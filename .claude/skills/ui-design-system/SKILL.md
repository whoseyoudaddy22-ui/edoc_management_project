---
name: ui-design-system
description: Defines the visual design system (colors, typography, spacing, component conventions) for the Electronic Document Creation and Archiving Management System, based on the approved UI mockups (dashboard, create document, document list, upload, print preview). Use this skill whenever building or editing any page, component, or layout in this project — sidebar navigation, dashboard cards, tables, forms, badges, buttons — so that every screen Claude builds stays visually consistent with the mockups. Also use when choosing Tailwind classes, shadcn/ui component variants, or colors for any new UI element.
---

# UI Design System (ระบบออกแบบหน้าตาโปรแกรม)

## Purpose

ทุกหน้าจอที่ Claude สร้างเพิ่มในโปรเจกต์นี้ (ไม่ว่าจะเป็นหน้าใหม่หรือแก้หน้าเดิม) **ต้องใช้สี ฟอนต์ ระยะห่าง และ component pattern ชุดเดียวกัน** ตามที่กำหนดในไฟล์นี้ เพื่อให้แอปทั้งระบบดูเป็นชิ้นเดียวกัน ไม่ใช่แต่ละหน้าคนละสไตล์

ห้าม Claude เลือกสี/สไตล์ขึ้นใหม่เองระหว่างเขียนโค้ด — ถ้าต้องการ token สีหรือ component ที่ไม่มีในไฟล์นี้ ให้เพิ่มเข้าไปในไฟล์นี้ก่อน แล้วค่อยใช้ในโค้ด เพื่อให้ทุกคน/ทุก session อ้างอิงจากที่เดียวกัน

> อ้างอิงจาก mockup หน้า Dashboard, สร้างเอกสาร, เอกสารทั้งหมด, อัปโหลดไฟล์ และพิมพ์เอกสาร ในสไลด์นำเสนอโปรเจกต์

## Color Tokens

กำหนดเป็น CSS variable / Tailwind theme extend เพื่อให้เปลี่ยนธีมได้จากจุดเดียว

| Token | สี (ประมาณ) | ใช้กับ |
|---|---|---|
| `--color-sidebar-bg` | น้ำเงินกรมท่าเข้ม (`#1e2a4a` โทนใกล้เคียง) | พื้นหลัง sidebar เมนูซ้าย |
| `--color-sidebar-text` | ขาว/เทาอ่อน | ตัวอักษรเมนูใน sidebar |
| `--color-sidebar-active` | ฟ้าสว่างกว่าพื้นหลัง sidebar เล็กน้อย | แถบเมนูที่ถูกเลือกอยู่ (active state) |
| `--color-accent-primary` | น้ำเงิน (Tailwind `blue-600` ใกล้เคียง) | ปุ่มหลัก, ลิงก์, แถบคั่นข้าง "เรื่อง" ในเอกสาร |
| `--color-accent-gold` | เหลืองทอง (โทนโลโก้วงกลม) | โลโก้/ไอคอนหน่วยงานเท่านั้น ไม่ใช้กับปุ่มหรือ text ทั่วไป |
| `--color-status-pending` | เหลือง (`amber-100` bg / `amber-800` text) | badge สถานะ "รอดำเนินการ" |
| `--color-status-approved` | เขียว (`green-100` bg / `green-700` text) | badge สถานะ "อนุมัติแล้ว" และไอคอน checkmark |
| `--color-status-external` | ฟ้า (`sky-100` bg / `sky-700` text) | badge ประเภทเอกสาร เช่น "หนังสือภายนอก" |
| `--color-surface` | ขาว | พื้นหลัง card, table, ฟอร์ม |
| `--color-page-bg` | เทาอ่อนมาก (`gray-50`) | พื้นหลังของพื้นที่เนื้อหาหลัก (นอก sidebar) |
| `--color-border` | เทาอ่อน (`gray-200`) | เส้นขอบ card, table, input |
| `--color-text-primary` | เทาเข้ม/เกือบดำ | ข้อความหลัก |
| `--color-text-secondary` | เทากลาง | label, ข้อความรอง, timestamp |

