# Module 13: Backup & Recovery (สำรองข้อมูลและกู้คืนข้อมูล)

> ไฟล์นี้เป็นรายละเอียดเฉพาะของ Module 13 อ่านไฟล์นี้เมื่อเริ่มทำงาน module นี้เท่านั้น
> เชื่อมโยงโดยตรงกับปัญหาตั้งต้นของโครงงานใน CLAUDE.md ("ปัญหาภัยพิบัติต่างๆ" ที่ทำให้เอกสารกระดาษสูญหาย)
> อ้างอิงบริบทรวมจาก `CLAUDE.md`

## เป้าหมายของ Module

สไลด์นำเสนอโครงงานระบุปัญหาของระบบเดิมไว้ชัดเจนว่าเอกสารกระดาษ "เสี่ยงต่อการชำรุดสูญหาย" จากภัยพิบัติ — **ถ้าระบบดิจิทัลที่สร้างขึ้นมาไม่มีการสำรองข้อมูล ก็ยังแก้ปัญหาเดิมไม่ได้จริง** เพียงแค่ย้ายความเสี่ยงจากแฟ้มกระดาษไปเป็นฐานข้อมูลที่ไม่มีการป้องกันแทน

Module นี้เพิ่ม **กระบวนการสำรองข้อมูลอัตโนมัติ** (ทั้งฐานข้อมูลและไฟล์แนบ) และ **ขั้นตอนกู้คืนข้อมูลที่ทดสอบแล้วว่าใช้งานได้จริง**

## ขอบเขตของสิ่งที่ต้องสำรอง

| สิ่งที่ต้องสำรอง | แหล่งข้อมูล | ความถี่ที่แนะนำ |
|---|---|---|
| ฐานข้อมูล PostgreSQL ทั้งหมด | `docs_management` database | ทุกวัน (daily) อย่างน้อย |
| ไฟล์แนบที่อัปโหลด | โฟลเดอร์ `/uploads` หรือ storage ที่ใช้เก็บไฟล์จริง | ทุกวัน (daily) หรือทันทีที่มีการอัปโหลดใหม่ (ถ้าใช้ cloud storage ที่ versioning ได้อยู่แล้ว) |
| ไฟล์ config สำคัญ (`.env`, `schema.prisma`) | เก็บใน version control (Git) อยู่แล้ว ยกเว้น `.env` ที่มีความลับ | เก็บแยกต่างหากอย่างปลอดภัย (secret manager หรือไฟล์เข้ารหัส) ไม่ commit ลง Git |

## กลยุทธ์การสำรองข้อมูล (Backup Strategy)

### 1) Database Backup ด้วย `pg_dump`

```bash
# สคริปต์ตัวอย่าง: scripts/backup-db.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="./backups/database"
mkdir -p "$BACKUP_DIR"

pg_dump "$DATABASE_URL" -F c -f "$BACKUP_DIR/docs_management_$TIMESTAMP.dump"

# ลบไฟล์ backup ที่เก่ากว่า 30 วัน (retention policy)
find "$BACKUP_DIR" -name "*.dump" -mtime +30 -delete
```

**เหตุผลที่ใช้ format `-F c` (custom format):** บีบอัดขนาดไฟล์ และรองรับการ restore แบบเลือกเฉพาะตารางได้ ยืดหยุ่นกว่า plain SQL dump

### 2) File Attachment Backup

```bash
# สคริปต์ตัวอย่าง: scripts/backup-files.sh
#!/bin/bash
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
tar -czf "./backups/files/uploads_$TIMESTAMP.tar.gz" ./uploads
find "./backups/files" -name "*.tar.gz" -mtime +30 -delete
```

### 3) ตำแหน่งจัดเก็บ Backup (สำคัญ — ต้องแยกจากเครื่อง/เซิร์ฟเวอร์หลัก)

**หลักการ 3-2-1:** มีข้อมูลอย่างน้อย 3 ชุด บน 2 สื่อที่ต่างกัน และ 1 ชุดอยู่นอกสถานที่ (off-site) — นี่คือหัวใจของการแก้ปัญหา "ภัยพิบัติ" ที่ระบุไว้ในโครงงาน ถ้า backup อยู่เครื่องเดียวกับฐานข้อมูลจริง เกิดภัยพิบัติมาก็เสียหายพร้อมกันหมด ไม่ต่างจากปัญหาเดิม

สำหรับโปรเจกต์ระดับนี้ (ใช้ในสถานที่ฝึกงาน) แนะนำอย่างน้อย:
- เก็บไฟล์ backup ไว้ในเครื่อง server ที่รันระบบ (ชุดที่ 1)
- อัปโหลด backup ไปยัง cloud storage แยกต่างหาก เช่น Google Drive/Dropbox ผ่าน API หรือ manual (ชุดที่ 2 — off-site)

