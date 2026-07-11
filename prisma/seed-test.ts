import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { createDocumentWithAutoNumber } from "../src/lib/document-number";
import { Role, DocumentStatus, Priority, DocumentLayout, TitlePrefix } from "../src/generated/prisma/enums";
import { deleteAuditLogsForTest } from "../tests/db-test-helpers";

// Seed สำหรับฐานข้อมูลทดสอบ (docs_management_test) เท่านั้น — ห้ามรันตรงด้วย `tsx`
// ต้องรันผ่าน `npm run test:db:seed` ซึ่งใช้ dotenv-cli โหลด .env.test เพื่อชี้ DATABASE_URL
// มายังฐานข้อมูลทดสอบก่อนเสมอ (ดู module-14-testing.md > Test Data)
//
// ล้างข้อมูลเดิมทั้งหมดก่อน seed ใหม่ทุกครั้ง เพื่อให้ทุกครั้งที่รันเทสเริ่มจากข้อมูลชุดเดียวกัน (predictable state)

const TEST_DEPARTMENT_CODE = "ทสบ";
const TEST_PASSWORD = "test1234";

// titlePrefix/firstName/lastName ตั้งใจใส่ให้ครบ (ไม่ใช่ null) เพราะโค้ดจริง (เช่น PUT /api/users/[id])
// มี branch ที่พฤติกรรมต่างกันระหว่าง user ที่ข้อมูลครบกับ user เก่าที่ยังไม่มี field พวกนี้
// (ดู security-review 2026-07-11 finding #2) — name ยังคงเป็น label บทบาทเดิม ไม่ผูกกับ firstName/lastName
// เพื่อไม่ให้ข้อความที่แสดงผลทั่วระบบ (sidebar, sender, audit log) เปลี่ยนไปจากเดิม
const USER_SEEDS = [
  {
    email: "saraban-test@organization.go.th",
    name: "เจ้าหน้าที่สารบรรณ (ทดสอบ)",
    role: Role.SARABAN,
    titlePrefix: TitlePrefix.MR,
    firstName: "ทดสอบ",
    lastName: "สารบรรณ",
  },
  {
    email: "admin-test@organization.go.th",
    name: "ผู้ดูแลระบบ (ทดสอบ)",
    role: Role.ADMIN,
    titlePrefix: TitlePrefix.MR,
    firstName: "ทดสอบ",
    lastName: "ดูแลระบบ",
  },
  {
    email: "approver-test@organization.go.th",
    name: "ผู้อนุมัติ (ทดสอบ)",
    role: Role.APPROVER,
    titlePrefix: TitlePrefix.MRS,
    firstName: "ทดสอบ",
    lastName: "อนุมัติ",
  },
  {
    email: "viewer-test@organization.go.th",
    name: "ผู้เยี่ยมชม (ทดสอบ)",
    role: Role.VIEWER,
    titlePrefix: TitlePrefix.MISS,
    firstName: "ทดสอบ",
    lastName: "เยี่ยมชม",
  },
] as const;

const DOCUMENT_TYPE_SEEDS = [
  { code: "0001", name: "หนังสือภายนอก (ทดสอบ)", layout: DocumentLayout.OFFICIAL_LETTER },
  { code: "0002", name: "หนังสือภายใน (ทดสอบ)", layout: DocumentLayout.OFFICIAL_LETTER },
  { code: "0005", name: "บันทึกข้อความ (ทดสอบ)", layout: DocumentLayout.MEMO },
];

function assertUsingTestDatabase() {
  const databaseUrl = process.env.DATABASE_URL ?? "";
  const databaseName = databaseUrl.split("?")[0].split("/").pop();

  if (databaseName !== "docs_management_test") {
    throw new Error(
      `seed-test.ts ปฏิเสธการทำงาน: DATABASE_URL ชี้ไปที่ "${databaseName || "(ไม่พบ)"}" ` +
        `แต่ต้องเป็น "docs_management_test" เท่านั้น (สคริปต์นี้จะลบข้อมูลทั้งหมดในฐานข้อมูลก่อน seed) ` +
        `ให้รันผ่าน \`npm run test:db:seed\` เสมอ`
    );
  }
}

async function resetDatabase() {
  // Trigger `audit_log_immutable` บล็อก DELETE บน AuditLog เสมอ — ใช้ helper กลางที่ปิด/เปิด
  // trigger ชั่วคราวให้แล้ว (ดู tests/db-test-helpers.ts:deleteAuditLogsForTest)
  await deleteAuditLogsForTest({});
  await prisma.attachment.deleteMany();
  await prisma.document.deleteMany();
  await prisma.user.deleteMany();
  await prisma.documentType.deleteMany();
}

async function main() {
  assertUsingTestDatabase();
  await resetDatabase();

  const passwordHash = await bcrypt.hash(TEST_PASSWORD, 10);
  const users = await Promise.all(
    USER_SEEDS.map((seed) =>
      prisma.user.create({
        data: {
          email: seed.email,
          passwordHash,
          name: seed.name,
          role: seed.role,
          titlePrefix: seed.titlePrefix,
          firstName: seed.firstName,
          lastName: seed.lastName,
          departmentCode: TEST_DEPARTMENT_CODE,
        },
      })
    )
  );

  const saraban = users[0];
  const approver = users[2];

  const documentTypes = await Promise.all(
    DOCUMENT_TYPE_SEEDS.map((type) => prisma.documentType.create({ data: { ...type, isActive: true } }))
  );

  const statuses = Object.values(DocumentStatus);

  for (const [index, status] of statuses.entries()) {
    const documentType = documentTypes[index % documentTypes.length];

    await createDocumentWithAutoNumber(
      TEST_DEPARTMENT_CODE,
      documentType.code,
      ({ documentNumber, buddhistYear, runningNumber }) => ({
        documentNumber,
        buddhistYear,
        runningNumber,
        departmentCode: TEST_DEPARTMENT_CODE,
        documentTypeCode: documentType.code,
        documentDate: new Date(),
        title: `เอกสารทดสอบสถานะ ${status}`,
        priority: Priority.NORMAL,
        recipient: "ผู้อำนวยการ (ทดสอบ)",
        sender: saraban.name,
        content: `เนื้อหาเอกสารทดสอบสำหรับสถานะ ${status} (seed-test)`,
        status,
        documentType: { connect: { id: documentType.id } },
        createdBy: { connect: { id: saraban.id } },
        ...(status === DocumentStatus.APPROVED
          ? { approvedBy: { connect: { id: approver.id } }, approvedAt: new Date() }
          : {}),
      })
    );
  }

  console.log(
    `Seeded ${users.length} test users (1 per role) and ${statuses.length} test documents (1 per status) into docs_management_test.`
  );
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
