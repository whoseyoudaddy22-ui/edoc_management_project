import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    setupFiles: ["./tests/setup.ts"],
    // เทสทั้งหมดเป็น integration test ที่ยิงฐานข้อมูล Postgres ทดสอบตัวเดียวกันจริง (docs_management_test)
    // ถ้าปล่อยให้ Vitest รันหลายไฟล์พร้อมกัน (ค่า default) แต่ละไฟล์จะแย่ง connection/lock กันเอง
    // ทำให้เทส flaky (fail แบบสุ่มไม่เกี่ยวกับบั๊กจริง) — รันทีละไฟล์แทนเพื่อผลลัพธ์ที่นิ่งและเชื่อถือได้
    fileParallelism: false,
  },
  resolve: {
    alias: {
      "@": path.resolve(process.cwd(), "src"),
    },
  },
});
