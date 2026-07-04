# Module 10: User & Role Management (จัดการผู้ใช้งาน/สิทธิ์)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 10 อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> อ้างอิงบริบทรวมจาก `CLAUDE.md` และ skill ที่เกี่ยวข้อง (`ui-design-system` สำหรับหน้าตา UI)

## เป้าหมายของ Module

เพิ่มระบบจัดการผู้ใช้งานและสิทธิ์การเข้าถึง เนื่องจากระบบนี้มีผู้ใช้งานหลายคนในหน่วยงานเดียวกัน (ตามกลุ่มเป้าหมายที่ระบุใน CLAUDE.md: "บุคลากรผู้ปฏิบัติงานด้านเอกสารภายในหน่วยงาน") ไม่ใช่ระบบผู้ใช้เดี่ยว

Module 9 (Auth พื้นฐาน) ทำแค่ login/logout — Module นี้ต่อยอดให้มี **การสร้าง/แก้ไข/ปิดใช้งานบัญชี** และ **กำหนดสิทธิ์ตาม role**

## Role ที่ต้องมีในระบบ (เริ่มต้น)

| Role | สิทธิ์ |
|---|---|
| **เจ้าหน้าที่สารบรรณ (Officer)** | สร้าง/แก้ไข/ดูเอกสารทั้งหมด, อัปโหลดไฟล์, พิมพ์เอกสาร — role หลักตาม mockup ที่ทำไว้แล้ว |
| **ผู้บริหาร/ผู้อนุมัติ (Approver)** | ดูเอกสารทั้งหมด, เปลี่ยนสถานะเอกสารเป็น "อนุมัติแล้ว", ดูรายงาน — แก้ไขเนื้อหาเอกสารไม่ได้ |
| **ผู้ดูแลระบบ (Admin)** | ทำได้ทุกอย่างของ Officer + Approver บวกจัดการบัญชีผู้ใช้/กำหนด role คนอื่น |
| **ผู้ใช้งานทั่วไป (Viewer)** *(ถ้าต้องการ)* | ดูเอกสารได้อย่างเดียว ค้นหาได้ ดาวน์โหลดไม่ได้ |

> หมายเหตุ: ถ้าโครงงานจริงมี role ต่างจากนี้ ให้แก้ตารางนี้ก่อนแล้วค่อยสั่งสร้างโค้ด

## Prisma Schema ที่ต้องเพิ่ม/แก้ไข

```prisma
enum UserRole {
  ADMIN
  APPROVER
  OFFICER
  VIEWER
}

model User {
  id           String    @id @default(cuid())
  name         String
  email        String    @unique
  passwordHash String
  role         UserRole  @default(OFFICER)
  department   String?   // ผูกกับ departmentCode ใน document-numbering skill
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  documents    Document[] // ผู้สร้างเอกสาร (relation เดิมที่มีอยู่)
  auditLogs    AuditLog[] // เชื่อมกับ Module 12
}
```

**ข้อควรระวัง:** ถ้า Module 1 (Schema เดิม) มี `User` model อยู่แล้วแบบง่ายๆ (สำหรับ Auth พื้นฐาน) ให้ใช้คำสั่งนี้กับ Claude Code แทนการสร้างใหม่ทับ:
```
ตรวจสอบ User model ที่มีอยู่ใน prisma/schema.prexisting ก่อน แล้วเพิ่ม field role, department, isActive
ตาม module-10-user-management.md โดยไม่ลบ field เดิมที่ใช้งานอยู่ แล้วสร้าง migration ใหม่
```

## API Routes ที่ต้องสร้าง

| Endpoint | หน้าที่ | จำกัดสิทธิ์ |
|---|---|---|
| `GET /api/users` | ดึงรายชื่อผู้ใช้ทั้งหมด | Admin เท่านั้น |
| `POST /api/users` | สร้างบัญชีผู้ใช้ใหม่ | Admin เท่านั้น |
| `PUT /api/users/[id]` | แก้ไขข้อมูล/role ของผู้ใช้ | Admin เท่านั้น |
| `PATCH /api/users/[id]/deactivate` | ปิดใช้งานบัญชี (ห้าม hard delete เพราะเอกสารเก่ายังผูกกับ user นี้อยู่) | Admin เท่านั้น |
| `GET /api/users/me` | ดึงข้อมูลตัวเองที่ login อยู่ | ทุก role |

