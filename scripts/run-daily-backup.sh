#!/bin/bash
# รวมงาน backup ประจำวัน (ฐานข้อมูล + ไฟล์แนบ) ไว้ในคำสั่งเดียว
# เขียนไว้ตอนเครื่อง dev ยังเป็น Windows (เรียกผ่าน Task Scheduler) — บนเครื่อง production
# Linux จริง ณ ตอนนี้ "ไม่ได้ใช้ไฟล์นี้" crontab เรียก backup-db.sh/backup-files.sh
# แยกกันสองบรรทัดตรงๆ แทน (ดู `crontab -l` และ docs/runbooks/disaster-recovery.md)
# เก็บไฟล์นี้ไว้เผื่ออยากรวมสองสคริปต์เป็นคำสั่งเดียวอีกในอนาคต
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
