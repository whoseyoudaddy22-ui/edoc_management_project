import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Document } from "@/generated/prisma/client";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import { createDocumentSchema } from "@/lib/validations/document";
import { requireRole } from "@/lib/authorize";
import { getDefaultClosingText } from "@/lib/labels";
import { Role } from "@/generated/prisma/enums";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

// การค้นหา/list เอกสารทั้งหมดย้ายไปอยู่ที่ GET /api/documents/search แล้ว
// (รองรับ multi-criteria search ตาม docs/modules/module-11-metadata-search.md)
// ไม่ทำ endpoint ค้นหาซ้ำที่นี่ เหลือเฉพาะ POST สำหรับสร้างเอกสาร

// สร้างเอกสารได้เฉพาะ ADMIN/SARABAN (เจ้าหน้าที่สารบรรณ) ตาม docs/modules/module-10-user-management.md
// APPROVER/VIEWER ไม่มีสิทธิ์สร้างเอกสาร
export async function POST(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN, Role.SARABAN]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  // ผู้สร้างเอกสารต้องเป็นผู้ใช้ที่ login อยู่เท่านั้น (จาก session) ห้ามรับค่านี้จาก client
  // มิเช่นนั้นผู้ใช้ A จะส่ง id ของผู้ใช้ B มาแอบอ้างเป็นผู้สร้างเอกสารแทนได้ (IDOR)
  const [creator, documentType] = await Promise.all([
    prisma.user.findUnique({ where: { id: session.user.id } }),
    prisma.documentType.findUnique({ where: { id: input.documentTypeId } }),
  ]);

  if (!creator) {
    return NextResponse.json(
      { error: "ไม่พบผู้ใช้ที่ระบุ" },
      { status: 404 }
    );
  }

  const departmentCode = creator.departmentCode;
  if (!departmentCode) {
    return NextResponse.json(
      { error: "ผู้ใช้นี้ยังไม่ได้กำหนดรหัสหน่วยงาน (departmentCode)" },
      { status: 400 }
    );
  }

  if (!documentType || !documentType.isActive) {
    return NextResponse.json(
      { error: "ไม่พบประเภทเอกสารที่ระบุ หรือประเภทเอกสารถูกปิดใช้งาน" },
      { status: 404 }
    );
  }

  try {
    const document = await createDocumentWithAutoNumber<Document>(
      departmentCode,
      documentType.code,
      ({ documentNumber, buddhistYear, runningNumber }) => ({
        documentNumber,
        buddhistYear,
        runningNumber,
        departmentCode,
        documentTypeCode: documentType.code,
        documentDate: input.documentDate,
        title: input.title,
        priority: input.priority,
        recipient: input.recipient,
        sender: input.sender,
        departmentName: input.departmentName,
        referenceNumber: input.referenceNumber,
        content: input.content,
        // ถ้า client ไม่ส่ง closingText มา ใช้ default ตามประเภทเอกสาร (memo -> จึงเรียนมาเพื่อทราบฯ)
        // ตัดสินที่ server เสมอ ไม่พึ่ง default ฝั่งฟอร์ม เผื่อกรณีเรียก API ตรง
        closingText: input.closingText ?? getDefaultClosingText(documentType.code),
        signerName: input.signerName,
        signerPosition: input.signerPosition,
        documentType: { connect: { id: documentType.id } },
        createdBy: { connect: { id: creator.id } },
      })
    );

    await logAction({
      action: AuditAction.DOCUMENT_CREATE,
      performedBy: session.user.id,
      targetType: "Document",
      targetId: document.id,
    });

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error("Failed to create document", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
