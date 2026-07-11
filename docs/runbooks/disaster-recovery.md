# Runbook: กู้คืนระบบหลังภัยพิบัติ (Disaster Recovery)

> ใช้เอกสารนี้เมื่อเครื่อง/เซิร์ฟเวอร์ที่รันระบบเสียหายทั้งหมด หรือฐานข้อมูล/ไฟล์แนบสูญหาย
> อ้างอิงกลยุทธ์และสคริปต์จาก `docs/modules/module-13-backup-recovery.md` และการติดตั้งเครื่องจาก skill `environment-setup`
> ปรับปรุงล่าสุด **2026-07-11** ให้ตรงกับสภาพแวดล้อม production จริง (Ubuntu Server 24.04 LTS on-premise, `docker compose`) — เวอร์ชันก่อนหน้าอ้างอิงเครื่อง dev แบบ Windows ซึ่งไม่ตรงกับของจริงแล้ว
> ทำตามลำดับขั้นตอนด้านล่างทีละข้อ ไม่ต้องตัดสินใจเพิ่มเติมระหว่างทำ

## สิ่งที่ต้องเตรียมไว้ล่วงหน้า (ก่อนเกิดเหตุ)

- [ ] มีสำเนา backup ฐานข้อมูล (`.dump`) และไฟล์แนบ (`.tar.gz`) อยู่ **นอกเครื่อง server หลัก** (off-site — Google Drive/Dropbox หรือเทียบเท่า) ตามหลัก 3-2-1 (cron รันทุกวัน 02:00 อยู่แล้ว แต่ retention 30 วันเก็บบนเครื่องเดียวกัน — ต้อง sync ออกนอกเครื่องเพิ่มเองด้วย ยังไม่ได้ทำเป็นอัตโนมัติ)
- [ ] เข้าถึง Git repository ได้จากเครื่องใหม่ (`gh auth login` ใหม่ถ้าเป็นเครื่องที่ไม่เคยตั้ง credential helper มาก่อน — เครื่อง production เดิมผูกไว้ผ่าน `gh auth setup-git`)
- [ ] มีไฟล์ `.env.production` (โดยเฉพาะ `DATABASE_URL`, `AUTH_SECRET`, `POSTGRES_USER`/`POSTGRES_PASSWORD`/`POSTGRES_DB`) เก็บแยกไว้อย่างปลอดภัยนอกเครื่อง — ไฟล์นี้ไม่ได้อยู่ใน Git (`.gitignore`) **ถ้าไฟล์นี้หายไปพร้อมเครื่อง กู้คืนไม่ได้เลยแม้จะมี backup DB ครบ**
- [ ] รู้ static IP ที่ตั้งใจให้เครื่องใหม่ใช้ (ปัจจุบัน `192.168.1.155/24`) และมีสิทธิ์แก้ netplan ของเครื่องใหม่

## ขั้นตอนกู้คืนแบบเต็ม

### 1) ติดตั้ง environment ใหม่บนเครื่อง Ubuntu Server 24.04 LTS

ทำตามลำดับขั้นตอนที่ 1-8 ของ skill `environment-setup` ให้ครบ (system update → chrony time sync → Node.js → Docker+Compose → Clone โปรเจกต์ → `.env` files → Prisma migrate) **ห้ามข้ามลำดับ** โดยเฉพาะ time sync ต้องทำก่อนเสมอเพราะกระทบ timestamp ของ Audit Log ทั้งหมดที่จะกู้คืนกลับมา

### 2) Clone โค้ดจาก Git repository

```bash
gh auth login          # ถ้าเครื่องใหม่ยังไม่เคย auth (ดู "สิ่งที่ต้องเตรียมไว้ล่วงหน้า")
gh auth setup-git

git clone https://github.com/whoseyoudaddy22-ui/edoc_management_project.git
cd edoc_management_project
npm install
```

นำไฟล์ `.env.production` ที่เก็บแยกไว้ (นอก Git) มาวางไว้ที่ root ของโปรเจกต์ — **ใช้ `.env.production` ไม่ใช่ `.env`** (`.env` คือค่าฝั่ง dev เท่านั้น ใช้กู้คืน production ไม่ได้)

