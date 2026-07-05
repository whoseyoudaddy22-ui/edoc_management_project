import type { NextConfig } from "next";

const nextConfig: NextConfig = {
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
        ],
      },
    ];
  },
};

export default nextConfig;
