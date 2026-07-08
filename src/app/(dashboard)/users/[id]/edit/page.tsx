import { redirect, notFound } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Role } from "@/generated/prisma/enums";
import { UserEditForm } from "@/components/shared/user-edit-form";

type PageParams = { params: Promise<{ id: string }> };

export default async function UserEditPage({ params }: PageParams) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  const { id } = await params;

  const user = await prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      departmentCode: true,
      titlePrefix: true,
      firstName: true,
      lastName: true,
      division: true,
      position: true,
    },
  });

  if (!user) {
    notFound();
  }

  return <UserEditForm user={user} />;
}
