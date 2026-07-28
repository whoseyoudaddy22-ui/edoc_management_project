import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";

// รูปแบบ: {รหัสหน่วยงาน}.{รหัสประเภทเอกสาร 4 หลัก}/{ปี พ.ศ. 4 หลัก}-{เลขลำดับ 3 หลัก}
// ดู .claude/skills/document-numbering/SKILL.md สำหรับ spec เต็ม ห้ามแก้ format ที่นี่โดยไม่แก้ที่ skill ก่อน
const DOCUMENT_NUMBER_REGEX = /^[ก-๙]{2,4}\.\d{4}\/\d{4}-\d{3}$/;

export function isValidDocumentNumber(value: string): boolean {
  return DOCUMENT_NUMBER_REGEX.test(value);
}

export function getCurrentBuddhistYear(): number {
  return new Date().getFullYear() + 543;
}

export function formatDocumentNumber(params: {
  departmentCode: string;
  documentTypeCode: string;
  buddhistYear: number;
  runningNumber: number;
}): string {
  const { departmentCode, documentTypeCode, buddhistYear, runningNumber } = params;
  return `${departmentCode}.${documentTypeCode}/${buddhistYear}-${String(runningNumber).padStart(3, "0")}`;
}

const MAX_RETRIES = 15;

function isRetryableTransactionError(error: unknown): boolean {
  if (error instanceof Prisma.PrismaClientKnownRequestError) {
    return error.code === "P2034" || error.code === "P2002";
  }
  // adapter บางเวอร์ชันโยน DriverAdapterError แบบ raw ออกมาตรงๆ โดยไม่ห่อเป็น
  // PrismaClientKnownRequestError เสมอไป จึงต้องเช็ค message เป็น fallback ด้วย
  const message = error instanceof Error ? error.message : String(error);
  return /write conflict|deadlock|serializ/i.test(message);
}

// เกิดเมื่อผู้ใช้พิมพ์เลขที่หนังสือเอง (manualDocumentNumber) ซ้ำกับเอกสารที่มีอยู่แล้ว —
// ไม่มีประโยชน์ที่จะ retry (เลขที่พิมพ์มาคงที่ ชนซ้ำเหมือนเดิมทุกครั้ง) ต้องแจ้งผู้ใช้ทันที
export class DuplicateDocumentNumberError extends Error {
  constructor(public documentNumber: string) {
    super(`เลขที่หนังสือ "${documentNumber}" ถูกใช้ไปแล้ว`);
    this.name = "DuplicateDocumentNumberError";
  }
}

// รูปแบบ error.meta ต่างกันไปตาม driver — บาง engine ให้ meta.target ตรงๆ แต่ driver adapter
// (@prisma/adapter-pg ที่โปรเจกต์นี้ใช้) ห่อรายละเอียดจริงไว้ใน
// meta.driverAdapterError.cause.constraint.fields แทน (ดู error จริงที่ debug ไว้) จึงต้องเช็คทั้งคู่
// พร้อม fallback เป็นข้อความ error เผื่อรูปแบบเปลี่ยนอีกในอนาคต
function isDocumentNumberUniqueViolation(error: unknown): boolean {
  if (!(error instanceof Prisma.PrismaClientKnownRequestError) || error.code !== "P2002") {
    return false;
  }

  const target = error.meta?.target;
  if (Array.isArray(target) && target.some((t) => String(t).includes("documentNumber"))) {
    return true;
  }
  if (typeof target === "string" && target.includes("documentNumber")) {
    return true;
  }

  const driverFields = (
    error.meta?.driverAdapterError as
      | { cause?: { constraint?: { fields?: unknown } } }
      | undefined
  )?.cause?.constraint?.fields;
  if (Array.isArray(driverFields) && driverFields.some((f) => String(f).includes("documentNumber"))) {
    return true;
  }

  return error.message.includes("documentNumber");
}

function backoffDelayMs(attempt: number): number {
  const base = 20 * 2 ** (attempt - 1);
  const jitter = Math.random() * base;
  return Math.min(base + jitter, 1000);
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * สร้างเอกสารพร้อมออกเลขที่เอกสารอัตโนมัติแบบ atomic
 * รันลำดับแยกต่างหากตาม (buddhistYear, documentTypeCode, departmentCode)
 * ใช้ Serializable transaction + retry เพื่อกันเลขซ้ำเมื่อมีการสร้างพร้อมกันหลาย request
 * (Postgres จะ abort หนึ่งใน transaction ที่ชนกันด้วย serialization error แทนที่จะปล่อยให้เลขซ้ำ)
 */
export async function createDocumentWithAutoNumber<T>(
  departmentCode: string,
  documentTypeCode: string,
  buildData: (documentNumber: {
    documentNumber: string;
    buddhistYear: number;
    runningNumber: number;
  }) => Prisma.DocumentCreateInput,
  // ผู้ใช้พิมพ์เลขที่หนังสือเองแทนเลขมาตรฐานได้ (เช่น นำเข้าเลขจริงจากหน่วยงานต้นทาง) — แต่
  // buddhistYear/runningNumber ยังคำนวณต่อเนื่องตามปกติเสมอ เพื่อให้เลขแนะนำครั้งถัดไปยังถูกต้อง
  // ดู .claude/skills/document-numbering/SKILL.md > การพิมพ์เลขที่ด้วยมือ
  manualDocumentNumber?: string
): Promise<T> {
  const buddhistYear = getCurrentBuddhistYear();

  for (let attempt = 1; attempt <= MAX_RETRIES; attempt++) {
    try {
      return await prisma.$transaction(
        async (tx) => {
          const last = await tx.document.findFirst({
            where: { departmentCode, documentTypeCode, buddhistYear },
            orderBy: { runningNumber: "desc" },
            select: { runningNumber: true },
          });

          const runningNumber = (last?.runningNumber ?? 0) + 1;
          const documentNumber =
            manualDocumentNumber ??
            formatDocumentNumber({
              departmentCode,
              documentTypeCode,
              buddhistYear,
              runningNumber,
            });

          const data = buildData({ documentNumber, buddhistYear, runningNumber });

          const created = await tx.document.create({ data });
          return created as unknown as T;
        },
        { isolationLevel: Prisma.TransactionIsolationLevel.Serializable }
      );
    } catch (error) {
      if (manualDocumentNumber && isDocumentNumberUniqueViolation(error)) {
        throw new DuplicateDocumentNumberError(manualDocumentNumber);
      }
      if (!isRetryableTransactionError(error) || attempt === MAX_RETRIES) {
        throw error;
      }
      await sleep(backoffDelayMs(attempt));
    }
  }

  throw new Error("ไม่สามารถออกเลขที่เอกสารได้หลังจากลองซ้ำหลายครั้ง");
}
