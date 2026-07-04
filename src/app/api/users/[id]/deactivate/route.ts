import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ id: string }> };

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function PATCH(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้ที่ระบุ" }, { status: 404 });
  }

  // ปิดใช้งานบัญชีเท่านั้น ห้าม hard delete เพราะเอกสารเก่ายังผูกกับ user นี้อยู่
  const user = await prisma.user.update({
    where: { id },
    data: { isActive: false },
    select: userListSelect,
  });

  if (existing.isActive) {
    await logAction({
      action: AuditAction.USER_DEACTIVATE,
      performedBy: session.user.id,
      targetType: "User",
      targetId: user.id,
    });
  }

  return NextResponse.json({ data: user });
}
