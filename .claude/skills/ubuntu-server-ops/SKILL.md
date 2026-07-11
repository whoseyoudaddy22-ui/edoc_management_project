---
name: ubuntu-server-ops
description: Ongoing configuration, service tuning, monitoring, and operational maintenance of the Ubuntu Server 24.04 LTS machine that runs this project's production instance — for use *after* the server is already installed and running (docker compose stack, Nginx, systemd, backup cron, ufw/fail2ban already in place). Use this skill when the user wants to improve/tune server or service performance, investigate a running-service issue (Nginx, Docker, PostgreSQL, systemd unit), set up log rotation/monitoring, apply a config change safely with a rollback plan, or do routine server maintenance (updates, disk cleanup, resource checks). For first-time server setup/installation, use the `environment-setup` skill instead — this skill assumes that work is already done.
---

# Ubuntu Server Operations (การดูแล/ปรับปรุงการทำงานของ Ubuntu Server 24.04 LTS)

## ขอบเขตของ Skill นี้ (ต่างจาก `environment-setup` อย่างไร)

`environment-setup` = ติดตั้งเครื่องใหม่ตั้งแต่ศูนย์ (ลำดับขั้นตอนที่ 1-13)
**`ubuntu-server-ops` (ไฟล์นี้) = ดูแล/ปรับปรุง/แก้ปัญหาเครื่องที่ติดตั้งเสร็จแล้วและรันจริงอยู่** — ใช้ตอนที่ stack ด้านล่างนี้ทำงานอยู่แล้วบนเครื่อง production:

- `docker compose` (service `db` + `app`, ดู `docker-compose.yml`) — Postgres ไม่ publish port ออกนอกเครื่อง, app bind กับ `127.0.0.1:3000` เท่านั้น
- Nginx reverse proxy หน้า app (HTTP→HTTPS redirect, terminate TLS)
- `ufw` (เปิดเฉพาะ 22/80/443) + `fail2ban` (jail `sshd`)
- Backup cron (`scripts/backup-db.sh`, `scripts/backup-files.sh` รันทุกวัน 02:00, retention 30 วัน — ดู `docs/modules/module-13-backup-recovery.md`)
- Static IP ตั้งผ่าน netplan (ไม่ใช่ DHCP)

**กฎเหล็กก่อนแก้ config ใดๆ บนเครื่องนี้:** เครื่องนี้เป็น production จริง — ทุกการแก้ config ต้อง (1) backup ไฟล์ config เดิมก่อนแก้เสมอ (`cp file file.bak.$(date +%Y%m%d)`) (2) ทดสอบ syntax ก่อน reload/restart service เสมอ (เช่น `nginx -t` ก่อน `systemctl reload nginx`) (3) มีแผน rollback ชัดเจนก่อนเริ่ม ไม่ใช่คิดตอนพัง — อ้างอิงแนวทางเดียวกับที่เคยทดสอบผ่านแล้วจริงใน `docs/progress-log.md` (retag Docker image กลับตัวก่อนหน้า, ข้อมูลใน `pgdata` volume ไม่หายเพราะแยกจาก container app)

## 1) ตรวจสถานะเครื่องก่อนแก้อะไรเสมอ (Pre-flight)

```bash
echo "=== Docker ===" && docker compose ps && docker system df
echo "=== Disk ===" && df -h / && du -sh /var/lib/docker
echo "=== Memory/Load ===" && free -h && uptime
echo "=== Services ===" && systemctl status nginx docker fail2ban ufw --no-pager
echo "=== Recent errors ===" && journalctl -p err -b --no-pager | tail -30
echo "=== Backup ล่าสุด ===" && ls -lt backups/database backups/files | head -5
```

## 2) Log Rotation (ป้องกัน disk เต็มจาก log ที่โตไม่หยุด)

ตรวจว่า log ของ backup cron (`logs/backup.log`) และ Docker container logs มี rotation จริง:

```bash
# ตรวจว่า Docker jsonfile log driver จำกัดขนาดไว้หรือยัง (ค่า default ไม่จำกัด = เสี่ยง disk เต็ม)
docker inspect docs-app --format '{{json .HostConfig.LogConfig}}'
```

ถ้ายังไม่จำกัด ให้เพิ่มใน `docker-compose.yml` ต่อ service:

```yaml
    logging:
      driver: json-file
      options:
        max-size: "10m"
        max-file: "3"
```

สำหรับ `logs/backup.log` ที่โตเรื่อยๆ ให้ตั้ง `logrotate`:

```bash
sudo tee /etc/logrotate.d/edoc-backup <<'EOF'
/path/to/Project/logs/backup.log {
  weekly
  rotate 8
  compress
  missingok
  notifempty
}
EOF
sudo logrotate -d /etc/logrotate.d/edoc-backup   # dry-run ตรวจ syntax ก่อนเชื่อ
```

## 3) Nginx — ปรับ performance/security header

ก่อนแก้ทุกครั้ง: `sudo nginx -t` ก่อนและหลังแก้เสมอ, `sudo systemctl reload nginx` (ไม่ใช้ `restart` เพราะตัด connection ที่ค้างอยู่ทันที)

จุดที่ควรตรวจ/ปรับปรุงเป็นระยะ:
- `gzip on;` + `gzip_types` ครอบคลุม `text/css application/javascript application/json` เพื่อลด bandwidth
- `client_max_body_size` ต้องสอดคล้องกับขนาดไฟล์แนบสูงสุดที่แอปอนุญาต (ดู `src/lib/upload.ts` ฝั่ง app — ถ้า Nginx จำกัดต่ำกว่า จะได้ 413 ก่อนถึงชั้น validation ของแอปเสียอีก)
- Header ที่ควรมี: `Strict-Transport-Security`, `X-Content-Type-Options: nosniff` — เทียบกับที่ตั้งไว้แล้วใน `next.config.ts` (`headers()`) ว่าไม่ตั้งซ้ำซ้อน/ขัดแย้งกัน
- `worker_processes auto;` และ `worker_connections` ให้เหมาะกับ core/RAM ของเครื่องจริง ไม่ใช่ค่า default ที่ generate ตอนติดตั้ง

