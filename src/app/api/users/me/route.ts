import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authorize";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  const user = await prisma.user.findUnique({
    where: { id: authResult.session.user.id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentCode: true,
      isActive: true,
      createdAt: true,
      updatedAt: true,
    },
  });

  if (!user) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้ที่ระบุ" }, { status: 404 });
  }

  return NextResponse.json({ data: user });
}
