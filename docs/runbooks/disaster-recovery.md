# Runbook: กู้คืนระบบหลังภัยพิบัติ (Disaster Recovery)

> ใช้เอกสารนี้เมื่อเครื่อง/เซิร์ฟเวอร์ที่รันระบบเสียหายทั้งหมด หรือฐานข้อมูล/ไฟล์แนบสูญหาย
> อ้างอิงกลยุทธ์และสคริปต์จาก `docs/modules/module-13-backup-recovery.md`
> ทำตามลำดับขั้นตอนด้านล่างทีละข้อ ไม่ต้องตัดสินใจเพิ่มเติมระหว่างทำ

## สิ่งที่ต้องเตรียมไว้ล่วงหน้า (ก่อนเกิดเหตุ)

- [ ] มีสำเนา backup ฐานข้อมูล (`.dump`) และไฟล์แนบ (`.tar.gz`) อยู่ **นอกเครื่อง server หลัก** (off-site — Google Drive/Dropbox หรือเทียบเท่า) ตามหลัก 3-2-1
- [ ] เข้าถึง Git repository ของโปรเจกต์ได้ (remote)
- [ ] มีไฟล์ `.env` (โดยเฉพาะ `DATABASE_URL`, `AUTH_SECRET`) เก็บแยกไว้อย่างปลอดภัย — ไฟล์นี้ไม่ได้อยู่ใน Git (`.gitignore`)

## ขั้นตอนกู้คืนแบบเต็ม

### 1) ติดตั้ง environment ใหม่

ทำตาม `CLAUDE.md` หัวข้อ "การเตรียมสภาพแวดล้อม":
- ติดตั้ง Node.js (20 LTS+), Git
- ติดตั้ง Docker (ใช้รัน PostgreSQL ผ่าน container — ดูข้อ 2)

### 2) Clone โค้ดจาก Git repository

```bash
git clone <repository-url> edoc_management_project
cd edoc_management_project
npm install
```

นำไฟล์ `.env` ที่เก็บแยกไว้ (นอก Git) มาวางไว้ที่ root ของโปรเจกต์

### 3) ตั้งฐานข้อมูล PostgreSQL ใหม่

โปรเจกต์นี้รัน PostgreSQL ผ่าน Docker container ชื่อ `docs-db` (พอร์ต 5433 ตาม `DATABASE_URL` ใน `.env`):

```bash
docker run --name docs-db \
  -e POSTGRES_USER=docs_user \
  -e POSTGRES_PASSWORD=docs_password \
  -e POSTGRES_DB=docs_management \
  -p 5433:5432 \
  -d postgres:16
```

> ถ้า `DATABASE_URL` ในไฟล์ `.env` ที่กู้คืนมาระบุ container name/user/db/พอร์ตต่างจากนี้ ให้ปรับคำสั่งข้างต้นให้ตรงกัน

### 4) กู้คืนฐานข้อมูลจาก backup ล่าสุด

```bash
./scripts/restore-db.sh <path-to-latest-dump-file>
# เช่น: ./scripts/restore-db.sh backups/database/docs_management_20260704_215902.dump
```

สคริปต์นี้เรียก `pg_restore --clean --if-exists` ผ่าน `docker exec` เข้าคอนเทนเนอร์ `docs-db` โดยตรง (ไม่ต้องติดตั้ง `pg_restore` บนเครื่อง host)

### 5) กู้คืนไฟล์แนบ

แตกไฟล์ backup ไฟล์แนบกลับไปที่ `public/uploads`:

```bash
tar -xzf <path-to-latest-uploads-backup>.tar.gz -C public/
# เช่น: tar -xzf backups/files/uploads_20260704_220245.tar.gz -C public/
```

(โครงสร้างในไฟล์ tar.gz คือ `uploads/...` จึงต้อง extract ไปที่ `public/` ไม่ใช่ `public/uploads/`)

### 6) ตรวจสอบว่า Prisma schema ตรงกับฐานข้อมูลที่กู้คืน

