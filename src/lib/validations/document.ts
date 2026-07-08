import { z } from "zod";
import { ClosingText, DocumentStatus, Priority } from "@/generated/prisma/enums";

// เพดานความยาวของแต่ละ field กันการยัด string ขนาดใหญ่ผิดปกติเข้า DB (CWE-1284)
// ตัวเลขอิงความยาวจริงของหนังสือราชการ ปรับได้ถ้าหน้างานพบว่าไม่พอ
export const FIELD_MAX = {
  title: 500,
  recipient: 255,
  sender: 255,
  departmentName: 255,
  referenceNumber: 100,
  content: 50_000,
  signerName: 255,
  signerPosition: 255,
} as const;

export const createDocumentSchema = z.object({
  documentTypeId: z.string().min(1, "กรุณาระบุประเภทเอกสาร"),
  documentDate: z.coerce.date(),
  title: z
    .string()
    .min(1, "กรุณาระบุชื่อเรื่อง")
    .max(FIELD_MAX.title, `ชื่อเรื่องต้องไม่เกิน ${FIELD_MAX.title} ตัวอักษร`),
  priority: z.enum(Priority).default(Priority.NORMAL),
  recipient: z
    .string()
    .min(1, "กรุณาระบุเรียน")
    .max(FIELD_MAX.recipient, `เรียนต้องไม่เกิน ${FIELD_MAX.recipient} ตัวอักษร`),
  sender: z
    .string()
    .min(1, "กรุณาระบุจาก")
    .max(FIELD_MAX.sender, `จากต้องไม่เกิน ${FIELD_MAX.sender} ตัวอักษร`),
  departmentName: z
    .string()
    .max(FIELD_MAX.departmentName, `ส่วนราชการต้องไม่เกิน ${FIELD_MAX.departmentName} ตัวอักษร`)
    .optional(),
  referenceNumber: z
    .string()
    .max(FIELD_MAX.referenceNumber, `อ้างอิงต้องไม่เกิน ${FIELD_MAX.referenceNumber} ตัวอักษร`)
    .optional(),
  content: z
    .string()
    .min(1, "กรุณาระบุเนื้อหา")
    .max(FIELD_MAX.content, `เนื้อหาต้องไม่เกิน ${FIELD_MAX.content.toLocaleString()} ตัวอักษร`),
  // ไม่ตั้ง default ที่นี่ — ถ้า client ไม่ส่งมา ฝั่ง API จะเลือก default ตามประเภทเอกสาร
  // (getDefaultClosingText ใน src/lib/labels.ts) เพื่อให้ default ถูกต้องแม้ client เรียก API ตรง
  closingText: z.enum(ClosingText).optional(),
  signerName: z
    .string()
    .max(FIELD_MAX.signerName, `ชื่อผู้ลงนามต้องไม่เกิน ${FIELD_MAX.signerName} ตัวอักษร`)
    .optional(),
  signerPosition: z
    .string()
    .max(FIELD_MAX.signerPosition, `ตำแหน่งผู้ลงนามต้องไม่เกิน ${FIELD_MAX.signerPosition} ตัวอักษร`)
    .optional(),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

// หมายเหตุ: ไม่รองรับการแก้ documentTypeId หลังสร้างเอกสารแล้ว เพราะเลขที่เอกสาร
// (documentNumber/documentTypeCode) ถูกออกผูกกับประเภทเอกสารตอนสร้างและห้ามเปลี่ยนภายหลัง
export const updateDocumentSchema = z
  .object({
    documentDate: z.coerce.date().optional(),
    title: z.string().min(1).max(FIELD_MAX.title).optional(),
    priority: z.enum(Priority).optional(),
    recipient: z.string().min(1).max(FIELD_MAX.recipient).optional(),
    sender: z.string().min(1).max(FIELD_MAX.sender).optional(),
    departmentName: z.string().max(FIELD_MAX.departmentName).nullable().optional(),
    referenceNumber: z.string().max(FIELD_MAX.referenceNumber).nullable().optional(),
    content: z.string().min(1).max(FIELD_MAX.content).optional(),
    closingText: z.enum(ClosingText).nullable().optional(),
    status: z.enum(DocumentStatus).optional(),
    signerName: z.string().max(FIELD_MAX.signerName).nullable().optional(),
    signerPosition: z.string().max(FIELD_MAX.signerPosition).nullable().optional(),
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
