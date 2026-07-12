import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Role, DocumentLayout } from "../src/generated/prisma/enums";

// รหัสประเภทเอกสารตาม .claude/skills/document-numbering/SKILL.md — ห้ามเปลี่ยนโดยไม่อัปเดต skill นั้นก่อน
const DOCUMENT_TYPE_SEEDS = [
  { code: "0001", name: "หนังสือภายนอก", layout: DocumentLayout.OFFICIAL_LETTER },
  { code: "0002", name: "หนังสือภายใน", layout: DocumentLayout.OFFICIAL_LETTER },
  { code: "0003", name: "คำสั่ง", layout: DocumentLayout.OFFICIAL_LETTER },
  { code: "0004", name: "ประกาศ", layout: DocumentLayout.OFFICIAL_LETTER },
  { code: "0005", name: "บันทึกข้อความ", layout: DocumentLayout.MEMO },
];

// Seed สำหรับฐานข้อมูล production (docs_management_prod) เท่านั้น — ห้ามรันตรงด้วย `tsx`
// ต้องรันผ่าน `npm run prod:db:seed` ซึ่งใช้ dotenv-cli โหลด .env.production เพื่อชี้ DATABASE_URL
// มายังฐานข้อมูล production ก่อนเสมอ
//
// ตั้งใจสร้างเฉพาะบัญชีที่ตั้งใจไว้สำหรับ production เท่านั้น (ไม่รวมบัญชีตัวอย่าง/dev ใน seed.ts)
// ใช้ upsert (ไม่ resetDatabase เหมือน seed-test.ts) เพราะห้ามลบข้อมูล production ที่มีอยู่จริง

function assertUsingProductionDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = databaseUrl.split("?")[0].split("/").pop();

  if (databaseName !== "docs_management_prod") {
    throw new Error(
      `seed-prod.ts ปฏิเสธการทำงาน: DATABASE_URL ชี้ไปที่ "${databaseName || "(ไม่พบ)"}" ` +
        `แต่ต้องเป็น "docs_management_prod" เท่านั้น ให้รันผ่าน \`npm run prod:db:seed\` เสมอ`
    );
  }
}

async function main() {
  assertUsingProductionDatabase();

  const adminProdPasswordHash = await bcrypt.hash("Admin1234", 10);

  const adminProd = await prisma.user.upsert({
    where: { email: "admin.prod@plvc.ac.th" },
    update: {},
    create: {
      email: "admin.prod@plvc.ac.th",
      passwordHash: adminProdPasswordHash,
      name: "ผู้ดูแลระบบ (Prod)",
      role: Role.ADMIN,
    },
  });

  console.log(`Seeded user: ${adminProd.email} (password: Admin1234) — เปลี่ยนรหัสผ่านนี้ทันทีหลัง seed`);

  const auditPasswordHash = await bcrypt.hash("Audit1234", 10);

  const audit = await prisma.user.upsert({
    where: { email: "auditplvc@plvc.ac.th" },
    update: {},
    create: {
      email: "auditplvc@plvc.ac.th",
      passwordHash: auditPasswordHash,
      name: "ผู้ตรวจสอบ",
      role: Role.APPROVER,
    },
  });

  console.log(`Seeded user: ${audit.email} (password: Audit1234) — เปลี่ยนรหัสผ่านนี้ทันทีหลัง seed`);

  await Promise.all(
    DOCUMENT_TYPE_SEEDS.map((type) =>
      prisma.documentType.upsert({
        where: { code: type.code },
        update: {},
        create: { ...type, isActive: true },
      })
    )
  );

  console.log(`Seeded ${DOCUMENT_TYPE_SEEDS.length} document types`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
