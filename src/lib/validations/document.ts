import { z } from "zod";
import { ClosingText, DocumentStatus, Priority } from "@/generated/prisma/enums";

export const createDocumentSchema = z.object({
  documentTypeId: z.string().min(1, "กรุณาระบุประเภทเอกสาร"),
  documentDate: z.coerce.date(),
  title: z.string().min(1, "กรุณาระบุชื่อเรื่อง"),
  priority: z.enum(Priority).default(Priority.NORMAL),
  recipient: z.string().min(1, "กรุณาระบุเรียน"),
  sender: z.string().min(1, "กรุณาระบุจาก"),
  departmentName: z.string().optional(),
  referenceNumber: z.string().optional(),
  content: z.string().min(1, "กรุณาระบุเนื้อหา"),
  closingText: z.enum(ClosingText).default(ClosingText.RESPECTFULLY),
  signerName: z.string().optional(),
  signerPosition: z.string().optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// หมายเหตุ: ไม่รองรับการแก้ documentTypeId หลังสร้างเอกสารแล้ว เพราะเลขที่เอกสาร
// (documentNumber/documentTypeCode) ถูกออกผูกกับประเภทเอกสารตอนสร้างและห้ามเปลี่ยนภายหลัง
export const updateDocumentSchema = z
  .object({
    documentDate: z.coerce.date().optional(),
    title: z.string().min(1).optional(),
    priority: z.enum(Priority).optional(),
    recipient: z.string().min(1).optional(),
    sender: z.string().min(1).optional(),
    departmentName: z.string().nullable().optional(),
    referenceNumber: z.string().nullable().optional(),
    content: z.string().min(1).optional(),
    closingText: z.enum(ClosingText).nullable().optional(),
    status: z.enum(DocumentStatus).optional(),
    signerName: z.string().nullable().optional(),
    signerPosition: z.string().nullable().optional(),
    approvedById: z.string().nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "ไม่มีข้อมูลที่ต้องการแก้ไข",
  });

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

// query parameter แบบ multi-select ส่งมาเป็น comma-separated string เดียว (เช่น ?statuses=DRAFT,PENDING)
function splitCommaSeparated(value: unknown): string[] | undefined {
  if (typeof value !== "string" || value.trim().length === 0) return undefined;
  return value
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (value === "true") return true;
  if (value === "false") return false;
  return undefined;
}

export const documentSearchQuerySchema = z.object({
  keyword: z.string().trim().min(1).optional(),
  documentTypeCodes: z.preprocess(splitCommaSeparated, z.array(z.string().min(1)).optional()),
  statuses: z.preprocess(splitCommaSeparated, z.array(z.enum(DocumentStatus)).optional()),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  createdByIds: z.preprocess(splitCommaSeparated, z.array(z.string().min(1)).optional()),
  departmentCodes: z.preprocess(splitCommaSeparated, z.array(z.string().min(1)).optional()),
  priorities: z.preprocess(splitCommaSeparated, z.array(z.enum(Priority)).optional()),
  referenceNumber: z.string().trim().min(1).optional(),
  hasAttachment: z.preprocess(parseBooleanFlag, z.boolean().optional()),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type DocumentSearchQuery = z.infer<typeof documentSearchQuerySchema>;
