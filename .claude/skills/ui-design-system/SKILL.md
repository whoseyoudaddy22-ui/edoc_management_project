---
name: ui-design-system
description: Defines the visual design system (colors, typography, spacing, component conventions) for the Electronic Document Creation and Archiving Management System, based on the approved UI mockups (dashboard, create document, document list, upload, print preview). Use this skill whenever building or editing any page, component, or layout in this project — sidebar navigation, dashboard cards, tables, forms, badges, buttons — so that every screen Claude builds stays visually consistent with the mockups. Also use when choosing Tailwind classes, shadcn/ui component variants, or colors for any new UI element.
---

# UI Design System (ระบบออกแบบหน้าตาโปรแกรม) — v2 (รอบ Redesign 2026-07-07)

## Purpose

ทุกหน้าจอที่ Claude สร้างเพิ่มในโปรเจกต์นี้ (ไม่ว่าจะเป็นหน้าใหม่หรือแก้หน้าเดิม) **ต้องใช้สี ฟอนต์ ระยะห่าง และ component pattern ชุดเดียวกัน** ตามที่กำหนดในไฟล์นี้ เพื่อให้แอปทั้งระบบดูเป็นชิ้นเดียวกัน ไม่ใช่แต่ละหน้าคนละสไตล์

ห้าม Claude เลือกสี/สไตล์ขึ้นใหม่เองระหว่างเขียนโค้ด — ถ้าต้องการ token สีหรือ component ที่ไม่มีในไฟล์นี้ ให้เพิ่มเข้าไปในไฟล์นี้ก่อน แล้วค่อยใช้ในโค้ด เพื่อให้ทุกคน/ทุก session อ้างอิงจากที่เดียวกัน

> อ้างอิงจาก mockup หน้า Dashboard, สร้างเอกสาร, เอกสารทั้งหมด, อัปโหลดไฟล์ และพิมพ์เอกสาร ในสไลด์นำเสนอโปรเจกต์
> ทิศทางที่ผู้ใช้อนุมัติรอบ redesign (2026-07-07): คงชุดสีกรมท่า + ทอง + น้ำเงิน, ฟอนต์ UI = Noto Sans Thai, หน้า Login เป็น card กลางจอแบบปรับโฉม

## สถานะการปรับใช้ (Implementation Status)

| ขั้น | สถานะ |
|---|---|
| 1. ไฟล์นี้เป็น source of truth ค่าใหม่ | ✅ อัปเดตแล้ว (เวอร์ชันนี้) |
| 2. Wire token เข้า `src/app/globals.css` + ฟอนต์ไทยใน `src/app/layout.tsx` | ✅ เสร็จแล้ว (2026-07-07) — ตรวจแล้วบน port 3001 |
| 3. ปรับหน้าตาม module (เริ่ม Login / Module 16) | ✅ Login (Module 16), Dashboard, Sidebar Navigation เสร็จแล้ว (2026-07-07) — โมดูลถัดไปยังไม่ทำ (เอกสารทั้งหมด, สร้างเอกสาร, อัปโหลดไฟล์, พิมพ์เอกสาร, ผู้ใช้งาน, ประวัติการใช้งาน, สำรองข้อมูล) |

เมื่อทำขั้น 2–3 เสร็จ ให้กลับมาอัปเดตตารางนี้

## กติกาหลัก (Hard Rules)

1. **ห้ามใช้ Tailwind palette class ตรงๆ กับสีที่มีความหมายเชิงระบบ** เช่น `bg-blue-600`, `text-red-500`, `bg-[#1e2a4a]` — ต้องใช้ semantic token ผ่าน class ของ shadcn theme (`bg-primary`, `text-destructive`, `bg-sidebar`, `text-muted-foreground`, `border-input`) หรือ token สถานะในไฟล์นี้เท่านั้น ข้อยกเว้นเดียว: เฉดเทา neutral เชิงโครงสร้าง (`bg-gray-50`, `border-gray-200`) ที่ระบุไว้ในตาราง token แล้ว
2. สีทุกค่าที่โค้ดใช้ ต้องประกาศเป็น CSS variable ใน `src/app/globals.css` (`:root` + `@theme inline`) และมีแถวในตาราง token ของไฟล์นี้ — ถ้าจะเพิ่มสีใหม่ ให้เพิ่มที่ไฟล์นี้ก่อน แล้วค่อยเพิ่มใน globals.css
3. ปุ่ม primary ใช้ shadcn `<Button>` variant default เปล่าๆ (สีมาจาก `--primary`) — **ห้าม** เขียน `className="bg-blue-600 hover:bg-blue-600/90"` ทับอีก (pattern เก่าที่ต้องทยอยลบออก)
4. ไอคอนทั้งระบบมาจาก `lucide-react` เท่านั้น

