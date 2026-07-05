import { describe, expect, it } from "vitest";
import { isDangerousFileContent, matchesDeclaredFileType } from "@/lib/upload";

// ทดสอบ content-based (magic bytes) validation ที่เสริมจากการเช็คนามสกุลไฟล์เดิม
// กันไฟล์ execute ได้ที่ถูกเปลี่ยนนามสกุลปลอมเป็นประเภทที่อนุญาต (CWE-434)
// เป็น unit test ล้วนๆ ไม่แตะฐานข้อมูล เพราะทดสอบแค่ตัวฟังก์ชันตรวจ buffer เอง

describe("matchesDeclaredFileType", () => {
  it("ยอมรับ .pdf ที่มี magic bytes %PDF- ถูกต้อง", () => {
    const buffer = Buffer.concat([Buffer.from("%PDF-1.4\n"), Buffer.alloc(10)]);
    expect(matchesDeclaredFileType(buffer, ".pdf")).toBe(true);
  });

  it("ปฏิเสธไฟล์ที่อ้างว่าเป็น .pdf แต่เนื้อหาเป็นข้อความล้วน", () => {
    const buffer = Buffer.from("นี่ไม่ใช่ไฟล์ PDF แค่เปลี่ยนนามสกุลมา");
    expect(matchesDeclaredFileType(buffer, ".pdf")).toBe(false);
  });

  it("ยอมรับ .png ที่มี magic bytes ถูกต้อง", () => {
    const buffer = Buffer.concat([
      Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
      Buffer.alloc(10),
    ]);
    expect(matchesDeclaredFileType(buffer, ".png")).toBe(true);
  });

  it("ปฏิเสธไฟล์ที่อ้างว่าเป็น .jpg แต่ magic bytes ไม่ตรง", () => {
    const buffer = Buffer.from([0x00, 0x01, 0x02, 0x03]);
    expect(matchesDeclaredFileType(buffer, ".jpg")).toBe(false);
  });

  it("ยอมรับ .docx/.xlsx/.pptx ที่ขึ้นต้นด้วย zip signature (PK)", () => {
    const buffer = Buffer.concat([Buffer.from([0x50, 0x4b, 0x03, 0x04]), Buffer.alloc(10)]);
    expect(matchesDeclaredFileType(buffer, ".docx")).toBe(true);
    expect(matchesDeclaredFileType(buffer, ".xlsx")).toBe(true);
    expect(matchesDeclaredFileType(buffer, ".pptx")).toBe(true);
  });

  it("ไม่เช็ค magic bytes สำหรับ .txt/.csv (ไม่มี magic number ที่แน่นอน)", () => {
    const buffer = Buffer.from("ข้อความล้วนทั่วไป,ไม่มีรูปแบบตายตัว");
    expect(matchesDeclaredFileType(buffer, ".txt")).toBe(true);
    expect(matchesDeclaredFileType(buffer, ".csv")).toBe(true);
  });
});

describe("isDangerousFileContent", () => {
  it("ปฏิเสธไฟล์ที่ขึ้นต้นด้วย MZ (Windows PE/EXE) แม้จะอ้างนามสกุลเป็น .txt", () => {
    const buffer = Buffer.concat([Buffer.from([0x4d, 0x5a]), Buffer.alloc(10)]);
    expect(isDangerousFileContent(buffer)).toBe(true);
  });

  it("ปฏิเสธไฟล์ที่ขึ้นต้นด้วย ELF header (Linux executable)", () => {
    const buffer = Buffer.concat([Buffer.from([0x7f, 0x45, 0x4c, 0x46]), Buffer.alloc(10)]);
    expect(isDangerousFileContent(buffer)).toBe(true);
  });

  it("ปฏิเสธไฟล์ shebang script (#!)", () => {
    const buffer = Buffer.from("#!/bin/sh\necho hello\n");
    expect(isDangerousFileContent(buffer)).toBe(true);
  });

  it("ยอมรับไฟล์ข้อความ/เอกสารปกติที่ไม่มีลายเซ็นอันตราย", () => {
    const buffer = Buffer.from("เนื้อหาไฟล์ปกติ ไม่มีอะไรน่าสงสัย");
    expect(isDangerousFileContent(buffer)).toBe(false);
  });
});
