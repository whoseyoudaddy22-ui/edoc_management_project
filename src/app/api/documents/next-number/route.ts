import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { formatDocumentNumber, getCurrentBuddhistYear } from "@/lib/document-number";
import { Role } from "@/generated/prisma/enums";

// คืนเลขที่หนังสือ "แนะนำ" ตามรูปแบบมาตรฐาน สำหรับเติมเป็นค่าเริ่มต้นในฟอร์มสร้างเอกสารเท่านั้น
// ไม่ใช่การจองเลข — เลขจริงยังคำนวณอีกครั้งแบบ atomic ตอน POST /api/documents (ดู
// .claude/skills/document-numbering/SKILL.md > การพิมพ์เลขที่ด้วยมือ)
export async function GET(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN, Role.SARABAN]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  // departmentCode มาจากผู้ใช้ที่ login เท่านั้น (เหมือน POST /api/documents) ห้ามรับจาก query
  // มิเช่นนั้นจะสืบเลขลำดับของหน่วยงานอื่นได้ (information disclosure)
  const creator = await prisma.user.findUnique({ where: { id: session.user.id } });
  const departmentCode = creator?.departmentCode;
  if (!departmentCode) {
    return NextResponse.json(
      { error: "ผู้ใช้นี้ยังไม่ได้กำหนดรหัสหน่วยงาน (departmentCode)" },
      { status: 400 }
    );
  }

  const documentTypeCode = request.nextUrl.searchParams.get("documentTypeCode");

  if (!documentTypeCode) {
    return NextResponse.json({ error: "ต้องระบุ documentTypeCode" }, { status: 400 });
  }

  const buddhistYear = getCurrentBuddhistYear();

  const last = await prisma.document.findFirst({
    where: { departmentCode, documentTypeCode, buddhistYear },
    orderBy: { runningNumber: "desc" },
    select: { runningNumber: true },
  });

  const runningNumber = (last?.runningNumber ?? 0) + 1;
  const documentNumber = formatDocumentNumber({
    departmentCode,
    documentTypeCode,
    buddhistYear,
    runningNumber,
  });

  return NextResponse.json({ data: { documentNumber } });
}
