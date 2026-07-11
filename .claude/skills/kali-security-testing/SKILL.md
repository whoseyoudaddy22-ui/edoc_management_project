---
name: kali-security-testing
description: Guidance for running hands-on security testing of this web application (Electronic Document Creation and Archiving Management System) from a Kali Linux machine — scanning, authenticated/unauthenticated test scenarios, and tool usage mapped to OWASP Top 10. Use this skill whenever the user wants to actually run security tests against a running instance of this app (staging/test/pre-production) using Kali tools (nmap, nikto, OWASP ZAP, Burp Suite, sqlmap, testssl.sh, gobuster/ffuf, hydra), design test-case scenarios for a pentest pass, or verify that fixes from `security-review` actually hold up against real traffic. This is the hands-on/dynamic counterpart to the `security-review` skill (which is static source-code review) — use `security-review` for reading code, use this skill for attacking a live instance.
---

# Kali Linux Security Testing (การทดสอบความปลอดภัยด้วย Kali Linux)

## ขอบเขตการใช้งานที่อนุญาต (Authorization Boundary) — อ่านก่อนทุกครั้ง

**กฎเหล็ก: ห้ามรันการทดสอบใดๆ ในสกิลนี้กับเป้าหมายที่ไม่ใช่ของผู้ใช้เอง หรือไม่มีสิทธิ์ทดสอบชัดเจน**

- ใช้ได้เฉพาะกับ instance ของโปรเจกต์นี้ที่ผู้ใช้เป็นเจ้าของ/ควบคุมเอง (dev, `docs_management_test` บน `localhost:3001`, staging, หรือ production ของหน่วยงานตัวเองที่ได้รับอนุญาตให้ทดสอบ)
- **ห้ามทดสอบกับ production ระหว่างเวลาทำงานจริงโดยไม่แจ้งล่วงหน้า** — ควรมี maintenance window หรือทดสอบกับ staging ที่มีข้อมูลเหมือน production ก่อนเสมอ (ดู `docs/modules/module-15-deployment.md` เรื่อง Environment Separation)
- **ห้ามใช้เทคนิคที่ทำลาย/รบกวนการทำงาน (DoS)** เช่น การยิง traffic จำนวนมากแบบไม่จำกัด, `nmap` แบบ aggressive timing (`-T5`) ใส่ production, หรือ brute-force ที่ไม่หยุดเอง — ทดสอบ rate-limit ด้วยจำนวนครั้งจำกัดพอสาธิตกลไกป้องกันเท่านั้น (เช่น 5-10 ครั้ง ไม่ใช่ยิงไม่หยุด)
- Payload/PoC ที่สร้างขึ้นเพื่อสาธิตช่องโหว่ ต้องเป็นแบบ **non-destructive** (พิสูจน์ได้ว่าช่องโหว่มีจริงโดยไม่ลบ/แก้ข้อมูลจริง) — ถ้าทดสอบ SQLi/command injection ให้ใช้ payload แบบ boolean-based/time-based เพื่อพิสูจน์เท่านั้น ไม่ใช่ payload ที่ `DROP`/`DELETE` ข้อมูลจริง
- ผลการทดสอบทุกครั้งต้องรายงานแบบ defensive-focused (กลไกช่องโหว่ + วิธีแก้) ตามรูปแบบเดียวกับ `security-review` skill ห้าม weaponize payload ให้พร้อมใช้โจมตีจริงส่งต่อ

ถ้าผู้ใช้ขอให้ทดสอบเป้าหมายที่ไม่ชัดเจนว่าเป็นของตัวเอง (เช่น โดเมนภายนอก, IP ที่ไม่รู้จักมาก่อน) **ให้หยุดแล้วถามยืนยันสิทธิ์ก่อนเสมอ** ไม่สันนิษฐานว่าได้รับอนุญาตแล้ว

## บริบทของโปรเจกต์นี้

