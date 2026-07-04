import { describe, expect, it } from "vitest";
import { createDocumentSchema } from "@/lib/validations/document";
import { Priority } from "@/generated/prisma/enums";

// ทดสอบ "Validation ฟอร์มสร้างเอกสาร (zod schema) reject ข้อมูลผิดรูปแบบ" ตาม module-14-testing.md
// > ระดับสำคัญ (Module 5) — เป็น unit test ล้วนๆ ไม่แตะฐานข้อมูล เพราะทดสอบแค่ตัว schema เอง

const validPayload = {
  documentTypeId: "doctype-1",
  documentDate: "2026-07-05",
  title: "ขออนุมัติจัดซื้อวัสดุสำนักงาน",
  priority: Priority.NORMAL,
  recipient: "ผู้อำนวยการ",
  sender: "งานสารบรรณ",
  content: "เนื้อหาเอกสารทดสอบ",
  createdById: "user-1",
};

describe("createDocumentSchema", () => {
  it("ยอมรับข้อมูลที่ถูกต้องครบทุก field", () => {
    const result = createDocumentSchema.safeParse(validPayload);
    expect(result.success).toBe(true);
  });

  it("เติมค่า default priority เป็น NORMAL เมื่อไม่ได้ระบุ", () => {
    const { priority, ...withoutPriority } = validPayload;
    const result = createDocumentSchema.safeParse(withoutPriority);
    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.priority).toBe(Priority.NORMAL);
    }
  });

  it("ยอมรับเมื่อไม่ระบุ field เสริม (referenceNumber, signerName, signerPosition)", () => {
    const { referenceNumber, signerName, signerPosition, ...rest } = validPayload as typeof validPayload & {
      referenceNumber?: string;
      signerName?: string;
      signerPosition?: string;
    };
    const result = createDocumentSchema.safeParse(rest);
    expect(result.success).toBe(true);
  });

  const requiredStringFields = ["documentTypeId", "title", "recipient", "sender", "content", "createdById"] as const;

  for (const field of requiredStringFields) {
    it(`ปฏิเสธเมื่อไม่ระบุ ${field}`, () => {
      const { [field]: _omit, ...rest } = validPayload;
      const result = createDocumentSchema.safeParse(rest);
      expect(result.success).toBe(false);
    });

    it(`ปฏิเสธเมื่อ ${field} เป็นสตริงว่าง`, () => {
      const result = createDocumentSchema.safeParse({ ...validPayload, [field]: "" });
      expect(result.success).toBe(false);
    });
  }

  it("ปฏิเสธเมื่อ documentDate ไม่ใช่วันที่ที่ถูกต้อง", () => {
    const result = createDocumentSchema.safeParse({ ...validPayload, documentDate: "ไม่ใช่วันที่" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ priority ไม่ใช่ค่าที่กำหนดไว้ใน enum", () => {
    const result = createDocumentSchema.safeParse({ ...validPayload, priority: "SUPER_URGENT" });
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ body ไม่มี field ที่จำเป็นเลยแม้แต่ตัวเดียว", () => {
    const result = createDocumentSchema.safeParse({});
    expect(result.success).toBe(false);
  });

  it("ปฏิเสธเมื่อ body เป็น null หรือไม่ใช่ object", () => {
    expect(createDocumentSchema.safeParse(null).success).toBe(false);
    expect(createDocumentSchema.safeParse("a string").success).toBe(false);
    expect(createDocumentSchema.safeParse(42).success).toBe(false);
  });
});
