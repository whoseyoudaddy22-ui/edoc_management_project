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
- [x] **แก้ช่องโหว่ session revocation หลัง logout** (2026-07-11 บ่าย, ดูรายละเอียดด้านล่าง) — โค้ด commit แล้ว (`919778a`) และ **deploy ขึ้น production เรียบร้อยแล้ว** (2026-07-11 บ่าย)
- [ ] ตั้ง DHCP reservation ที่ router — **ต้องทำผ่านหน้า admin ของ router โดยตรง อยู่นอกเหนือขอบเขตที่ทำจากเครื่องนี้ได้ ต้องให้ผู้ใช้ทำเอง**
- [x] อัปเดต `docs/runbooks/disaster-recovery.md` (2026-07-11 บ่าย) — เขียนใหม่ให้ตรงกับ Linux production stack จริง (เดิมอ้างอิงเครื่อง Windows/Task Scheduler/port 5433 ที่เลิกใช้แล้ว) เพิ่มขั้นตอน Nginx/HTTPS/ufw/fail2ban/static IP ที่หายไปทั้งหมด (เดิมกู้คืนได้แค่ตัวแอป เข้าเว็บจากเครื่องอื่นไม่ได้เลย)
- [x] ตรวจสอบ "ประวัติการทดสอบ Runbook" ท้าย `disaster-recovery.md` (2026-07-11 บ่าย) — เพิ่มแถวทดสอบใหม่: backup `docs_management_prod` สดจริง → restore ลง `docs_management_test_restore` (แยกจาก prod จริง) → row count ตรงกันทุกตาราง, `sessionInvalidatedAt` รอดจากการ restore, migration ครบ 10 ตัว — ปิด "ปัญหาที่พบ" เดิม 2/3 ข้อ (commit scripts เข้า git แล้ว, `AUTH_TRUST_HOST` ตั้งถูกแล้ว) ข้อที่เหลือ (cygpath) ไม่เกี่ยวข้องแล้วเพราะย้ายมา Linux — **ยังไม่ได้ทดสอบกู้คืนเครื่องทั้งเครื่อง (Nginx/firewall/static IP) แบบจริงจัง เพราะเสี่ยงเกินไปที่จะทำกับ production ตรงๆ โดยไม่มี VM แยก แนะนำให้ทำก่อนส่งมอบโครงงานถ้าเป็นไปได้**
- [ ] (เสริม ไม่เร่งด่วน) เพิ่ม Content-Security-Policy header, sanitize `Attachment.fileName` ก่อนบันทึก DB — จากรายงาน security testing วันนี้

### แก้ช่องโหว่ CWE-613 (session revocation หลัง logout) — บ่าย 2026-07-11

Commit `919778a` — `fix(auth): revoke JWT session on logout (CWE-613)`

