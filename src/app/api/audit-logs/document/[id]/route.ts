import { NextRequest, NextResponse } from "next/server";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";

type RouteParams = { params: Promise<{ id: string }> };

// ไม่ filter deletedAt เพราะประวัติของเอกสารที่ถูกลบ (soft delete) ก็ยังต้องดูย้อนหลังได้
export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN, Role.APPROVER]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id },
    select: { id: true, createdById: true, approvedById: true },
  });
  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  // Approver ดูได้เฉพาะเอกสารที่ตัวเองเกี่ยวข้อง (สร้างเอง หรือเป็นผู้อนุมัติ) ตาม module-12-audit-log.md
  if (session.user.role === Role.APPROVER) {
    const isInvolved =
      document.createdById === session.user.id || document.approvedById === session.user.id;
    if (!isInvolved) {
      return NextResponse.json(
        { error: "คุณไม่มีสิทธิ์ดูประวัติของเอกสารนี้" },
        { status: 403 }
      );
    }
  }

  const logs = await prisma.auditLog.findMany({
    where: { targetType: "Document", targetId: id },
    include: { user: { select: { name: true, email: true } } },
    orderBy: { createdAt: "desc" },
    take: 200,
  });

  return NextResponse.json({
    data: logs.map((log) => ({
      id: log.id,
      action: log.action,
      performedBy: { name: log.user.name, email: log.user.email },
      changes: log.changes,
      createdAt: log.createdAt,
    })),
  });
}
