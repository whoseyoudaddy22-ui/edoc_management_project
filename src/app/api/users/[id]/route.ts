import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { updateUserSchema } from "@/lib/validations/user";
import { logAction, diffFields } from "@/lib/audit";
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = updateUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { id } });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้ที่ระบุ" }, { status: 404 });
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: parsed.data,
      select: userListSelect,
    });

    const fieldChanges = diffFields(existing, parsed.data);
    if (Object.keys(fieldChanges).length > 0) {
      await logAction({
        action: AuditAction.USER_UPDATE,
        performedBy: session.user.id,
        targetType: "User",
        targetId: user.id,
        changes: fieldChanges,
      });
    }

    return NextResponse.json({ data: user });
  } catch (error) {
    console.error("Failed to update user", error);
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไขผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
