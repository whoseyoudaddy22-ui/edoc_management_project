// รันก่อนทุกไฟล์เทส (ดู vitest.config.ts > test.setupFiles)
// ป้องกันไม่ให้เทสรันไปโดนฐานข้อมูล dev จริงโดยไม่ตั้งใจ (module-14-testing.md > Testing Checklist ข้อสุดท้าย)

const databaseUrl = process.env.DATABASE_URL ?? "";
const databaseName = databaseUrl.split("?")[0].split("/").pop();

if (databaseName !== "docs_management_test") {
  throw new Error(
    `เทสถูกยกเลิก: DATABASE_URL ชี้ไปที่ "${databaseName || "(ไม่พบ)"}" แต่ต้องเป็น "docs_management_test" เท่านั้น ` +
      `ให้รันผ่าน \`npm run test\` หรือ \`npm run test:watch\` เสมอ (โหลด .env.test ให้อัตโนมัติ)`
  );
}