- **แนวทางที่เลือก:** ไม่ได้เปลี่ยนไปใช้ `session.strategy: "database"` ตามที่ TODO เดิมเสนอไว้ (ต้องเพิ่ม adapter/Session table ใหญ่เกินจำเป็น) แต่เพิ่ม field `User.sessionInvalidatedAt` แทน — logout เซ็ตเป็นเวลาปัจจุบัน แล้ว `jwt()` callback (`src/lib/auth.config.ts`) เช็คทุก request ว่า `token.iat` เก่ากว่าค่านี้หรือ user ถูกปิดใช้งาน (`isActive=false`) ไหม ถ้าใช่ return `null` ให้ next-auth เคลียร์ session ทันที
- **สิ่งที่ค้นพบระหว่างทางที่เปลี่ยนแผน:** คอมเมนต์เดิมใน `auth.config.ts` เขียนไว้ว่าห้ามใช้ Prisma เพราะต้องรันบน Edge runtime ใน middleware — ตรวจสอบ `node_modules/next` จริง (Next.js 16.2.10) แล้วพบว่าไม่จริงอีกต่อไป: โปรเจกต์นี้ใช้ `src/proxy.ts` ซึ่งเป็น convention ใหม่ของ Next.js 16 (แทน `middleware.ts`) และ **proxy.ts บังคับรันบน Node.js runtime เสมอ ตั้ง edge ไม่ได้เลย** (ระบบ throw error E1031 ถ้าพยายามตั้ง) เพราะงั้นเรียก Prisma ตรงใน `jwt()` callback ที่ทั้ง `proxy.ts` และ `auth.ts` ใช้ร่วมกันได้อย่างปลอดภัย — เป็นทางแก้ที่ตรงจุดกว่าเดิมมาก
- **ทดสอบยืนยันจริง (ไม่ใช่แค่ unit test):** รันเซิร์ฟเวอร์แยก (`npm run dev:ui-test` port 3001, DB `docs_management_test`, ไม่แตะ prod เลย) ทำ raw token replay แบบเดียวกับตอน security testing เดิม — login → capture session cookie ไว้ต่างหาก → logout → ยิง `/dashboard` ด้วย cookie เก่าตรงๆ (ข้าม cookie jar ปกติ) ผลคือ **307 redirect ไป `/login`** (ก่อนแก้คือ 200 เข้าได้ปกติ ตามที่รายงานไว้เมื่อเช้า) และ query DB ยืนยัน `sessionInvalidatedAt` ถูกเซ็ตจริงหลัง logout
- `npm run test` ผ่านครบ 95/95 (ไม่มี regression), `npm run build` ผ่าน — migration ใหม่ `20260711111230_add_session_invalidated_at` เป็น additive-only (`ALTER TABLE ... ADD COLUMN`) ปลอดภัยกับข้อมูลเดิม
- ระหว่างทดสอบต้อง publish port 5432 ของ `docs-db` ชั่วคราว (ผ่าน `docker-compose.dev.yml` override) เพื่อรัน `prisma migrate dev` กับฐาน dev บน host ได้ — **เปิดเสร็จก็ปิดกลับเป็น production-only compose ทันที** (ไม่ publish port 5432 ออกจากเครื่องอีกต่อไป) production (`docs-app`/`docs-db`) ไม่ถูกแตะระหว่างกระบวนการทั้งหมดเลย ยืนยันแล้วว่า `https://192.168.1.155` ยังตอบ 200 ปกติ
- **Deploy ขึ้น production ตาม playbook ของ `ubuntu-server-ops` (หัวข้อ 6) เรียบร้อยแล้ว** (ผู้ใช้สั่งให้ deploy ต่อทันทีในบทสนทนาเดียวกัน):
  - `git push origin master` (commit `919778a` + `e16e62d`)
  - Backup DB prod ก่อนเสมอ: `DB_USER=docs_user_prod DB_NAME=docs_management_prod ./scripts/backup-db.sh` → `backups/database/docs_management_20260711_115230.dump` (24K)
  - Tag image เดิมเป็น known-good: `edoc-app:known-good-44e1d59` (ก่อนหน้า 2 commit ที่เพิ่ง push)
  - **จุดที่พลาดแล้วแก้ทัน:** รัน `docker compose run --rm migrate` ครั้งแรกแล้วขึ้น "No pending migrations to apply" ทั้งที่ควรมี migration ใหม่ — สาเหตุคือ service `migrate` ใช้ image cache เดิม (build ก่อนหน้าคอมมิทวันนี้) เพราะ `docker compose run` ไม่ rebuild อัตโนมัติถ้า image มีอยู่แล้ว ต้องรัน `docker compose build migrate` แยกก่อน แล้วรัน `run --rm migrate` ใหม่ถึงจะเจอ migration `20260711111230_add_session_invalidated_at` และ apply สำเร็จ (ตรวจ column ยืนยันด้วย `\d "User"` ในเครื่อง DB จริง)
  - `docker compose --env-file .env.production up -d --build` → `docs-app` recreate สำเร็จ, log สะอาดไม่มี error, `docker compose ps` ทั้งคู่ up
  - **Verify ด้วย raw token replay จริงบน production** (บัญชีทดสอบ `saraban@test.com`/`Test1234`): login → `/dashboard` 200 → logout → ยิง cookie เก่าซ้ำ → **307 ไป `/login`** (ก่อน deploy รอบนี้จะเป็น 200) ยืนยันช่องโหว่ปิดจริงบน production ไม่ใช่แค่ dev/test
  - ปิดรายการนี้ได้เต็มรูปแล้ว ไม่มีรายการค้างต่อจากงานนี้
- **Docker cleanup หลัง deploy** (บ่าย 2026-07-11): ลบ image rollback tag เก่าที่ถูกแทนที่แล้ว (`known-good-39e57d5`, `pre-deploy-20260711081402`) เหลือแค่ `known-good-44e1d59` ที่เป็นจุด rollback ปัจจุบัน, `docker builder prune -f` ล้าง build cache (คืนพื้นที่ ~7GB), `docker image prune -f` ล้าง dangling image (~56MB), `docker system prune --volumes -f` (ไม่ใช้ `-a` เพราะจะลบ `known-good-44e1d59` ทิ้งไปด้วย — เช็คด้วย dry-run ที่ทำเองก่อนว่า `-a` จะลบอะไรบ้างแล้วเลือกไม่ทำ) ผลรวม: disk ว่างจาก 73G เป็น 79G ไม่กระทบ `docs-app`/`docs-db` เลย

