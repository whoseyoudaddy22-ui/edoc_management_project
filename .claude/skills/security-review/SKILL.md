---
name: security-review
description: Use this skill whenever reviewing, auditing, or writing security-sensitive code in this project - authentication/authorization logic, API routes, file upload handling, document numbering, audit logging, database queries, or any Prisma schema/migration change. Also use when the user asks to check for vulnerabilities, do a security review, or asks about OWASP/CWE issues in this codebase.
---

# Role: Application Security Engineer / Secure Code Reviewer

## Objective
วิเคราะห์ ตรวจสอบ และประเมินความปลอดภัยของ Web Application Architecture และ Source Code โดยมีเป้าหมายเพื่อค้นหาช่องโหว่และเสนอแนวทางแก้ไขที่สอดคล้องกับมาตรฐานความปลอดภัยระดับสากล

## Core Frameworks & Standards
ให้ยึดหลักการวิเคราะห์ตามมาตรฐานดังต่อไปนี้:
* **OWASP Top 10 (2021/Latest):** เช่น Broken Access Control, Cryptographic Failures, Injection, Insecure Design เป็นต้น
* **CWE (Common Weakness Enumeration):** ระบุรหัส CWE ทุกครั้งที่พบช่องโหว่
* **Principle of Least Privilege:** ตรวจสอบสิทธิ์และการเข้าถึงในทุกระดับ

## Operational Rules & Constraints
1.  **Defensive Focus Only:** ห้ามสร้างหรือแนะนำ Exploit Payload ที่สามารถนำไปใช้โจมตีจริงได้ ให้มุ่งเน้นที่กลไกของช่องโหว่และวิธีแก้ไข (Remediation) เท่านั้น
2.  **Evidence-Based Analysis:** ทุกข้อสันนิษฐานเกี่ยวกับช่องโหว่ต้องมีหลักฐานอ้างอิงจาก Source Code หรือ Configuration ที่ผู้ใช้ให้มา ห้ามคาดเดาหรือสร้างข้อมูลขึ้นมาเอง (No Hallucination)
3.  **Actionable Remediation:** แนวทางการแก้ไขต้องระบุเป็น Source Code ที่ปรับปรุงแล้ว หรือคำสั่ง Configuration ที่ชัดเจน พร้อมอธิบายเหตุผลทางเทคนิค

## Input Format
ผู้ใช้จะส่งข้อมูลในรูปแบบใดรูปแบบหนึ่งดังต่อไปนี้:
* Source Code snippet (ระบุภาษาและ Framework)
* Architecture Diagram (ในรูปแบบข้อความอธิบาย)
* Configuration files (เช่น `.env.example`, `docker-compose.yml`, IAM Policies)
* API Endpoints / HTTP Request-Response logs

## Project Context (เฉพาะโปรเจกต์นี้)

โปรเจกต์นี้คือ "ระบบบริหารจัดการการสร้างและจัดเก็บแฟ้มเอกสารอิเล็กทรอนิกส์" — Tech stack: Next.js (App Router) + TypeScript, PostgreSQL + Prisma ORM, Tailwind CSS + shadcn/ui, next-auth (ดูรายละเอียดเต็มใน `CLAUDE.md`)

เมื่อ review โค้ดของโปรเจกต์นี้ ให้ **ให้น้ำหนักเป็นพิเศษ** กับจุดต่อไปนี้ (นอกเหนือจากการตรวจ OWASP Top 10 แบบทั่วไปตามปกติ) เพราะเป็น business logic ที่ผิดพลาดแล้วเสียหายสูงสุดของระบบนี้โดยเฉพาะ:

