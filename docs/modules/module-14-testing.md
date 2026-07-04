# Module 14: Testing (การทดสอบระบบ)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 14 อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> รวบรวม Testing Checklist ที่กระจายอยู่ใน Module 1-13 ทั้งหมดมาไว้เป็นชุดทดสอบที่รันซ้ำได้ (automated) แทนการทดสอบมือทีละครั้ง
> อ้างอิงบริบทรวมจาก `CLAUDE.md`

## เป้าหมายของ Module

ตลอด Module 1-13 มี "Testing Checklist" กำกับไว้ท้ายแต่ละไฟล์อยู่แล้ว แต่เป็นการทดสอบแบบทำมือ (manual) ซึ่งเสี่ยงถูกลืมทำซ้ำเมื่อมีการแก้โค้ดภายหลัง

Module นี้แปลง checklist ที่สำคัญที่สุดให้เป็น **automated test** ที่รันได้ซ้ำๆ ด้วยคำสั่งเดียว เพื่อจับข้อผิดพลาดก่อนที่จะไปถึงผู้ใช้จริง โดยเน้นเฉพาะจุดที่ "ผิดแล้วเสียหายมาก" ไม่ใช่ทดสอบทุกอย่างในระบบ (ซึ่งเกินความจำเป็นของโครงงานระดับนี้)

## เครื่องมือที่ใช้

| เครื่องมือ | ใช้ทำอะไร |
|---|---|
| **Vitest** | Unit test / Integration test สำหรับ logic ฝั่ง backend (เข้ากับ TypeScript + Next.js ได้ดี ตั้งค่าเร็วกว่า Jest) |
| **Prisma Test Environment** | ใช้ฐานข้อมูล PostgreSQL แยกต่างหากสำหรับรันเทส (`docs_management_test`) ไม่ปนกับฐานข้อมูล dev จริง |
| **Playwright** *(ถ้ามีเวลา)* | End-to-end test จำลองการใช้งานจริงผ่านหน้าเว็บ (เช่น กรอกฟอร์มสร้างเอกสารจนจบ) |

```bash
npm install -D vitest @vitest/ui
npm install -D playwright @playwright/test  # ถ้าทำ e2e ด้วย
```

## ลำดับความสำคัญของสิ่งที่ต้องทดสอบ (เรียงจากสำคัญที่สุด)

### ระดับวิกฤต (ต้องมี automated test แน่นอน)

| เรื่อง | มาจาก Module | เหตุผลที่สำคัญที่สุด |
|---|---|---|
| การออกเลขที่เอกสารไม่ซ้ำเมื่อสร้างพร้อมกัน (concurrency) | Module 3 (document-numbering skill) | ถ้าเลขซ้ำ = เอกสารราชการผิดกฎหมาย/ผิดระเบียบทันที เป็นจุดที่พลาดไม่ได้ที่สุดในระบบทั้งหมด |
| การรีเซ็ตเลขลำดับข้ามปี พ.ศ. | Module 3 | ตามที่ระบุใน skill document-numbering |
| Authorization: role ที่ไม่มีสิทธิ์เข้าไม่ได้จริง | Module 10 | ป้องกันข้อมูลรั่วไหล/ถูกแก้ไขโดยไม่ได้รับอนุญาต |
| Backup/Restore ทำงานได้จริง | Module 13 | ตามที่ระบุใน module-13 — backup ที่ไม่เคยทดสอบถือว่าใช้ไม่ได้ |

### ระดับสำคัญ (ควรมี)

| เรื่อง | มาจาก Module |
|---|---|
| Metadata search คืนผลลัพธ์ตรงเงื่อนไขทุกกรณี (AND logic ไม่ใช่ OR) | Module 11 |
| Audit log บันทึกครบทุก event ที่กำหนดไว้ | Module 12 |
| Validation ฟอร์มสร้างเอกสาร (zod schema) reject ข้อมูลผิดรูปแบบ | Module 5 |
| Upload ไฟล์: reject นามสกุลไฟล์ที่ไม่รองรับ | Module 7 |

