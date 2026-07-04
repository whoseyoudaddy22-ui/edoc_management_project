import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Sidebar } from "@/components/shared/sidebar";

export default async function DashboardGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen w-full bg-gray-50">
      <Sidebar user={{ name: session.user.name ?? "", role: session.user.role }} />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
