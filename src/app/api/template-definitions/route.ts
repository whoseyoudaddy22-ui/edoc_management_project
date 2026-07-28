import { NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";

const templateDefinitionListSelect = {
  id: true,
  documentTypeCode: true,
  name: true,
  componentKey: true,
  defaultClosingText: true,
  isActive: true,
  version: true,
  createdAt: true,
  updatedAt: true,
  documentType: { select: { name: true } },
} satisfies Prisma.TemplateDefinitionSelect;

// ดูรายการเทมเพลตทั้งหมด สำหรับหน้า Admin "จัดการเทมเพลต" — เปิด/ปิดใช้งานได้เท่านั้น
// ห้ามแก้ layout/componentKey ผ่านหน้าเว็บ (ต้องแก้ผ่านโค้ด + PR ดู
// docs/modules/module-17-smart-template-system.md)
export async function GET() {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  const templateDefinitions = await prisma.templateDefinition.findMany({
    select: templateDefinitionListSelect,
    orderBy: { documentTypeCode: "asc" },
  });

  return NextResponse.json({ data: templateDefinitions });
}
