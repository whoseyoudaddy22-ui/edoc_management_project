# Module 12: Audit Log (ประวัติการแก้ไข/เข้าถึงเอกสาร)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 12 อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> ต่อยอดจาก Module 10 (User & Role — ต้องรู้ว่าใครเป็นคนทำ action) และเชื่อมกับทุก Module ที่มีการสร้าง/แก้/ลบข้อมูล
> อ้างอิงบริบทรวมจาก `CLAUDE.md` (มี `AuditLog` model ถูกวางแผนไว้แล้วใน schema เบื้องต้น) และ skill `ui-design-system`

## เป้าหมายของ Module

เอกสารราชการต้องตรวจสอบย้อนกลับได้เสมอว่า **ใครทำอะไร กับเอกสารไหน เมื่อไร** — ทั้งเพื่อความโปร่งใสในการทำงาน และเพื่อสืบสวนเมื่อเกิดข้อผิดพลาด (เช่น เอกสารถูกแก้ไขโดยไม่ได้รับอนุญาต)

Module นี้เพิ่ม**ระบบบันทึกเหตุการณ์อัตโนมัติ (Audit Trail)** ทุกครั้งที่มีการกระทำสำคัญเกิดขึ้นในระบบ และหน้าจอสำหรับดูประวัติย้อนหลัง

## Event ที่ต้องถูกบันทึกลง Audit Log

| Event | รายละเอียดที่ต้องบันทึก |
|---|---|
| สร้างเอกสารใหม่ | ผู้สร้าง, เวลา, เลขที่เอกสารที่ออกให้ |
| แก้ไขเอกสาร | ผู้แก้ไข, เวลา, **field ที่เปลี่ยนแปลง** (ค่าเดิม → ค่าใหม่) |
| เปลี่ยนสถานะเอกสาร | ผู้เปลี่ยน, เวลา, สถานะเดิม → สถานะใหม่ (เช่น รอดำเนินการ → อนุมัติแล้ว) |
| ลบเอกสาร (soft delete) | ผู้ลบ, เวลา |
| อัปโหลด/ลบไฟล์แนบ | ผู้ดำเนินการ, เวลา, ชื่อไฟล์ |
| พิมพ์/Export PDF เอกสาร | ผู้สั่งพิมพ์, เวลา (สำคัญเพื่อรู้ว่าเอกสารฉบับไหนถูกนำออกไปใช้ภายนอกแล้วบ้าง) |
| เข้าสู่ระบบ/ออกจากระบบ | ผู้ใช้, เวลา, สำเร็จ/ไม่สำเร็จ |
| สร้าง/แก้ไข/ปิดใช้งานบัญชีผู้ใช้ (จาก Module 10) | ผู้ดำเนินการ (Admin), เวลา, บัญชีที่ถูกกระทำ |

## Prisma Schema

```prisma
enum AuditAction {
  DOCUMENT_CREATE
  DOCUMENT_UPDATE
  DOCUMENT_STATUS_CHANGE
  DOCUMENT_DELETE
  ATTACHMENT_UPLOAD
  ATTACHMENT_DELETE
  DOCUMENT_PRINT
  USER_LOGIN
  USER_LOGOUT
  USER_LOGIN_FAILED
  USER_CREATE
  USER_UPDATE
  USER_DEACTIVATE
}

model AuditLog {
  id          String      @id @default(cuid())
  action      AuditAction
  performedBy String      // User.id ของผู้ทำ action
  targetType  String      // เช่น "Document", "User", "Attachment"
  targetId    String      // id ของ record ที่ถูกกระทำ
  changes     Json?       // { field: { from: ..., to: ... } } เฉพาะกรณี UPDATE
  ipAddress   String?
  createdAt   DateTime    @default(now())

  user        User        @relation(fields: [performedBy], references: [id])

  @@index([targetType, targetId])
  @@index([performedBy])
  @@index([createdAt])
}
```

**กฎสำคัญ:** ตาราง `AuditLog` เป็น**ข้อมูลที่ต้อง immutable** — ห้ามมี API หรือหน้าจอใดๆ ในระบบที่แก้ไขหรือลบ record ใน AuditLog ได้ แม้แต่ Admin ก็ทำไม่ได้ (มิฉะนั้นจะเสียความน่าเชื่อถือของการตรวจสอบย้อนกลับ)

## วิธี Implement การบันทึก Log (สำคัญ — เลือกแนวทางเดียวให้สอดคล้องทั้งระบบ)

**แนะนำ: สร้างฟังก์ชันกลาง ห่อหุ้ม (wrapper) ไว้ที่จุดเดียว** แทนการเขียน `prisma.auditLog.create()` กระจายอยู่ทุก API route

