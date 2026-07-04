import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { DocumentMetadataView } from "@/components/shared/document-metadata-view";

export default async function DocumentMetadataPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

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

  return <DocumentMetadataView document={document} />;
}
