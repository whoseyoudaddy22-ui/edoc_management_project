# Module 15: Deployment / Production Build (นำระบบขึ้นใช้งานจริง)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 15 (Module สุดท้ายจาก 15 module) อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> ควรทำหลังจาก Module 14 (Testing) ผ่านหมดแล้วเท่านั้น — ห้าม deploy ระบบที่ยังไม่ผ่านเทสระดับวิกฤต
> อ้างอิงบริบทรวมจาก `CLAUDE.md`

## เป้าหมายของ Module

นำระบบที่พัฒนาเสร็จ (Module 1-14) ไปติดตั้งใช้งานจริงที่หน่วยงาน/สถานที่ฝึกประสบการณ์วิชาชีพตามขอบเขตที่ระบุใน CLAUDE.md พร้อมทั้งเตรียมความพร้อมสำหรับการประเมินประสิทธิภาพและความพึงพอใจของผู้ใช้งานจริง (ตามวัตถุประสงค์ข้อ 3 ของโครงงาน)

## ทางเลือกการ Deploy (เลือกตามข้อจำกัดของหน่วยงานจริง)

| ทางเลือก | เหมาะกับ | ข้อจำกัด |
|---|---|---|
| **เครื่อง Server ภายในหน่วยงาน (On-premise)** | หน่วยงานมีเครื่องคอมพิวเตอร์/เซิร์ฟเวอร์เดิมอยู่แล้ว ต้องการควบคุมข้อมูลเองทั้งหมด (เอกสารราชการ อาจมีข้อกำหนดห้ามออกนอกหน่วยงาน) | ต้องดูแล security/backup เอง, ต้องมีคนดูแลเครื่องต่อเนื่อง |
| **VPS ราคาประหยัด (เช่น DigitalOcean, Vultr)** | ไม่มีเครื่อง server ในหน่วยงาน ต้องการควบคุมเต็มที่แต่ไม่อยากดูแล hardware เอง | มีค่าใช้จ่ายรายเดือน (ประมาณ $5-10/เดือนสำหรับ workload ระดับนี้) |
| **Vercel + Managed PostgreSQL (เช่น Supabase/Neon)** | ต้องการ deploy เร็วที่สุด ไม่อยากดูแล infra เลย | Next.js บน Vercel เหมาะกับ workload นี้ดี แต่ควรตรวจสอบว่านโยบายหน่วยงานอนุญาตให้เก็บข้อมูลเอกสารราชการบน cloud ต่างประเทศหรือไม่ก่อนเลือกทางนี้ |

> **สำหรับโครงงานระดับฝึกประสบการณ์วิชาชีพ แนะนำเริ่มจาก On-premise หรือ VPS** เพราะควบคุมข้อมูลได้ชัดเจนกว่า และตรงกับลักษณะงานสารบรรณที่มักมีข้อกำหนดเรื่องที่ตั้งของข้อมูล — ถ้าอาจารย์ที่ปรึกษา/หน่วยงานมีข้อกำหนดชัดเจนอยู่แล้ว ให้ยึดตามนั้นแทน

## Environment Separation (แยกสภาพแวดล้อม)

ต้องแยกอย่างน้อย 2 ชุด ห้ามใช้ฐานข้อมูล/`.env` เดียวกับตอนพัฒนา (dev) ไปรันจริง (production):

| Environment | ใช้ทำอะไร | ฐานข้อมูล |
|---|---|---|
| Development | เครื่องที่ใช้พัฒนา (ตามที่ตั้งค่าไว้ตั้งแต่ต้น) | `docs_management` (local) |
| Production | เครื่องที่หน่วยงานใช้งานจริง | `docs_management_prod` (แยกเครื่อง/แยก instance ชัดเจน) |

## Checklist ก่อน Build (Pre-build)

- [ ] ยืนยันว่า Module 14 (Testing) ผ่านครบทุกเคสระดับวิกฤตแล้ว
- [ ] ตรวจสอบ `.env.production` แยกจาก `.env` ที่ใช้ตอนพัฒนา — ค่าที่ต้องเปลี่ยน:
  - `DATABASE_URL` ชี้ไปที่ฐานข้อมูล production
  - `AUTH_SECRET` / secret key ต่างๆ ต้องเป็นค่าใหม่ที่สุ่มขึ้นเฉพาะ production (**ห้ามใช้ค่าเดียวกับตอน dev**)
  - `NODE_ENV=production`
- [ ] ลบ/ปิด API endpoint หรือหน้าที่ใช้เฉพาะตอนพัฒนา (เช่น seed data endpoint) ไม่ให้เข้าถึงได้จาก production

## ขั้นตอน Build & Deploy

```bash
# 1. Build production bundle
npm run build

# 2. รัน migration บนฐานข้อมูล production (ใช้ deploy ไม่ใช่ dev)
npx prisma migrate deploy

# 3. รันแอปโหมด production
npm run start
```

**ข้อควรระวัง:** ใช้คำสั่ง `prisma migrate deploy` เท่านั้นสำหรับ production ห้ามใช้ `prisma migrate dev` (คำสั่ง dev อาจถามคำถามแบบ interactive และมีพฤติกรรมที่ไม่เหมาะกับ production pipeline)

