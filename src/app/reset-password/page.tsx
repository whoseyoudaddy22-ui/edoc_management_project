import { Building2 } from "lucide-react";
import Link from "next/link";
import { isResetTokenValid } from "@/lib/password-reset";
import { ResetPasswordForm } from "@/components/shared/reset-password-form";

export default async function ResetPasswordPage({
  searchParams,
}: {
  searchParams: Promise<{ token?: string }>;
}) {
  const { token } = await searchParams;
  const valid = token ? await isResetTokenValid(token) : false;

  return (
    <div className="flex min-h-screen w-full items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-sm rounded-xl border border-gray-200 bg-white p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-[#f2b93b]">
            <Building2 className="h-6 w-6 text-[#1e2a4a]" />
          </div>
          <div className="leading-tight">
            <p className="text-base font-semibold text-gray-900">ระบบจัดเก็บเอกสาร</p>
            <p className="text-xs text-gray-500">Digital Archive System</p>
          </div>
        </div>

        <h1 className="mb-6 text-xl font-semibold text-gray-900">ตั้งรหัสผ่านใหม่</h1>

        {valid && token ? (
          <ResetPasswordForm token={token} />
        ) : (
          <div className="flex flex-col gap-4">
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              ลิงก์รีเซ็ตรหัสผ่านไม่ถูกต้องหรือหมดอายุแล้ว กรุณาขอลิงก์ใหม่อีกครั้ง
            </p>
            <Link href="/forgot-password" className="text-center text-sm text-blue-600 hover:underline">
              ขอลิงก์รีเซ็ตรหัสผ่านใหม่
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
