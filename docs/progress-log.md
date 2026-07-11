# Progress Log

## 2026-07-05

- สถานะ: ไม่มีการแก้ไขโค้ดใหม่ในวันนี้ (git working tree สะอาด, ไม่มีอะไรให้ commit)
- ความคืบหน้าล่าสุดของโปรเจกต์ยังอยู่ที่ commit `23c2670` (module 15: production deployment setup) ซึ่งเป็น module สุดท้ายตามแผน
- งานที่ทำก่อนเลิกงาน: ตรวจสอบ git status, หยุด dev server (`npm run dev`) ที่ค้างอยู่, หยุด container ฐานข้อมูล `docs-db` ด้วย `docker stop` (ไม่ลบ volume/ข้อมูล)
- หมายเหตุ: container ชื่อ `docs-db` รันขึ้นด้วยคำสั่ง `docker run` ตรง ๆ (ตาม CLAUDE.md) ไม่ได้อยู่ภายใต้ `docker compose` ของโปรเจกต์นี้ (`docker compose ps` ไม่เห็น service ใด ๆ) จึงหยุดด้วย `docker stop docs-db` แทน `docker compose down` เพื่อให้ได้ผลลัพธ์เดียวกัน (หยุด service แต่ไม่ลบข้อมูล)
- ต่อไป: ถ้าจะเริ่มงานต่อ ให้ `docker start docs-db` แล้ว `npm run dev` ใหม่

## 2026-07-06

สรุปงานยาวทั้งวัน ครอบคลุม module-14 (testing) ต่อจนจบ และ module-15 (deployment) เกือบทั้งหมด

- **Push commits ค้าง:** push commit ที่ค้างไว้ตั้งแต่ก่อนหน้าขึ้น origin เรียบร้อย (รวมรอบนี้ล่าสุดคือ `eab261c`)
- **module-14 (Testing):** สร้าง `.env.test`/`.env.production` ครบ (secret สุ่มใหม่ทั้งหมด ไม่ copy จาก `.env` dev) สร้าง Postgres role/database แยก 3 ชุด (`docs_management_test`, `docs_management_test_restore`, `docs_management_prod`) migrate schema ครบ รัน `npm run test` ผ่านทั้งหมด **95/95 tests, 8/8 files**
- **module-15 (Deployment):**
  - Seed บัญชี production เฉพาะที่ตั้งใจไว้ (`admin.prod@plvc.ac.th`, `auditplvc@plvc.ac.th`) ผ่าน `prisma/seed-prod.ts` ใหม่ (แยกจาก `seed.ts` ที่มีบัญชี dev ปนอยู่) — เปลี่ยนรหัสผ่าน `admin.prod` เป็นค่าสุ่มใหม่แล้ว (เก็บไว้นอกเอกสารนี้ ไม่บันทึกรหัสผ่านจริงในไฟล์นี้เพราะ commit เข้า git)
  - สร้างบัญชีทดสอบสำหรับอาจารย์ครบ 4 role ผ่าน `prisma/seed-advisor.ts` (`saraban@test.com`/`admin@test.com`/`approver@test.com`/`viewer@test.com`, password `Test1234`) — seed ไว้ทั้งฐานข้อมูล dev และ prod
  - ตั้ง backup cron บน production จริง (`crontab -l` มี 2 entries รันทุกวัน 02:00 เรียก `scripts/backup-db.sh`/`backup-files.sh` พร้อม `chmod +x` ให้สคริปต์ทั้งหมดที่เคยขาด execute permission)
  - ติดตั้ง + ตั้งค่า `fail2ban` (jail `sshd`, `maxretry=3`, `findtime=5m`, `bantime=10m`) ทดสอบจริงด้วยการยิง SSH ผิด user ใส่ `127.0.0.1` แล้วยืนยัน ban ทำงาน
  - **ทดสอบ reboot จริง 1 ครั้ง** เพื่อพิสูจน์ auto-recovery: Docker/cron/fail2ban/container กลับมาเองสำเร็จหมด — แต่ IP เปลี่ยนจาก `.154` เป็น `.155` (DHCP) ทำให้เข้าเว็บไม่ได้ชั่วคราว แก้โดย**ตั้ง static IP ถาวรที่เครื่องนี้ผ่าน netplan** (ไม่ใช่ router reservation) เป็น `192.168.1.155/24` (backup ไฟล์เดิมไว้ที่ `/etc/netplan/50-cloud-init.yaml.bak`) — ต้องระวัง IP conflict ในอนาคตถ้า router แจก `.155` ให้เครื่องอื่น (ยังไม่ได้ตั้ง DHCP reservation ที่ router)
  - ย้ายจากรัน `next start` ตรงบน host มาเป็น **`docker compose` เต็มรูป** (`docs-db` + `docs-app`) ทั้งคู่มี `restart: unless-stopped`
  - ติดตั้ง **Nginx reverse proxy + HTTPS (self-signed cert)** หน้า `docs-app`: HTTP (80) redirect ไป HTTPS (443) → proxy ไป `127.0.0.1:3000`; แก้ `docker-compose.yml` ผูก port 3000 กับ `127.0.0.1` เท่านั้น (ยิงตรงจากภายนอกเข้าไม่ได้อีกแล้ว ต้องผ่าน Nginx) ทดสอบ login จริงผ่าน `https://192.168.1.155` สำเร็จ (cookie `Secure`, session ใช้งานได้)
  - ผลข้างเคียงที่ต้องรู้: หลังเปลี่ยนมาใช้ `docker compose` เต็มรูป `docs-db` ไม่ publish port 5432 ออก host แล้ว (ตรงตาม security hardening ของ module-15) เครื่องมือที่เคยรันจาก host ตรงๆ (เช่น `npx prisma ...`, seed scripts) จะต่อฐานข้อมูล prod ไม่ได้อีก ต้องรันผ่าน `docker compose run`/`docker exec`/หรือ build image ชั่วคราวต่อ network เดียวกันแทน

