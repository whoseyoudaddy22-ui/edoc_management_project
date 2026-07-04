import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { PrintView } from "@/components/shared/print-view";

export default async function DocumentPrintPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;

  const [document, documentOptions] = await Promise.all([
    prisma.document.findFirst({
      where: { id, deletedAt: null },
      include: { documentType: { select: { name: true } } },
    }),
    prisma.document.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      select: { id: true, documentNumber: true, title: true },
      take: 100,
    }),
  ]);

  if (!document) {
    notFound();
  }

  return (
    <PrintView document={document} documentId={id} documentOptions={documentOptions} />
  );
}