## Typography

| ระดับ | ขนาด/น้ำหนัก | ใช้กับ |
|---|---|---|
| Page Title | `text-xl font-semibold` | หัวข้อหน้า เช่น "แดชบอร์ด", "สร้างเอกสาร" |
| Card Number (ตัวเลขสรุปในแดชบอร์ด) | `text-3xl font-bold` | ตัวเลขในการ์ดสรุป เช่น "1", "0" |
| Card Label | `text-sm text-secondary` | ป้ายกำกับใต้/เหนือตัวเลขในการ์ด |
| Table Header | `text-sm font-medium text-secondary uppercase` | หัวตาราง |
| Table Cell | `text-sm` | เนื้อหาในตาราง |
| Form Label | `text-sm font-medium` | label ของ input ในฟอร์ม |
| Body Text | `text-base` | เนื้อหาเอกสาร, ข้อความทั่วไป |

ฟอนต์ UI ทั่วไป (ไม่ใช่ตัวเอกสารที่ export) ใช้ฟอนต์ระบบมาตรฐานของ Tailwind (`font-sans`) — ฟอนต์ TH Sarabun New/PSK ใช้เฉพาะเนื้อหาเอกสารที่ preview/print เท่านั้น (ดู skill `official-document-template`)

## Spacing & Layout

- **Sidebar:** ความกว้างคงที่ประมาณ `w-64` แสดงตลอด ไม่ยุบ/ขยายในเวอร์ชันแรก
- **แบ่งเมนู sidebar เป็นกลุ่ม** พร้อมหัวข้อกลุ่มตัวเล็ก (เช่น "ภาพรวม", "เอกสาร", "ระบบ") ตาม mockup
- **พื้นที่เนื้อหาหลัก:** padding รอบนอก `p-6`, ระยะห่างระหว่าง section `gap-6`
- **Grid การ์ดสรุปในแดชบอร์ด:** 4 คอลัมน์บนจอกว้าง (`grid-cols-4`), ยุบเหลือ 2 คอลัมน์บนแท็บเล็ต, 1 คอลัมน์บนมือถือ
- **Card:** ขอบมน `rounded-lg`, เงาบางเบา `shadow-sm`, ขอบเส้นบาง `border border-gray-200`, พื้นหลังขาว, padding ภายใน `p-4` ถึง `p-6`

## Component Conventions

### Sidebar Navigation
- โลโก้/ไอคอนหน่วยงานอยู่บนสุด พร้อมชื่อระบบ 2 บรรทัด (ชื่อระบบ + คำอธิบายสั้น)
- รายการเมนูมีไอคอนนำหน้าเสมอ (ใช้ `lucide-react`)
- เมนูที่ active มีพื้นหลังสว่างกว่ารอบข้างและตัวหนา
- ด้านล่างสุดของ sidebar แสดงข้อมูลผู้ใช้ที่ล็อกอินอยู่ (avatar วงกลม + ชื่อ + ตำแหน่ง)

### Dashboard Summary Card
- โครงสร้าง: label (บนซ้าย) + ไอคอนใน badge วงกลมพื้นสี (บนขวา) + ตัวเลขใหญ่ (กลาง) + ข้อความเสริมเล็กๆ ด้านล่าง (เช่น "↑ อัปเดตล่าสุด")
- ใช้ shadcn/ui `Card` component เป็นฐาน

### Status Badge
- ใช้ shadcn/ui `Badge` component แบบ `variant="outline"` หรือ custom class ตาม token สีสถานะด้านบน
- ขอบมนเต็ม (`rounded-full`), padding แนวนอนมากกว่าแนวตั้ง (`px-3 py-1`)
- ข้อความสั้น กระชับ เช่น "รอดำเนินการ", "อนุมัติแล้ว"

