import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { forgotPasswordSchema } from "@/lib/validations/auth";
import { createPasswordResetToken } from "@/lib/password-reset";
import { sendPasswordResetEmail } from "@/lib/mailer";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import {
  isForgotPasswordRateLimited,
  recordForgotPasswordAttempt,
} from "@/lib/forgot-password-rate-limit";

const GENERIC_MESSAGE = "หากอีเมลนี้มีอยู่ในระบบ ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = forgotPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email } = parsed.data;

  // นับทุกครั้งที่ขอ ไม่ว่าอีเมลจะมีอยู่จริงหรือไม่ กัน mail-bombing กล่องขาเข้าของเหยื่อ
  // ด้วยลิงก์รีเซ็ตรหัสผ่านซ้ำๆ (ดู src/lib/forgot-password-rate-limit.ts)
  if (isForgotPasswordRateLimited(email)) {
    return NextResponse.json(
      { error: "คุณขอรีเซ็ตรหัสผ่านบ่อยเกินไป กรุณาลองใหม่ภายหลัง" },
      { status: 429 }
    );
  }
  recordForgotPasswordAttempt(email);

  const user = await prisma.user.findUnique({ where: { email } });

  // ไม่พบผู้ใช้หรือบัญชีถูกปิดใช้งาน: ไม่สร้าง token/ไม่ส่งอีเมล/ไม่บันทึก log
  // แต่ยังตอบข้อความเดียวกันเสมอ กัน enumeration ว่าอีเมลไหนมีอยู่จริง
  if (user && user.isActive) {
    const rawToken = await createPasswordResetToken(user.id);
    const link = new URL(`/reset-password?token=${rawToken}`, request.nextUrl.origin).toString();

    await sendPasswordResetEmail(user.email, link);

    await logAction({
      action: AuditAction.PASSWORD_RESET_REQUESTED,
      performedBy: user.id,
      targetType: "User",
      targetId: user.id,
    });
  }

  return NextResponse.json({ message: GENERIC_MESSAGE });
}