### 3) ตั้งฐานข้อมูล PostgreSQL ใหม่ (เปล่า) ผ่าน `docker compose`

โปรเจกต์นี้รัน PostgreSQL ผ่าน service `db` ใน `docker-compose.yml` (container ชื่อ `docs-db`, **ไม่ publish port 5432 ออกนอกเครื่อง** ตาม security hardening) — เริ่มเฉพาะ service `db` ก่อน ยังไม่ต้องเริ่ม `app`:

```bash
docker compose --env-file .env.production up -d db
docker compose ps    # รอจน docs-db ขึ้นสถานะ "healthy"
```

ขั้นตอนนี้จะสร้าง named volume `pgdata` ใหม่ (ว่างเปล่า) — ข้อมูลจริงจะกลับมาในขั้นตอนถัดไป

### 4) กู้คืนฐานข้อมูลจาก backup ล่าสุด

```bash
DB_USER=docs_user_prod DB_NAME=docs_management_prod \
  ./scripts/restore-db.sh <path-to-latest-dump-file>
# เช่น: DB_USER=docs_user_prod DB_NAME=docs_management_prod \
#         ./scripts/restore-db.sh backups/database/docs_management_20260711_122448.dump
```

สคริปต์นี้เรียก `pg_restore --clean --if-exists` ผ่าน `docker exec` เข้าคอนเทนเนอร์ `docs-db` โดยตรง (ไม่ต้องติดตั้ง `pg_restore` บน host, ไม่ต้อง publish port) — **ต้อง override `DB_USER`/`DB_NAME` เป็นค่า production เสมอ** ค่า default ในสคริปต์เป็นชื่อฐานข้อมูล dev

> ถ้า role `docs_user_prod` ยังไม่ถูกสร้างในฐานข้อมูลใหม่ (กรณี volume ว่างเปล่าจริงๆ ตามขั้นตอนที่ 3) ให้รัน restore ด้วย `DB_USER=docs_user_prod` ตามด้านบนได้เลย — role นี้ถูกสร้างอัตโนมัติจาก `POSTGRES_USER` ใน `.env.production` ตอน container เริ่มครั้งแรกแล้ว (ดูขั้นตอนที่ 3)

### 5) กู้คืนไฟล์แนบ

`docker-compose.yml` bind mount โฟลเดอร์ `public/uploads` ของ host เข้า container โดยตรง (ไม่ใช่ named volume) — แตะไฟล์บน host ธรรมดาได้เลย ไม่ต้องผ่าน `docker exec`:

```bash
tar -xzf <path-to-latest-uploads-backup>.tar.gz -C public/
# เช่น: tar -xzf backups/files/uploads_20260711_122522.tar.gz -C public/
```

(โครงสร้างในไฟล์ tar.gz คือ `uploads/...` จึงต้อง extract ไปที่ `public/` ไม่ใช่ `public/uploads/`)

### 6) ตรวจสอบว่า migration ตรงกับฐานข้อมูลที่กู้คืน

**ห้ามรัน `npx prisma migrate status`/`migrate deploy` ตรงจาก host** — `DATABASE_URL` ใน `.env.production` ชี้ไปที่ `localhost:5432` เผื่อกรณี deploy แบบไม่ใช้ Docker เท่านั้น แต่ Docker Compose จริงไม่ publish port 5432 ออกจากเครื่อง จะต่อไม่ติด ต้องรันผ่าน service `migrate` แทน (เหมือนที่ใช้จริงตอน deploy ปกติ):

```bash
docker compose --env-file .env.production build migrate   # สำคัญ: build ใหม่เสมอ อย่าไว้ใจ image cache เดิม
docker compose --env-file .env.production run --rm migrate
```

ถ้ามี migration ที่ยังไม่ถูก apply (กรณี backup เก่ากว่า schema ปัจจุบันใน Git) คำสั่งข้างบนจะ apply ให้อัตโนมัติ (ใช้ `migrate deploy` ภายใน ไม่ใช่ `migrate dev`)

### 7) รันระบบเต็มรูปแบบและตรวจสอบ

