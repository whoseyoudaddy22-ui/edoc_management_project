import { Building2 } from "lucide-react";
import { ForgotPasswordForm } from "@/components/shared/forgot-password-form";

export default function ForgotPasswordPage() {
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

        <h1 className="mb-2 text-xl font-semibold text-gray-900">ลืมรหัสผ่าน</h1>
        <p className="mb-6 text-sm text-gray-500">
          กรอกอีเมลที่ใช้เข้าสู่ระบบ เราจะส่งลิงก์สำหรับตั้งรหัสผ่านใหม่ไปให้
        </p>

        <ForgotPasswordForm />
      </div>
    </div>
  );
}