### 4) การตั้งเวลาอัตโนมัติ (Scheduling)

ใช้ `cron` (Linux) รันสคริปต์ทุกวัน:
```bash
# ตัวอย่าง crontab -e
0 2 * * * /path/to/Project/scripts/backup-db.sh >> /path/to/Project/logs/backup.log 2>&1
0 2 * * * /path/to/Project/scripts/backup-files.sh >> /path/to/Project/logs/backup.log 2>&1
```
(รันเวลา 02:00 น. ทุกวัน เป็นช่วงที่คาดว่าไม่มีคนใช้งานระบบ)

## ขั้นตอนการกู้คืนข้อมูล (Recovery Procedure)

**ต้องเขียนเป็นเอกสารขั้นตอนที่ทำตามได้ทันทีในสถานการณ์ฉุกเฉิน** ไม่ใช่แค่มีสคริปต์ backup อย่างเดียว:

```bash
# scripts/restore-db.sh
#!/bin/bash
# ใช้งาน: ./restore-db.sh <path-to-dump-file>
pg_restore --clean --if-exists -d "$DATABASE_URL" "$1"
```

**ขั้นตอนกู้คืนแบบเต็ม (บันทึกเป็น runbook แยก `docs/runbooks/disaster-recovery.md`):**
1. ติดตั้ง environment ใหม่ตามขั้นตอนใน `CLAUDE.md` (Node.js, PostgreSQL, dependencies)
2. Clone โค้ดจาก Git repository
3. รัน `scripts/restore-db.sh` กับไฟล์ backup ล่าสุด
4. แตกไฟล์ backup ไฟล์แนบกลับไปที่โฟลเดอร์ `uploads`
5. ตรวจสอบความถูกต้อง (ดู "Testing Checklist" ด้านล่าง)

## หน้า UI ที่ควรมี (สำหรับ Admin)

1. **หน้า "สำรองข้อมูล"** — แสดงรายการ backup ที่มีอยู่ (วันที่, ขนาดไฟล์), ปุ่ม "สำรองข้อมูลทันที" (manual trigger), แสดงสถานะ backup ล่าสุดสำเร็จ/ล้มเหลว
2. แจ้งเตือนถ้า backup ล้มเหลวติดต่อกัน (เชื่อมกับ Module ที่จะทำเรื่อง Notification ในอนาคต ถ้ายังไม่มีให้ log error ไว้ก่อน)

## ผลกระทบต่อ Module อื่น

- ไม่กระทบโค้ดของ Module อื่นโดยตรง (เป็น infrastructure layer แยกต่างหาก) แต่ **ต้องรอ Module 1 (Schema) นิ่งแล้วระดับหนึ่งก่อน** เพราะทุกครั้งที่ schema เปลี่ยน ต้องทดสอบว่า restore ยังใช้ได้กับ schema ใหม่

## Testing Checklist (สำคัญที่สุดของ Module นี้ — Backup ที่ไม่เคยทดสอบ Restore ถือว่าใช้ไม่ได้)

- [x] รันสคริปต์ backup แล้วได้ไฟล์ dump/tar.gz จริง ไม่ error (2026-07-04)
- [x] **ทดสอบ restore บนฐานข้อมูลใหม่ (คนละตัวกับของจริง)** แล้วข้อมูลครบถ้วนตรงกับต้นฉบับ — ต้องทำจริง ไม่ใช่แค่เชื่อว่าสคริปต์ทำงาน (2026-07-04 — เทียบ md5 checksum ทุกตาราง ตรงกันหมด)
- [x] ทดสอบ restore ไฟล์แนบแล้วเปิดไฟล์ได้ปกติ ไม่เสียหาย (2026-07-04 — อัปโหลดไฟล์จริงผ่านแอป, backup, restore แยกที่, เทียบ sha256 ตรงกัน)
- [x] ทดสอบ retention policy: ไฟล์ backup ที่เก่ากว่า 30 วันถูกลบจริงตามกำหนด (2026-07-04 — ไฟล์ dummy อายุ 35 วันถูกลบ, ไฟล์อายุ 10 วันยังอยู่)
- [x] จำลองสถานการณ์ "เครื่อง server เสียหายทั้งหมด" แล้วทำตาม `docs/runbooks/disaster-recovery.md` กู้ระบบขึ้นมาใหม่บนเครื่องอื่นได้สำเร็จ (2026-07-04 — ดูรายละเอียดผลการทดสอบและปัญหาที่พบใน `docs/runbooks/disaster-recovery.md`)
