import { afterAll, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { buildDocumentSearchWhere } from "@/lib/document-search";
import { Role, DocumentStatus, Priority } from "@/generated/prisma/enums";

// ทดสอบ "Metadata search คืนผลลัพธ์ตรงเงื่อนไขทุกกรณี (AND logic ไม่ใช่ OR)" ตาม module-14-testing.md
// > ระดับสำคัญ (Module 11) — ยิงผ่าน buildDocumentSearchWhere() ตรงๆ แล้ว query ด้วย prisma จริง
// เพื่อพิสูจน์ว่าเงื่อนไขที่ระบุพร้อมกันหลายตัวต้องแมตช์ "ทุกตัว" ไม่ใช่ "ตัวใดตัวหนึ่งก็พอ"

const TEST_DEPARTMENT_CODE = "ทคน"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น
const TYPE_A = "9401";
const TYPE_B = "9402";

let userId: string;
const docId: Record<"alpha" | "beta" | "gamma" | "delta", string> = {} as never;

async function search(params: Parameters<typeof buildDocumentSearchWhere>[0]) {
  const where = buildDocumentSearchWhere({ ...params, departmentCodes: [TEST_DEPARTMENT_CODE] });
  const documents = await prisma.document.findMany({ where, select: { id: true } });
  return documents.map((d) => d.id);
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "metadata-search-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ metadata search",
      role: Role.SARABAN,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  userId = user.id;

  const [typeA, typeB] = await Promise.all([
    prisma.documentType.create({ data: { code: TYPE_A, name: "ประเภททดสอบค้นหา A", isActive: true } }),
    prisma.documentType.create({ data: { code: TYPE_B, name: "ประเภททดสอบค้นหา B", isActive: true } }),
  ]);

  // 4 เอกสารที่ตั้งใจให้ทับซ้อนกันบางส่วนในแต่ละมิติ (type/status/priority/attachment/referenceNumber)
  // เพื่อให้ถ้า search logic เป็น OR แทนที่จะเป็น AND จะดึงเอกสารที่ไม่ควรมาด้วยทันที
  const alpha = await prisma.document.create({
    data: {
      documentNumber: `${TEST_DEPARTMENT_CODE}.${TYPE_A}/2569-001`,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: TYPE_A,
      buddhistYear: 2569,
      runningNumber: 1,
      documentDate: new Date("2026-01-10"),
      createdAt: new Date("2026-01-10"), // buildDocumentSearchWhere กรองช่วงวันที่ด้วย createdAt ไม่ใช่ documentDate
      title: "เอกสารทดสอบค้นหา Alpha",
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ",
      sender: "ผู้ทดสอบ",
      content: "เนื้อหา Alpha",
      status: DocumentStatus.DRAFT,
      documentType: { connect: { id: typeA.id } },
      createdBy: { connect: { id: user.id } },
    },
  });
  docId.alpha = alpha.id;

  const beta = await prisma.document.create({
    data: {
      documentNumber: `${TEST_DEPARTMENT_CODE}.${TYPE_A}/2569-002`,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: TYPE_A,
      buddhistYear: 2569,
      runningNumber: 2,
      documentDate: new Date("2026-03-10"),
      createdAt: new Date("2026-03-10"),
      title: "เอกสารทดสอบค้นหา Beta",
      priority: Priority.URGENT,
      recipient: "ผู้อำนวยการ",
      sender: "ผู้ทดสอบ",
      content: "เนื้อหา Beta",
      referenceNumber: "REF-100",
      status: DocumentStatus.APPROVED,
      documentType: { connect: { id: typeA.id } },
      createdBy: { connect: { id: user.id } },
      attachments: { create: { fileName: "beta.pdf", filePath: "/uploads/x/beta.pdf", fileType: "pdf", fileSize: 100, uploadedById: user.id } },
    },
  });
  docId.beta = beta.id;

  const gamma = await prisma.document.create({
    data: {
      documentNumber: `${TEST_DEPARTMENT_CODE}.${TYPE_B}/2569-001`,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: TYPE_B,
      buddhistYear: 2569,
      runningNumber: 1,
      documentDate: new Date("2026-01-15"),
      createdAt: new Date("2026-01-15"),
      title: "เอกสารทดสอบค้นหา Gamma",
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ",
      sender: "ผู้ทดสอบ",
      content: "เนื้อหา Gamma",
      status: DocumentStatus.DRAFT,
      documentType: { connect: { id: typeB.id } },
      createdBy: { connect: { id: user.id } },
    },
  });
  docId.gamma = gamma.id;

  const delta = await prisma.document.create({
    data: {
      documentNumber: `${TEST_DEPARTMENT_CODE}.${TYPE_B}/2569-002`,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: TYPE_B,
      buddhistYear: 2569,
      runningNumber: 2,
      documentDate: new Date("2026-03-20"),
      createdAt: new Date("2026-03-20"),
      title: "เอกสารทดสอบค้นหา Delta",
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ",
      sender: "ผู้ทดสอบ",
      content: "เนื้อหา Delta",
      referenceNumber: "REF-100",
      status: DocumentStatus.APPROVED,
      documentType: { connect: { id: typeB.id } },
      createdBy: { connect: { id: user.id } },
      attachments: { create: { fileName: "delta.pdf", filePath: "/uploads/x/delta.pdf", fileType: "pdf", fileSize: 100, uploadedById: user.id } },
    },
  });
  docId.delta = delta.id;
}, 30_000);