```bash
docker compose --env-file .env.production up -d --build
docker compose ps    # docs-db + docs-app ต้อง "Up"/"healthy" ทั้งคู่
docker logs docs-app --tail 30   # ต้องไม่มี error
```

ตอนนี้แอปเข้าถึงได้เฉพาะ `127.0.0.1:3000` เท่านั้น (ตาม security hardening) — ต้องทำขั้นตอนที่ 8 ก่อนถึงจะเข้าจากเครื่องอื่นในเครือข่ายได้

### 8) กู้คืนชั้นเครือข่าย/reverse proxy (เดิมไม่มีขั้นตอนนี้ — เพิ่มเข้ามาเพราะจำเป็นจริงถ้าเครื่องเสียหายทั้งเครื่อง)

ทำตามลำดับขั้นตอนที่ 10-13 ของ skill `environment-setup` ให้ครบ ก่อนประกาศว่ากู้คืนสำเร็จ:
- **Static IP** ผ่าน netplan ให้ตรงกับ IP เดิมที่ผู้ใช้คุ้นเคย (ปัจจุบัน `192.168.1.155/24`)
- **Nginx reverse proxy + HTTPS** หน้า `docs-app`: HTTP(80) redirect → HTTPS(443) → `proxy_pass http://127.0.0.1:3000` (cert self-signed เดิมหายไปพร้อมเครื่อง ต้องสร้างใหม่ — ผู้ใช้จะเจอ warning เตือน cert ครั้งแรกอีกครั้ง เป็นเรื่องปกติ ไม่ใช่ปัญหา)
- **ufw**: เปิดเฉพาะ `22`/`80`/`443`
- **fail2ban**: jail `sshd`
- ตั้ง cron backup กลับ (`crontab -e`, สองบรรทัดตาม `docs/modules/module-13-backup-recovery.md` — ต้อง override `DB_USER=docs_user_prod DB_NAME=docs_management_prod` เสมอ)

### 9) ตรวจสอบผ่าน HTTPS จริง

เปิด `https://<IP เครื่องใหม่>` แล้วตรวจตาม "Testing Checklist" ด้านล่าง

## Testing Checklist หลังกู้คืน

- [ ] Login เข้าระบบได้ด้วยบัญชีที่มีอยู่ก่อนเกิดเหตุ
- [ ] จำนวนเอกสารในแดชบอร์ด/หน้า "เอกสารทั้งหมด" ตรงกับต้นฉบับ (เทียบ count จาก backup ก่อนเกิดเหตุถ้ามีบันทึกไว้)
- [ ] เปิดไฟล์แนบตัวอย่างได้ปกติ ไม่เสียหาย
- [ ] สร้างเอกสารใหม่ได้ และเลขที่เอกสารอัตโนมัติไม่ชนกับเลขที่เดิมที่กู้คืนมา (ตรวจ `document-numbering` logic ทำงานถูกต้องหลัง restore)
- [ ] Audit log เดิมยังอยู่ครบ (module 12)
- [ ] เข้าผ่าน HTTPS ได้จริง (ไม่ใช่ port 3000 ตรง), cookie session เป็น `Secure`
- [ ] Logout แล้ว token เก่าใช้ซ้ำไม่ได้ (verify [[session-revocation-fix]] ยังทำงานหลังกู้คืน — เช็ค `User.sessionInvalidatedAt` ถูก preserve มาจาก backup)

> ⚠️ **checklist ชุดนี้ยังไม่เคยถูกทดสอบแบบเต็มรูปแบบ (end-to-end) บนเครื่อง Ubuntu Server จริง** มีเพียงการ verify เฉพาะส่วนฐานข้อมูล (ขั้นตอนที่ 3-6) เท่านั้น (ดูหัวข้อ "ประวัติการทดสอบ Runbook" ด้านล่าง, รายการ 2026-07-11) การทดสอบเต็มรูปแบบครั้งล่าสุด (2026-07-04) ทำบนเครื่อง Windows ที่ไม่ใช้งานแล้ว — **แนะนำให้จำลองเครื่องเสียหายทั้งเครื่องจริงอีกครั้งบน VM ทดสอบแยกต่างหาก** (ไม่ใช่เครื่อง production) ก่อนถือว่า runbook นี้พร้อมใช้งานจริง 100%