## Color Tokens

**ค่า oklch คือค่า authoritative ที่เขียนใน globals.css** — คอลัมน์ hex คือค่า fallback ที่ browser แสดงจริง (โปรเจกต์ใช้ Tailwind v4 ซึ่งชื่อสีอย่าง blue-600 เป็นคนละ hex กับ Tailwind v3 เช่น blue-600 = `#155dfc` ไม่ใช่ `#2563eb`)

### Brand / Semantic (map เข้า shadcn theme variables)

| shadcn variable | oklch (authoritative) | hex ที่แสดงจริง | ใช้กับ |
|---|---|---|---|
| `--primary` | `oklch(0.546 0.245 262.881)` | `#155dfc` (Tailwind v4 blue-600 — สีเดียวกับปุ่ม `bg-blue-600` เดิมทุกประการ) | ปุ่มหลัก, ลิงก์, แถบคั่นข้าง "เรื่อง", focus indicator |
| `--primary-foreground` | `oklch(1 0 0)` | `#ffffff` | ตัวอักษรบนปุ่ม primary |
| `--ring` | เท่ากับ `--primary` | `#155dfc` | focus ring ของ input/ปุ่มทุกตัว |
| `--destructive` | `oklch(0.577 0.245 27.325)` | `#e7000b` (Tailwind v4 red-600) | ปุ่ม/ไอคอนลบ, ข้อความ error |
| `--sidebar` | `oklch(0.291 0.061 267)` | `#1e2a4a` (กรมท่า จาก mockup) | พื้นหลัง sidebar |
| `--sidebar-foreground` | `oklch(0.929 0.013 255.508)` | `#e2e8f0` (slate-200) | ตัวอักษรเมนู sidebar |
| `--sidebar-accent` | `oklch(0.361 0.072 267)` | `#2c3b63` (กรมท่าอ่อนกว่าพื้น) | แถบเมนู active / hover ใน sidebar |
| `--sidebar-accent-foreground` | `oklch(1 0 0)` | `#ffffff` | ตัวอักษรเมนู active |
| `--background` | `oklch(0.985 0.002 247.839)` | `#f9fafb` (gray-50) | พื้นหลังพื้นที่เนื้อหาหลัก (นอก sidebar) |
| `--card` / `--popover` | `oklch(1 0 0)` | `#ffffff` | พื้นหลัง card, table, ฟอร์ม, dialog |
| `--border` / `--input` | `oklch(0.928 0.006 264.531)` | `#e5e7eb` (gray-200) | เส้นขอบ card, table, input |
| `--foreground` | `oklch(0.21 0.034 264.665)` | `#111827` (gray-900) | ข้อความหลัก |
| `--muted-foreground` | `oklch(0.551 0.027 264.364)` | `#6b7280` (gray-500) | label, ข้อความรอง, timestamp |

### Accent เฉพาะทาง (custom token)

| Token | ค่า (hex) | ใช้กับ |
|---|---|---|
| `--color-accent-gold` | `#f2b93b` | โลโก้/ตราหน่วยงานเท่านั้น (พื้น badge วงกลมโลโก้ คู่กับไอคอนสี `--sidebar`) — **ห้าม**ใช้กับปุ่ม, ลิงก์, หรือ text ทั่วไป |

### Status Tokens (คู่ bg/fg — ใช้กับ Badge และกล่องข้อความสถานะ)

| Token | bg (hex) | fg (hex) | ใช้กับ |
|---|---|---|---|
| `--status-pending-bg/-fg` | `#fef3c7` (amber-100) | `#92400e` (amber-800) | badge "รอดำเนินการ" |
| `--status-approved-bg/-fg` | `#dcfce7` (green-100) | `#15803d` (green-700) | badge "อนุมัติแล้ว", ไอคอน checkmark |
| `--status-external-bg/-fg` | `#e0f2fe` (sky-100) | `#0369a1` (sky-700) | badge ประเภทเอกสาร เช่น "หนังสือภายนอก" |
| `--status-draft-bg/-fg` | `#f3f4f6` (gray-100) | `#374151` (gray-700) | badge "ฉบับร่าง" / สถานะกลางๆ |
| `--status-rejected-bg/-fg` | `#fee2e2` (red-100) | `#b91c1c` (red-700) | badge "ไม่อนุมัติ/ตีกลับ", กล่อง error ระดับฟอร์ม |

