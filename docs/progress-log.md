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

### เข้าใช้งานระบบตอนนี้
- Production จริง: `https://192.168.1.155` (self-signed cert เตือนครั้งแรก กด Advanced → Proceed) — บัญชี admin/audit จริงคนละรหัสกับ dev, บัญชีอาจารย์ทดสอบ 4 role (`*@test.com` / `Test1234`) ก็ล็อกอินผ่าน URL นี้ได้เหมือนกัน
- ถ้าเครื่อง reboot ไปแล้วอยากกลับมาที่ session แชทนี้: `cd` เข้าโฟลเดอร์โปรเจกต์แล้วรัน `claude --continue`