afterAll(async () => {
  await prisma.attachment.deleteMany({ where: { documentId: { in: Object.values(docId) } } });
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: { in: [TYPE_A, TYPE_B] } } });
  await prisma.user.delete({ where: { id: userId } });
});

describe("Metadata search — AND logic", () => {
  it("documentTypeCode + status ต้องแมตช์ทั้งคู่ (ไม่ใช่แค่ตัวใดตัวหนึ่ง)", async () => {
    // beta เป็น type A แต่สถานะ APPROVED (ไม่ใช่ DRAFT), gamma เป็นสถานะ DRAFT แต่ type B
    // ถ้า logic เป็น OR ผลลัพธ์จะมี beta และ gamma ปนมาด้วย
    const result = await search({ documentTypeCodes: [TYPE_A], statuses: [DocumentStatus.DRAFT] });
    expect(result).toEqual([docId.alpha]);
  });

  it("status + priority ต้องแมตช์ทั้งคู่", async () => {
    // delta เป็น APPROVED เหมือน beta แต่ priority เป็น NORMAL ไม่ใช่ URGENT
    const result = await search({ statuses: [DocumentStatus.APPROVED], priorities: [Priority.URGENT] });
    expect(result).toEqual([docId.beta]);
  });

  it("hasAttachment + documentTypeCode ต้องแมตช์ทั้งคู่", async () => {
    // beta มี attachment แต่เป็น type A ไม่ใช่ type B
    const result = await search({ hasAttachment: true, documentTypeCodes: [TYPE_B] });
    expect(result).toEqual([docId.delta]);
  });

  it("referenceNumber + documentTypeCode ต้องแมตช์ทั้งคู่", async () => {
    // delta ก็มี referenceNumber เดียวกัน (REF-100) แต่เป็น type B ไม่ใช่ type A
    const result = await search({ referenceNumber: "REF-100", documentTypeCodes: [TYPE_A] });
    expect(result).toEqual([docId.beta]);
  });

  it("keyword + status ต้องแมตช์ทั้งคู่", async () => {
    const result = await search({ keyword: "Alpha", statuses: [DocumentStatus.DRAFT] });
    expect(result).toEqual([docId.alpha]);
  });

  it("รวม 4 เงื่อนไขพร้อมกัน (type + status + priority + hasAttachment) ต้องแมตช์ทุกเงื่อนไข", async () => {
    const result = await search({
      documentTypeCodes: [TYPE_B],
      statuses: [DocumentStatus.APPROVED],
      priorities: [Priority.NORMAL],
      hasAttachment: true,
    });
    expect(result).toEqual([docId.delta]);
  });

  it("ไม่มีเอกสารใดแมตช์ครบทุกเงื่อนไข ต้องคืนค่าว่าง (พิสูจน์ว่าไม่ได้ fallback เป็น OR)", async () => {
    // beta คือ type A + APPROVED แต่ priority เป็น URGENT ไม่ใช่ NORMAL จึงไม่ควรมีผลลัพธ์ใดๆ
    const result = await search({
      documentTypeCodes: [TYPE_A],
      statuses: [DocumentStatus.APPROVED],
      priorities: [Priority.NORMAL],
    });
    expect(result).toEqual([]);
  });

  it("ช่วงวันที่ (dateFrom/dateTo) ต้อง AND ร่วมกับเงื่อนไขอื่น", async () => {
    // alpha และ gamma อยู่ในช่วงเดือน ม.ค. 2026 ทั้งคู่ แต่มีแค่ gamma เท่านั้นที่เป็น type B
    const result = await search({
      dateFrom: new Date("2026-01-01"),
      dateTo: new Date("2026-01-31"),
      documentTypeCodes: [TYPE_B],
    });
    expect(result).toEqual([docId.gamma]);
  });
});
