#!/bin/bash
# สำรองไฟล์แนบที่อัปโหลด (public/uploads) เป็น tar.gz
# ใช้งาน: ./scripts/backup-files.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

UPLOADS_DIR="${UPLOADS_DIR:-$PROJECT_ROOT/public/uploads}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/files"
mkdir -p "$BACKUP_DIR"

OUT_FILE="$BACKUP_DIR/uploads_${TIMESTAMP}.tar.gz"

tar -czf "$OUT_FILE" -C "$(dirname "$UPLOADS_DIR")" "$(basename "$UPLOADS_DIR")"

# ลบไฟล์ backup ที่เก่ากว่า retention policy
find "$BACKUP_DIR" -name "*.tar.gz" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: $OUT_FILE"