### ยังไม่ได้ทำ (ต่อพรุ่งนี้)
- [ ] ตั้งค่า `ufw` firewall (เปิดเฉพาะ 22/80/443, ปิดที่เหลือ) — ยังไม่ทำเพราะต้องเช็ค SSH rule ก่อนเปิดใช้กันหลุดจาก remote session
- [ ] ตั้ง DHCP reservation ที่ router สำหรับ MAC ของเครื่องนี้ เพื่อลดความเสี่ยง IP conflict ในอนาคต (ตอนนี้กันด้วย static IP ฝั่งเครื่องอย่างเดียว)
- [ ] อัปเดต `docs/runbooks/disaster-recovery.md` — ยังอ้างอิงเครื่อง dev แบบ Windows/Task Scheduler เดิม ไม่ตรงกับเครื่องนี้ที่เป็น Linux จริงแล้ว
- [ ] ทดสอบ rollback จริง 1 ครั้งตาม module-15 checklist (deploy เวอร์ชันทดสอบแล้วย้อนกลับ)
- [ ] Revoke GitHub PAT ที่ใช้ push หลายรอบ (หลุดเข้า chat history ไปแล้ว) แล้วเปลี่ยนไปใช้ `gh auth login` แทนในอนาคต
- [ ] ตรวจสอบ "ประวัติการทดสอบ Runbook" ท้าย `disaster-recovery.md` ให้ตรงกับสถานะจริงล่าสุด

## 2026-07-07

- **ยืนยันผลทดสอบ `sudo shutdown` จริง (poweroff เต็มรูป ไม่ใช่แค่ reboot):** เปิดเครื่องกลับมาวันถัดไป เข้าเว็บผ่าน `https://192.168.1.155` (ผ่าน Nginx reverse proxy จริง ไม่ใช่ port 3000 ตรง) ได้ปกติ, static IP กลับมาเป็น `192.168.1.155` เหมือนเดิมตามที่ตั้งไว้ใน netplan → **ปิดรายการ "Nginx/static IP ยังไม่เคยผ่านการทดสอบ reboot จริง" ได้แล้ว** (docker/cron/fail2ban เคยยืนยันจากการทดสอบ reboot รอบก่อนหน้าอยู่แล้ว)

