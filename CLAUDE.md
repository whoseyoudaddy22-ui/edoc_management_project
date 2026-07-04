# CLAUDE.md

คำแนะนำสำหรับ Claude Code เมื่อทำงานกับโปรเจกต์นี้

## ภาพรวมโปรเจกต์

**ชื่อโปรเจกต์:** ระบบบริหารจัดการการสร้างและจัดเก็บแฟ้มเอกสารอิเล็กทรอนิกส์
**ชื่อภาษาอังกฤษ:** Electronic Document Creation and Archiving Management System

**ปัญหาที่ต้องแก้:** งานเอกสารแบบดั้งเดิม (Hardcopy) มีปัญหาเรื่องการจัดรูปแบบไม่คงที่ การออกเลขที่เอกสารซ้ำซ้อน จัดเก็บไม่เป็นระเบียบ ใช้เวลาค้นหานาน และเสี่ยงสูญหายจากภัยพิบัติ

**แนวทางแก้ปัญหา:** พัฒนาเว็บแอปพลิเคชันที่ควบคุมความถูกต้องของเอกสารตั้งแต่ต้นทางด้วย Smart Template, ออกเลขที่เอกสารอัตโนมัติ, แปลงเอกสารเป็น PDF ตามมาตรฐานองค์กร และจัดเก็บในศูนย์กลางแฟ้มประวัติดิจิทัล (Digital Archive) ที่สืบค้นได้ด้วย Metadata

## ขอบเขตโปรเจกต์

- **เนื้อหา:** เว็บแอปพลิเคชันออนไลน์ ที่มีฟังก์ชัน (1) ควบคุมสถานะเอกสาร (2) รันเลขที่เอกสารอัตโนมัติ (3) แปลงข้อมูลเป็นไฟล์ PDF ตามมาตรฐานองค์กร (4) ศูนย์กลางแฟ้มประวัติดิจิทัลที่สืบค้นด้วย Metadata ได้
- **พื้นที่:** องค์กร/หน่วยงานที่ใช้เป็นสถานที่ฝึกประสบการณ์วิชาชีพ
- **กลุ่มเป้าหมาย:** บุคลากรผู้ปฏิบัติงานด้านเอกสารภายในหน่วยงาน

## ฟีเจอร์หลัก (อ้างอิงจาก Mockup ในสไลด์นำเสนอ)

1. **แดชบอร์ด (หน้าแรก)** — สรุปจำนวนเอกสารทั้งหมด, รอดำเนินการ, อนุมัติแล้ว, ไฟล์แนบ, เอกสารล่าสุด, สัดส่วนแยกตามประเภทเอกสาร
2. **สร้างเอกสาร** — ฟอร์มกรอกข้อมูลหนังสือ (เลขที่/วันที่/ประเภท/ระดับความเร่งด่วน/ชื่อเรื่อง/เรียน/จาก/อ้างอิง/เนื้อหา) พร้อมออกเลขที่เอกสารอัตโนมัติแบบ Smart Template (เช่น รูปแบบ `ศรพ.2000-1001-02-1`)
3. **เอกสารทั้งหมด (ศูนย์กลางแฟ้มประวัติดิจิทัล)** — ตาราง list พร้อมค้นหาด้วยเลขที่/ชื่อเรื่อง, filter ตามประเภท/สถานะ, ปุ่มดู/พิมพ์/ลบ
4. **อัปโหลดไฟล์** — รองรับไฟล์แนบ `.pdf .docx .xlsx .jpg/.png .txt .csv .pptx`
5. **พิมพ์เอกสาร** — เลือกเอกสาร แล้ว preview รูปแบบหนังสือราชการก่อนสั่งพิมพ์/Export PDF
6. ระบบผู้ใช้งาน/สิทธิ์การเข้าถึงเบื้องต้น (เจ้าหน้าที่สารบรรณ เป็น role เริ่มต้นตาม mockup)

## Tech Stack (ตามที่ระบุในสไลด์)

| ส่วนงาน | เทคโนโลยี |
|---|---|
| Front-end + Back-end | Next.js (App Router) + TypeScript — Full-stack Framework เดียวกัน |
| Database | PostgreSQL |
| ORM | Prisma |
| UI/Component | Tailwind CSS + shadcn/ui |
| Runtime | Node.js |

**เหตุผลที่เลือก Next.js แบบ Full-stack:** รวม Frontend และ API Routes ไว้ในโปรเจกต์เดียวกัน ลดความซับซ้อนของ deployment และการเชื่อมต่อระหว่างระบบ

## การเตรียมสภาพแวดล้อม (Environment Setup)

### 1) เครื่องมือพื้นฐานที่ต้องติดตั้งก่อน

```bash
# ตรวจสอบเวอร์ชัน Node.js (แนะนำ 20 LTS ขึ้นไป)
node -v
npm -v

# ถ้ายังไม่มี Node.js ให้ติดตั้งผ่าน nvm (Linux/macOS)
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
nvm install --lts
nvm use --lts

# ติดตั้ง Git (ถ้ายังไม่มี)
git --version
```

### 2) ติดตั้ง PostgreSQL

**ตัวเลือกที่แนะนำสำหรับ dev environment: ใช้ Docker** (ไม่ต้องติดตั้ง PostgreSQL ลงเครื่องโดยตรง)

```bash
docker run --name docs-db \
  -e POSTGRES_USER=docs_user \
  -e POSTGRES_PASSWORD=docs_password \
  -e POSTGRES_DB=docs_management \
  -p 5432:5432 \
  -d postgres:16
```

หรือถ้าต้องการติดตั้งลงเครื่องโดยตรง (Ubuntu):

```bash
sudo apt update
sudo apt install postgresql postgresql-contrib -y
sudo -u postgres createuser --interactive
sudo -u postgres createdb docs_management
```

