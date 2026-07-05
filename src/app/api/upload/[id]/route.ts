import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { Role } from "@/generated/prisma/enums";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ id: string }> };

// ลบไฟล์แนบได้เฉพาะ ADMIN/SARABAN ตาม docs/modules/module-10-user-management.md
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN, Role.SARABAN]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "ไม่พบไฟล์แนบที่ระบุ" }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id } });

  try {
    await unlink(path.join(process.cwd(), "public", attachment.filePath));
  } catch (error) {
    console.error("Failed to remove attachment file from disk", error);
  }

  // targetId ยังชี้ไปยัง Attachment ที่ถูกลบไปแล้ว (hard delete) จึงเก็บ fileName ไว้ใน changes
  // เพราะหลังจากนี้จะ join กลับไปหาชื่อไฟล์จากตาราง Attachment ไม่ได้อีก
  await logAction({
    action: AuditAction.ATTACHMENT_DELETE,
    performedBy: session.user.id,
    targetType: "Attachment",
    targetId: attachment.id,
    changes: { fileName: { from: attachment.fileName, to: null } },
  });

  return NextResponse.json({ data: attachment });
}
