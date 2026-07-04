import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authorize";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ id: string }> };

// ไม่มีหน้า UI ใดเรียก endpoint นี้เพื่อแสดงผล — เรียกจากฝั่ง client เพียงเพื่อบันทึก
// audit log ตอนสั่งพิมพ์/export PDF ตาม docs/modules/module-12-audit-log.md เท่านั้น
export async function POST(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  await logAction({
    action: AuditAction.DOCUMENT_PRINT,
    performedBy: session.user.id,
    targetType: "Document",
    targetId: document.id,
  });

  return NextResponse.json({ data: { ok: true } });
}
