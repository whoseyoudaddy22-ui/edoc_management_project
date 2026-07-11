import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { updateUserSchema } from "@/lib/validations/user";
import { logAction, diffFields } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { TITLE_PREFIX_LABELS } from "@/lib/labels";

type RouteParams = { params: Promise<{ id: string }> };

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentCode: true,
  titlePrefix: true,
  firstName: true,
  lastName: true,
  division: true,
  position: true,
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

  const updateData: Prisma.UserUpdateInput = { ...parsed.data };

  // ชื่อเต็ม (name) ต้อง sync ใหม่ทุกครั้งที่คำนำหน้า/ชื่อ/นามสกุลถูกแก้ไข
  if (parsed.data.titlePrefix || parsed.data.firstName || parsed.data.lastName) {
    const titlePrefix = parsed.data.titlePrefix ?? existing.titlePrefix;
    const firstName = parsed.data.firstName ?? existing.firstName;
    const lastName = parsed.data.lastName ?? existing.lastName;

    if (!titlePrefix || !firstName || !lastName) {
      return NextResponse.json(
        {
          error:
            "บัญชีนี้ยังไม่มีคำนำหน้า/ชื่อ/นามสกุลครบถ้วน กรุณากรอกคำนำหน้า ชื่อ และนามสกุลให้ครบทั้ง 3 ช่องพร้อมกันเพื่ออัปเดตชื่อที่แสดงผล",
        },
        { status: 400 }
      );
    }

    updateData.name = `${TITLE_PREFIX_LABELS[titlePrefix]}${firstName} ${lastName}`;
  }

  try {
    const user = await prisma.user.update({
      where: { id },
      data: updateData,
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