### เขียนใหม่ `docs/runbooks/disaster-recovery.md` ให้ตรงกับ production จริง — บ่าย 2026-07-11 (ตั้งเป้าหมาย `/goal` ให้ระบบพร้อม go live)

Commit `bcb270f` — พบว่า runbook ทั้งไฟล์ยังอ้างอิงเครื่อง Windows dev เดิม (port 5433 แบบ `docker run` เดี่ยว, Windows Task Scheduler, `npx prisma` ตรงบน host) ซึ่งใช้ไม่ได้จริงกับเครื่อง production ปัจจุบันเลย (Linux, `docker compose`, ไม่ publish port 5432) และ**ไม่มีขั้นตอนกู้คืน Nginx/HTTPS/ufw/fail2ban/static IP เลยสักบรรทัด** — ถ้าเครื่องเสียหายจริงแล้วทำตาม runbook เดิม จะกู้คืนได้แค่ตัวแอปที่เข้าได้เฉพาะจาก `localhost:3000` เท่านั้น เข้าจากเครื่องอื่นในเครือข่ายไม่ได้เลย

- **เขียนใหม่ทั้งไฟล์:** ปรับทุกขั้นตอนให้ใช้ `docker compose` (service `db` ก่อน → restore → migrate ผ่าน service `migrate` → `up -d --build` เต็ม stack) เพิ่มขั้นตอนที่ 8 ใหม่ทั้งหมด (กู้คืน static IP/Nginx/ufw/fail2ban/cron ตาม `environment-setup` skill) แก้คอมเมนต์เข้าใจผิดใน `scripts/run-daily-backup.sh` (เขียนไว้ว่าเรียกโดย Windows Task Scheduler ทั้งที่ปัจจุบัน cron เรียก `backup-db.sh`/`backup-files.sh` ตรงๆ ไม่ผ่านสคริปต์นี้แล้ว)
- **ทดสอบจริงก่อนเขียนเอกสาร (ไม่ใช่แค่แก้ข้อความ):** backup `docs_management_prod` สดใหม่ล่าสุด → เริ่ม `docker compose up -d db` → `restore-db.sh` กู้คืนลง `docs_management_test_restore` (ฐานข้อมูลแยกที่เตรียมไว้สำหรับ drill นี้โดยเฉพาะ ไม่กระทบ prod จริง) ด้วย role superuser `docs_user` → เทียบผลลัพธ์กับ prod จริง: **row count ตรงกันทุกตาราง** (`User` 6, `AuditLog` 14, `Document`/`Attachment` 0 เพราะยังไม่มีข้อมูลจริงใน prod), คอลัมน์ `sessionInvalidatedAt` (migration ล่าสุดของวันนี้) รอดจากการ restore พร้อมค่าถูกต้อง, `_prisma_migrations` ครบ 10 แถว, `backup-files.sh` รันผ่านไม่มี error
- **ปิด "ปัญหาที่พบ" เดิมจากการทดสอบปี 2026-07-04 ได้ 2/3 ข้อ:** (1) scripts/runbooks ไม่เคย commit เข้า git ตอนนั้น → ตอนนี้ commit ครบแล้ว ยืนยันด้วย `git ls-files` (2) `AUTH_TRUST_HOST`/`AUTH_URL` ปัญหา `UntrustedHost` → ตั้งถูกต้องใน `.env.production` แล้ว ยืนยันจาก login จริงสำเร็จหลายรอบ ข้อที่ 3 (`cygpath`/MSYS path bug) ไม่เกี่ยวข้องอีกต่อไปเพราะย้ายมา Linux แล้ว
- **สิ่งที่ตั้งใจไม่ทำ เพราะเสี่ยงเกินไป:** ไม่ได้จำลองเครื่อง production เสียหายทั้งเครื่องแบบเต็มรูปแบบ (ขั้นตอนที่ 1, 2, 7, 8, 9 ของ runbook ใหม่ — ติดตั้งเครื่องใหม่/Nginx/firewall/static IP) เพราะไม่มี VM แยกต่างหากให้ทดสอบ การจำลองบน production ตรงๆ มีความเสี่ยง downtime สูงเกินไปสำหรับสิ่งที่ทำได้แค่ประเมิน ไม่ใช่คำสั่งที่ผู้ใช้ขอโดยตรง — ทำเครื่องหมายไว้ชัดเจนในตัว runbook เองว่ายังไม่ผ่านการทดสอบส่วนนี้ แนะนำให้ทำก่อนส่งมอบโครงงานถ้ามี VM ทดสอบแยกได้
