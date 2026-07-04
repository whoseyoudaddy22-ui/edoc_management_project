---
name: document-numbering
description: Generate, validate, and format automatic document reference numbers (เลขที่หนังสือ) for the Electronic Document Creation and Archiving Management System. Use this skill whenever creating a new document, writing/editing the document-creation API or form, building the auto-numbering logic, seeding test data, or whenever a document reference number needs to be generated, parsed, validated, or displayed anywhere in the app — even if the user just says "เลขที่เอกสาร", "running number", "เลขที่หนังสือ", or "document number" without asking for numbering explicitly.
---

# Document Numbering (การออกเลขที่เอกสารอัตโนมัติ)

## Purpose

ระบบต้องออกเลขที่เอกสาร (เลขที่หนังสือ) ให้อัตโนมัติทุกครั้งที่มีการสร้างเอกสารใหม่ เลขนี้เป็นตัวระบุที่ต้องไม่ซ้ำกัน (unique) และต้องคงรูปแบบเดียวกันทุกจุดของระบบ (ฟอร์มสร้างเอกสาร, ตารางเอกสารทั้งหมด, หน้าพิมพ์เอกสาร/PDF)

**ห้าม** ให้ Claude คิดรูปแบบเลขที่เอกสารขึ้นใหม่เองในแต่ละครั้งที่แก้ไฟล์ — ให้ยึดตาม spec ในไฟล์นี้เท่านั้น ถ้าต้องเปลี่ยน format ให้แก้ที่ไฟล์นี้ก่อน แล้วค่อยไปแก้โค้ด

> **หมายเหตุสำคัญ:** รูปแบบด้านล่างเป็น spec เริ่มต้นที่ออกแบบจากตัวอย่าง placeholder ในสไลด์นำเสนอโปรเจกต์ (`สน.0015/2568-001`) ก่อนใช้งานจริงควรให้เจ้าของโครงงาน/อาจารย์ที่ปรึกษายืนยันรูปแบบที่ถูกต้องตามระเบียบงานสารบรรณของหน่วยงานอีกครั้ง แล้วอัปเดตไฟล์นี้

## รูปแบบเลขที่เอกสาร (Format Specification)

```
{รหัสหน่วยงาน}.{รหัสประเภทเอกสาร}/{ปี พ.ศ. 4 หลัก}-{เลขลำดับ 3 หลัก}
```

ตัวอย่าง: `สน.0015/2568-001`

| ส่วนประกอบ | คำอธิบาย | กฎ |
|---|---|---|
| `รหัสหน่วยงาน` | อักษรย่อหน่วยงานผู้ออกเอกสาร | ตัวอักษรไทย 2-4 ตัว กำหนดค่าคงที่ระดับ organization setting ไม่ใช่ให้ผู้ใช้พิมพ์เอง |
| `รหัสประเภทเอกสาร` | เลข 4 หลัก อ้างอิงจาก field `DocumentType` | ดึงจากตาราง mapping ประเภทเอกสาร → รหัส (ดูหัวข้อ "Document Type Codes" ด้านล่าง) |
| `ปี พ.ศ.` | ปีพุทธศักราชปัจจุบัน 4 หลัก | คำนวณจาก `ค.ศ. ปัจจุบัน + 543` ไม่ใช่ค่าที่ผู้ใช้กรอกเอง |
| `เลขลำดับ` | เลขลำดับรันของเอกสารในปีนั้น เริ่มที่ `001` | zero-padded 3 หลัก, รีเซ็ตกลับเป็น `001` ทุกต้นปีปฏิทิน พ.ศ. ใหม่ |

## Document Type Codes (ตัวอย่างเริ่มต้น — ปรับตาม DocumentType จริงในระบบ)

| ประเภทเอกสาร | รหัส |
|---|---|
| หนังสือภายนอก | `0001` |
| หนังสือภายใน | `0002` |
| คำสั่ง | `0003` |
| ประกาศ | `0004` |
| บันทึกข้อความ | `0005` |

> เมื่อมีการเพิ่ม/แก้ไข `DocumentType` ใน Prisma schema ต้องอัปเดตตารางนี้ให้ตรงกันเสมอ — ห้ามให้ Claude สร้างรหัสประเภทเอกสารขึ้นใหม่แบบสุ่ม

## Generation Algorithm

ต้อง implement เป็นฟังก์ชันเดียว ใช้ร่วมกันทั้งระบบ (เช่น `src/lib/document-number.ts`) ห้ามให้แต่ละหน้า/API เขียน logic ออกเลขซ้ำกันเอง

ขั้นตอน:

