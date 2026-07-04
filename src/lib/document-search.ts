import { Prisma } from "@/generated/prisma/client";
import { DocumentStatus, Priority } from "@/generated/prisma/enums";

export type DocumentSearchParams = {
  keyword?: string;
  documentTypeCodes?: string[];
  statuses?: DocumentStatus[];
  dateFrom?: Date;
  dateTo?: Date;
  createdByIds?: string[];
  departmentCodes?: string[];
  priorities?: Priority[];
  referenceNumber?: string;
  hasAttachment?: boolean;
};

// รวมเงื่อนไขที่ผู้ใช้ระบุมาเท่านั้นเข้า where ของ Prisma (AND ทุกเงื่อนไข)
// ห้าม findMany() แล้ว filter ใน JS ทีหลัง ตาม docs/modules/module-11-metadata-search.md
export function buildDocumentSearchWhere(
  params: DocumentSearchParams
): Prisma.DocumentWhereInput {
  const and: Prisma.DocumentWhereInput[] = [];

  if (params.keyword) {
    and.push({
      OR: [
        { documentNumber: { contains: params.keyword, mode: "insensitive" } },
        { title: { contains: params.keyword, mode: "insensitive" } },
      ],
    });
  }

  if (params.documentTypeCodes?.length) {
    and.push({ documentTypeCode: { in: params.documentTypeCodes } });
  }

  if (params.statuses?.length) {
    and.push({ status: { in: params.statuses } });
  }

  if (params.dateFrom || params.dateTo) {
    const createdAt: Prisma.DateTimeFilter = {};
    if (params.dateFrom) createdAt.gte = params.dateFrom;
    if (params.dateTo) {
      // นับรวมทั้งวันของ dateTo (ผู้ใช้เลือกวันที่ล้วนจาก date range picker)
      const endOfDay = new Date(params.dateTo);
      endOfDay.setUTCHours(23, 59, 59, 999);
      createdAt.lte = endOfDay;
    }
    and.push({ createdAt });
  }

  if (params.createdByIds?.length) {
    and.push({ createdById: { in: params.createdByIds } });
  }

  if (params.departmentCodes?.length) {
    and.push({ departmentCode: { in: params.departmentCodes } });
  }

  if (params.priorities?.length) {
    and.push({ priority: { in: params.priorities } });
  }

  if (params.referenceNumber) {
    and.push({
      referenceNumber: { contains: params.referenceNumber, mode: "insensitive" },
    });
  }

  if (params.hasAttachment !== undefined) {
    and.push({ attachments: params.hasAttachment ? { some: {} } : { none: {} } });
  }

  return {
    deletedAt: null,
    ...(and.length > 0 ? { AND: and } : {}),
  };
}
