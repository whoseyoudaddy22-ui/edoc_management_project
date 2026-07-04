import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber, getCurrentBuddhistYear } from "@/lib/document-number";
import { Role, DocumentStatus, Priority } from "@/generated/prisma/enums";

// ทดสอบ 2 จุดวิกฤตของการออกเลขที่เอกสาร ตาม module-14-testing.md > ระดับวิกฤต:
// 1. เลขที่เอกสารไม่ซ้ำเมื่อสร้างพร้อมกัน (concurrency)
// 2. รีเซ็ตเลขลำดับข้ามปี พ.ศ.

const TEST_DEPARTMENT_CODE = "ทสน"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับ seed-test.ts หรือไฟล์เทสอื่น
const CONCURRENCY_TYPE_CODE = "9101";
const YEAR_RESET_TYPE_CODE = "9102";

type CreatedDocument = {
  id: string;
  documentNumber: string;
  buddhistYear: number;
  runningNumber: number;
};

let userId: string;
let concurrencyTypeId: string;
let yearResetTypeId: string;

function makeBuildData(documentTypeDbId: string, documentTypeCode: string) {
  return ({
    documentNumber,
    buddhistYear,
    runningNumber,
  }: {
    documentNumber: string;
    buddhistYear: number;
    runningNumber: number;
  }) => ({
    documentNumber,
    buddhistYear,
    runningNumber,
    departmentCode: TEST_DEPARTMENT_CODE,
    documentTypeCode,
    documentDate: new Date(),
    title: `เอกสารทดสอบเลขที่ ${documentNumber}`,
    priority: Priority.NORMAL,
    recipient: "ผู้อำนวยการ (ทดสอบ)",
    sender: "ผู้ทดสอบระบบ",
    content: "เนื้อหาเอกสารทดสอบสำหรับ document-numbering.test.ts",
    status: DocumentStatus.DRAFT,
    documentType: { connect: { id: documentTypeDbId } },
    createdBy: { connect: { id: userId } },
  });
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "document-numbering-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบระบบออกเลขที่เอกสาร",
      role: Role.SARABAN,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  userId = user.id;

  const concurrencyType = await prisma.documentType.create({
    data: { code: CONCURRENCY_TYPE_CODE, name: "ประเภททดสอบ concurrency", isActive: true },
  });
  concurrencyTypeId = concurrencyType.id;

  const yearResetType = await prisma.documentType.create({
    data: { code: YEAR_RESET_TYPE_CODE, name: "ประเภททดสอบรีเซ็ตปี", isActive: true },
  });
  yearResetTypeId = yearResetType.id;
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({
    where: { code: { in: [CONCURRENCY_TYPE_CODE, YEAR_RESET_TYPE_CODE] } },
  });
  await prisma.user.delete({ where: { id: userId } });
});

describe("Document Numbering", () => {
  it("ออกเลขที่เอกสารไม่ซ้ำเมื่อสร้างพร้อมกัน 20 รายการ", async () => {
    const results = await Promise.all(
      Array.from({ length: 20 }, () =>
        createDocumentWithAutoNumber<CreatedDocument>(
          TEST_DEPARTMENT_CODE,
          CONCURRENCY_TYPE_CODE,
          makeBuildData(concurrencyTypeId, CONCURRENCY_TYPE_CODE)
        )
      )
    );

    const documentNumbers = results.map((doc) => doc.documentNumber);
    const runningNumbers = results.map((doc) => doc.runningNumber).sort((a, b) => a - b);

    expect(new Set(documentNumbers).size).toBe(20);
    expect(runningNumbers).toEqual(Array.from({ length: 20 }, (_, i) => i + 1));
  });

  it("รีเซ็ตเลขลำดับเป็น 1 เมื่อข้ามปี พ.ศ.", async () => {
    vi.useFakeTimers({ toFake: ["Date"] });

    try {
      vi.setSystemTime(new Date(2026, 11, 31)); // 31 ธ.ค. 2026 => พ.ศ. 2569
      const yearBefore = getCurrentBuddhistYear();

      const doc1 = await createDocumentWithAutoNumber<CreatedDocument>(
        TEST_DEPARTMENT_CODE,
        YEAR_RESET_TYPE_CODE,
        makeBuildData(yearResetTypeId, YEAR_RESET_TYPE_CODE)
      );
      const doc2 = await createDocumentWithAutoNumber<CreatedDocument>(
        TEST_DEPARTMENT_CODE,
        YEAR_RESET_TYPE_CODE,
        makeBuildData(yearResetTypeId, YEAR_RESET_TYPE_CODE)
      );

      expect(doc1.buddhistYear).toBe(yearBefore);
      expect(doc1.runningNumber).toBe(1);
      expect(doc2.runningNumber).toBe(2);

      vi.setSystemTime(new Date(2027, 0, 1)); // ข้ามปี => พ.ศ. 2570
      const yearAfter = getCurrentBuddhistYear();
      expect(yearAfter).toBe(yearBefore + 1);

      const doc3 = await createDocumentWithAutoNumber<CreatedDocument>(
        TEST_DEPARTMENT_CODE,
        YEAR_RESET_TYPE_CODE,
        makeBuildData(yearResetTypeId, YEAR_RESET_TYPE_CODE)
      );

      expect(doc3.buddhistYear).toBe(yearAfter);
      expect(doc3.runningNumber).toBe(1);
    } finally {
      vi.useRealTimers();
    }
  });
});
