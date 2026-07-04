# อ้างอิงตาม docs/modules/module-15-deployment.md > ถ้าใช้ Docker
# Multi-stage build: deps -> builder -> runner เพื่อให้ image สุดท้ายไม่มี devDependencies/source ที่ไม่จำเป็น

# ---- Stage 1: ติดตั้ง dependencies ----
FROM node:20-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci

# ---- Stage 2: build ----
FROM node:20-alpine AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .
# src/generated/prisma ไม่ commit เข้า git (ดู .gitignore) ต้อง generate ใหม่ทุกครั้งก่อน build
RUN npx prisma generate
RUN npm run build
# ตัด devDependencies ออกก่อนนำ node_modules ไปใช้ใน production image
RUN npm prune --omit=dev

# ---- Stage 3: production runtime ----
FROM node:20-alpine AS runner
WORKDIR /app
ENV NODE_ENV=production

RUN addgroup -S nodejs && adduser -S nextjs -G nodejs

COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./package.json
COPY --from=builder /app/next.config.ts ./next.config.ts
COPY --from=builder /app/prisma.config.ts ./prisma.config.ts
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next ./.next
COPY --from=builder /app/prisma ./prisma
COPY --from=builder /app/src/generated ./src/generated

# public/uploads ถูก mount เป็น volume ใน docker-compose.yml อยู่แล้ว บรรทัดนี้กันไว้เผื่อรันโดยไม่มี volume
RUN mkdir -p ./public/uploads && chown -R nextjs:nodejs ./public/uploads .next

USER nextjs
EXPOSE 3000

# หมายเหตุ: ไม่รัน `prisma migrate deploy` ใน CMD/entrypoint ตั้งใจ — ต้องรันแยกเป็นขั้นตอนเดียว
# ก่อน start เสมอ (ดู docker-compose.yml service "migrate" และ module-15-deployment.md > ขั้นตอน Build & Deploy)
# เพื่อป้องกันปัญหา migration แข่งกันรันถ้ามีหลาย instance ของ app พร้อมกัน
CMD ["npm", "start"]
