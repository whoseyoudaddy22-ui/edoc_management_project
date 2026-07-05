// ป้องกันการยิง POST /api/auth/forgot-password ซ้ำๆ ใส่อีเมลเดียว (mail-bombing กล่องขาเข้าของเหยื่อ
// ด้วยลิงก์รีเซ็ตรหัสผ่าน) ตาม Security Hardening checklist ใน docs/modules/module-15-deployment.md
//
// เก็บ state เป็น in-memory (ไม่ใช้ AuditLog เหมือน login-rate-limit.ts) เพราะ endpoint นี้ต้องนับ
// ทั้งกรณีอีเมลมีอยู่จริงและไม่มีอยู่จริงในระบบเหมือนกัน (กัน enumeration) แต่ AuditLog.performedBy
// ผูกกับ User.id แบบ required จึงบันทึก log ให้อีเมลที่ไม่มีอยู่จริงไม่ได้
//
// key ด้วยอีเมล (ไม่ใช่ IP) เพราะระบบนี้ใช้งานภายในหน่วยงานเดียว ผู้ใช้หลายคนมักอยู่หลัง IP
// สาธารณะเดียวกัน (NAT ขององค์กร) การจำกัดด้วย IP จะบล็อกทั้งออฟฟิศพร้อมกันโดยไม่ตั้งใจ
export const FORGOT_PASSWORD_MAX_ATTEMPTS = 3;
export const FORGOT_PASSWORD_WINDOW_MINUTES = 60;

const attemptsByEmail = new Map<string, number[]>();

function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

function pruneOldAttempts(timestamps: number[], now: number): number[] {
  const windowMs = FORGOT_PASSWORD_WINDOW_MINUTES * 60 * 1000;
  return timestamps.filter((t) => now - t < windowMs);
}

export function isForgotPasswordRateLimited(email: string): boolean {
  const key = normalizeEmail(email);
  const now = Date.now();
  const timestamps = pruneOldAttempts(attemptsByEmail.get(key) ?? [], now);
  attemptsByEmail.set(key, timestamps);
  return timestamps.length >= FORGOT_PASSWORD_MAX_ATTEMPTS;
}

export function recordForgotPasswordAttempt(email: string): void {
  const key = normalizeEmail(email);
  const now = Date.now();
  const timestamps = pruneOldAttempts(attemptsByEmail.get(key) ?? [], now);
  timestamps.push(now);
  attemptsByEmail.set(key, timestamps);
}