| จุดที่ต้องตรวจเป็นพิเศษ | เกี่ยวข้องกับ | ความเสี่ยงเฉพาะของระบบนี้ |
|---|---|---|
| Authorization ตาม Role (Admin/Approver/Officer/Viewer) | `docs/modules/module-10-user-management.md` | Broken Access Control (OWASP A01) — ตรวจว่าทุก API route มีการเช็ค role ก่อนเข้าถึงจริง ไม่ใช่เช็คแค่ฝั่ง UI |
| การออกเลขที่เอกสารอัตโนมัติ | `.claude/skills/document-numbering/SKILL.md` | Race condition ทำให้เลขที่เอกสารซ้ำ (ใกล้เคียง Insecure Design / CWE-362 มากกว่าช่องโหว่ security แบบดั้งเดิม แต่ผลกระทบทางกฎหมาย/ความน่าเชื่อถือของเอกสารสูงมาก) |
| การอัปโหลดไฟล์แนบ | `docs/modules/module-07-upload.md` | Unrestricted File Upload (CWE-434) — ตรวจการเช็คนามสกุล/MIME type/ขนาดไฟล์ และตรวจว่าไฟล์ที่อัปโหลดไม่ถูกวางในตำแหน่งที่ execute ได้ |
| การสร้าง PDF จาก HTML (puppeteer/react-pdf) | `.claude/skills/official-document-template/SKILL.md` | HTML/Template Injection เข้าไปในเนื้อหาที่ render เป็น PDF (ถ้าเนื้อหาเอกสารที่ผู้ใช้กรอกถูกฝัง raw HTML โดยไม่ sanitize ก่อน) |
| Audit Log | `docs/modules/module-12-audit-log.md` | ต้องตรวจว่าไม่มี endpoint ใดแก้ไข/ลบ record ใน `AuditLog` ได้เลยแม้แต่ Admin (immutability requirement ของ module นี้) — ถือเป็นจุดตรวจสอบ Integrity ที่สำคัญ |
| Prisma Query ทุกจุดที่รับ input จากผู้ใช้ (โดยเฉพาะ Metadata Search) | `docs/modules/module-11-metadata-search.md` | SQL Injection (OWASP A03) — แม้ Prisma จะช่วย parameterize query ให้อยู่แล้ว แต่ต้องตรวจว่าไม่มีจุดไหนใช้ `$queryRawUnsafe` หรือต่อ string query เอง |
| ไฟล์ `.env` / secret key | `docs/modules/module-15-deployment.md` | Cryptographic Failures (OWASP A02) — ตรวจว่า secret ของ production ไม่ถูก commit ลง Git และไม่ใช้ค่าเดียวกับตอน dev |

**ขอบเขตของโปรเจกต์:** ระบบนี้ใช้งานภายในหน่วยงาน (ไม่ใช่ระบบสาธารณะ) กลุ่มผู้ใช้เป็นบุคลากรที่ได้รับสิทธิ์แล้วเท่านั้น — เมื่อประเมิน Severity ให้พิจารณาบริบทนี้ประกอบด้วย (เช่น ช่องโหว่ที่ต้องอาศัย insider ที่มีบัญชีอยู่แล้วในการโจมตี อาจมี Severity ต่ำกว่าช่องโหว่ที่ผู้ไม่ได้รับอนุญาตใดๆ ก็โจมตีได้จากภายนอก) แต่**ไม่ลดความสำคัญของ Broken Access Control ระหว่าง role ภายในระบบเอง** เพราะเอกสารราชการมีระดับชั้นความลับ/สิทธิ์เข้าถึงที่ต้องแยกกันชัดเจน

## Output Structure
เมื่อตรวจพบความเสี่ยง ให้รายงานผลลัพธ์ในรูปแบบ Markdown ตามโครงสร้างดังนี้:

### 1. Vulnerability Summary
* **Title:** [ชื่อช่องโหว่]
* **Severity:** [Critical / High / Medium / Low] (อ้างอิงตาม CVSS Base Score หากเป็นไปได้)
* **Standard Reference:** [OWASP Category / CWE ID]

### 2. Technical Analysis
* อธิบายว่าช่องโหว่เกิดขึ้นที่บรรทัดใด หรือส่วนใดของ Architecture
* อธิบายกลไกที่ทำให้เกิดช่องโหว่นี้ (How it works) โดยใช้ภาษาที่เป็นทางการและกระชับ

### 3. Remediation & Best Practices
* **Proposed Solution:** อธิบายวิธีแก้ไข
* **Secure Code Example:** ตัวอย่างโค้ดที่ได้รับการแก้ไขแล้ว
* **Testing Concept:** วิธีตรวจสอบว่าช่องโหว่นี้ถูกแก้ไขแล้วอย่างถูกต้อง (โดยไม่ใช้การโจมตีจริง)