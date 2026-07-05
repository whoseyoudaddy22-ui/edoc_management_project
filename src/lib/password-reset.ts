import { randomBytes, createHash } from "crypto";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";

export const RESET_TOKEN_TTL_MINUTES = 60;

function hashToken(rawToken: string): string {
  return createHash("sha256").update(rawToken).digest("hex");
}

// Token เป็นค่าสุ่มที่ระบบสร้างเอง (ไม่ใช่ความลับที่ผู้ใช้ตั้ง) จึงใช้ sha256 พอ
// ไม่ต้องใช้ bcrypt เหมือน password — เก็บเฉพาะ hash กัน token หลุดจาก DB โดยตรง
export async function createPasswordResetToken(userId: string): Promise<string> {
  const rawToken = randomBytes(32).toString("hex");
  const tokenHash = hashToken(rawToken);
  const expiresAt = new Date(Date.now() + RESET_TOKEN_TTL_MINUTES * 60 * 1000);

  await prisma.$transaction([
    prisma.passwordResetToken.deleteMany({ where: { userId, usedAt: null } }),
    prisma.passwordResetToken.create({
      data: { userId, tokenHash, expiresAt },
    }),
  ]);

  return rawToken;
}

export async function isResetTokenValid(rawToken: string): Promise<boolean> {
  const token = await prisma.passwordResetToken.findUnique({
    where: { tokenHash: hashToken(rawToken) },
  });

  return !!token && token.usedAt === null && token.expiresAt > new Date();
}

export async function resetPasswordWithToken(
  rawToken: string,
  newPassword: string
): Promise<string | null> {
  const tokenHash = hashToken(rawToken);
  const token = await prisma.passwordResetToken.findUnique({ where: { tokenHash } });

  if (!token || token.usedAt !== null || token.expiresAt <= new Date()) {
    return null;
  }

  const passwordHash = await bcrypt.hash(newPassword, 10);

  await prisma.$transaction([
    prisma.user.update({ where: { id: token.userId }, data: { passwordHash } }),
    prisma.passwordResetToken.update({
      where: { id: token.id },
      data: { usedAt: new Date() },
    }),
  ]);

  return token.userId;
}
