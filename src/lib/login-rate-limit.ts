import { prisma } from "@/lib/prisma";
import { AuditAction } from "@/generated/prisma/enums";

// Security Hardening checklist (docs/modules/module-15-deployment.md):
// ป้องกัน brute-force หน้า login โดยนับ USER_LOGIN_FAILED ที่ Module 12 (Audit Log) บันทึกไว้แล้ว
// ต่อ user คนเดียวกัน ภายในช่วงเวลาที่กำหนด — ไม่ต้องมีตาราง/state เพิ่มเติม
export const LOGIN_MAX_FAILED_ATTEMPTS = 5;
export const LOGIN_LOCKOUT_WINDOW_MINUTES = 15;

export async function isLoginLocked(userId: string): Promise<boolean> {
  const since = new Date(Date.now() - LOGIN_LOCKOUT_WINDOW_MINUTES * 60 * 1000);

  const recentFailedAttempts = await prisma.auditLog.count({
    where: {
      performedBy: userId,
      action: AuditAction.USER_LOGIN_FAILED,
      createdAt: { gte: since },
    },
  });

  return recentFailedAttempts >= LOGIN_MAX_FAILED_ATTEMPTS;
}
