#!/bin/bash
# Build + migrate deploy + start สำหรับ deploy แบบไม่ใช้ Docker (On-premise/VPS)
# อ้างอิง docs/modules/module-15-deployment.md > ขั้นตอน Build & Deploy
# ใช้งาน: bash scripts/deploy.sh
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
cd "$PROJECT_ROOT"

if [ ! -f .env.production ]; then
  echo "ไม่พบ .env.production ที่ $PROJECT_ROOT — สร้างไฟล์นี้ก่อน deploy (ดู docs/modules/module-15-deployment.md)" >&2
  exit 1
fi

echo "=== 1/4 ติดตั้ง dependencies ==="
npm ci

echo "=== 2/4 generate prisma client + build production bundle ==="
npx dotenv -e .env.production -- npx prisma generate
npx dotenv -e .env.production -- npm run build

echo "=== 3/4 รัน migration บนฐานข้อมูล production (migrate deploy เท่านั้น ห้ามใช้ migrate dev) ==="
npx dotenv -e .env.production -- npx prisma migrate deploy

echo "=== 4/4 เริ่มแอปโหมด production ==="
npx dotenv -e .env.production -- npm run start
