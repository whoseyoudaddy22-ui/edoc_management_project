import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { createDocumentWithAutoNumber } from "../src/lib/document-number";
import { DocumentStatus, Priority } from "../src/generated/prisma/enums";

// สร้างข้อมูลทดสอบเอกสารจำนวนมาก สำหรับทดสอบ multi-criteria search / pagination
// ตาม Testing Checklist ใน docs/modules/module-11-metadata-search.md
// รันซ้ำได้ (idempotent เฉพาะ documentType/user, เอกสารจะถูกสร้างเพิ่มทุกครั้งที่รัน)
const TOTAL_DOCUMENTS = 120;

const DOCUMENT_TYPE_SEEDS = [
  { code: "0001", name: "หนังสือภายนอก" },
  { code: "0002", name: "หนังสือภายใน" },
  { code: "0003", name: "คำสั่ง" },
  { code: "0004", name: "ประกาศ" },
];

const USER_SEEDS = [
  { email: "search-seed-1@organization.go.th", name: "เจ้าหน้าที่สารบรรณ กองกลาง", departmentCode: "กก" },
  { email: "search-seed-2@organization.go.th", name: "เจ้าหน้าที่สารบรรณ กองคลัง", departmentCode: "กง" },
  { email: "search-seed-3@organization.go.th", name: "เจ้าหน้าที่สารบรรณ กองแผนงาน", departmentCode: "กผ" },
];

const STATUSES = Object.values(DocumentStatus);
const PRIORITIES = Object.values(Priority);

const TITLE_TOPICS = [
  "ขออนุมัติจัดซื้อจัดจ้าง",
  "แจ้งเวียนระเบียบปฏิบัติงาน",
  "ขอเชิญประชุมประจำเดือน",
  "รายงานผลการดำเนินงาน",
  "ขออนุญาตเดินทางไปราชการ",
  "แจ้งผลการพิจารณา",
  "ขอความอนุเคราะห์ข้อมูล",
  "แต่งตั้งคณะทำงาน",
];

function randomItem<T>(items: T[]): T {
  return items[Math.floor(Math.random() * items.length)];
}

function randomDateWithinLastMonths(months: number): Date {
  const now = Date.now();
  const past = now - months * 30 * 24 * 60 * 60 * 1000;
  return new Date(past + Math.random() * (now - past));
}

async function main() {
  const documentTypes = await Promise.all(
    DOCUMENT_TYPE_SEEDS.map((type) =>
      prisma.documentType.upsert({
        where: { code: type.code },
        update: {},
        create: { ...type, isActive: true },
      })
    )
  );

  const passwordHash = await bcrypt.hash("searchseed1234", 10);
  const users = await Promise.all(
    USER_SEEDS.map((user) =>
      prisma.user.upsert({
        where: { email: user.email },
        update: {},
        create: { ...user, passwordHash, role: "SARABAN" },
      })
    )
  );

  let created = 0;
  let withAttachment = 0;
  let withReference = 0;

  for (let i = 0; i < TOTAL_DOCUMENTS; i++) {
    const creator = randomItem(users);
    const documentType = randomItem(documentTypes);
    const createdAt = randomDateWithinLastMonths(6);
    const hasReference = Math.random() < 0.3;

    const document = await createDocumentWithAutoNumber(
      creator.departmentCode!,
      documentType.code,
      ({ documentNumber, buddhistYear, runningNumber }) => ({
        documentNumber,
        buddhistYear,
        runningNumber,
        departmentCode: creator.departmentCode!,
        documentTypeCode: documentType.code,
        documentDate: createdAt,
        title: `${randomItem(TITLE_TOPICS)} ครั้งที่ ${i + 1}`,
        priority: randomItem(PRIORITIES),
        recipient: "ผู้อำนวยการ",
        sender: creator.name,
        referenceNumber: hasReference ? `อ้างอิง-${1000 + i}` : null,
        content: `เนื้อหาเอกสารทดสอบลำดับที่ ${i + 1} สำหรับทดสอบระบบค้นหาขั้นสูง (module 11)`,
        status: randomItem(STATUSES),
        createdAt,
        documentType: { connect: { id: documentType.id } },
        createdBy: { connect: { id: creator.id } },
      })
    );

    created += 1;
    if (hasReference) withReference += 1;

    if (Math.random() < 0.25) {
      await prisma.attachment.create({
        data: {
          documentId: (document as { id: string }).id,
          fileName: `แนบไฟล์-${i + 1}.pdf`,
          filePath: `/uploads/seed/attachment-${i + 1}.pdf`,
          fileType: "application/pdf",
          fileSize: 50_000 + Math.floor(Math.random() * 200_000),
          uploadedById: creator.id,
        },
      });
      withAttachment += 1;
    }
  }

  console.log(
    `สร้างเอกสารทดสอบ ${created} รายการ (มีไฟล์แนบ ${withAttachment} รายการ, มีเอกสารอ้างอิง ${withReference} รายการ)`
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