## หมายเหตุสภาพแวดล้อม (ปัจจุบัน — Linux production)

- เครื่อง production เป็น **Ubuntu Server 24.04 LTS** (on-premise, IP คงที่ `192.168.1.155`) — มี `pg_dump`/`pg_restore` เข้าถึงได้ผ่าน `docker exec` เข้า container `docs-db` เท่านั้น (ไม่ publish port 5432 ออกจากเครื่องตาม security hardening) สคริปต์ `backup-db.sh`/`restore-db.sh` จึงต้องเรียกผ่าน `docker exec` เสมอ ไม่มีทางเลือกอื่นในสภาพแวดล้อมนี้ (ต่างจากที่เอกสารเวอร์ชันก่อนเข้าใจว่าเป็นทางเลือกสำหรับ Windows เท่านั้น)
- การตั้งเวลาสำรองอัตโนมัติใช้ **`cron`** (`crontab -e`) เรียก `scripts/backup-db.sh` และ `scripts/backup-files.sh` แยกกันสองบรรทัด ทุกวัน 02:00 น. log ไปที่ `logs/backup.log` — **ไม่ได้ใช้ `scripts/run-daily-backup.sh` แล้ว** (ไฟล์นั้นเขียนไว้สำหรับเรียกผ่าน Windows Task Scheduler ตอนยังเป็นเครื่อง dev เก่า ตอนนี้ cron เรียกสองสคริปต์ตรงๆ แทน ไม่ต้องผ่าน wrapper — ดู `crontab -l` บนเครื่องจริงเพื่อยืนยัน)
- Deploy จริงใช้ `docker compose` เต็มรูป (services `db`/`app`/`migrate` ใน `docker-compose.yml`) **ไม่ได้ใช้ `scripts/deploy.sh`/`npm run start` ตรงบน host แล้ว** (สคริปต์นั้นเขียนไว้สำหรับทางเลือก deploy แบบไม่ใช้ Docker ตาม module-15 แต่ของจริงเลือกใช้ Docker Compose เต็มรูปแทน ยังไม่ได้ลบสคริปต์นั้นทิ้งเผื่อใช้อ้างอิง)
- `AUTH_TRUST_HOST=true` และ `AUTH_URL` ตั้งไว้ถูกต้องใน `.env.production` แล้ว (แก้ปัญหา `UntrustedHost` ที่เคยเจอตอนทดสอบบน Windows ไปแล้ว — ดูรายการที่ 3 ใน "ปัญหาที่พบ" ด้านล่าง สถานะ: ✅ แก้แล้วถาวร)

## ประวัติการทดสอบ Runbook นี้