1. รับ input: `departmentCode` (รหัสหน่วยงาน), `documentTypeCode` (รหัสประเภทเอกสาร 4 หลัก)
2. คำนวณปี พ.ศ. ปัจจุบัน: `buddhistYear = new Date().getFullYear() + 543`
3. **ใช้ database transaction** ค้นหาเลขลำดับล่าสุดของปีนั้น (`WHERE year = buddhistYear`) แล้ว `SELECT ... FOR UPDATE` หรือใช้ Prisma `$transaction` แบบ serializable เพื่อ lock แถวระหว่างอ่าน-เขียน ป้องกันเลขซ้ำเมื่อมีการสร้างเอกสารพร้อมกันหลาย request
4. เพิ่มเลขลำดับ +1 จากค่าล่าสุด (หรือเริ่มที่ 1 ถ้ายังไม่มีเอกสารในปีนั้น)
5. Format เป็น string ตาม spec: `${departmentCode}.${documentTypeCode}/${buddhistYear}-${String(runningNumber).padStart(3, '0')}`
6. บันทึกเลขที่เอกสารพร้อม `year` และ `runningNumber` แยกเป็น field ในตาราง (อย่าเก็บแค่ string รวม) เพื่อให้ query/เรียงลำดับและตรวจสอบซ้ำได้ง่าย
7. กำหนด **unique constraint** ระดับ database บนคู่ (`year`, `documentTypeCode`, `runningNumber`) หรือบน field เลขที่เอกสารแบบเต็ม เพื่อเป็นเซฟตี้ชั้นสุดท้ายกันเลขซ้ำ แม้ transaction จะพลาด

### ตัวอย่างโครงสร้าง Prisma field ที่เกี่ยวข้อง

```prisma
model Document {
  id               String   @id @default(cuid())
  documentNumber   String   @unique   // เลขที่เอกสารแบบเต็ม เช่น "สน.0015/2568-001"
  departmentCode   String
  documentTypeCode String
  buddhistYear     Int
  runningNumber    Int

  @@unique([buddhistYear, documentTypeCode, runningNumber])
}
```

## Validation Rules

เมื่อรับเลขที่เอกสารจาก input ใดๆ (เช่น กรณีนำเข้าเอกสารเก่า/แก้ไขด้วยมือ) ต้อง validate ด้วย regex:

```
^[ก-๙]{2,4}\.\d{4}\/\d{4}-\d{3}$
```

ถ้าไม่ตรง pattern นี้ ให้ reject และแจ้ง error message ว่า "รูปแบบเลขที่เอกสารไม่ถูกต้อง ต้องเป็นรูปแบบ รหัสหน่วยงาน.รหัสประเภท/ปีพ.ศ.-เลขลำดับ"

## Edge Cases ที่ต้องจัดการ

- **ข้ามปีปฏิทิน พ.ศ.:** เอกสารแรกของปีใหม่ต้องเริ่มเลขลำดับที่ `001` ใหม่ แม้ปีก่อนหน้าจะไปถึงเลขสูงแค่ไหนก็ตาม
- **สร้างเอกสารพร้อมกันหลาย request (concurrency):** ต้องผ่าน transaction/lock ตามข้อ 3 ใน Generation Algorithm ห้ามคำนวณเลขลำดับด้วยการ `SELECT COUNT(*)` เฉยๆ เพราะจะเกิดเลขซ้ำได้เมื่อมีการเขียนพร้อมกัน
- **ลบเอกสาร:** ห้ามนำเลขที่เอกสารที่เคยออกไปแล้วกลับมาใช้ซ้ำ แม้เอกสารนั้นจะถูกลบไปแล้ว (soft delete เท่านั้น ห้าม hard delete แถวที่มีเลขที่เอกสารออกไปแล้ว)
- **หลายหน่วยงานในระบบเดียว:** เลขลำดับต้องรันแยกอิสระต่อ `departmentCode` แต่ละหน่วยงาน ไม่ปนกัน

## ตัวอย่าง Input/Output ที่ถูกต้อง

| Input | Output |
|---|---|
| `departmentCode="สน"`, `documentTypeCode="0001"`, ปี ค.ศ. 2025 (เอกสารแรกของปี) | `สน.0001/2568-001` |
| เอกสารถัดไปในปีเดียวกัน ประเภทเดียวกัน | `สน.0001/2568-002` |
| เอกสารแรกของประเภทอื่นในปีเดียวกัน (`documentTypeCode="0003"`) | `สน.0003/2568-001` (เลขลำดับเริ่มใหม่เพราะแยกตามประเภท) |
| ปีถัดไป (ค.ศ. 2026 → พ.ศ. 2569) เอกสารแรก | `สน.0001/2569-001` (รีเซ็ตกลับเป็น 001) |

## Testing Checklist

ก่อน merge โค้ดที่เกี่ยวกับการออกเลขที่เอกสาร ให้ตรวจสอบว่า:

- [ ] สร้างเอกสาร 2 รายการพร้อมกัน (concurrent) แล้วได้เลขที่ไม่ซ้ำกัน
- [ ] สร้างเอกสารข้ามปี พ.ศ. แล้วเลขลำดับรีเซ็ตถูกต้อง
- [ ] สร้างเอกสารคนละประเภทในปีเดียวกัน แล้วเลขลำดับแยกกันถูกต้อง
- [ ] ลบเอกสารแล้วสร้างใหม่ เลขที่เดิมต้องไม่ถูกนำกลับมาใช้ซ้ำ
- [ ] ทดสอบ validation regex กับ input ที่ผิดรูปแบบ ต้อง reject ทุกกรณี
