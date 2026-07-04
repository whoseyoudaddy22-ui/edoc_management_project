#!/bin/bash
# รวมงาน backup ประจำวัน (ฐานข้อมูล + ไฟล์แนบ) เรียกโดย Windows Task Scheduler
# เทียบเท่ากับสองบรรทัดใน crontab ที่ระบุใน docs/modules/module-13-backup-recovery.md
# (เครื่องนี้เป็น Windows ไม่มี cron จึงใช้ Task Scheduler แทน — ดูรายละเอียดการตั้งค่าใน
# docs/runbooks/disaster-recovery.md)
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$PROJECT_ROOT/logs"
mkdir -p "$LOG_DIR"

{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') backup run start ==="
  "$SCRIPT_DIR/backup-db.sh"
  "$SCRIPT_DIR/backup-files.sh"
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') backup run end ==="
} >> "$LOG_DIR/backup.log" 2>&1
