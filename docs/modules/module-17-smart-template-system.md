# Module 17: Smart Template System (ระบบเทมเพลตเอกสารอัจฉริยะ)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 17 อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> ต่อยอดจาก Module 5 (สร้างเอกสาร), Module 8 (พิมพ์เอกสาร/PDF), skill `official-document-template`
> อ้างอิง `docs/reference/memo-template-phitsanulok.md` เป็นตัวอย่างเทมเพลตแรกที่ implement จริง

## ปัญหาที่ Module นี้แก้

ระบบงานเอกสารราชการเดิมใช้ Microsoft Word ล้วน — การจัดหน้า, เว้นบรรทัด, เคาะ tab, ปรับ indent ทำด้วยมือทุกครั้ง ทำให้:
- แต่ละคนจัดฟอร์มไม่เหมือนกัน แม้เป็นเอกสารประเภทเดียวกัน
- แก้ไขยาก ถ้ามาตรฐานเปลี่ยน ต้องไล่แก้ไฟล์ Word เก่าทีละไฟล์
- ไม่มีทางบังคับ "ความถูกต้องตั้งแต่ต้นทาง" ได้เลย เพราะ Word เปิดให้แก้ layout อิสระ

**เป้าหมายของ Smart Template:** เปลี่ยนจาก "พิมพ์เอกสารอิสระใน Word" เป็น **"กรอกข้อมูลลงฟอร์มที่ layout ถูกล็อกไว้แล้ว"** — เจ้าหน้าที่แก้ได้แค่เนื้อหา (ตัวแปร) ส่วนโครงสร้าง/ระยะห่าง/ฟอนต์คงที่เสมอ ควบคุมจากส่วนกลาง

## หลักการสำคัญ (ย้ำอีกครั้งจากที่คุยกันไว้)

**ระบบนี้ไม่ใช่ตัวแปลงไฟล์ Word/PDF เป็น CSS อัตโนมัติ** — การสร้างเทมเพลตใหม่แต่ละแบบเป็นงานที่ **นักพัฒนา/แอดมินทำครั้งเดียว** (ดูจากเอกสารต้นฉบับด้วยตา แล้วเขียน component ให้ตรง) จากนั้นระบบจะ **บังคับใช้เทมเพลตนั้นซ้ำอัตโนมัติทุกครั้ง** ที่มีคนเลือกประเภทเอกสารนั้น — ความ "Smart" อยู่ที่การบังคับความสม่ำเสมอ ไม่ใช่ auto-generate จากภาพ

## Prisma Schema: `TemplateDefinition`

```prisma
model TemplateDefinition {
  id                String   @id @default(cuid())
  documentTypeCode  String   @unique   // ผูกกับรหัสประเภทเอกสาร (เช่น "0001" หนังสือภายนอก, "0005" บันทึกข้อความ)
  name              String              // ชื่อเทมเพลตที่มนุษย์อ่านได้ เช่น "บันทึกข้อความมาตรฐาน อบจ.พิษณุโลก"
  componentKey      String              // key ที่ใช้ map ไปยัง React component จริงในโค้ด เช่น "memo-standard-v1"
  layoutConfig      Json                // ค่า config เช่น dateFormat ("full" | "month-year"), closingTextOptions
  defaultClosingText String?            // ข้อความปิดท้ายมาตรฐานของประเภทนี้ เช่น "จึงเรียนมาเพื่อทราบ..."
  isActive          Boolean  @default(true)
  version           Int      @default(1)  // เพิ่มทุกครั้งที่แก้ layout เพื่อ track ประวัติการเปลี่ยนแปลง
  createdAt         DateTime @default(now())
  updatedAt         DateTime @updatedAt

  documents         Document[]
}
```

**เหตุผลที่ใช้ `componentKey` แทนการเก็บ HTML/CSS ดิบใน database:** ทำให้ layout ยังอยู่ในระบบ version control (git) ตรวจสอบ/review โค้ดได้ตามปกติ ไม่ใช่ string HTML ลอยๆ ในฐานข้อมูลที่ตรวจสอบยากและเสี่ยง XSS ถ้าเปิดให้ admin แก้ HTML ตรงๆ ผ่านหน้าเว็บ

## โครงสร้างโค้ด: Template Registry Pattern

```
src/components/document-templates/
├── registry.ts                    ← map componentKey -> component จริง
├── external-letter-standard.tsx   ← เทมเพลต "หนังสือภายนอก" (ของเดิมที่มีอยู่แล้ว)
├── memo-standard-v1.tsx           ← เทมเพลต "บันทึกข้อความ" (จาก memo-form.html)
└── shared/
    ├── page-frame.tsx             ← กรอบ A4 + margin ร่วมกันทุกเทมเพลต
    └── signature-block.tsx        ← ส่วนลงนามที่ใช้ซ้ำได้หลายเทมเพลต
```

```typescript
// registry.ts — แนวคิด ไม่ใช่โค้ดสมบูรณ์
import { ExternalLetterStandard } from './external-letter-standard';
import { MemoStandardV1 } from './memo-standard-v1';

export const templateRegistry: Record<string, React.ComponentType<TemplateProps>> = {
  'external-letter-standard': ExternalLetterStandard,
  'memo-standard-v1': MemoStandardV1,
};
```

หน้า "สร้างเอกสาร" และหน้า "พิมพ์เอกสาร" **เรียกใช้ component เดียวกันจาก registry นี้เสมอ** (สอดคล้องกับกฎ Preview/PDF Parity ใน skill `official-document-template`) — เลือก component จาก `TemplateDefinition.componentKey` ที่ผูกกับ `documentTypeCode` ของเอกสารนั้น

## Workflow: ขั้นตอนเมื่อได้เอกสารต้นฉบับใหม่มา (คู่มือปฏิบัติจริง)

