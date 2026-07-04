import { prisma } from "@/lib/prisma";
import { DocumentStatus } from "@/generated/prisma/enums";

export async function getDashboardStats() {
  const [
    totalDocuments,
    pendingCount,
    approvedCount,
    attachmentCount,
    recentDocuments,
    typeCounts,
  ] = await Promise.all([
    prisma.document.count({ where: { deletedAt: null } }),
    prisma.document.count({ where: { deletedAt: null, status: DocumentStatus.PENDING } }),
    prisma.document.count({ where: { deletedAt: null, status: DocumentStatus.APPROVED } }),
    prisma.attachment.count(),
    prisma.document.findMany({
      where: { deletedAt: null },
      orderBy: { createdAt: "desc" },
      take: 5,
      include: { documentType: true },
    }),
    prisma.document.groupBy({
      by: ["documentTypeId"],
      where: { deletedAt: null },
      _count: { _all: true },
      orderBy: { _count: { documentTypeId: "desc" } },
    }),
  ]);

  const documentTypes = await prisma.documentType.findMany({
    where: { id: { in: typeCounts.map((item) => item.documentTypeId) } },
  });

  const documentTypeBreakdown = typeCounts.map((item) => {
    const type = documentTypes.find((t) => t.id === item.documentTypeId);
    return {
      documentTypeId: item.documentTypeId,
      name: type?.name ?? "ไม่ระบุประเภท",
      count: item._count._all,
      percentage:
        totalDocuments > 0 ? Math.round((item._count._all / totalDocuments) * 100) : 0,
    };
  });

  return {
    totalDocuments,
    pendingCount,
    approvedCount,
    attachmentCount,
    recentDocuments,
    documentTypeBreakdown,
  };
}

export type DashboardStats = Awaited<ReturnType<typeof getDashboardStats>>;