### ยังไม่ได้ทำ (อัปเดต)
- [x] ตั้งค่า `ufw` firewall (2026-07-07) — เปิดเฉพาะ `22`/`80`/`443` (IPv4+IPv6), default deny incoming/allow outgoing, `systemctl is-enabled ufw` = enabled (บูตแล้วเปิดเองอัตโนมัติ) ทดสอบแล้ว SSH session เดิมไม่หลุดระหว่างเปิดใช้งาน
- [ ] ตั้ง DHCP reservation ที่ router
- [ ] อัปเดต `docs/runbooks/disaster-recovery.md` (ยังอ้างอิงเครื่อง Windows เดิม)
- [x] ทดสอบ rollback จริง (2026-07-07) — ขอบเขต: เฉพาะระดับแอป/Docker image (ไม่แตะ DB schema) ผลลัพธ์: **ผ่านทั้งหมด** deploy เวอร์ชันทดสอบ (`[TEST-ROLLBACK-v2]` title marker) → ยืนยันขึ้นจริงผ่าน Nginx → retag image เดิม (`edoc-app:known-good-39e57d5`) กลับมาแล้ว rollback → ยืนยันกลับเป็นเดิม → rebuild ใหม่จาก git HEAD สะอาด → ยืนยันรอบสุดท้ายตรงกับต้นฉบับ ข้อมูล prod (6 users) อยู่ครบตลอดทุกขั้นตอน แม้ compose จะ recreate container `docs-db` เองระหว่างทาง (ผลข้างเคียงที่ไม่ทำลายข้อมูล เพราะอยู่ใน volume `pgdata` แยกจาก container — พบซ้ำเป็นครั้งที่ 2 ในโปรเจกต์นี้)
- [ ] Revoke GitHub PAT เก่า
- [ ] ตรวจสอบ "ประวัติการทดสอบ Runbook" ท้าย `disaster-recovery.md`

### เข้าใช้งานระบบตอนนี้
- Production จริง: `https://192.168.1.155` (self-signed cert เตือนครั้งแรก กด Advanced → Proceed) — บัญชี admin/audit จริงคนละรหัสกับ dev, บัญชีอาจารย์ทดสอบ 4 role (`*@test.com` / `Test1234`) ก็ล็อกอินผ่าน URL นี้ได้เหมือนกัน
- ถ้าเครื่อง reboot ไปแล้วอยากกลับมาที่ session แชทนี้: `cd` เข้าโฟลเดอร์โปรเจกต์แล้วรัน `claude --continue`

## 2026-07-11

Deploy โค้ดล่าสุดจาก `master` ขึ้น production จริง แล้วรัน security testing เต็มรูป 8 scenario ตาม skill `kali-security-testing`

- **Pull ค้าง 34 commits จาก origin/master:** local เคย "ahead 1 commit" อยู่ก่อนหน้า แต่จริงๆ origin ไปไกลกว่ามาก (merge branch `feature/ui-redesign` เข้า master แล้ว) ได้ของใหม่มาด้วย: skill `ubuntu-server-ops` และ `kali-security-testing` (ที่ก่อนหน้านี้เข้าใจผิดว่าไม่มีอยู่จริง), migration ใหม่ 3 ตัว (`add_user_profile_fields`, `add_memo_closing_text_department_name`, `add_document_type_layout`), และโค้ดหน้าบ้าน/หลังบ้านอีกจำนวนมาก
- **Deploy production ตาม playbook ของ `ubuntu-server-ops` (หัวข้อ 6):** backup DB (`docs_management_prod`) → tag image เดิมเป็น known-good (`edoc-app:pre-deploy-...`) → migrate → build+up → verify
  - **เจอบั๊ก build-blocking ระหว่างทาง:** `.dockerignore` กัน `tests/` ทั้งโฟลเดอร์ออกจาก Docker build context แต่ `prisma/seed-test.ts` (ถูกกวาดเข้า typecheck ของ `next build` เพราะ `tsconfig.json` include `**/*.ts`) import `../tests/db-test-helpers` อยู่ → build ล้มเหลวทุกครั้งที่รันใน Docker (แต่ผ่านปกตินอก Docker เพราะไฟล์มีอยู่จริงบน host) — แก้โดยลบ `tests` ออกจาก `.dockerignore` (commit `02968d1`) ไม่กระทบ image สุดท้ายเพราะ runner stage ของ `Dockerfile` copy เฉพาะ path ที่ระบุไว้เท่านั้น ไม่รวม `tests/`
  - Deploy สำเร็จ ยืนยันด้วย login จริงผ่าน `https://192.168.1.155` (ได้ session จริง, `/dashboard` 200, ไม่มี error ใน `docker logs docs-app`)
