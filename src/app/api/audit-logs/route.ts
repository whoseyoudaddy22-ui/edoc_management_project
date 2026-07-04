import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { auditLogQuerySchema } from "@/lib/validations/audit";

export async function GET(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  const parsedQuery = auditLogQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );
  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "พารามิเตอร์ไม่ถูกต้อง", issues: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  const { targetType, performedBy, dateFrom, dateTo, page, pageSize } = parsedQuery.data;

  const where: Prisma.AuditLogWhereInput = {
    ...(targetType ? { targetType } : {}),
    ...(performedBy ? { performedBy } : {}),
    ...(dateFrom || dateTo
      ? {
          createdAt: {
            ...(dateFrom ? { gte: dateFrom } : {}),
            ...(dateTo ? { lte: dateTo } : {}),
          },
        }
      : {}),
  };

  const [logs, total] = await Promise.all([
    prisma.auditLog.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.auditLog.count({ where }),
  ]);

  // targetType/targetId เป็น generic string ไม่มี FK relation ตรงๆ (ตามที่ออกแบบไว้ใน module-12)
  // จึง resolve ชื่อที่อ่านง่ายแยกต่างหากด้วย batch query ตาม targetType ที่พบในหน้านี้
  const documentIds = logs.filter((l) => l.targetType === "Document").map((l) => l.targetId);
  const userIds = logs.filter((l) => l.targetType === "User").map((l) => l.targetId);

  const [documents, targetUsers] = await Promise.all([
    documentIds.length
      ? prisma.document.findMany({
          where: { id: { in: documentIds } },
          select: { id: true, documentNumber: true, title: true },
        })
      : Promise.resolve([]),
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true, email: true },
        })
      : Promise.resolve([]),
  ]);

  const documentMap = new Map(documents.map((d) => [d.id, d]));
  const userMap = new Map(targetUsers.map((u) => [u.id, u]));

  const data = logs.map((log) => {
    const document = log.targetType === "Document" ? documentMap.get(log.targetId) : undefined;
    const targetUser = log.targetType === "User" ? userMap.get(log.targetId) : undefined;

    return {
      id: log.id,
      action: log.action,
      performedBy: { id: log.performedBy, name: log.user.name, email: log.user.email },
      targetType: log.targetType,
      targetId: log.targetId,
      targetLabel: document
        ? `${document.documentNumber} · ${document.title}`
        : targetUser
          ? `${targetUser.name} (${targetUser.email})`
          : null,
      changes: log.changes,
      createdAt: log.createdAt,
    };
  });

  return NextResponse.json({
    data,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}