```bash
npx prisma generate
npx prisma migrate status
```

ถ้ามี migration ที่ยังไม่ถูก apply (กรณี backup เก่ากว่า schema ปัจจุบัน) ให้รัน `npx prisma migrate deploy` แล้วตรวจสอบผลกระทบต่อข้อมูลก่อน

### 7) รันระบบและตรวจสอบ

```bash
npm run build
npm run start
```

เปิด `http://localhost:3000` แล้วตรวจตาม "Testing Checklist" ด้านล่าง

## Testing Checklist หลังกู้คืน

- [x] Login เข้าระบบได้ด้วยบัญชีที่มีอยู่ก่อนเกิดเหตุ
- [x] จำนวนเอกสารในแดชบอร์ด/หน้า "เอกสารทั้งหมด" ตรงกับต้นฉบับ (เทียบ count จาก backup ก่อนเกิดเหตุถ้ามีบันทึกไว้)
- [x] เปิดไฟล์แนบตัวอย่างได้ปกติ ไม่เสียหาย
- [x] สร้างเอกสารใหม่ได้ และเลขที่เอกสารอัตโนมัติไม่ชนกับเลขที่เดิมที่กู้คืนมา (ตรวจ `document-numbering` logic ทำงานถูกต้องหลัง restore)
- [x] Audit log เดิมยังอยู่ครบ (module 12)

## หมายเหตุสภาพแวดล้อม

- เครื่อง dev ปัจจุบันเป็น Windows ไม่มี `pg_dump`/`pg_restore`/`cron` แบบ native — สคริปต์ `backup-db.sh`/`restore-db.sh` จึงเรียกผ่าน `docker exec` เข้า container `docs-db` แทน หากย้ายไป deploy บนเซิร์ฟเวอร์ Linux จริง สามารถใช้ `pg_dump`/`pg_restore` ที่ติดตั้งบน host ตรงๆ ได้เช่นกัน โดยปรับสคริปต์ให้เรียกตรงแทนการผ่าน `docker exec`
- การตั้งเวลาสำรองอัตโนมัติ (scheduling) บนเครื่อง Windows ใช้ Windows Task Scheduler (`schtasks`) แทน `cron` — ตั้งค่าไว้แล้วเป็น task ชื่อ `EdocManagement-DailyBackup` รันทุกวันเวลา 02:00 น. เรียก `scripts/run-daily-backup.sh` (รวม backup DB + ไฟล์แนบ, log ไปที่ `logs/backup.log`) ผ่าน Git Bash แบบ `--login` (จำเป็นต้องมี `--login` เพื่อให้ได้ PATH ของ `/usr/bin` เช่น `docker`, `tar` — ถ้าเรียกแบบไม่ login จะหา `docker`/`tar` ไม่เจอ) หากย้ายไป deploy บน Linux ให้ใช้ crontab ตามตัวอย่างใน `docs/modules/module-13-backup-recovery.md` แทน

## ประวัติการทดสอบ Runbook นี้

