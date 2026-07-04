# Module 11: Metadata Search (สืบค้นด้วยข้อมูลจำเพาะแบบละเอียด)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 11 อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> ต่อยอดจาก Module 6 (เอกสารทั้งหมด — ค้นหาพื้นฐาน) และ Module 10 (User & Role — เพิ่ม field department/ผู้สร้าง)
> อ้างอิงบริบทรวมจาก `CLAUDE.md` และ skill `ui-design-system`

## เป้าหมายของ Module

ขอบเขตโครงงานใน CLAUDE.md ระบุไว้ชัดเจนว่าต้อง "สืบค้นด้วยข้อมูลจำเพาะ (Metadata) ได้" — Module 6 ที่ทำไปแล้วมีแค่ช่องค้นหาคำเดียว (เลขที่/ชื่อเรื่อง) และ filter ประเภท/สถานะแบบเดี่ยว ยังไม่ใช่การสืบค้นแบบ Metadata จริง

Module นี้เพิ่มความสามารถให้ผู้ใช้ **ค้นหาแบบผสมหลายเงื่อนไขพร้อมกัน (multi-criteria search)** และ **ดูรายละเอียด metadata ของเอกสารแต่ละฉบับแบบเต็ม**

## Metadata Fields ที่ต้องรองรับการค้นหา

| Field | แหล่งที่มา | รูปแบบการค้นหา |
|---|---|---|
| เลขที่เอกสาร | `Document.documentNumber` | ค้นหาแบบ partial match |
| ชื่อเรื่อง | `Document.title` | ค้นหาแบบ partial match (full-text ถ้าเป็นไปได้) |
| ประเภทเอกสาร | `Document.documentTypeCode` | เลือกจาก dropdown (multi-select ได้) |
| สถานะ | `Document.status` | เลือกจาก dropdown (multi-select ได้) |
| ช่วงวันที่สร้าง | `Document.createdAt` | date range picker (จาก-ถึง) |
| ผู้สร้างเอกสาร | `Document.createdBy` (เพิ่มจาก Module 10) | เลือกจาก dropdown รายชื่อผู้ใช้ |
| หน่วยงาน/แผนก | `Document.departmentCode` | เลือกจาก dropdown |
| ระดับความเร่งด่วน | `Document.priority` | เลือกจาก dropdown |
| เอกสารอ้างอิง | `Document.referenceDocumentNumber` | ค้นหาแบบ partial match |
| มีไฟล์แนบหรือไม่ | ผ่าน relation `Attachment` | toggle ใช่/ไม่ใช่ |

> ถ้า field ไหนยังไม่มีใน Prisma schema ปัจจุบัน ให้เพิ่มก่อนเริ่มเขียน query (เช่น `priority` ถ้า Module 1 ยังไม่ได้ใส่ไว้)

## การออกแบบ Query (Prisma)

ใช้ dynamic `where` clause แบบรวมเงื่อนไขที่ผู้ใช้เลือกเท่านั้น (ไม่ fix เงื่อนไขตายตัว) ตัวอย่างแนวคิด:

```typescript
// src/lib/document-search.ts — แนวคิด ไม่ใช่โค้ดสมบูรณ์
type SearchParams = {
  keyword?: string;
  documentTypeCodes?: string[];
  statuses?: string[];
  dateFrom?: Date;
  dateTo?: Date;
  createdByIds?: string[];
  departmentCodes?: string[];
  hasAttachment?: boolean;
};

function buildWhereClause(params: SearchParams) {
  // เพิ่มเงื่อนไขเข้า array แบบมีเงื่อนไขทีละ field
  // เฉพาะ field ที่ผู้ใช้ระบุค่ามาเท่านั้น ถึงจะถูกใส่ใน where
}
```

**กฎสำคัญ:** ห้าม query แบบดึงเอกสารทั้งหมดมา filter ใน JavaScript ทีหลัง (`findMany()` แล้ว `.filter()`) — ต้องส่งเงื่อนไขเข้า `where` ของ Prisma ให้ database กรองให้ เพื่อรองรับข้อมูลจำนวนมากในอนาคตโดยไม่ช้าลง

## Database Index ที่ต้องเพิ่ม

