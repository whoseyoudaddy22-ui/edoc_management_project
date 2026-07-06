#!/bin/bash
# สำรองฐานข้อมูล PostgreSQL ผ่าน pg_dump ที่รันอยู่ในคอนเทนเนอร์ Docker
# (เครื่อง dev นี้ไม่มี pg_dump ติดตั้งบน host จึงเรียกผ่าน `docker exec` แทน)
# ใช้งาน: ./scripts/backup-db.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

DB_CONTAINER="${DB_CONTAINER:-docs-db}"
DB_USER="${DB_USER:-docs_user}"
DB_NAME="${DB_NAME:-docs_management}"
RETENTION_DAYS="${RETENTION_DAYS:-30}"

TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="$PROJECT_ROOT/backups/database"
mkdir -p "$BACKUP_DIR"

OUT_FILE="$BACKUP_DIR/docs_management_${TIMESTAMP}.dump"

docker exec "$DB_CONTAINER" pg_dump -U "$DB_USER" -F c "$DB_NAME" > "$OUT_FILE"

# ลบไฟล์ backup ที่เก่ากว่า retention policy
find "$BACKUP_DIR" -name "*.dump" -mtime "+${RETENTION_DAYS}" -delete

echo "Backup created: $OUT_FILE"