| วันที่ | ทดสอบอะไร | ผล |
|---|---|---|
| 2026-07-04 | รัน `restore-db.sh` กู้คืนไฟล์ `docs_management_20260704_215902.dump` ลงฐานข้อมูลทดสอบแยกต่างหาก (`test_restore_verify` คนละตัวกับของจริง) แล้วเทียบจำนวนแถวตาราง `Document`/`User`/`Attachment` | ✅ ตรงกันทุกตาราง (Document 122, User 8, Attachment 19) |
| 2026-07-04 | ทดสอบ retention policy: สร้างไฟล์ dummy อายุ 35 วันและ 10 วันใน `backups/database` และ `backups/files` แล้วรัน backup scripts | ✅ ไฟล์อายุ 35 วันถูกลบอัตโนมัติ, ไฟล์อายุ 10 วันยังอยู่ (ตรงตาม retention 30 วัน) |
| 2026-07-04 | ทดสอบ restore ไฟล์แนบ: อัปโหลดไฟล์จริงผ่าน `/api/upload` ของแอป → backup ด้วย `backup-files.sh` → extract ไปที่อื่นแยกจาก `public/uploads` จริง → เทียบ sha256 | ✅ ตรงกันทุก byte, เปิดไฟล์อ่านเนื้อหาได้ปกติ |
| 2026-07-04 | **จำลองสถานการณ์เครื่อง server เสียหายทั้งหมด** (บนเครื่อง Windows dev เดิม — เครื่องนี้เลิกใช้แล้ว) ทำตามขั้นตอนของ runbook เวอร์ชันตอนนั้นแบบเต็มรูปแบบ | ✅ Build สำเร็จ, login ได้, ข้อมูล/ไฟล์แนบตรงกับ ณ เวลา backup, Audit log ครบ — รื้อ environment จำลองทิ้งหมดหลังทดสอบเสร็จ |
| **2026-07-11** | **ทดสอบเฉพาะส่วนฐานข้อมูล (ขั้นตอนที่ 3-6 ของ runbook เวอร์ชันปัจจุบัน) บนเครื่อง Linux production จริง**: backup `docs_management_prod` สดใหม่ล่าสุด (23,639 → 24K, หลัง deploy ช่องโหว่ session revocation แล้ว) → `docker compose up -d db` → `restore-db.sh` กู้คืนลงฐานข้อมูลแยก `docs_management_test_restore` (คนละตัวกับ prod จริง ไม่กระทบข้อมูลจริง) ด้วย role superuser `docs_user` → เทียบจำนวนแถว | ✅ ตรงกันทุกตาราง (`User` 6, `Document` 0, `Attachment` 0, `AuditLog` 14 — prod ยังไม่มีเอกสาร/ไฟล์แนบจริงในระบบ ณ ตอนนี้) ✅ คอลัมน์ `sessionInvalidatedAt` (migration ใหม่ล่าสุด) รอดจากการ restore พร้อมค่าข้อมูลถูกต้อง ✅ `_prisma_migrations` มีครบ 10 แถวหลัง restore ✅ `backup-files.sh` รันผ่านไม่มี error (ไม่มีไฟล์แนบจริงให้เทียบ sha256 รอบนี้เพราะยังไม่มี upload จริงใน prod) — **ยังไม่ได้ทดสอบขั้นตอนที่ 1, 2, 7, 8, 9 (ติดตั้งเครื่องใหม่ทั้งเครื่อง/Nginx/firewall/static IP) เพราะเสี่ยงเกินไปที่จะทำกับเครื่อง production จริงโดยไม่มี VM แยกต่างหาก** |

### ปัญหาที่พบระหว่างจำลอง Disaster Recovery (2026-07-04, บนเครื่อง Windows เดิม) และสถานะปัจจุบัน

1. **`scripts/`, `docs/runbooks/`, และหน้า "สำรองข้อมูล" ยังไม่ได้ commit เข้า Git** ตอนทดสอบครั้งนั้น — **สถานะ: ✅ แก้แล้ว** ยืนยันด้วย `git ls-files scripts/ docs/runbooks/` ว่าทั้ง `backup-db.sh`, `backup-files.sh`, `restore-db.sh`, `deploy.sh`, `run-daily-backup.sh`, และไฟล์นี้เองอยู่ใน Git ครบแล้ว (2026-07-11)
2. **`restore-db.sh` ใช้งานไม่ได้กับ absolute path บน Windows** (ปัญหา `cygpath`/`MSYS_NO_PATHCONV`) — **สถานะ: ไม่เกี่ยวข้องอีกต่อไป** เครื่อง production เป็น Linux ล้วน ไม่มี MSYS/Git Bash เกี่ยวข้อง (โค้ดส่วนนี้ยังหลงเหลืออยู่ใน `scripts/restore-db.sh` แต่ไม่ทำอะไรบน Linux เพราะเช็ค `command -v cygpath` ก่อนเสมอ ไม่กระทบการทำงานจริง)
3. **`npm run start` (production mode) ติด `UntrustedHost` error จาก Auth.js** — **สถานะ: ✅ แก้แล้ว** `.env.production` ตั้ง `AUTH_TRUST_HOST=true` และ `AUTH_URL` ให้ตรงกับ `https://192.168.1.155` แล้ว ยืนยันจาก login จริงสำเร็จหลาย deploy ต่อเนื่อง (ล่าสุด 2026-07-11)
