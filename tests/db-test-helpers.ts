import { prisma } from "@/lib/prisma";
import type { Prisma } from "@/generated/prisma/client";

// Trigger `audit_log_immutable` (ดู prisma/migrations/*_add_audit_log_immutability_trigger)
// บล็อก UPDATE/DELETE บน AuditLog ทุกกรณีโดยตั้งใจ (ดู security-review Finding #5) รวมถึงตอนที่
// เทสไฟล์ต่างๆ ต้องล้างข้อมูล AuditLog ที่ seed ไว้เองหลังจบเทสด้วย จึงต้องปิด trigger ชั่วคราว
// เฉพาะช่วง cleanup ของเทสเท่านั้น แล้วเปิดกลับทันที — ไม่ใช่ทางที่ application code เรียกใช้ได้
export async function deleteAuditLogsForTest(where: Prisma.AuditLogWhereInput): Promise<void> {
  await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" DISABLE TRIGGER audit_log_immutable`);
  try {
    await prisma.auditLog.deleteMany({ where });
  } finally {
    await prisma.$executeRawUnsafe(`ALTER TABLE "AuditLog" ENABLE TRIGGER audit_log_immutable`);
  }
}
