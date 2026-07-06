#!/bin/bash
# กู้คืนฐานข้อมูล PostgreSQL จากไฟล์ backup (pg_dump custom format)
# ผ่าน pg_restore ที่รันอยู่ในคอนเทนเนอร์ Docker เช่นเดียวกับ backup-db.sh
# ใช้งาน: ./scripts/restore-db.sh <path-to-dump-file>
set -euo pipefail

if [[ $# -ne 1 ]]; then
  echo "Usage: $0 <path-to-dump-file>" >&2
  exit 1
fi

DUMP_FILE="$1"
if [[ ! -f "$DUMP_FILE" ]]; then
  echo "Error: dump file not found: $DUMP_FILE" >&2
  exit 1
fi

DB_CONTAINER="${DB_CONTAINER:-docs-db}"
DB_USER="${DB_USER:-docs_user}"
DB_NAME="${DB_NAME:-docs_management}"

# บน Git Bash (MSYS) ต้องแปลง path ฝั่ง host ให้เป็น Windows path เองอย่างชัดเจนด้วย cygpath ก่อน
# แล้วปิดการแปลง path อัตโนมัติของ MSYS เฉพาะตอนเรียก docker (MSYS_NO_PATHCONV) มิเช่นนั้น path
# ปลายทางในคอนเทนเนอร์ "container:/tmp/x" จะถูกตีความเป็น Windows path ผิดๆ ไปด้วย
if command -v cygpath >/dev/null 2>&1; then
  DUMP_FILE_HOST_PATH="$(cygpath -w "$DUMP_FILE")"
else
  DUMP_FILE_HOST_PATH="$DUMP_FILE"
fi

REMOTE_TMP="/tmp/restore_$(date +%s).dump"

MSYS_NO_PATHCONV=1 docker cp "$DUMP_FILE_HOST_PATH" "$DB_CONTAINER:$REMOTE_TMP"
MSYS_NO_PATHCONV=1 docker exec "$DB_CONTAINER" pg_restore --clean --if-exists -U "$DB_USER" -d "$DB_NAME" "$REMOTE_TMP"
MSYS_NO_PATHCONV=1 docker exec "$DB_CONTAINER" rm -f "$REMOTE_TMP"

echo "Restore complete from: $DUMP_FILE"