| วันที่ | ทดสอบอะไร | ผล |
|---|---|---|
| 2026-07-04 | รัน `restore-db.sh` กู้คืนไฟล์ `docs_management_20260704_215902.dump` ลงฐานข้อมูลทดสอบแยกต่างหาก (`test_restore_verify` คนละตัวกับของจริง) แล้วเทียบจำนวนแถวตาราง `Document`/`User`/`Attachment` | ✅ ตรงกันทุกตาราง (Document 122, User 8, Attachment 19) |
| 2026-07-04 | ทดสอบ retention policy: สร้างไฟล์ dummy อายุ 35 วันและ 10 วันใน `backups/database` และ `backups/files` แล้วรัน backup scripts | ✅ ไฟล์อายุ 35 วันถูกลบอัตโนมัติ, ไฟล์อายุ 10 วันยังอยู่ (ตรงตาม retention 30 วัน) |
| 2026-07-04 | ทดสอบ restore ไฟล์แนบ: อัปโหลดไฟล์จริงผ่าน `/api/upload` ของแอป → backup ด้วย `backup-files.sh` → extract ไปที่อื่นแยกจาก `public/uploads` จริง → เทียบ sha256 | ✅ ตรงกันทุก byte, เปิดไฟล์อ่านเนื้อหาได้ปกติ |
| 2026-07-04 | **จำลองสถานการณ์เครื่อง server เสียหายทั้งหมด** — ทำตามขั้นตอน 1-7 ของ runbook นี้แบบเต็มรูปแบบ: clone repo ใหม่ (`C:\dr-sim`), ตั้ง PostgreSQL container ใหม่ (`dr-sim-db`, พอร์ต 5434, ไม่เกี่ยวข้องกับ container จริง), restore DB backup ล่าสุด, extract ไฟล์แนบ backup ล่าสุด, `npm install` + `prisma generate` + `migrate status`, `npm run build` + `npm run start` บนพอร์ตแยก (3001) | ✅ Build สำเร็จ, login ได้, จำนวนเอกสาร/ไฟล์แนบในแดชบอร์ดตรงกับข้อมูล ณ เวลา backup, เปิดไฟล์แนบผ่าน HTTP ได้เนื้อหาตรง, สร้างเอกสารใหม่ได้เลขที่ `ศรพ.0001/2569-001` ไม่ชนกับเลขเดิม (ตรวจสอบใน DB ว่ามีแค่ 1 แถว), Audit log เดิมครบถ้วน — รื้อ environment จำลองทิ้งหมดหลังทดสอบเสร็จ (ลบ container, ลบโค้ดที่ clone) |

### ปัญหาที่พบระหว่างจำลอง Disaster Recovery และการแก้ไข

1. **`scripts/`, `docs/runbooks/`, และหน้า "สำรองข้อมูล" ยังไม่ได้ commit เข้า Git** — ตอน clone repo ใหม่ตามขั้นตอนที่ 2 ของ runbook ไฟล์เหล่านี้หายไปหมด (เพราะเป็น working-tree changes ที่ยังไม่ commit) ถ้าเกิดภัยพิบัติจริงตอนนี้ การกู้คืนจะ **ล้มเหลวทันทีที่ขั้นตอน 4** เพราะ `scripts/restore-db.sh` จะไม่มีอยู่ในเครื่องใหม่เลย ⚠️ **ต้อง commit ไฟล์เหล่านี้เข้า Git ก่อนส่งมอบโครงงาน** มิเช่นนั้น runbook นี้ใช้งานจริงไม่ได้
2. **`restore-db.sh` ใช้งานไม่ได้กับ absolute path บน Windows** — พบว่า `docker cp` ล้มเหลวเมื่อส่ง path แบบ `/c/Users/...` (Git Bash) เข้าไปพร้อมกับปิด path conversion แบบเหมารวมด้วย `MSYS_NO_PATHCONV=1` (ของเดิมทำให้ path ฝั่ง host ไม่ถูกแปลงเป็น Windows path ที่ถูกต้องด้วย) **แก้แล้ว:** แปลง path ฝั่ง host ด้วย `cygpath -w` อย่างชัดเจนก่อน แล้วค่อยปิด path conversion เฉพาะตอนเรียกคำสั่ง `docker` แต่ละคำสั่ง — ทดสอบซ้ำแล้วใช้ได้ทั้ง absolute และ relative path
3. **`npm run start` (production mode) ติด `UntrustedHost` error จาก Auth.js** — เพราะรันคนละพอร์ต/โดเมนจากที่ตั้งค่าไว้ ต่างจาก `npm run dev` ที่ trust host อัตโนมัติในโหมด development ⚠️ **สำหรับ deploy จริง ต้องตั้ง `AUTH_TRUST_HOST=true` หรือ `AUTH_URL` ให้ตรงกับโดเมนจริงใน `.env`** มิเช่นนั้นจะ login ไม่ได้หลังกู้คืนระบบขึ้น production