เพิ่ม index ใน `schema.prisma` สำหรับ field ที่จะถูกค้นหา/กรองบ่อย เพื่อความเร็วในการ query:

```prisma
model Document {
  // ... field เดิม

  @@index([documentTypeCode])
  @@index([status])
  @@index([createdAt])
  @@index([departmentCode])
  @@index([createdById])
}
```

## API Endpoint

| Endpoint | หน้าที่ |
|---|---|
| `GET /api/documents/search` | รับ query parameters ตาม `SearchParams` ด้านบน คืนผลลัพธ์แบบ pagination |
| `GET /api/documents/[id]/metadata` | คืนข้อมูล metadata แบบเต็มของเอกสารฉบับเดียว (สำหรับหน้ารายละเอียด) |

ต้อง**ทำ pagination เสมอ** (เช่น `page`, `pageSize` parameter) ห้ามคืนผลลัพธ์ทั้งหมดในครั้งเดียวถ้าจำนวนเอกสารมีโอกาสเยอะ

## หน้า UI ที่ต้องสร้าง/แก้ไข

1. **แผงค้นหาขั้นสูง (Advanced Search Panel)** — เพิ่มในหน้า "เอกสารทั้งหมด" (Module 6) เป็น panel แบบ expand/collapse (ไม่ต้องเปิดค้างตลอดเวลา เพื่อไม่ให้หน้าดูรก) มีปุ่ม "ค้นหาขั้นสูง" กดแล้วเผยฟิลด์ทั้งหมดในตาราง metadata ด้านบน
2. **Chip/Tag แสดงเงื่อนไขที่กำลังใช้ค้นหาอยู่** — เหนือผลลัพธ์ตาราง แสดงเป็น tag ที่กดปิดทีละอันได้ (เช่น "ประเภท: หนังสือภายนอก ✕", "วันที่: 1-30 มิ.ย. 2569 ✕")
3. **หน้ารายละเอียดเอกสาร (Document Metadata View)** — ถ้ายังไม่มี ให้สร้างหน้าแสดง metadata ครบทุก field ของเอกสารฉบับเดียว (แยกจากหน้า "พิมพ์เอกสาร" ที่เน้นแสดงเนื้อหาเอกสาร)
4. ปรับ conventions ตาม skill `ui-design-system`: filter dropdown/date picker ใช้สไตล์เดียวกับที่กำหนดไว้ในหัวข้อ "Table (เอกสารทั้งหมด)"

## ผลกระทบต่อ Module อื่นที่ทำไปแล้ว

- **Module 6:** ต้องปรับหน้า "เอกสารทั้งหมด" ให้เรียก endpoint ใหม่ `/api/documents/search` แทน endpoint ค้นหาพื้นฐานเดิม (หรือขยาย endpoint เดิมให้รองรับเงื่อนไขเพิ่ม — เลือกวิธีใดวิธีหนึ่ง อย่าให้มี endpoint ค้นหาสองชุดที่ทำงานซ้ำกัน)
- **Module 1 (Schema):** อาจต้องเพิ่ม index ตามที่ระบุด้านบน ถ้ายังไม่มี

## Testing Checklist

- [ ] ค้นหาด้วยเงื่อนไขเดียว (เช่น เฉพาะ keyword) ได้ผลลัพธ์ถูกต้อง
- [ ] ค้นหาด้วยหลายเงื่อนไขพร้อมกัน (เช่น ประเภท + ช่วงวันที่ + ผู้สร้าง) ได้ผลลัพธ์ที่ตรงเงื่อนไขทั้งหมด (AND ไม่ใช่ OR)
- [ ] ค้นหาแล้วไม่พบผลลัพธ์ แสดงข้อความแจ้งผู้ใช้อย่างเหมาะสม (ไม่ error ไม่หน้าว่างเปล่าแบบไม่มีคำอธิบาย)
- [ ] ทดสอบ pagination กับข้อมูลจำนวนมาก (seed test data อย่างน้อย 100+ รายการ) ความเร็วยังอยู่ในระดับที่ยอมรับได้
- [ ] ปิด tag เงื่อนไขค้นหาทีละอันแล้วผลลัพธ์อัปเดตถูกต้องตามเงื่อนไขที่เหลือ
