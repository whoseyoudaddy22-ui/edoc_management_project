---
name: environment-setup
description: Best practices for installing, configuring, and verifying the runtime environment for the Electronic Document Creation and Archiving Management System on Ubuntu Server 24.04 LTS. Use this skill whenever setting up a new server/VM for this project, verifying an existing environment before go-live, troubleshooting missing .env/database/Docker issues, or hardening the on-premise Ubuntu server (Nginx, systemd, firewall, time sync, backups). Also use when a command fails because DATABASE_URL, .env, .env.test, or .env.production is missing.
---

# Environment Setup (การติดตั้งสภาพแวดล้อมบน Ubuntu Server 24.04 LTS)

## Purpose

โปรเจกต์นี้ใช้ Ubuntu Server 24.04 LTS เป็น OS หลัก (บน VirtualBox สำหรับ on-premise หรือ VPS สำหรับ upscale ในอนาคต) ไฟล์นี้รวบรวม **ลำดับการติดตั้งที่ถูกต้อง** และ **จุดตรวจสอบก่อนเริ่มงานทุกครั้ง** เพื่อป้องกันปัญหาที่เคยเกิดขึ้นจริงในโปรเจกต์นี้ — เช่น การรัน `npm run test` หรือ `npx prisma migrate status` บนเครื่องที่ยังไม่มี Docker/PostgreSQL/`.env` ทำให้ตรวจสอบอะไรไม่ได้เลย

**กฎเหล็ก:** ก่อนรันคำสั่งใดๆ ที่เกี่ยวกับฐานข้อมูลหรือ environment variable (`npm run test`, `npx prisma migrate`, `npm run build/start`) **ต้องตรวจสอบก่อนเสมอว่า Docker/PostgreSQL รันอยู่จริง และไฟล์ `.env` ที่เกี่ยวข้องมีอยู่จริง** ห้ามรันคำสั่งแล้วสรุปผลจาก error message ที่เกิดจาก environment ไม่พร้อม ว่าเป็นผลการทดสอบจริง

## ลำดับการติดตั้ง (Installation Order — ห้ามข้ามลำดับ)

การติดตั้งต้องทำตามลำดับนี้ เพราะแต่ละขั้นพึ่งพาขั้นก่อนหน้า:

```
1. System update + พื้นฐาน (git, curl, build tools)
2. Time sync (chrony) — ทำก่อน service อื่นเสมอ เพราะกระทบ timestamp ของทุกอย่างที่ตามมา
3. Node.js (native installer หรือ nvm)
4. Docker + Docker Compose
5. PostgreSQL (ผ่าน Docker container)
6. Clone โปรเจกต์ + npm install
7. สร้างไฟล์ .env / .env.test / .env.production
8. Prisma migrate + verify
9. Claude Code (ติดตั้งได้ทุกจุดหลังจากนี้ ไม่ผูกกับลำดับข้างบน)
10. Nginx reverse proxy (ทำหลังแอปรันได้แล้วเท่านั้น)
11. systemd service (ทำหลัง build/start ผ่านด้วยมือแล้วเท่านั้น)
12. Security hardening (SSH, fail2ban, ufw, unattended-upgrades)
13. Backup automation (cron)
```

