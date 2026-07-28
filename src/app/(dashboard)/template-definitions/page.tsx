import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { TemplateDefinitionsTable } from "@/components/shared/template-definitions-table";

export default async function TemplateDefinitionsPage() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  if (session.user.role !== Role.ADMIN) {
    redirect("/dashboard");
  }

  return <TemplateDefinitionsTable />;
}
