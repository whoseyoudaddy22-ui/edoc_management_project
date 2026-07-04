import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import { createDocumentSchema } from "@/lib/validations/document";

// การค้นหา/list เอกสารทั้งหมดย้ายไปอยู่ที่ GET /api/documents/search แล้ว
// (รองรับ multi-criteria search ตาม docs/modules/module-11-metadata-search.md)
// ไม่ทำ endpoint ค้นหาซ้ำที่นี่ เหลือเฉพาะ POST สำหรับสร้างเอกสาร

export async function POST(request: NextRequest) {
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

  const [creator, documentType] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.createdById } }),
    prisma.documentType.findUnique({ where: { id: input.documentTypeId } }),
  ]);

  if (!creator) {
    return NextResponse.json(
      { error: "ไม่พบผู้ใช้ที่ระบุ (createdById)" },
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
    const document = await createDocumentWithAutoNumber(
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
        referenceNumber: input.referenceNumber,
        content: input.content,
        signerName: input.signerName,
        signerPosition: input.signerPosition,
        documentType: { connect: { id: documentType.id } },
        createdBy: { connect: { id: creator.id } },
      })
    );

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error("Failed to create document", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
