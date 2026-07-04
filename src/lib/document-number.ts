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

const MAX_RETRIES = 5;

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
  }) => Prisma.DocumentCreateInput
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
          const documentNumber = formatDocumentNumber({
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
      const isRetryable =
        error instanceof Prisma.PrismaClientKnownRequestError &&
        (error.code === "P2034" || error.code === "P2002");

      if (!isRetryable || attempt === MAX_RETRIES) {
        throw error;
      }
    }
  }

  throw new Error("ไม่สามารถออกเลขที่เอกสารได้หลังจากลองซ้ำหลายครั้ง");
}
