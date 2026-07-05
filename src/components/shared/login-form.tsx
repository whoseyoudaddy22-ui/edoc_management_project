"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/password-input";
import { loginSchema, type LoginInput } from "@/lib/validations/auth";

export function LoginForm({ callbackUrl }: { callbackUrl: string }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginInput>({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: "", password: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    const result = await signIn("credentials", {
      ...values,
      redirect: false,
    });

    if (!result || result.error) {
      // "account_locked" ต้องตรงกับ AccountLockedError.code ใน src/lib/auth.ts
      // (ตัวเลข 15 นาทีต้องตรงกับ LOGIN_LOCKOUT_WINDOW_MINUTES ใน src/lib/login-rate-limit.ts)
      if (result?.code === "account_locked") {
        setSubmitError("เข้าสู่ระบบผิดพลาดติดต่อกันหลายครั้งเกินไป กรุณารอ 15 นาทีแล้วลองใหม่อีกครั้ง");
      } else {
        setSubmitError("อีเมลหรือรหัสผ่านไม่ถูกต้อง");
      }
      return;
    }

    router.push(callbackUrl);
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">
          อีเมล<span className="text-red-500">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@organization.go.th"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-red-500">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">
          รหัสผ่าน<span className="text-red-500">*</span>
        </Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-red-500">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <label htmlFor="remember-me" className="flex items-center gap-2 text-sm text-gray-600">
          <input id="remember-me" type="checkbox" defaultChecked className="h-4 w-4 rounded border-gray-300" />
          จดจำการเข้าสู่ระบบ
        </label>
        <Link href="/forgot-password" className="text-sm text-blue-600 hover:underline">
          ลืมรหัสผ่าน?
        </Link>
      </div>

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 bg-blue-600 hover:bg-blue-600/90">
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
