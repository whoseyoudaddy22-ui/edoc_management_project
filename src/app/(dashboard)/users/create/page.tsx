import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { UserCreateForm } from "@/components/shared/user-create-form";

export default async function UserCreatePage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  return <UserCreateForm />;
}
