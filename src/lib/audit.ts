import type { Prisma } from "@/generated/prisma/client";
import { AuditAction } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

type AuditLogParams = {
  action: AuditAction;
  performedBy: string;
  targetType: string;
  targetId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
  ipAddress?: string;
};

/**
 * บันทึก Audit Log — เรียกทันทีหลัง action สำเร็จเท่านั้น (ไม่ใช่ก่อนทำ)
 * ห้าม throw ทำให้ request หลักล้มเหลว เพราะ action จริงสำเร็จไปแล้ว จึงแค่ log error แล้วปล่อยผ่าน
 */
export async function logAction(params: AuditLogParams): Promise<void> {
  const { action, performedBy, targetType, targetId, changes, ipAddress } = params;

  try {
    await prisma.auditLog.create({
      data: {
        action,
        targetType,
        targetId,
        changes: changes as Prisma.InputJsonValue | undefined,
        ipAddress,
        user: { connect: { id: performedBy } },
      },
    });
  } catch (error) {
    console.error("Failed to write audit log", { action, targetType, targetId, error });
  }
}

/**
 * เทียบข้อมูลเดิมกับข้อมูลใหม่ แล้วคืนเฉพาะ field ที่เปลี่ยนแปลงจริง สำหรับใช้เป็น `changes` ของ DOCUMENT_UPDATE
 */
export function diffFields<T extends Record<string, unknown>>(
  before: T,
  after: Partial<T>
): Record<string, { from: unknown; to: unknown }> {
  const changes: Record<string, { from: unknown; to: unknown }> = {};

  for (const key of Object.keys(after) as (keyof T)[]) {
    const from = before[key];
    const to = after[key];

    if (to === undefined) continue;
    if (JSON.stringify(from) === JSON.stringify(to)) continue;

    changes[key as string] = { from, to };
  }

  return changes;
}
