import { prisma } from "@/lib/prisma";
import { DocumentsTable } from "@/components/shared/documents-table";

export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ type?: string }>;
}) {
  const { type } = await searchParams;

  const [documentTypes, users, departmentRows] = await Promise.all([
    prisma.documentType.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true, code: true },
    }),
    prisma.user.findMany({
      where: { isActive: true },
      orderBy: { name: "asc" },
      select: { id: true, name: true },
    }),
    prisma.document.findMany({
      where: { deletedAt: null },
      distinct: ["departmentCode"],
      orderBy: { departmentCode: "asc" },
      select: { departmentCode: true },
    }),
  ]);

  const departmentCodes = departmentRows.map((row) => row.departmentCode);
  const initialDocumentTypeCodes =
    type && documentTypes.some((docType) => docType.code === type) ? [type] : [];

  return (
    <DocumentsTable
      documentTypes={documentTypes}
      users={users}
      departmentCodes={departmentCodes}
      initialDocumentTypeCodes={initialDocumentTypeCodes}
    />
  );
}