## 1) System Update + พื้นฐาน

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl build-essential ca-certificates gnupg
```

## 2) Time Sync (chrony) — ทำก่อนเสมอ

```bash
sudo apt install -y chrony
sudo timedatectl set-timezone Asia/Bangkok
sudo systemctl enable chrony --now
timedatectl status   # ตรวจว่า "System clock synchronized: yes"
```

**เหตุผลที่ต้องทำก่อน:** ระบบนี้มี Audit Log (บันทึก timestamp ทุก action) และ Document Numbering (อ้างอิงปี พ.ศ./วันที่) — ถ้าเวลาเครื่องเพี้ยนตั้งแต่ต้น ข้อมูลที่บันทึกทั้งหมดหลังจากนี้จะผิดตาม

## 3) Node.js

**แนะนำ:** ใช้ Node.js 20 LTS ผ่าน nvm เพื่อจัดการเวอร์ชันได้ง่าย

```bash
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.7/install.sh | bash
source ~/.bashrc
nvm install --lts
nvm use --lts
node -v && npm -v   # ต้องเห็นเวอร์ชันตอบกลับ ไม่ error
```

## 4) Docker + Docker Compose

```bash
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker $USER
newgrp docker   # หรือ logout/login ใหม่ให้ group มีผล
docker --version && docker compose version
docker run hello-world   # ทดสอบว่า Docker ทำงานได้จริง
```

## 5) PostgreSQL ผ่าน Docker

```bash
# ตัวอย่าง docker-compose.yml (วางในโฟลเดอร์โปรเจกต์)
docker compose up -d
docker compose ps   # ต้องเห็น container สถานะ "running" หรือ "healthy"
```

**ตรวจสอบก่อนไปขั้นถัดไปเสมอ:**
```bash
docker exec -it <container_name> psql -U docs_user -d docs_management -c "SELECT 1;"
```
ถ้าคำสั่งนี้ไม่สำเร็จ **ห้ามไปขั้นถัดไป** — แก้ไข container ให้รันได้ก่อน

## 6) Clone โปรเจกต์

```bash
mkdir -p ~/Project && cd ~/Project
git clone <repository-url> .
npm install
```

## 7) ไฟล์ Environment ที่ต้องมี (จุดที่พลาดบ่อยที่สุด)

| ไฟล์ | ใช้กับ | DATABASE_URL ชี้ไปที่ |
|---|---|---|
| `.env` | `npm run dev`, `npm run start` | `docs_management` |
| `.env.test` | `npm run test` (Module 14) | `docs_management_test` |
| `.env.production` | production deploy จริง (Module 15) | `docs_management_prod` |

**กฎสำคัญ:** ทั้ง 3 ไฟล์ต้องมี `DATABASE_URL`, secret key (`AUTH_SECRET` ฯลฯ) แยกกันคนละค่า **ห้ามใช้ค่าเดียวกันข้ามไฟล์** โดยเฉพาะ production ต้องเป็นค่าใหม่ที่สุ่มขึ้นเสมอ ไม่ใช่ copy จาก `.env`

```bash
# ตัวอย่างสร้าง secret แบบสุ่มปลอดภัย
openssl rand -base64 32
```

**ก่อนรันคำสั่งใดๆ ที่ต้องใช้ไฟล์เหล่านี้ ให้เช็คก่อนเสมอ:**
```bash
ls -la .env .env.test .env.production 2>&1
```

## 8) Prisma Migrate + Verify

```bash
npx prisma migrate deploy      # สำหรับ .env (dev) และ .env.production
npx prisma migrate status      # ตรวจว่า schema ตรงกับฐานข้อมูลจริง
```

ต้องรันแยกกันสำหรับแต่ละฐานข้อมูล (dev, test, production) เพราะแต่ละตัวมี `DATABASE_URL` คนละค่า

## 9) Claude Code

```bash
curl -fsSL https://claude.ai/install.sh | bash
claude --version
claude doctor   # ตรวจสอบความสมบูรณ์ของการติดตั้งก่อนเริ่มงานเสมอ
```

**สำคัญ:** เปิด Claude Code จาก **root directory ของโปรเจกต์เสมอ** (`cd ~/Project && claude`) ไม่ใช่ home directory — เพื่อให้ `CLAUDE.md` และ `.claude/skills/` ถูกโหลดอัตโนมัติ

## 10) Nginx Reverse Proxy (ทำหลังแอปรันได้แล้วเท่านั้น)

```bash
sudo apt install -y nginx
# config: proxy_pass http://localhost:3000; ใน /etc/nginx/sites-available/
sudo nginx -t              # ทดสอบ config ก่อน reload เสมอ
sudo systemctl reload nginx
```

หลังตั้งค่าแล้ว ปรับ firewall ให้ port 3000 เข้าถึงได้เฉพาะ localhost เท่านั้น (ดูหัวข้อ Security Hardening)

## 11) systemd Service (ทำหลัง build/start ผ่านด้วยมือแล้วเท่านั้น)

```bash
sudo systemctl daemon-reload
sudo systemctl enable <service-name> --now
sudo systemctl status <service-name>   # ต้องเป็น "active (running)"
journalctl -u <service-name> -f        # ดู log แบบ real-time เวลามีปัญหา
```

## 12) Security Hardening

| รายการ | คำสั่งตรวจสอบ |
|---|---|
| ufw firewall เปิดเฉพาะ port ที่จำเป็น (22, 80/443) | `sudo ufw status verbose` |
| SSH ปิด root login | `grep PermitRootLogin /etc/ssh/sshd_config` |
| fail2ban ทำงาน | `sudo fail2ban-client status sshd` |
| unattended-upgrades เปิดใช้งาน | `cat /etc/apt/apt.conf.d/20auto-upgrades` |

## 13) Backup Automation

```bash
crontab -l   # ต้องเห็น entry สำหรับ backup-db.sh และ backup-files.sh (ตาม module-13)
```

## ตารางตรวจสอบก่อนเริ่มงานทุกครั้ง (Pre-flight Checklist)

ก่อนสั่งงานอะไรก็ตามที่เกี่ยวกับแอป/ฐานข้อมูล ให้รันชุดคำสั่งนี้ตรวจสอบสถานะก่อนเสมอ:

```bash
echo "=== Node.js ===" && node -v
echo "=== Docker ===" && docker --version && docker compose ps
echo "=== PostgreSQL ===" && docker exec -it <container_name> psql -U docs_user -d docs_management -c "SELECT 1;"
echo "=== Env files ===" && ls -la .env .env.test .env.production 2>&1
echo "=== Time sync ===" && timedatectl status | grep synchronized
echo "=== Disk space ===" && df -h /
```

ถ้าข้อไหน fail ให้แก้ข้อนั้นก่อน **ห้ามข้ามไปรัน `npm run test` หรือ `npm run build` ทั้งที่ pre-flight check ยังไม่ผ่าน** เพราะผลลัพธ์ที่ได้จะไม่สะท้อนความจริง (เหมือนกรณีที่เคยเกิดขึ้น: รัน test แล้ว fail ทั้ง 8 ไฟล์เพราะไม่มี `.env.test`/database ไม่ใช่เพราะโค้ดมีบั๊ก)

## Troubleshooting: ปัญหาที่เคยเกิดขึ้นจริงในโปรเจกต์นี้

| อาการ | สาเหตุที่แท้จริง | วิธีแก้ |
|---|---|---|
| `npm run test` fail ทุกไฟล์ทันที, error `DATABASE_URL ชี้ไปที่ (ไม่พบ)` | ไม่มีไฟล์ `.env.test` และไม่มี PostgreSQL container รันอยู่ | ทำขั้นตอนที่ 4, 5, 7 ให้ครบก่อน ไม่ใช่บั๊กของ test code |
| `npx prisma migrate status` ล้มเหลวด้วยเหตุผลเดียวกัน | ไม่มี `.env`/`DATABASE_URL` | สร้าง `.env` ตามขั้นตอนที่ 7 |
| เว็บเข้าได้จาก host แต่เข้าจากเครื่องอื่นใน LAN ไม่ได้ | ufw ปิด port หรือ VM ตั้งเป็น NAT แทน Bridged Adapter | ตรวจ `sudo ufw status` และ Network setting ใน VirtualBox |
| เอกสาร/log มี timestamp ผิดเพี้ยน | ไม่ได้ตั้ง chrony/timezone ตั้งแต่ต้น | รันขั้นตอนที่ 2 แล้ว restart service ที่เกี่ยวข้อง |
| รัน `npm run dev:ui-test` (port 3001) พร้อม dev server หลัก (port 3000) แล้วเงียบ/ขึ้น `Another next dev server is already running` | Next.js ห้ามรัน `next dev` สองตัวพร้อมกันในโปรเจกต์เดียวกัน แม้คนละ port เพราะใช้ `.next` build cache ร่วมกัน | ต้องมี `NEXT_DIST_DIR=.next-test` ใน `.env.test` (ให้ `next.config.ts` แยก `distDir` ไปคนละที่กับ instance หลัก) — ถ้า `.env.test` ถูกสร้างใหม่ (ไฟล์นี้ไม่ได้ commit เข้า git) ต้องเติมบรรทัดนี้กลับเข้าไปด้วยเสมอ |

## Testing Checklist ของ Skill นี้เอง

- [ ] รัน Pre-flight Checklist แล้วผ่านครบทุกข้อก่อนเริ่มงานพัฒนา/ทดสอบใดๆ
- [ ] ทำการติดตั้งตามลำดับ 1-13 โดยไม่ข้ามขั้นตอน
- [ ] ยืนยันว่า `.env`, `.env.test`, `.env.production` แยกค่า secret กันจริง ไม่ซ้ำกัน
- [ ] ทดสอบ `docker compose down` แล้ว `up` ใหม่ 1 รอบ ยืนยันว่าข้อมูลยังอยู่ (ไม่ใช้ flag `-v`)
- [ ] ทดสอบ restart เครื่อง VM ทั้งเครื่อง 1 รอบ ยืนยันว่า systemd service + Docker container กลับมาทำงานเองอัตโนมัติ (auto-start)
