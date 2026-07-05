import { z } from "zod";
import { passwordSchema } from "@/lib/validations/password";

export const loginSchema = z.object({
  email: z.string().min(1, "กรุณาระบุอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
  password: z.string().min(1, "กรุณาระบุรหัสผ่าน"),
});

export type LoginInput = z.infer<typeof loginSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().min(1, "กรุณาระบุอีเมล").email("รูปแบบอีเมลไม่ถูกต้อง"),
});

export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const resetPasswordSchema = z
  .object({
    token: z.string().min(1, "ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้อง"),
    password: passwordSchema,
    confirmPassword: z.string().min(1, "กรุณายืนยันรหัสผ่าน"),
  })
  .refine((data) => data.password === data.confirmPassword, {
    message: "รหัสผ่านไม่ตรงกัน",
    path: ["confirmPassword"],
  });

export type ResetPasswordInput = z.infer<typeof resetPasswordSchema>;
