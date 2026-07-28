import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";

type RouteParams = { params: Promise<{ id: string }> };

// เปิด/ปิดการใช้งานเทมเพลต — ปิดแล้วเลือกสร้างเอกสารประเภทนี้ใหม่ไม่ได้ แต่เอกสารเก่าที่เคย
// สร้างด้วยเทมเพลตนี้ยังดู/พิมพ์ได้ปกติ (ดู docs/modules/module-17-smart-template-system.md)
export async function PATCH(_request: Request, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;

  const existing = await prisma.templateDefinition.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบเทมเพลตที่ระบุ" }, { status: 404 });
  }

  const templateDefinition = await prisma.templateDefinition.update({
    where: { id },
    data: { isActive: !existing.isActive },
    select: { id: true, isActive: true },
  });

  return NextResponse.json({ data: templateDefinition });
}
