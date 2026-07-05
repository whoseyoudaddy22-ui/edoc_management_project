"use client";

import { useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordSchema, type ForgotPasswordInput } from "@/lib/validations/auth";

export function ForgotPasswordForm() {
  const [submitted, setSubmitted] = useState(false);
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotPasswordInput>({
    resolver: zodResolver(forgotPasswordSchema),
    defaultValues: { email: "" },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        setSubmitError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
        return;
      }

      setSubmitted(true);
    } catch {
      setSubmitError("เกิดข้อผิดพลาด กรุณาลองใหม่อีกครั้ง");
    }
  });

  if (submitted) {
    return (
      <div className="flex flex-col gap-4">
        <p className="rounded-lg border border-green-200 bg-green-50 p-3 text-sm text-green-700">
          หากอีเมลนี้มีอยู่ในระบบ ระบบได้ส่งลิงก์รีเซ็ตรหัสผ่านไปให้แล้ว กรุณาตรวจสอบกล่องอีเมลของคุณ
        </p>
        <Link href="/login" className="text-sm text-blue-600 hover:underline">
          กลับไปหน้าเข้าสู่ระบบ
        </Link>
      </div>
    );
  }

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

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <Button type="submit" disabled={isSubmitting} className="mt-2 bg-blue-600 hover:bg-blue-600/90">
        {isSubmitting ? "กำลังส่งลิงก์..." : "ส่งลิงก์รีเซ็ตรหัสผ่าน"}
      </Button>

      <Link href="/login" className="text-center text-sm text-blue-600 hover:underline">
        กลับไปหน้าเข้าสู่ระบบ
      </Link>
    </form>
  );
}