### ระดับเสริม (ทำถ้ามีเวลาเหลือ)

- Preview/PDF parity (หน้าตาตรงกัน) — ทดสอบด้วยการเทียบด้วยตาเปล่าก็เพียงพอสำหรับโครงงานระดับนี้ ไม่จำเป็นต้องเขียน visual regression test อัตโนมัติ
- E2E test เต็ม flow (login → สร้างเอกสาร → อนุมัติ → พิมพ์)

## ตัวอย่างโครงสร้าง Test (แนวคิด)

```typescript
// tests/document-numbering.test.ts — แนวคิด ไม่ใช่โค้ดสมบูรณ์
import { describe, it, expect } from 'vitest';

describe('Document Numbering', () => {
  it('ออกเลขที่เอกสารไม่ซ้ำเมื่อสร้างพร้อมกัน 10 รายการ', async () => {
    // ยิง generateDocumentNumber() พร้อมกัน 10 ครั้งด้วย Promise.all
    // เช็คว่าเลขที่เอกสารทั้ง 10 ตัวไม่มีค่าซ้ำกันเลย
  });

  it('รีเซ็ตเลขลำดับเป็น 001 เมื่อข้ามปี พ.ศ.', async () => {
    // mock วันที่ให้อยู่คนละปี พ.ศ. แล้วตรวจเลขลำดับที่ได้
  });
});
```

```typescript
// tests/authorization.test.ts — แนวคิด
describe('Authorization', () => {
  it('Officer เข้าหน้า /api/users ไม่ได้ (403)', async () => {
    // เรียก API ด้วย session ของ user role OFFICER แล้วคาดหวัง status 403
  });
});
```

## Test Data (Seed สำหรับทดสอบ)

สร้างไฟล์ `prisma/seed-test.ts` แยกจาก seed ข้อมูลตัวอย่างสำหรับ demo (ถ้ามี) เพื่อให้ทุกครั้งที่รันเทสเริ่มจากข้อมูลชุดเดียวกันเสมอ (predictable state):
- ผู้ใช้ทดสอบอย่างน้อย 1 คนต่อ role (Admin, Approver, Officer, Viewer)
- เอกสารตัวอย่างที่ครอบคลุมทุกสถานะ/ประเภท

```bash
npx prisma db seed -- --environment=test
```

## การรันเทส

เพิ่มใน `package.json`:
```json
{
  "scripts": {
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  }
}
```

```bash
npm run test        # รันครั้งเดียว เหมาะกับตรวจก่อน commit
npm run test:watch  # รันค้างไว้ระหว่างเขียนโค้ด
```

## ผลกระทบต่อ Module อื่น

- ไม่แก้โค้ด production ของ module ไหน แต่จะ**เปิดเผยบั๊กที่อาจซ่อนอยู่ใน Module 3, 10, 11, 12, 13** — ถ้าเทสไม่ผ่าน ต้องย้อนกลับไปแก้ module ต้นทางนั้นๆ ก่อน ไม่ใช่แก้ที่ test ให้ผ่านแบบผิดๆ

## Testing Checklist ของ Module นี้เอง

- [ ] รัน `npm run test` แล้วผ่านทุกเคสที่เขียนไว้ในระดับ "วิกฤต" ทั้งหมด
- [ ] ทดสอบ concurrency ของการออกเลขที่เอกสารด้วยจำนวนพร้อมกันที่สูงกว่าที่คาดว่าจะเกิดขึ้นจริง (เช่น ทดสอบ 20 request พร้อมกัน ทั้งที่ใช้งานจริงไม่น่าเกิน 5)
- [ ] ทดสอบ authorization ครบทุก role x ทุก endpoint ที่มีการจำกัดสิทธิ์
- [ ] ฐานข้อมูลทดสอบ (`docs_management_test`) แยกจากฐานข้อมูล dev จริงอย่างชัดเจน ไม่มีทางรันเทสแล้วไปลบ/แก้ข้อมูลจริงโดยไม่ตั้งใจ
