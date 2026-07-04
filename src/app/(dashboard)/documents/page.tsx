import { prisma } from "@/lib/prisma";
import { DocumentsTable } from "@/components/shared/documents-table";

export default async function DocumentsPage() {
  const documentTypes = await prisma.documentType.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
    select: { id: true, name: true },
  });

  return <DocumentsTable documentTypes={documentTypes} />;
}