### 3) สร้างโปรเจกต์ Next.js + TypeScript

```bash
npx create-next-app@latest docs-management-system \
  --typescript --tailwind --eslint --app --src-dir --import-alias "@/*"
cd docs-management-system
```

### 4) ติดตั้ง shadcn/ui

```bash
npx shadcn@latest init
# เลือก style, base color ตามต้องการ
# ติดตั้ง component ที่จะใช้บ่อย เช่น
npx shadcn@latest add button input table card select badge dialog form dropdown-menu
```

### 5) ติดตั้ง Prisma + เชื่อมต่อ PostgreSQL

```bash
npm install prisma --save-dev
npm install @prisma/client
npx prisma init
```

กำหนดค่าใน `.env`:

```
DATABASE_URL="postgresql://docs_user:docs_password@localhost:5432/docs_management?schema=public"
```

หลังจากออกแบบ schema (`prisma/schema.prisma`) แล้ว:

```bash
npx prisma migrate dev --name init
npx prisma generate
```

### 6) ไลบรารีเสริมที่มักต้องใช้กับโปรเจกต์ลักษณะนี้

```bash
# สำหรับสร้าง/แปลงไฟล์ PDF (ตามฟีเจอร์ "แปลงข้อมูลเป็นไฟล์ PDF" และ "พิมพ์เอกสาร")
npm install @react-pdf/renderer
# หรือ puppeteer สำหรับ render HTML -> PDF
npm install puppeteer

# สำหรับ authentication (ระบบผู้ใช้/สิทธิ์)
npm install next-auth

# สำหรับจัดการฟอร์ม + validation
npm install react-hook-form zod @hookform/resolvers

# สำหรับอัปโหลดไฟล์
npm install multer
# หรือใช้ Next.js native FormData handling ใน API Route
```

### 7) รันโปรเจกต์

```bash
npm run dev
# เปิด http://localhost:3000
```

## โครงสร้างโฟลเดอร์ที่แนะนำ

```
docs-management-system/
├── prisma/
│   └── schema.prisma
├── src/
│   ├── app/
│   │   ├── (dashboard)/
│   │   │   ├── dashboard/page.tsx        # แดชบอร์ด/หน้าแรก
│   │   │   ├── documents/
│   │   │   │   ├── page.tsx              # เอกสารทั้งหมด
│   │   │   │   ├── create/page.tsx       # สร้างเอกสาร
│   │   │   │   └── [id]/page.tsx         # รายละเอียด/พิมพ์เอกสาร
│   │   │   └── upload/page.tsx           # อัปโหลดไฟล์
│   │   └── api/
│   │       ├── documents/route.ts
│   │       ├── documents/[id]/route.ts
│   │       └── upload/route.ts
│   ├── components/
│   │   ├── ui/                           # shadcn/ui components
│   │   └── shared/
│   ├── lib/
│   │   ├── prisma.ts
│   │   ├── document-number.ts            # logic ออกเลขที่เอกสารอัตโนมัติ
│   │   └── pdf-generator.ts
│   └── types/
├── public/
├── .env
├── CLAUDE.md
└── package.json
```

## แนวทางการทำงานสำหรับ Claude Code

1. **อย่าเพิ่ง generate source code จนกว่าจะได้รับคำสั่งชัดเจน** — ให้เริ่มจากการยืนยัน/ออกแบบ Prisma schema (Document, DocumentType, User, Attachment, AuditLog) ร่วมกับผู้ใช้ก่อน
2. เมื่อเริ่มพัฒนาโค้ด ให้ทำทีละฟีเจอร์ตามลำดับ: **(1) Schema/DB → (2) API Routes → (3) UI หน้า Dashboard → (4) สร้างเอกสาร → (5) เอกสารทั้งหมด/ค้นหา → (6) อัปโหลดไฟล์ → (7) พิมพ์/Export PDF**
3. ใช้ `npx prisma studio` เพื่อตรวจสอบข้อมูลใน database ระหว่างพัฒนา
4. เขียน API Route ให้ validate input ด้วย `zod` เสมอ ก่อนบันทึกลง DB
5. Logic การออกเลขที่เอกสารอัตโนมัติต้องป้องกันเลขซ้ำ (ใช้ DB transaction/lock หรือ sequence)
6. ใช้ `git commit` เป็นระยะหลังจบแต่ละฟีเจอร์ย่อย เพื่อให้ทำงานต่อเนื่องข้าม session ได้ (Claude Code จะอ่านประวัติ commit และไฟล์นี้เพื่อทวนบริบทของโปรเจกต์)
7. ก่อนเริ่มงานในแต่ละ session ใหม่ ให้ Claude Code ตรวจสอบ `git status`, `git log --oneline -10` และไฟล์นี้ก่อนเสมอ เพื่อทราบว่าทำถึงขั้นตอนไหนแล้ว

## คำสั่งที่ใช้บ่อย

```bash
npm run dev              # รัน dev server
npm run build            # build production
npx prisma studio        # เปิด GUI จัดการฐานข้อมูล
npx prisma migrate dev   # สร้าง migration ใหม่หลังแก้ schema
npx eslint . --fix       # ตรวจ/แก้ lint
```

## หมายเหตุ

- ไฟล์นี้เป็นจุดเริ่มต้น (initial context) ให้ Claude Code เข้าใจภาพรวมโปรเจกต์ ยังไม่มีการสร้าง source code จริง ให้ใช้ไฟล์นี้เป็นฐานในการวางแผนงานพัฒนาต่อไป
- ควรปรับปรุงไฟล์นี้ทุกครั้งที่มีการเปลี่ยนแปลงสำคัญด้าน scope/tech stack/โครงสร้างโปรเจกต์
