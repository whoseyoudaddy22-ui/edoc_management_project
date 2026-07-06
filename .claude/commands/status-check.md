ตรวจสอบสถานะปัจจุบันของโปรเจกต์นี้ให้ครบก่อนเริ่มทำงานต่อ ห้ามสรุปจากความจำ/บทสนทนาเก่า
ให้ตรวจสอบจากสถานะจริงของเครื่องและ git เท่านั้น ทำตามลำดับนี้:

## 1) ตรวจสอบ Git

```
git branch --show-current
git status
git log --oneline -10
```

รายงาน: อยู่ branch ไหน, มีอะไรค้างไม่ commit ไหม, commit ล่าสุด 10 อันคืออะไร

## 2) ตรวจสอบว่า skill ครบหรือไม่

```
ls .claude/skills/
```

ต้องเจอครบ 5 ตัว: document-numbering, official-document-template, ui-design-system,
security-review, environment-setup — ถ้าขาดตัวไหนแจ้งทันที

## 3) ตรวจสอบว่า module documentation ครบหรือไม่

```
ls docs/modules/
```

ต้องเจอ module-10 ถึง module-16 (7 ไฟล์)

## 4) รัน Pre-flight Checklist จาก skill environment-setup

อ่าน .claude/skills/environment-setup/SKILL.md แล้วรันชุดคำสั่งตรวจสอบสถานะเครื่อง
(Node.js, Docker, PostgreSQL, ไฟล์ .env/.env.test/.env.production, time sync, disk space)
ตามที่ระบุไว้ในหัวข้อ "ตารางตรวจสอบก่อนเริ่มงานทุกครั้ง"

## 5) ตรวจสอบว่ามีบันทึกความคืบหน้าเดิมหรือไม่

```
cat docs/progress-log.md 2>&1 | tail -30
```

ถ้ามีไฟล์นี้ ให้สรุปสิ่งที่บันทึกไว้ล่าสุดว่าทำอะไรไปถึงไหนแล้ว
ถ้ายังไม่มีไฟล์นี้ ให้แจ้งว่ายังไม่เคยสร้าง

## 6) สรุปผลรวมทั้งหมด

หลังตรวจครบทุกข้อ ให้สรุปเป็นรายการเดียวจบว่า:
- ตอนนี้ทำ Module ไหนไปถึงไหนแล้ว (อ้างอิงจาก git log + progress-log)
- Environment พร้อมแค่ไหน (อ้างอิงจาก Pre-flight Checklist)
- มีอะไรที่ยังค้างหรือผิดปกติที่ต้องแจ้งก่อนไปต่อหรือไม่
- เสนอว่าขั้นตอนถัดไปที่ควรทำคืออะไร

**ห้ามติดตั้ง/แก้ไข/รันคำสั่งใดๆ ในขั้นตอนนี้ เป็นการตรวจสอบสถานะอย่างเดียว**
รอให้ฉันยืนยันก่อนว่าจะดำเนินการขั้นต่อไปอย่างไร
