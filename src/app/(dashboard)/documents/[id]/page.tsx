import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { auth } from "@/lib/auth";
import { Role } from "@/generated/prisma/enums";
import { DocumentMetadataView } from "@/components/shared/document-metadata-view";

const APPROVER_ROLES: Role[] = [Role.ADMIN, Role.APPROVER];

export default async function DocumentMetadataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }

  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: {
      documentType: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true, email: true, departmentCode: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      attachments: {
        select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!document) {
    notFound();
  }

  return (
    <DocumentMetadataView
      document={document}
      canApprove={APPROVER_ROLES.includes(session.user.role)}
      currentUserId={session.user.id}
    />
  );
}