### ถ้าใช้ Docker (แนะนำเพื่อความสม่ำเสมอระหว่างเครื่อง dev และ production)

```dockerfile
# Dockerfile ตัวอย่างแนวคิด
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN npm ci && npm run build

FROM node:20-alpine
WORKDIR /app
COPY --from=builder /app ./
EXPOSE 3000
CMD ["npm", "start"]
```

```bash
docker compose up -d   # รัน app + postgresql พร้อมกันตาม docker-compose.yml
```

## Security Hardening ก่อนเปิดใช้งานจริง

- [ ] เปิดใช้ **HTTPS** เสมอ (ใช้ reverse proxy เช่น Nginx + Let's Encrypt ถ้า deploy บน VPS/on-premise)
- [ ] ตั้งค่า firewall เปิดเฉพาะ port ที่จำเป็น (80, 443) ปิด port database (5432) ไม่ให้เข้าถึงจากภายนอกโดยตรง
- [ ] เปลี่ยนรหัสผ่านเริ่มต้นของบัญชี Admin ทันทีหลัง deploy (ห้ามใช้รหัสผ่านตัวอย่างที่ตั้งไว้ตอนพัฒนา)
- [ ] ตรวจสอบว่า rate limiting มีอยู่ในหน้า login (ป้องกัน brute-force) — เชื่อมกับ Module 12 (Audit Log) ที่บันทึก `USER_LOGIN_FAILED` ไว้อยู่แล้ว ใช้ข้อมูลนี้ตรวจจับได้
- [ ] เปิดใช้ Module 13 (Backup) บน production จริง ไม่ใช่แค่ทดสอบตอน dev — ตั้ง cron บนเครื่อง production ให้เรียบร้อย

> **ข้อควรระวังตอนตั้ง cron บน production:** `scripts/backup-db.sh` ใช้ค่า default `DB_USER=docs_user`, `DB_NAME=docs_management` (ชื่อฐานข้อมูล dev) — บน production **ต้อง override เป็นชื่อ production เสมอ** ไม่งั้น backup จะไม่ทำงานหรือ backup ผิดฐานข้อมูล ตัวอย่าง crontab ที่ถูกต้อง:
> ```bash
> 0 2 * * * DB_USER=docs_user_prod DB_NAME=docs_management_prod /path/to/Project/scripts/backup-db.sh >> /path/to/Project/logs/backup.log 2>&1
> 0 2 * * * /path/to/Project/scripts/backup-files.sh >> /path/to/Project/logs/backup.log 2>&1
> ```
> (ค่า `DB_USER`/`DB_NAME` ต้องตรงกับ `POSTGRES_USER`/`POSTGRES_DB` ใน `.env.production`)

## แผนสำรองเมื่อ Deploy ผิดพลาด (Rollback Plan)

- เก็บ backup ฐานข้อมูลก่อน migrate ทุกครั้งที่ deploy เวอร์ชันใหม่ (ใช้สคริปต์จาก Module 13)
- ใช้ Git tag กำกับทุกเวอร์ชันที่ deploy จริง เช่น `git tag v1.0.0` เพื่อย้อนกลับโค้ดไปเวอร์ชันก่อนหน้าได้ทันทีถ้าพบปัญหา

## เตรียมพร้อมสำหรับการประเมินผล (เชื่อมกับวัตถุประสงค์โครงงาน)

หลัง deploy เสร็จและระบบใช้งานได้จริงแล้ว งานถัดไปที่ไม่ใช่โค้ด (ตามที่เคยแนะนำไว้ก่อนหน้า):
- แจกแบบประเมินความพึงพอใจให้ผู้ใช้งานจริงในหน่วยงาน
- เก็บผลใช้งานจริงช่วงหนึ่ง (เช่น 2-4 สัปดาห์) เพื่อเป็นข้อมูลบทที่ว่าด้วยผลการทดลอง/ผลการดำเนินงานของรายงานโครงงาน

## Testing Checklist ของ Module นี้เอง

- [ ] Build production (`npm run build`) ผ่านโดยไม่มี error/warning ที่ critical
- [ ] ทดสอบ `prisma migrate deploy` บนฐานข้อมูล production จริง (หรือฐานข้อมูลจำลองที่เหมือนกันทุกประการ) สำเร็จ
- [ ] เข้าใช้งานผ่าน HTTPS ได้จริง ไม่มี mixed-content warning
- [ ] ทดสอบ login ด้วยบัญชี Admin ที่เปลี่ยนรหัสผ่านใหม่แล้ว (ไม่ใช่รหัสผ่านตัวอย่าง)
- [ ] ทดสอบว่า backup อัตโนมัติทำงานจริงบนเครื่อง production (ไม่ใช่แค่ที่เคยทดสอบตอน dev)
- [ ] ทดสอบ rollback จริง 1 ครั้ง (deploy เวอร์ชันทดสอบ แล้วลองย้อนกลับ) ก่อนประกาศใช้งานจริงกับผู้ใช้