- **Security testing 8/8 scenario ผ่าน `localhost:3001` (`docs_management_test`):**
  - ก่อนเริ่มทดสอบต้องแก้ 2 ปัญหาของ test env ที่ไม่เกี่ยวกับ deploy: (1) Prisma client บน host ค้าง schema เก่า (ต้อง `npx prisma generate` ใหม่) (2) `docs_management_test` เองก็ยังไม่เคย apply migration 3 ตัวใหม่เหมือนกัน (ต้อง `npm run test:db:migrate` แยกจาก prod)
  - ผลสรุป: **7/8 scenario ไม่พบช่องโหว่** (Broken Access Control, IDOR, SQL Injection ผ่าน `sqlmap`, Unrestricted File Upload, Document Numbering Race Condition ยิง 20 concurrent requests ไม่ซ้ำเลขเลย, Audit Log Immutability ทั้งระดับ API และ DB trigger)
  - **พบช่องโหว่จริง 1 รายการ (Medium, CWE-613):** session ไม่ถูก revoke หลัง logout เพราะ NextAuth ใช้ `session.strategy: "jwt"` แบบ stateless — token ที่ capture ไว้ก่อน logout ยังเข้า `/dashboard` ได้ปกติหลัง logout ไปแล้วจริง (ทดสอบยืนยันด้วย raw token replay ไม่ผ่าน cookie jar) ยังไม่ได้แก้ รอตัดสินใจว่าจะทำก่อน go-live เต็มรูปไหม
  - รายงานฉบับเต็มอยู่ใน Claude artifact (ลิงก์ในบทสนทนา ไม่ได้ commit เข้า repo)
- **ปิด TODO ค้างนาน — GitHub push:** พบว่าเครื่องนี้ไม่เคยตั้ง git credential helper เลยตั้งแต่ต้น (ไม่มี `credential.helper`, ไม่มี `~/.git-credentials`) ทำให้ push ทุกครั้งต้อง auth แบบ interactive และล้มเหลวในเซสชันที่ไม่มี TTY ซ้ำๆ — แก้โดยติดตั้ง `gh` CLI แล้ว `gh auth login` + `gh auth setup-git` ผูก credential helper ระดับเครื่อง ปิดรายการ "Revoke GitHub PAT / เปลี่ยนไปใช้ gh auth login" ที่ค้างมาตั้งแต่ 2026-07-06 ได้แล้ว

### ยังไม่ได้ทำ (อัปเดต)
- [x] Revoke GitHub PAT เก่า / เปลี่ยนไปใช้ `gh auth login` (2026-07-11)
- [ ] **แก้ช่องโหว่ session revocation หลัง logout** (พบใหม่วันนี้, Medium) — เพิ่ม `sessionInvalidatedAt`/`tokenVersion` เช็คใน `jwt` callback หรือเปลี่ยนเป็น `session.strategy: "database"`
- [ ] ตั้ง DHCP reservation ที่ router
- [ ] อัปเดต `docs/runbooks/disaster-recovery.md` (ยังอ้างอิงเครื่อง Windows เดิม)
- [ ] ตรวจสอบ "ประวัติการทดสอบ Runbook" ท้าย `disaster-recovery.md`
- [ ] (เสริม ไม่เร่งด่วน) เพิ่ม Content-Security-Policy header, sanitize `Attachment.fileName` ก่อนบันทึก DB — จากรายงาน security testing วันนี้
