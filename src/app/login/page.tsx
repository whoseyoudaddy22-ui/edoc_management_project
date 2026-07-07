import Image from "next/image";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { getSafeCallbackUrl } from "@/lib/safe-redirect";
import { LoginForm } from "@/components/shared/login-form";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ callbackUrl?: string }>;
}) {
  const session = await auth();
  if (session?.user) {
    redirect("/dashboard");
  }

  const { callbackUrl } = await searchParams;

  return (
    <div className="flex min-h-screen w-full flex-col items-center justify-center gap-4 bg-background p-6">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-8 flex flex-col items-center gap-3 text-center">
          <Image
            src="/logo/plvc.png"
            alt="ตราวิทยาลัย"
            width={96}
            height={96}
            priority
            className="h-20 w-20"
          />
          <div className="leading-tight">
            <p className="text-lg font-semibold text-foreground">ระบบจัดเก็บเอกสาร</p>
            <p className="text-xs text-muted-foreground">Digital Archive System</p>
          </div>
        </div>

        <h1 className="mb-6 text-xl font-semibold text-foreground">เข้าสู่ระบบ</h1>

        <LoginForm callbackUrl={getSafeCallbackUrl(callbackUrl)} />
      </div>

      <p className="text-xs text-muted-foreground">
        ระบบบริหารจัดการการสร้างและจัดเก็บแฟ้มเอกสารอิเล็กทรอนิกส์
      </p>
    </div>
  );
}
