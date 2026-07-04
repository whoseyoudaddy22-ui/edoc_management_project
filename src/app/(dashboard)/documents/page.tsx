import { prisma } from "@/lib/prisma";
import { DocumentsTable } from "@/components/shared/documents-table";

export default async function DocumentsPage() {
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

  return (
    <DocumentsTable
      documentTypes={documentTypes}
      users={users}
      departmentCodes={departmentCodes}
    />
  );
}