```typescript
// src/lib/audit.ts — แนวคิด ไม่ใช่โค้ดสมบูรณ์
async function logAction(params: {
  action: AuditAction;
  performedBy: string;
  targetType: string;
  targetId: string;
  changes?: Record<string, { from: unknown; to: unknown }>;
}) {
  // บันทึกลง AuditLog ผ่าน prisma
}
```

จากนั้นเรียกใช้ `logAction()` ในทุก API route ที่อยู่ในตาราง "Event ที่ต้องถูกบันทึก" ด้านบน **ทันทีหลัง action นั้นสำเร็จ** (ไม่ใช่ก่อนทำ เพราะถ้า action ล้มเหลวไม่ควรมี log หลอกอยู่)

**สำหรับ DOCUMENT_UPDATE:** ต้อง diff ค่าเดิมกับค่าใหม่ก่อนบันทึก (ดึงข้อมูลเดิมมาเทียบกับข้อมูลที่จะอัปเดต แล้วเก็บเฉพาะ field ที่เปลี่ยนจริงลงใน `changes`)

## API Endpoint

| Endpoint | หน้าที่ | จำกัดสิทธิ์ |
|---|---|---|
| `GET /api/audit-logs` | ดึงประวัติทั้งหมด รองรับ filter (targetType, performedBy, ช่วงวันที่) + pagination | Admin เท่านั้น |
| `GET /api/audit-logs/document/[id]` | ดึงประวัติเฉพาะของเอกสารฉบับหนึ่ง | Admin + Approver (ดูได้เฉพาะเอกสารที่ตัวเองเกี่ยวข้อง) |

## หน้า UI ที่ต้องสร้าง

1. **หน้า "ประวัติการใช้งานระบบ" (เห็นเฉพาะ Admin)** — ตาราง log พร้อม filter ตาม event/ผู้ใช้/ช่วงวันที่ ใช้ table convention เดียวกับ skill `ui-design-system`
2. **แท็บ "ประวัติ" ในหน้ารายละเอียดเอกสาร** — แสดง timeline การเปลี่ยนแปลงของเอกสารฉบับนั้นโดยเฉพาะ (ใครสร้าง → ใครแก้ไขอะไรบ้าง → ใครเปลี่ยนสถานะ) เรียงจากใหม่ไปเก่า
3. แสดงผล `changes` (field ที่เปลี่ยน) ในรูปแบบอ่านง่าย เช่น "เปลี่ยนสถานะจาก 'รอดำเนินการ' → 'อนุมัติแล้ว'" ไม่ใช่แสดง JSON ดิบให้ผู้ใช้ดู

## ผลกระทบต่อ Module อื่นที่ทำไปแล้ว (ต้องกลับไปแก้เพื่อเพิ่มการเรียก logAction)

- **Module 2 (API เอกสาร):** เพิ่ม `logAction()` ใน create/update/delete
- **Module 5 (สร้างเอกสาร):** เพิ่ม log ตอนออกเลขที่เอกสารสำเร็จ
- **Module 7 (อัปโหลดไฟล์):** เพิ่ม log ตอนอัปโหลด/ลบไฟล์แนบ
- **Module 8 (พิมพ์เอกสาร):** เพิ่ม log ตอนสั่งพิมพ์/export PDF
- **Module 9 (Auth):** เพิ่ม log ตอน login สำเร็จ/ไม่สำเร็จ/logout
- **Module 10 (User Management):** เพิ่ม log ตอนสร้าง/แก้ไข/ปิดใช้งานบัญชี

## Testing Checklist

- [ ] สร้าง/แก้ไข/ลบเอกสาร แล้วตรวจว่ามี record ใน AuditLog ถูกสร้างถูกต้องครบทุก action
- [ ] แก้ไขเอกสารหลาย field พร้อมกัน แล้ว `changes` บันทึกครบทุก field ที่เปลี่ยนจริง (ไม่บันทึก field ที่ไม่ได้แก้)
- [ ] พยายามเรียก API ลบ/แก้ไข AuditLog โดยตรง (ถ้ามีช่องทางเข้าถึง) ต้องถูกปฏิเสธเสมอ ไม่มี endpoint ไหนอนุญาตให้แก้ไขได้
- [ ] ผู้ใช้ role ที่ไม่ใช่ Admin พยายามเข้าหน้า "ประวัติการใช้งานระบบ" ต้องถูกปฏิเสธ
- [ ] Login ผิดรหัสผ่านหลายครั้ง แล้วตรวจว่า `USER_LOGIN_FAILED` ถูกบันทึกทุกครั้ง