1. รับไฟล์ต้นฉบับ (.docx หรือ PDF จากหน่วยงาน)
2. **ถ้าเป็น .docx:** แปลงผ่าน `mammoth` เป็น HTML ตั้งต้น เพื่อดูโครงสร้างคร่าวๆ
   **ถ้าเป็น PDF/ภาพสแกน:** เปิดดูด้วยตา (หรือส่งภาพให้ Claude อ่านโดยตรง) — ไม่ต้องพึ่ง OCR
3. เขียน React component ใหม่ตาม layout จริงที่เห็น (ใช้ Grid/Flexbox ตามแนวทางที่ทำใน `memo-form.html`) ระบุ field ที่เป็น "ตัวแปร" ให้ผู้ใช้กรอกได้ ส่วนที่เหลือ (ระยะขอบ, ฟอนต์, ข้อความปิดท้ายมาตรฐาน) fix ไว้ในโค้ด
4. เพิ่ม record ใหม่ใน `TemplateDefinition` ผูกกับ `documentTypeCode` และ `componentKey` ของ component ที่เพิ่งเขียน
5. เพิ่ม component เข้า `registry.ts`
6. ทดสอบ: สร้างเอกสารด้วยประเภทนี้ → preview → export PDF → เทียบกับต้นฉบับด้วยตา
7. เมื่อผ่านแล้ว commit เข้า branch งาน แล้วรอ merge ตาม pre-merge checklist ปกติ

## กรณีตัวอย่างที่ Implement แล้ว: บันทึกข้อความ (memo-standard-v1)

อ้างอิงจาก `docs/reference/memo-template-phitsanulok.md` — field ที่ต่างจากหนังสือภายนอก:
- Format วันที่แบบ "เดือน ปี" (ไม่มีวันที่) แทนวันที่เต็ม
- ข้อความปิดท้าย "จึงเรียนมาเพื่อทราบ และดำเนินการตามอำนาจและหน้าที่ต่อไป" แทน "ขอแสดงความนับถือ"
- ไม่มีตราครุฑแบบเดียวกับหนังสือภายนอก (ใช้ placeholder ไว้ก่อน รอไฟล์จริงจากหน่วยงาน)

## จัดการ "ความยุ่งยากแบบ Word" ที่พบบ่อย — แปลงเป็นกฎ CSS ตายตัว

| ปัญหาที่เจอบ่อยใน Word | วิธีแก้แบบ Smart Template |
|---|---|
| เคาะ Tab ไม่เท่ากันแต่ละคน | ใช้ `text-indent: 2.2em` คงที่ในโค้ด ไม่ให้ผู้ใช้กด tab เอง |
| เว้นบรรทัดไม่สม่ำเสมอ | กำหนด `line-height` ตายตัวต่อเทมเพลตในโค้ด |
| จัดหน้ากระดาษเพี้ยนแต่ละเครื่อง (ขนาดกระดาษ, ขอบ) | `page-frame.tsx` กำหนด A4 + margin ตายตัว ใช้ร่วมกันทุกเทมเพลต |
| ฟอนต์ไม่ตรงกันเพราะเครื่องแต่ละคนไม่มี TH Sarabun | ฝัง `@font-face` ในระบบเว็บแทน พึ่งฟอนต์ที่ติดตั้งในเครื่อง Word ของแต่ละคน |
| Copy ข้อความจากไฟล์เก่ามาแปะแล้วรูปแบบเพี้ยน (font/size ติดมาจากต้นฉบับ) | เนื้อหาที่กรอกในระบบเป็น plain text เท่านั้น (ไม่รับ rich-text paste) style ทั้งหมดมาจาก template ไม่ใช่จากเนื้อหาที่กรอก |

## API/UI ที่ต้องเพิ่ม

| ส่วน | หน้าที่ |
|---|---|
| `GET /api/template-definitions` | ดึงรายการเทมเพลตทั้งหมด (สำหรับหน้า Admin จัดการเทมเพลต) |
| หน้า "จัดการเทมเพลต" (Admin เท่านั้น) | ดูรายการเทมเพลต, เปิด/ปิดการใช้งาน (`isActive`), ดู version history — **ไม่ให้แก้ layout ผ่านหน้าเว็บโดยตรง** (ต้องแก้ผ่านโค้ด + PR ตามกระบวนการพัฒนาปกติ เพื่อรักษาคุณภาพ/ตรวจสอบได้) |

## Testing Checklist

- [ ] เพิ่มเทมเพลตใหม่ 1 ตัวตาม Workflow ข้างบน ตั้งแต่ต้นจนจบ ได้ผลลัพธ์ preview/PDF ตรงกับต้นฉบับจริง
- [ ] สลับไปมาระหว่างประเภทเอกสารที่มีเทมเพลตต่างกัน (เช่น หนังสือภายนอก ↔ บันทึกข้อความ) แล้ว layout ไม่ปนกัน
- [ ] วางข้อความที่มี rich formatting จากที่อื่น (เช่น copy จาก Word) ลงในช่องกรอกเนื้อหา แล้วตรวจว่า style แปลกปลอมไม่ติดเข้ามาในเอกสารที่ export
- [ ] ปิดการใช้งานเทมเพลต (`isActive = false`) แล้วตรวจว่าประเภทเอกสารนั้นไม่สามารถเลือกสร้างใหม่ได้ (แต่เอกสารเก่าที่เคยสร้างด้วยเทมเพลตนี้ยังดูได้ปกติ)
- [ ] ทดสอบ regression: หนังสือภายนอก (เทมเพลตเดิมที่มีอยู่แล้ว) ยังทำงานถูกต้องหลังเพิ่มระบบ registry เข้ามา
