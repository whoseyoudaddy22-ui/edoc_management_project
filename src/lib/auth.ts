import NextAuth, { CredentialsSignin } from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import type { JWT } from "next-auth/jwt";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { isLoginLocked } from "@/lib/login-rate-limit";

// code นี้ถูกส่งกลับไปที่ query param `code` ตอน redirect (ดู login-form.tsx) จึงต้องไม่ใบ้ข้อมูลอ่อนไหว
export class AccountLockedError extends CredentialsSignin {
  code = "account_locked";
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      credentials: {
        email: { label: "อีเมล", type: "email" },
        password: { label: "รหัสผ่าน", type: "password" },
      },
      async authorize(credentials) {
        const email = credentials?.email;
        const password = credentials?.password;

        if (typeof email !== "string" || typeof password !== "string") {
          return null;
        }

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user || !user.isActive) {
          // ไม่พบผู้ใช้เลยไม่มี performedBy ที่ valid ให้บันทึก (AuditLog.performedBy เป็น FK ไป User)
          // แต่ถ้าเป็นบัญชีที่ถูกปิดใช้งาน (มี user แต่ isActive=false) ยังบันทึกได้เพราะมี id จริง
          if (user) {
            await logAction({
              action: AuditAction.USER_LOGIN_FAILED,
              performedBy: user.id,
              targetType: "User",
              targetId: user.id,
            });
          }
          return null;
        }

        // ป้องกัน brute-force: บล็อกก่อนตรวจรหัสผ่านเลยถ้า login ผิดเกินกำหนดในช่วงเวลาที่กำหนด
        // (ดู src/lib/login-rate-limit.ts และ docs/modules/module-15-deployment.md > Security Hardening)
        if (await isLoginLocked(user.id)) {
          throw new AccountLockedError();
        }

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) {
          await logAction({
            action: AuditAction.USER_LOGIN_FAILED,
            performedBy: user.id,
            targetType: "User",
            targetId: user.id,
          });
          return null;
        }

        await logAction({
          action: AuditAction.USER_LOGIN,
          performedBy: user.id,
          targetType: "User",
          targetId: user.id,
        });

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
          departmentCode: user.departmentCode,
        };
      },
    }),
  ],
  events: {
    async signOut(message) {
      const token = "token" in message ? (message.token as JWT | null) : undefined;
      if (!token?.id) return;

      await logAction({
        action: AuditAction.USER_LOGOUT,
        performedBy: token.id,
        targetType: "User",
        targetId: token.id,
      });
    },
  },
});