## Typography

**ฟอนต์ UI ทั้งระบบ: Noto Sans Thai** โหลดผ่าน `next/font/google` ใน `src/app/layout.tsx` (variable font, `subsets: ["thai", "latin"]`) และตั้งเป็น `--font-sans` ตัวจริงใน `@theme` ของ globals.css (แก้ปัญหาเดิมที่ `--font-sans` ชี้หาตัวเองแบบวน และ Geist ไม่มี glyph ไทย ทำให้ตัวไทย fallback ไปฟอนต์เครื่องผู้ใช้)

- Geist Mono คงไว้เป็น `--font-mono` สำหรับโค้ด/เลขที่เอกสารใน UI ถ้าจำเป็น
- **ฟอนต์เอกสาร TH Sarabun New (`.font-document`) ห้ามแตะ** — ใช้เฉพาะเนื้อหาเอกสารที่ preview/print เท่านั้น (ดู skill `official-document-template`)

| ระดับ | ขนาด/น้ำหนัก | ใช้กับ |
|---|---|---|
| Page Title | `text-xl font-semibold` | หัวข้อหน้า เช่น "แดชบอร์ด", "สร้างเอกสาร", "เข้าสู่ระบบ" |
| Card Number (ตัวเลขสรุปในแดชบอร์ด) | `text-3xl font-bold` | ตัวเลขในการ์ดสรุป |
| Card Label | `text-sm text-muted-foreground` | ป้ายกำกับใต้/เหนือตัวเลขในการ์ด |
| Table Header | `text-sm font-medium text-muted-foreground uppercase` | หัวตาราง |
| Table Cell | `text-sm` | เนื้อหาในตาราง |
| Form Label | `text-sm font-medium` | label ของ input ในฟอร์ม |
| Body Text | `text-base` | เนื้อหาเอกสาร, ข้อความทั่วไป |
| App Name (หน้า auth/sidebar) | `text-lg font-semibold` + บรรทัดรอง `text-xs text-muted-foreground` | ชื่อระบบ 2 บรรทัดใต้โลโก้ |
| Helper / Field Error | `text-xs` (error ใช้ `text-destructive`) | ข้อความช่วยเหลือใต้ input, error รายฟิลด์ |

## Spacing & Layout

- **Sidebar:** ความกว้างคงที่ประมาณ `w-64` แสดงตลอด ไม่ยุบ/ขยายในเวอร์ชันแรก
- **แบ่งเมนู sidebar เป็นกลุ่ม** พร้อมหัวข้อกลุ่มตัวเล็ก (เช่น "ภาพรวม", "เอกสาร", "ระบบ") ตาม mockup
- **พื้นที่เนื้อหาหลัก:** padding รอบนอก `p-6`, ระยะห่างระหว่าง section `gap-6`
- **Grid การ์ดสรุปในแดชบอร์ด:** 4 คอลัมน์บนจอกว้าง (`grid-cols-4`), ยุบเหลือ 2 คอลัมน์บนแท็บเล็ต, 1 คอลัมน์บนมือถือ
- **Card:** ขอบมน `rounded-lg`, เงาบางเบา `shadow-sm`, ขอบเส้นบาง `border` (สีจาก `--border`), พื้นหลัง `bg-card`, padding ภายใน `p-4` ถึง `p-6`

## Component Conventions

### Auth Page (Login / Forgot password — Module 16)

Layout ที่ผู้ใช้เลือก: **card เดี่ยวกลางจอ แบบปรับโฉม** (ไม่ใช่ split-panel)