**กฎสำคัญ:** ห้ามลบ User ออกจากฐานข้อมูลจริง (hard delete) เพราะเอกสารที่เคยสร้างไว้จะสูญ relation กับผู้สร้าง — ใช้ `isActive = false` แทนเสมอ

## Middleware ควบคุมสิทธิ์ (Authorization)

สร้างฟังก์ชันกลาง `src/lib/authorize.ts` ใช้ตรวจสิทธิ์ก่อนเข้าถึงทุก API route ที่ sensitive:

```typescript
// ตัวอย่างแนวคิด ไม่ใช่โค้ดสมบูรณ์
function requireRole(allowedRoles: UserRole[]) {
  // ตรวจ session ปัจจุบัน -> เทียบ role -> reject 403 ถ้าไม่ผ่าน
}
```

ใช้ครอบทุก API ที่เกี่ยวกับ: จัดการผู้ใช้ (Admin เท่านั้น), เปลี่ยนสถานะอนุมัติเอกสาร (Approver/Admin เท่านั้น)

## หน้า UI ที่ต้องสร้าง

1. **หน้า "จัดการผู้ใช้งาน"** (เห็นเฉพาะ Admin ใน sidebar) — ตาราง list ผู้ใช้ทั้งหมด พร้อมคอลัมน์ role, สถานะ (active/inactive), ปุ่มแก้ไข/ปิดใช้งาน (ใช้ conventions เดียวกับตาราง "เอกสารทั้งหมด" ตาม skill `ui-design-system`)
2. **ฟอร์มสร้าง/แก้ไขผู้ใช้** — ชื่อ, อีเมล, รหัสผ่านเริ่มต้น (กรณีสร้างใหม่), เลือก role แบบ dropdown, เลือกหน่วยงาน
3. **หน้า Profile ของตัวเอง** — ผู้ใช้ทุกคนแก้ไขชื่อ/รหัสผ่านตัวเองได้ (แก้ role ตัวเองไม่ได้)
4. **ปรับ Sidebar** — ซ่อนเมนู "จัดการผู้ใช้งาน" สำหรับ role ที่ไม่ใช่ Admin

## ผลกระทบต่อ Module อื่นที่ทำไปแล้ว (ต้องกลับไปแก้)

- **Module 2 (API เอกสาร):** ต้องเพิ่มการตรวจสอบว่าใครเป็นคนสร้าง/แก้ไขเอกสาร (`createdBy` field ผูกกับ `User.id`)
- **Module 4 (Dashboard):** ตัวเลขสรุปควร filter ตาม department/role ของผู้ login (เช่น Officer เห็นเฉพาะเอกสารหน่วยงานตัวเอง, Admin เห็นทั้งหมด) — ถ้ายังไม่ทำ ให้ระบุเป็น TODO ไว้ก่อนได้ ไม่บังคับต้องแก้ทันที

## Testing Checklist

- [ ] สร้างผู้ใช้ role ต่างกัน แล้วยืนยันว่าแต่ละ role เข้าถึง API/หน้าได้ตามสิทธิ์ที่กำหนดจริง
- [ ] ผู้ใช้ role Viewer/Officer พยายามเข้าหน้า "จัดการผู้ใช้งาน" ต้องถูกปฏิเสธ (403 หรือ redirect)
- [ ] ปิดใช้งานบัญชี (deactivate) แล้วบัญชีนั้น login ไม่ได้อีก แต่เอกสารเก่าที่เคยสร้างไว้ยังแสดงชื่อผู้สร้างถูกต้อง
- [ ] แก้ไข role ผู้ใช้ระหว่างที่ผู้ใช้นั้น login ค้างอยู่ — สิทธิ์ใหม่มีผลใน session ถัดไป (หรือระบุพฤติกรรมที่ต้องการให้ชัดเจน)