## 4) PostgreSQL — ตรวจสุขภาพและ tuning เบื้องต้น

```bash
# ขนาด DB และตารางที่ใหญ่ที่สุด (เฝ้าดู Document/AuditLog โตเร็วกว่าตารางอื่น)
docker exec docs-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\
  SELECT relname, pg_size_pretty(pg_total_relation_size(relid)) AS size \
  FROM pg_catalog.pg_statio_user_tables ORDER BY pg_total_relation_size(relid) DESC LIMIT 10;"

# ตรวจว่า autovacuum ทำงานอยู่ (สำคัญมากสำหรับตาราง AuditLog ที่ insert-only แต่ไม่เคย delete)
docker exec docs-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "SHOW autovacuum;"

# connection ที่ค้าง/idle นาน
docker exec docs-db psql -U "$POSTGRES_USER" -d "$POSTGRES_DB" -c "\
  SELECT pid, state, now()-query_start AS duration, query \
  FROM pg_stat_activity WHERE state != 'idle' ORDER BY duration DESC LIMIT 10;"
```

**ข้อควรระวังเฉพาะโปรเจกต์นี้:** ห้ามให้ DB user ของ production มีสิทธิ์ `ALTER TABLE` (พบระหว่าง security-review 2026-07-11 ว่า test-only script บางตัวใช้ `ALTER TABLE ... DISABLE TRIGGER` ชั่วคราวเพื่อปิด `audit_log_immutable` — ถ้า production DB user มีสิทธิ์นี้ได้ด้วย จะเป็นช่องทางที่แพทเทิร์นเดียวกันหลุดไปทำลาย audit trail integrity บน production ได้ ให้จำกัดสิทธิ์ผ่าน `REVOKE ALTER ON "AuditLog" FROM <prod_user>` หรือเทียบเท่า)

## 5) systemd / Docker auto-recovery — ตรวจเป็นระยะไม่ใช่แค่ตอนติดตั้ง

```bash
systemctl is-enabled docker nginx fail2ban   # ต้อง enabled ทั้งหมด (บูตแล้วเปิดเอง)
docker inspect docs-app docs-db --format '{{.Name}}: {{.HostConfig.RestartPolicy.Name}}'  # ต้องเป็น unless-stopped
```

ถ้าจะทดสอบ auto-recovery จริง (`sudo reboot`) ให้แจ้งผู้ใช้ก่อนเสมอเพราะเป็นการ downtime ระบบจริง — ไม่ทำโดยไม่ถาม แม้จะเคยทดสอบผ่านมาแล้วในอดีตก็ตาม (ระบบอาจเปลี่ยนไปตั้งแต่ครั้งล่าสุด)

## 6) Deploy เวอร์ชันใหม่แบบไม่ downtime นาน (Rolling-ish update)

อ้างอิงขั้นตอนที่เคยทดสอบผ่านจริงแล้ว (ดู `docs/progress-log.md`):

```bash
# 1) backup DB ก่อนเสมอ (โดยเฉพาะถ้ามี migration ใหม่)
./scripts/backup-db.sh

# 2) เก็บ image ปัจจุบันไว้เป็น known-good ก่อน build ใหม่
docker tag docs-app:latest edoc-app:known-good-$(git rev-parse --short HEAD)

# 3) pull โค้ดใหม่ + migrate + build + up
git pull origin master
docker compose --env-file .env.production run --rm migrate
docker compose --env-file .env.production up -d --build

# 4) verify ผ่าน HTTPS จริงก่อนปิดงาน — ถ้าพัง ให้ rollback ทันที:
#    docker tag edoc-app:known-good-<sha> docs-app:latest && docker compose up -d --no-build
```

ข้อมูลใน `pgdata` volume ไม่ถูกกระทบจากขั้นตอนนี้เลย (แยกจาก container image) — เคยยืนยันด้วยการทดสอบจริงแล้วว่า rollback แบบนี้ใช้งานได้

## 7) Disk cleanup เมื่อพื้นที่เหลือน้อย

```bash
docker image prune -a -f          # ลบ image เก่าที่ไม่ได้ใช้แล้ว (เก็บ known-good tag ล่าสุดไว้เสมอ อย่า prune มั่ว)
docker system df                  # ดูว่าพื้นที่หายไปกับอะไร (image/container/volume/build cache)
find backups/ -type f -mtime +30  # ตรวจว่า retention policy ของ backup ทำงานจริง (ควรลบเองแล้วตาม module-13)
```

## Testing Checklist ของ Skill นี้เอง

- [ ] Backup ไฟล์ config เดิมก่อนแก้ทุกครั้ง
- [ ] ทดสอบ syntax (`nginx -t` หรือเทียบเท่า) ก่อน reload/restart service จริงเสมอ
- [ ] มีแผน rollback ที่ทดสอบแล้วจริงก่อนเริ่มแก้ config บน production (ไม่ใช่คิดตอนพัง)
- [ ] แจ้งผู้ใช้ก่อนทำ action ที่มี downtime (reboot, restart service หลัก) เสมอ ไม่ทำเองโดยไม่ถาม
- [ ] หลังแก้เสร็จ ตรวจ Testing Checklist ที่เกี่ยวข้องใน `docs/modules/module-15-deployment.md` ซ้ำอีกครั้ง