- พื้นหลังทั้งจอ: `bg-background` (gray-50) จัด card กึ่งกลางแนวตั้ง-แนวนอน, padding รอบนอก `p-6`
- Card: `max-w-md` (กว้างขึ้นจากเดิม `max-w-sm`), `rounded-xl border bg-card shadow-sm`, padding ภายใน `p-8`
- ส่วนหัว card เรียงกลาง: badge วงกลมโลโก้ `h-12 w-12 rounded-full` พื้น `--color-accent-gold` ไอคอน `Building2` สี `--sidebar` → ชื่อระบบ (App Name typography ด้านบน) → เส้นคั่นบางหรือช่องว่าง → หัวข้อ "เข้าสู่ระบบ" (Page Title)
- ฟิลด์ฟอร์ม: shadcn `Label` + `Input`/`PasswordInput`, ฟิลด์บังคับมี `*` ผ่าน `text-destructive`, error รายฟิลด์ `text-xs text-destructive`
- แถวตัวเลือก: "จดจำการเข้าสู่ระบบ" ใช้ shadcn `Checkbox` (ห้าม `<input type="checkbox">` ดิบ), ลิงก์ "ลืมรหัสผ่าน?" ใช้ `text-sm text-primary hover:underline`
- Error ระดับฟอร์ม (เช่น รหัสผ่านผิด/บัญชีถูกล็อก): shadcn `Alert` variant `destructive` ไม่ใช่ `<p>` แต่งเอง
- ปุ่ม submit: `<Button>` default variant เต็มความกว้าง (`w-full`) ข้อความสถานะ loading ตามเดิม
- โลโก้จริงที่ใช้: ตราวิทยาลัย `public/logo/plvc.png` (ไม่ใช่ badge ไอคอน `Building2` อีกต่อไป) แสดงขนาด `h-20 w-20` เหนือชื่อระบบ — asset สาธารณะใต้ `public/logo/*` ต้อง exclude ออกจาก auth proxy matcher (`src/proxy.ts`) เพื่อให้โหลดได้ในหน้า login เอง ก่อน login
- ใต้ card (นอก card): ข้อความ footer `text-xs text-muted-foreground` เช่น ชื่อหน่วยงาน/เวอร์ชันระบบ (ถ้ามี)

### Sidebar Navigation

- โลโก้หน่วยงานอยู่บนสุด พร้อมชื่อระบบ 2 บรรทัด (ชื่อระบบ + คำอธิบายสั้น) — ใช้โลโก้จริง `public/logo/plvc.png` ขนาด `h-10 w-10` ครอบด้วยวงกลม `rounded-full overflow-hidden ring-2 ring-accent-gold/70` (`object-cover` ให้ครอปเข้ากลางภาพ) **ไม่ใช่** ไอคอน `Building2` ในวงกลมพื้นทองแบบเดิมอีกต่อไป — เหตุผล: โลโก้จริงมีรายละเอียดหลายสี ถ้าไม่ครอปเป็นวงกลมเล็กๆ จะดูรกบนพื้น sidebar สีกรมท่า วง `ring-accent-gold` ทำหน้าที่เป็นกรอบบางๆ ผูกโทนสีให้เข้ากับหน้าเว็บแทน
- รายการเมนูมีไอคอนนำหน้าเสมอ (ใช้ `lucide-react`)
- เมนูที่ active ใช้พื้น `--sidebar-accent` ตัวอักษร `--sidebar-accent-foreground` และตัวหนา (`font-semibold`)
- เมนู/ข้อความรองใน sidebar ที่ไม่ active ใช้ opacity variant ของ token เดิมแทนสีดิบ (เช่น `text-sidebar-foreground/80`, `/60`, `hover:bg-sidebar-accent/40`) ห้ามใช้ `text-gray-300/400` หรือ `bg-white/5` `bg-white/10` แบบเดิม
- ด้านล่างสุดของ sidebar แสดงข้อมูลผู้ใช้ที่ล็อกอินอยู่ (avatar วงกลม + ชื่อ + ตำแหน่ง)

### Dashboard Summary Card

- โครงสร้าง: label (บนซ้าย) + ไอคอนใน badge วงกลมพื้นสี (บนขวา) + ตัวเลขใหญ่ (กลาง) + ข้อความเสริมเล็กๆ ด้านล่าง (เช่น "↑ อัปเดตล่าสุด")
- ใช้ shadcn/ui `Card` component เป็นฐาน

### Dashboard Breakdown Chart (สัดส่วนแยกตามประเภทเอกสาร)

