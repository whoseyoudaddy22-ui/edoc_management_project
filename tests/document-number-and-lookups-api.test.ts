import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import { Role, DocumentStatus, Priority } from "@/generated/prisma/enums";

// ทดสอบ GET /api/documents/next-number (เลขที่หนังสือแนะนำ) และ GET /api/lookups
// (ค่า distinct สำหรับ autocomplete) ที่เพิ่มเข้ามาคู่กับฟีเจอร์พิมพ์เลขที่ด้วยมือ

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const mockAuth = vi.mocked(auth);

const { GET: getNextNumber } = await import("@/app/api/documents/next-number/route");
const { GET: getLookups } = await import("@/app/api/lookups/route");

const TEST_DEPARTMENT_CODE = "ทลป"; // สงวนไว้เฉพาะไฟล์เทสนี้
const TYPE_CODE = "9501";

let userId: string;
let documentTypeId: string;

function setSession(role: Role, id: string) {
  mockAuth.mockResolvedValue({
    user: { id, role, departmentCode: TEST_DEPARTMENT_CODE },
  } as Awaited<ReturnType<typeof auth>>);
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "next-number-lookups-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ next-number/lookups",
      role: Role.SARABAN,
      departmentCode: TEST_DEPARTMENT_CODE,
      position: "เจ้าหน้าที่ทดสอบ",
    },
  });
  userId = user.id;

  const documentType = await prisma.documentType.create({
    data: { code: TYPE_CODE, name: "ประเภททดสอบ next-number/lookups", isActive: true },
  });
  documentTypeId = documentType.id;
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: TYPE_CODE } });
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
});

describe("GET /api/documents/next-number", () => {
  it("401 เมื่อไม่ได้ login", async () => {
    mockAuth.mockResolvedValue(null);
    const response = await getNextNumber(
      new NextRequest(`http://localhost/api/documents/next-number?documentTypeCode=${TYPE_CODE}`)
    );
    expect(response.status).toBe(401);
  });

  it("คืนเลขแนะนำรูปแบบมาตรฐาน และไม่จองเลข (เรียกซ้ำได้ค่าเดิม)", async () => {
    setSession(Role.SARABAN, userId);

    const response = await getNextNumber(
      new NextRequest(`http://localhost/api/documents/next-number?documentTypeCode=${TYPE_CODE}`)
    );
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data.documentNumber).toMatch(/^ทลป\.9501\/\d{4}-001$/);

    // เรียกซ้ำโดยยังไม่มีการสร้างเอกสารจริง ต้องได้เลขเดิม (แค่ preview ไม่ได้จอง)
    const secondResponse = await getNextNumber(
      new NextRequest(`http://localhost/api/documents/next-number?documentTypeCode=${TYPE_CODE}`)
    );
    const secondBody = await secondResponse.json();
    expect(secondBody.data.documentNumber).toBe(body.data.documentNumber);
  });

  it("เลขแนะนำขยับต่อเนื่องหลังมีเอกสารที่พิมพ์เลขมือ (manual override) เกิดขึ้นจริงแล้ว", async () => {
    setSession(Role.SARABAN, userId);

    await createDocumentWithAutoNumber(
      TEST_DEPARTMENT_CODE,
      TYPE_CODE,
      ({ documentNumber, buddhistYear, runningNumber }) => ({
        documentNumber,
        buddhistYear,
        runningNumber,
        departmentCode: TEST_DEPARTMENT_CODE,
        documentTypeCode: TYPE_CODE,
        documentDate: new Date(),
        title: "เอกสารทดสอบพิมพ์เลขมือ",
        priority: Priority.NORMAL,
        recipient: "ผู้อำนวยการ",
        sender: "ผู้ทดสอบ",
        content: "เนื้อหาทดสอบ",
        status: DocumentStatus.DRAFT,
        documentType: { connect: { id: documentTypeId } },
        createdBy: { connect: { id: userId } },
      }),
      "เลขที่พิมพ์มือ-ทดสอบ"
    );

    const response = await getNextNumber(
      new NextRequest(`http://localhost/api/documents/next-number?documentTypeCode=${TYPE_CODE}`)
    );
    const body = await response.json();
    expect(body.data.documentNumber).toMatch(/^ทลป\.9501\/\d{4}-002$/);
  });
});

describe("GET /api/lookups", () => {
  it("400 เมื่อ field ไม่ถูกต้อง", async () => {
    setSession(Role.SARABAN, userId);
    const response = await getLookups(new NextRequest("http://localhost/api/lookups?field=bogus"));
    expect(response.status).toBe(400);
  });

  it("คืนค่า distinct ของ position จาก User", async () => {
    setSession(Role.SARABAN, userId);
    const response = await getLookups(new NextRequest("http://localhost/api/lookups?field=position"));
    expect(response.status).toBe(200);
    const body = await response.json();
    expect(body.data).toContain("เจ้าหน้าที่ทดสอบ");
  });

  it("คืนค่า distinct ของ title จาก Document (ไม่ปนกับเอกสารที่ soft delete แล้ว)", async () => {
    setSession(Role.SARABAN, userId);

    const doc = await createDocumentWithAutoNumber(
      TEST_DEPARTMENT_CODE,
      TYPE_CODE,
      ({ documentNumber, buddhistYear, runningNumber }) => ({
        documentNumber,
        buddhistYear,
        runningNumber,
        departmentCode: TEST_DEPARTMENT_CODE,
        documentTypeCode: TYPE_CODE,
        documentDate: new Date(),
        title: "เรื่องทดสอบ lookups เฉพาะไฟล์นี้",
        priority: Priority.NORMAL,
        recipient: "ผู้อำนวยการ",
        sender: "ผู้ทดสอบ",
        content: "เนื้อหาทดสอบ",
        status: DocumentStatus.DRAFT,
        documentType: { connect: { id: documentTypeId } },
        createdBy: { connect: { id: userId } },
      })
    );

    const response = await getLookups(new NextRequest("http://localhost/api/lookups?field=title"));
    const body = await response.json();
    expect(body.data).toContain("เรื่องทดสอบ lookups เฉพาะไฟล์นี้");

    await prisma.document.update({
      where: { id: (doc as { id: string }).id },
      data: { deletedAt: new Date() },
    });

    const afterDeleteResponse = await getLookups(
      new NextRequest("http://localhost/api/lookups?field=title")
    );
    const afterDeleteBody = await afterDeleteResponse.json();
    expect(afterDeleteBody.data).not.toContain("เรื่องทดสอบ lookups เฉพาะไฟล์นี้");
  });
});