### Table (เอกสารทั้งหมด)
- แถวสลับสี (zebra stripe) แบบบางเบา หรือใช้เส้นคั่นแถวบาง `border-b`
- คอลัมน์ "จัดการ" อยู่ขวาสุดเสมอ เป็นกลุ่มไอคอนปุ่ม (ดู/พิมพ์/ลบ) ไม่ใช่ปุ่มข้อความ
- แถวมี hover state (`hover:bg-gray-50`)
- ช่องค้นหาและ filter dropdown อยู่แถวบนสุดของตาราง เรียงจากซ้าย (ค้นหา) ไปขวา (filter ประเภท, filter สถานะ)

### Form (สร้างเอกสาร)
- แบ่งฟอร์มเป็น section การ์ดย่อยตามหมวดข้อมูล (เช่น "ข้อมูลหนังสือ", "เนื้อหาเอกสาร") แต่ละ section มีหัวข้อกำกับด้านบนพร้อมไอคอน
- ฟิลด์บังคับกรอกมีเครื่องหมาย `*` สีแดงต่อท้าย label
- จัดฟิลด์เป็น 2 คอลัมน์บนจอกว้าง (เช่น เลขที่หนังสือ คู่กับ วันที่หนังสือ) ยุบเป็น 1 คอลัมน์บนจอแคบ

### ปุ่ม (Buttons)
- ปุ่มหลัก (primary action เช่น "+ สร้างเอกสาร", "บันทึกไฟล์", "พิมพ์เอกสาร"): พื้นน้ำเงิน (`--color-accent-primary`) ตัวอักษรขาว อยู่มุมขวาบนของหน้าเสมอ
- ปุ่มรอง/ยกเลิก: outline หรือ ghost variant ของ shadcn/ui
- ปุ่มอันตราย (ลบ): สีแดง ใช้เฉพาะ icon button ในตาราง ไม่ใช่ปุ่มข้อความเต็ม

### Upload Zone
- กรอบเส้นประ (`border-dashed`), ไอคอนอัปโหลดตรงกลาง, ข้อความคลิกหรือลากไฟล์วาง
- แสดงรายการนามสกุลไฟล์ที่รองรับเป็น badge เล็กๆ ใต้ข้อความ (`.pdf` `.docx` `.xlsx` `.jpg/.png` `.txt` `.csv` `.pptx`)

## Icon Set

ใช้ `lucide-react` เป็นชุดไอคอนหลักทั้งระบบเท่านั้น ห้ามผสมชุดไอคอนอื่น เพื่อความสม่ำเสมอของเส้น (stroke width)

| ความหมาย | ไอคอนแนะนำ |
|---|---|
| เอกสารทั้งหมด | `FileText` |
| รอดำเนินการ | `Clock` |
| อนุมัติแล้ว | `CheckCircle2` |
| ไฟล์แนบ | `Cloud` หรือ `Paperclip` |
| สร้างเอกสาร | `FilePlus` |
| อัปโหลด | `UploadCloud` |
| พิมพ์ | `Printer` |

## Responsive Rules

- Breakpoint หลักตาม Tailwind default (`sm`, `md`, `lg`, `xl`)
- เวอร์ชันแรกเน้น desktop/laptop ก่อน (เจ้าหน้าที่สารบรรณใช้งานบนคอมพิวเตอร์เป็นหลัก) แต่ทุกหน้าต้อง**ไม่พังบนจอแคบ** อย่างน้อยต้อง scroll/ใช้งานได้ ไม่จำเป็นต้องสวยสมบูรณ์แบบระดับ mobile-first

## Testing Checklist

ก่อน merge หน้าจอ/component ใหม่ ให้ตรวจสอบว่า:

- [ ] ใช้สีจาก token ในไฟล์นี้เท่านั้น ไม่มีสี hex แปลกปลอมที่เขียนขึ้นเอง
- [ ] Badge สถานะใช้สีตรงตามความหมาย (เหลือง=รอ, เขียว=อนุมัติ)
- [ ] ไอคอนทั้งหมดมาจาก `lucide-react`
- [ ] Sidebar และโครงสร้างหน้าหลักสอดคล้องกับหน้าอื่นที่มีอยู่แล้วในระบบ
- [ ] ปุ่ม primary action อยู่ตำแหน่งมุมขวาบนตามธรรมเนียมของระบบ