- **ไม่ใช้ recharts** — ลองแล้วพบบั๊กจริงใน recharts 3.8.0 กับ `BarChart layout="vertical"` (ค่า width คำนวณผิดเป็น 0 เสมอ ไม่ว่าค่าจริงจะเป็นเท่าไหร่ ดู commit ที่เพิ่ม/ถอด dependency นี้) จึงถอด `recharts` และ `src/components/ui/chart.tsx` (shadcn chart wrapper) ออกจากโปรเจกต์ทั้งหมด — **ห้ามติดตั้งใหม่**โดยไม่ตรวจสอบบั๊กนี้ก่อน (หรือย้ายไป major version ใหม่กว่าที่ยืนยันแล้วว่าแก้ไขแล้ว)
- ใช้ horizontal bar แบบ hand-rolled ด้วย `<Link>` + `<div>` สองชั้น (track `bg-gray-100` + fill `bg-primary` ปรับ `width` เป็น % ตาม `count` เทียบกับค่าสูงสุดในชุดข้อมูล ไม่ใช่เทียบกับผลรวม เพื่อให้แท่งที่มากที่สุดเต็มความกว้างเสมอ) ดู `src/components/shared/document-type-breakdown-chart.tsx`
- ทั้งแถว (label + แท่ง) คลิกได้ทั้งหมดผ่าน `<Link href="/documents?type={code}">` ไม่ใช่แค่พิกเซลของแท่งกราฟ — พาไปหน้าเอกสารทั้งหมดพร้อม filter ประเภทเอกสารตั้งต้น (ต้องส่ง `documentTypeCode` มาจาก `getDashboardStats()` ด้วย ไม่ใช่แค่ `documentTypeId`)
- Hover state: label เปลี่ยนเป็น `text-primary`, แท่งเปลี่ยนเป็น `bg-primary/80` (ผ่าน `group`/`group-hover`)

### Status Badge

- ใช้ shadcn/ui `Badge` แบบ custom class ที่อ้าง status token คู่ bg/fg ด้านบน (เช่น `bg-[var(--status-pending-bg)] text-[var(--status-pending-fg)]` หรือ utility ที่ประกาศใน globals.css)
- ขอบมนเต็ม (`rounded-full`), padding แนวนอนมากกว่าแนวตั้ง (`px-3 py-1`)
- ข้อความสั้น กระชับ เช่น "รอดำเนินการ", "อนุมัติแล้ว"

### Table (เอกสารทั้งหมด)

- แถวสลับสี (zebra stripe) แบบบางเบา หรือใช้เส้นคั่นแถวบาง `border-b`
- คอลัมน์ "จัดการ" อยู่ขวาสุดเสมอ เป็นกลุ่มไอคอนปุ่ม (ดู/พิมพ์/ลบ) ไม่ใช่ปุ่มข้อความ
- แถวมี hover state (`hover:bg-gray-50`)
- ช่องค้นหาและ filter dropdown อยู่แถวบนสุดของตาราง เรียงจากซ้าย (ค้นหา) ไปขวา (filter ประเภท, filter สถานะ)

### Form (สร้างเอกสาร และฟอร์มทั่วไป)

- แบ่งฟอร์มเป็น section การ์ดย่อยตามหมวดข้อมูล (เช่น "ข้อมูลหนังสือ", "เนื้อหาเอกสาร") แต่ละ section มีหัวข้อกำกับด้านบนพร้อมไอคอน
- ฟิลด์บังคับกรอกมีเครื่องหมาย `*` สี `text-destructive` ต่อท้าย label
- จัดฟิลด์เป็น 2 คอลัมน์บนจอกว้าง ยุบเป็น 1 คอลัมน์บนจอแคบ
- **Error/Alert มาตรฐานเดียวทั้งระบบ:** error ระดับฟอร์ม = shadcn `Alert` variant `destructive`, error รายฟิลด์ = `text-xs text-destructive`, checkbox ทุกตัว = shadcn `Checkbox`

### ปุ่ม (Buttons)

- ปุ่มหลัก (primary action เช่น "+ สร้างเอกสาร", "บันทึกไฟล์", "พิมพ์เอกสาร"): shadcn `<Button>` variant default (สีจาก `--primary` อัตโนมัติ) อยู่มุมขวาบนของหน้าเสมอ
- ปุ่มรอง/ยกเลิก: `outline` หรือ `ghost` variant
- ปุ่มอันตราย (ลบ): variant `destructive` ใช้เฉพาะ icon button ในตาราง ไม่ใช่ปุ่มข้อความเต็ม

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
| โลโก้หน่วยงาน | `Building2` |

## Responsive Rules

- Breakpoint หลักตาม Tailwind default (`sm`, `md`, `lg`, `xl`)
- เวอร์ชันแรกเน้น desktop/laptop ก่อน (เจ้าหน้าที่สารบรรณใช้งานบนคอมพิวเตอร์เป็นหลัก) แต่ทุกหน้าต้อง**ไม่พังบนจอแคบ** อย่างน้อยต้อง scroll/ใช้งานได้ ไม่จำเป็นต้องสวยสมบูรณ์แบบระดับ mobile-first

## Testing Checklist

