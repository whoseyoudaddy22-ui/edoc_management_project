import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // แยก build cache ของ dev server ทดสอบ UI (port 3001, .env.test) ออกจาก .next ปกติ
  // เพราะ Next.js ห้ามรัน `next dev` สองตัวพร้อมกันถ้าใช้ distDir เดียวกัน (ชนกับ production บน port 3000)
  ...(process.env.NEXT_DIST_DIR ? { distDir: process.env.NEXT_DIST_DIR } : {}),
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "X-Frame-Options", value: "DENY" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          // เบราว์เซอร์จะเมิน header นี้เมื่อรับผ่าน HTTP ธรรมดา (เช่นตอน dev) จึงใส่ได้โดยไม่กระทบ
          // local dev — มีผลจริงเฉพาะตอน deploy ผ่าน HTTPS ตาม Security Hardening ใน module-15
          { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains" },
          // เอกสารในระบบนี้เป็นข้อมูลภายในหน่วยงาน ไม่ต้องมี cross-origin permission เพิ่มเติมใดๆ
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
          // จำกัดทุก resource ให้โหลดจาก origin เดียวกันเท่านั้น (ไม่มี CDN/analytics ภายนอกในระบบนี้)
          // 'unsafe-inline' ใน script-src/style-src ยังจำเป็นเพราะยังไม่ได้ตั้ง nonce-based CSP
          // ผ่าน proxy.ts (Next.js hydration script + Tailwind บาง utility ต้องใช้ inline) — แผนถัดไป
          // ถ้าจะรัดกุมกว่านี้คือเปลี่ยนเป็น nonce แทน ไม่ใช่ปล่อย unsafe-inline ถาวร
          {
            key: "Content-Security-Policy",
            value: [
              "default-src 'self'",
              "script-src 'self' 'unsafe-inline'",
              "style-src 'self' 'unsafe-inline'",
              "img-src 'self' data:",
              "font-src 'self'",
              "connect-src 'self'",
              "object-src 'none'",
              "base-uri 'self'",
              "form-action 'self'",
              "frame-ancestors 'none'",
            ].join("; "),
          },
        ],
      },
    ];
  },
};

export default nextConfig;
