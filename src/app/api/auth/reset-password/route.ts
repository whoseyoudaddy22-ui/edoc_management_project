import { NextRequest, NextResponse } from "next/server";
import { resetPasswordSchema } from "@/lib/validations/auth";
import { resetPasswordWithToken } from "@/lib/password-reset";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = resetPasswordSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { token, password } = parsed.data;
  const userId = await resetPasswordWithToken(token, password);

  if (!userId) {
    return NextResponse.json(
      { error: "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว" },
      { status: 400 }
    );
  }

  await logAction({
    action: AuditAction.PASSWORD_RESET_COMPLETED,
    performedBy: userId,
    targetType: "User",
    targetId: userId,
  });

  return NextResponse.json({ message: "ตั้งรหัสผ่านใหม่สำเร็จ" });
}
