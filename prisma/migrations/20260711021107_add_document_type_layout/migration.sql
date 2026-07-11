-- CreateEnum
CREATE TYPE "DocumentLayout" AS ENUM ('OFFICIAL_LETTER', 'MEMO');

-- AlterTable
ALTER TABLE "DocumentType" ADD COLUMN     "layout" "DocumentLayout" NOT NULL DEFAULT 'OFFICIAL_LETTER';

-- Backfill: บันทึกข้อความ (code 0005) ต้องเป็น layout MEMO ไม่ใช่ default OFFICIAL_LETTER
-- (ดู security-review 2026-07-11 finding #3 — เดิมเทียบ code === '0005' ตรงๆ ในโค้ด ย้ายมาเป็น field นี้แทน)
UPDATE "DocumentType" SET "layout" = 'MEMO' WHERE "code" = '0005';