Target: Next.js (App Router) + TypeScript, PostgreSQL + Prisma, next-auth (credentials-based) — รันบน:
- Dev/ทดสอบ: `http://localhost:3001` (`.env.test`, DB `docs_management_test`) — ปลอดภัยที่สุดสำหรับทดสอบแบบ aggressive
- Production: ผ่าน Nginx reverse proxy + HTTPS (self-signed หรือ Let's Encrypt ตาม `module-15-deployment.md`) — ทดสอบเฉพาะที่ได้รับอนุญาตและมี window ชัดเจน

อ่าน `docs/modules/module-10-user-management.md` (role: ADMIN/SARABAN/APPROVER/VIEWER), `module-11-metadata-search.md`, `module-12-audit-log.md` ก่อนออกแบบ test scenario เพื่อรู้ว่า endpoint ไหนควรมี access control แบบใด

## เครื่องมือหลักที่ใช้ (Kali Linux)

| เครื่องมือ | ใช้ตรวจอะไร |
|---|---|
| `nmap` | เปิด port ที่ไม่ควรเปิด (เช่น 5432 Postgres หลุดออกนอกเครื่อง — ดู "Security Hardening" ใน module-15), service fingerprinting |
| `nikto` | misconfiguration ทั่วไปของ web server (header ที่รั่วข้อมูล, ไฟล์ตัวอย่าง/default ที่ยังเปิดอยู่) |
| `testssl.sh` / `sslscan` | ตรวจ TLS config (cipher อ่อน, cert หมดอายุ, protocol เก่าอย่าง TLS 1.0/1.1) เฉพาะตอนทดสอบผ่าน HTTPS จริง |
| OWASP ZAP / Burp Suite (Community) | Active/Passive scan ทั้งเว็บ, ใช้ intercept proxy ทดสอบ business logic (เช่น เปลี่ยน `documentTypeId` ใน request ตรงๆ ดูว่า server validate ซ้ำไหม) |
| `sqlmap` | ทดสอบ SQL injection กับ API ที่รับ query param (ดูหัวข้อ Test Scenario 4 — คาดว่าจะ "ไม่พบ" เพราะ Prisma parameterize ให้อยู่แล้ว แต่ต้องพิสูจน์จริง ไม่ใช่อนุมานจากโค้ด) |
| `gobuster`/`ffuf` | หา endpoint/route ที่ไม่ได้ตั้งใจเปิดเผย (เช่น dev-only seed endpoint ที่ลืมปิดก่อน deploy — ดู module-15 checklist ข้อ "ลบ/ปิด API endpoint ที่ใช้เฉพาะตอนพัฒนา") |
| `hydra` | ทดสอบ rate-limit ของหน้า login **แบบจำกัดจำนวนครั้ง** (ห้ามปล่อยรันไม่หยุด) — ดู Test Scenario 2 |
| Browser DevTools + curl | ตรวจ cookie flag (`Secure`, `HttpOnly`, `SameSite`), ตรวจ response header (`Strict-Transport-Security`, `X-Frame-Options` ที่ตั้งไว้ใน `next.config.ts`) |

## Test Case Scenarios เฉพาะโปรเจกต์นี้

เรียงตามความสำคัญ ควรทำครบทุกข้อก่อนสรุปผล ไม่ใช่หยุดที่ข้อแรกที่เจอ:

### 1. Broken Access Control ระหว่าง Role (สำคัญที่สุดของระบบนี้)
ล็อกอินด้วยบัญชี VIEWER/APPROVER แล้วยิง request ตรงไปยัง endpoint ที่ควรสงวนไว้สำหรับ ADMIN/SARABAN เท่านั้น (เช่น `POST /api/documents`, `POST /api/users`, `DELETE /api/documents/[id]`) ทั้งผ่าน UI (ปุ่มควรถูกซ่อน) และยิง HTTP request ตรงด้วย `curl`/Burp Repeater (endpoint ต้อง reject แม้ UI ซ่อนปุ่มไปแล้ว) — เทียบกับที่เขียนไว้ใน `docs/modules/module-10-user-management.md`

### 2. Authentication & Session Security
- ทดสอบ brute-force login ด้วยจำนวนครั้งจำกัด (5-10 ครั้ง) ดูว่ามี lockout/rate-limit ทำงานจริง (`AccountLockedError` ใน `src/lib/auth.ts`)
- ตรวจ user enumeration ผ่าน response time ระหว่าง "อีเมลไม่มีในระบบ" กับ "อีเมลมีแต่รหัสผ่านผิด" (ดูกลไก dummy-hash ใน `src/lib/auth.ts`)
- ตรวจ cookie ของ session (`Secure`, `HttpOnly`, `SameSite=Lax/Strict`) ต้องตั้งครบเมื่อรันผ่าน HTTPS
- ทดสอบ session fixation/replay: ใช้ session cookie เดิมหลัง logout ดูว่าถูก invalidate จริง

### 3. Insecure Direct Object Reference (IDOR)
ล็อกอินเป็น user A แล้วลองเข้าถึง/แก้ไข resource ของ user อื่นผ่าน id ตรงๆ (เช่น `GET /api/documents/[id]`, `PUT /api/users/[id]`, ไฟล์แนบใน `/uploads/[id]`) — ต้องถูก block ด้วย role/ownership check ไม่ใช่ block ด้วย "เดา id ไม่ถูก" เท่านั้น

### 4. SQL Injection ผ่าน Metadata Search
ยิง payload มาตรฐาน (boolean-based, time-based, ไม่ใช่ destructive) เข้าพารามิเตอร์ค้นหาทั้งหมดของ `GET /api/documents/search` (keyword, documentTypeCodes, referenceNumber ฯลฯ) ด้วย `sqlmap` — คาดว่า Prisma parameterize ป้องกันไว้แล้ว แต่ต้อง **ยืนยันด้วยการทดสอบจริง** ไม่ใช่เชื่อจากการอ่านโค้ดอย่างเดียว (ตรงกับหลักการ Evidence-Based ของ `security-review` skill)

### 5. Unrestricted File Upload
ทดสอบอัปโหลดไฟล์ผ่าน `/api/upload`:
- เปลี่ยนนามสกุลไฟล์อันตราย (`.php`, `.sh`, `.exe`) ให้เป็นนามสกุลที่อนุญาต (`.pdf`, `.jpg`) ดูว่า magic-byte check จับได้จริง (ดู `src/lib/upload.ts`)
- อัปโหลดไฟล์ที่มีชื่อแบบ path traversal (`../../etc/passwd`) ดูว่าถูก sanitize
- พยายามเข้าถึงไฟล์ที่เพิ่งอัปโหลดโดยไม่ล็อกอิน (ต้องโดน middleware บล็อก — ดู `src/proxy.ts`)

### 6. Document Numbering Race Condition
ยิง `POST /api/documents` พร้อมกันหลาย request (concurrent, ใช้ `hey`/`ab`/Burp Intruder) ด้วย department/document type เดียวกัน ตรวจว่าเลขที่เอกสารที่ออกมาไม่ซ้ำกันเลยแม้แต่คู่เดียว (ดู `.claude/skills/document-numbering/SKILL.md` และ `src/lib/document-number.ts`)

### 7. Audit Log Immutability
ล็อกอินเป็น ADMIN แล้วพยายามหาทาง UPDATE/DELETE record ใน `AuditLog` ผ่านทุก endpoint ที่มี (ไม่ควรมี endpoint ไหนทำได้เลย แม้แต่ ADMIN) — ยืนยันด้วยการยิง request ตรง ไม่ใช่แค่ดูว่า UI ไม่มีปุ่มลบ

### 8. Open Redirect / HTTP Header ตรวจสอบ
ทดสอบ `callbackUrl` query param ตอน login ด้วยค่าเช่น `//evil.com`, `/\evil.com`, `https://evil.com` ต้องถูก reject กลับไป `/dashboard` เสมอ (ดู `src/lib/safe-redirect.ts`) — ตรวจ security header อื่นที่ตั้งไว้ใน `next.config.ts` ด้วย `curl -I`

## รูปแบบการรายงานผล

ใช้โครงสร้างเดียวกับ skill `security-review` (Vulnerability Summary / Technical Analysis / Remediation & Best Practices) แต่เพิ่มหลักฐานจากการทดสอบจริง:
- คำสั่งที่ใช้ทดสอบ (ให้ reproduce ได้)
- response/output ที่พิสูจน์ว่าช่องโหว่มีจริง (หรือพิสูจน์ว่า "ไม่พบ" หลังทดสอบครบ ไม่ใช่แค่ข้าม)
- ถ้าเจอช่องโหว่ ให้ระบุ CWE/OWASP category และแนวทางแก้ตาม `security-review` skill แล้วส่งต่อให้แก้ที่ระดับโค้ดผ่าน skill นั้น (สกิลนี้ไม่ได้มีไว้แก้โค้ด มีไว้ค้นหา/ยืนยันช่องโหว่)

## Testing Checklist ของ Skill นี้เอง

- [ ] ยืนยัน scope/authorization ชัดเจนก่อนเริ่มทุกครั้ง (dev/test/staging ของตัวเอง หรือ production ที่มี maintenance window)
- [ ] ทำครบทั้ง 8 test scenario ก่อนสรุปผล ไม่ใช่หยุดที่ข้อแรกที่เจอ
- [ ] ไม่มีการทดสอบใดที่ทำลาย/รบกวนข้อมูลจริงถาวร
- [ ] รายงานผลตามรูปแบบ `security-review` skill ทุกครั้ง
