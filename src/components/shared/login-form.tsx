"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { signIn } from "next-auth/react";
import Link from "next/link";
import { AlertCircle } from "lucide-react";
import { Alert, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { PasswordInput } from "@/components/shared/password-input";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";
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

    // ตรวจซ้ำอีกชั้นตรงจุดที่ navigate จริง (defense-in-depth) เผื่อ component นี้ถูกใช้จากที่อื่น
    // ในอนาคตโดยไม่ผ่านการเช็คที่ page.tsx — ดู src/lib/safe-redirect.ts
    router.push(getSafeCallbackUrl(callbackUrl));
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4">
      <div className="flex flex-col gap-1.5">
        <Label htmlFor="email">
          อีเมล<span className="text-destructive">*</span>
        </Label>
        <Input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="name@organization.go.th"
          {...register("email")}
        />
        {errors.email && (
          <p className="text-xs text-destructive">{errors.email.message}</p>
        )}
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="password">
          รหัสผ่าน<span className="text-destructive">*</span>
        </Label>
        <PasswordInput
          id="password"
          autoComplete="current-password"
          placeholder="••••••••"
          {...register("password")}
        />
        {errors.password && (
          <p className="text-xs text-destructive">{errors.password.message}</p>
        )}
      </div>

      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <Checkbox id="remember-me" defaultChecked />
          <Label htmlFor="remember-me" className="font-normal text-muted-foreground">
            จดจำการเข้าสู่ระบบ
          </Label>
        </div>
        <Link href="/forgot-password" className="text-sm text-primary hover:underline">
          ลืมรหัสผ่าน?
        </Link>
      </div>

      {submitError && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertCircle />
          <AlertTitle>{submitError}</AlertTitle>
        </Alert>
      )}

      <Button type="submit" size="lg" disabled={isSubmitting} className="mt-2 w-full">
        {isSubmitting ? "กำลังเข้าสู่ระบบ..." : "เข้าสู่ระบบ"}
      </Button>
    </form>
  );
}