ก่อน merge หน้าจอ/component ใหม่ ให้ตรวจสอบว่า:

- [ ] ไม่มี palette class เชิงความหมาย (`bg-blue-600`, `text-red-500`) หรือ hex ฝังในโค้ด — ใช้ semantic/status token เท่านั้น
- [ ] ตัวอักษรไทยแสดงด้วย Noto Sans Thai (ไม่ fallback ฟอนต์เครื่อง) และหน้าดังกล่าวไม่กระทบ `.font-document`
- [ ] Badge สถานะใช้สีตรงตามความหมาย (เหลือง=รอ, เขียว=อนุมัติ, เทา=ร่าง, แดง=ตีกลับ)
- [ ] Error ฟอร์มใช้ `Alert` destructive, checkbox ใช้ shadcn `Checkbox`
- [ ] ไอคอนทั้งหมดมาจาก `lucide-react`
- [ ] Sidebar และโครงสร้างหน้าหลักสอดคล้องกับหน้าอื่นที่มีอยู่แล้วในระบบ
- [ ] ปุ่ม primary action อยู่ตำแหน่งมุมขวาบนตามธรรมเนียมของระบบ

## Changelog

- **v2.4 (2026-07-08):** เปลี่ยนโลโก้ sidebar จากไอคอน `Building2` ในวงกลมพื้นทอง เป็นโลโก้จริง `public/logo/plvc.png` ครอปวงกลมเล็ก + ring กรอบทอง (ดู Sidebar Navigation convention) และเปลี่ยน "สัดส่วนแยกตามประเภทเอกสาร" ในแดชบอร์ดจาก progress bar ธรรมดาเป็น bar แบบคลิกได้ พาไปหน้าเอกสารทั้งหมดพร้อม filter ประเภทตั้งต้น (ดู Dashboard Breakdown Chart convention) — **บันทึกบั๊ก:** ลองใช้ recharts 3.8.0 ก่อนแล้วเจอบั๊กจริง (`BarChart layout="vertical"` คำนวณ width เป็น 0 เสมอ) จึงถอด recharts ออกจากโปรเจกต์ทั้งหมดและเขียน chart เองด้วย Tailwind ล้วน
- **v2.3 (2026-07-07):** ปรับหน้า Dashboard และ Sidebar Navigation เสร็จ — ลบ palette class ดิบทั้งหมด (`bg-blue-50/600`, `bg-amber-100`, `bg-green-100`, `bg-sky-100`, `bg-[#1e2a4a]`, `bg-[#f2b93b]`, `text-gray-*`, `bg-white/10` ฯลฯ) เปลี่ยนเป็น semantic/status/sidebar token ทั้งหมด (`bg-primary/10`, `bg-status-*-bg`, `bg-sidebar`, `bg-sidebar-accent`, `text-sidebar-foreground` พร้อม opacity variant สำหรับข้อความรอง) สีที่แสดงจริงไม่เปลี่ยนแปลง (ตรวจแล้วด้วย computed style บน port 3001) และแก้ `StatusBadge` component ให้ใช้ status token แทน palette class ดิบด้วยเช่นกัน (กระทบทุกหน้าที่ใช้ badge สถานะเอกสาร)
- **v2.2 (2026-07-07):** ปรับหน้า Login (Module 16) เสร็จ — ใช้โลโก้จริง `public/logo/plvc.png` แทนไอคอน `Building2`, เพิ่มกติกาว่า asset สาธารณะใต้ `public/logo/*` ต้อง exclude จาก auth proxy matcher
- **v2.1 (2026-07-07):** wire ขั้น 2 เสร็จ — แก้ตาราง Brand token ให้ oklch เป็นค่า authoritative และ hex เป็นค่าที่ browser แสดงจริงตาม Tailwind v4 (blue-600 = `#155dfc`, red-600 = `#e7000b`) เพื่อคงสีเดิมที่ผู้ใช้เห็นบนจอทุกประการ
- **v2 (2026-07-07):** รอบ redesign ทั้งระบบ — ประกาศค่า hex/oklch จริงของทุก token และ mapping เข้า shadcn theme variables, เพิ่มกติกาห้าม palette class, เปลี่ยนฟอนต์ UI เป็น Noto Sans Thai, เพิ่ม status token `draft`/`rejected`, เพิ่ม convention หน้า Auth (card กลางจอปรับโฉม), Error/Alert/Checkbox มาตรฐานเดียว
- **v1:** ตาราง token เชิงพรรณนาตาม mockup ในสไลด์นำเสนอ
