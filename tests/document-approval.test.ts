import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import { deleteAuditLogsForTest } from "./db-test-helpers";
import { Role, DocumentStatus, Priority } from "@/generated/prisma/enums";

// ทดสอบ business rule ของปุ่ม อนุมัติ/ไม่อนุมัติ ที่เพิ่มใน commit 7199d21
// (src/components/shared/document-approval-actions.tsx เรียก PUT /api/documents/[id] ด้วย
// { status: "APPROVED" | "REJECTED", approvedById: currentUserId })
//
// authorization.test.ts ครอบคลุมแค่ 401/403 ระดับ endpoint (requireRole ที่หน้า route) และ
// audit-log.test.ts ทดสอบแค่กรณี SARABAN เปลี่ยนสถานะเป็น PENDING (ไม่ชน isApprovalDecision) —
// ไฟล์นี้เติมช่องว่าง: กติกาเฉพาะภายใน PUT /api/documents/[id] ที่แยก "ผู้แก้เนื้อหา" ออกจาก
// "ผู้อนุมัติ" (ดู src/app/api/documents/[id]/route.ts > isApprovalDecision / hasContentChanges)

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const mockAuth = vi.mocked(auth);

const { PUT: putDocument } = await import("@/app/api/documents/[id]/route");

const TEST_DEPARTMENT_CODE = "ทอม"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น
const DOCUMENT_TYPE_CODE = "9601";

const roleUserId = {} as Record<Role, string>;

function setSession(role: Role) {
  mockAuth.mockResolvedValue({
    user: { id: roleUserId[role], role, departmentCode: TEST_DEPARTMENT_CODE },
  } as Awaited<ReturnType<typeof auth>>);
}

let documentTypeId: string;

async function createPendingDocument(title: string) {
  const document = await createDocumentWithAutoNumber<{ id: string; status: DocumentStatus }>(
    TEST_DEPARTMENT_CODE,
    DOCUMENT_TYPE_CODE,
    ({ documentNumber, buddhistYear, runningNumber }) => ({
      documentNumber,
      buddhistYear,
      runningNumber,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: DOCUMENT_TYPE_CODE,
      documentDate: new Date(),
      title,
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ (ทดสอบ)",
      sender: "ผู้ทดสอบระบบ",
      content: "เนื้อหาเอกสารทดสอบสำหรับ document-approval.test.ts",
      status: DocumentStatus.PENDING,
      documentType: { connect: { id: documentTypeId } },
      createdBy: { connect: { id: roleUserId[Role.SARABAN] } },
    })
  );
  return document;
}

function decide(documentId: string, nextStatus: "APPROVED" | "REJECTED", approvedById: string) {
  return putDocument(
    new NextRequest(`http://localhost/api/documents/${documentId}`, {
      method: "PUT",
      body: JSON.stringify({ status: nextStatus, approvedById }),
    }),
    { params: Promise.resolve({ id: documentId }) }
  );
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);

  for (const role of [Role.SARABAN, Role.ADMIN, Role.APPROVER, Role.VIEWER] as const) {
    const user = await prisma.user.create({
      data: {
        email: `doc-approval-${role.toLowerCase()}-test@organization.go.th`,
        passwordHash,
        name: `ผู้ทดสอบ document-approval (${role})`,
        role,
        departmentCode: TEST_DEPARTMENT_CODE,
      },
    });
    roleUserId[role] = user.id;
  }

  const documentType = await prisma.documentType.create({
    data: { code: DOCUMENT_TYPE_CODE, name: "ประเภททดสอบ document-approval", isActive: true },
  });
  documentTypeId = documentType.id;
}, 30_000);

afterAll(async () => {
  await deleteAuditLogsForTest({ performedBy: { in: Object.values(roleUserId) } });
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: DOCUMENT_TYPE_CODE } });
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  vi.restoreAllMocks();
});

describe("PUT /api/documents/[id] — สิทธิ์อนุมัติ/ไม่อนุมัติ", () => {
  it("SARABAN (เจ้าหน้าที่สารบรรณ) พยายามอนุมัติเอกสาร ต้องถูกปฏิเสธ (403) แม้จะแก้เอกสารทั่วไปได้", async () => {
    const document = await createPendingDocument("เอกสารทดสอบ (SARABAN อนุมัติ)");
    setSession(Role.SARABAN);

    const response = await decide(document.id, "APPROVED", roleUserId[Role.SARABAN]);
    expect(response.status).toBe(403);

    const unchanged = await prisma.document.findUniqueOrThrow({ where: { id: document.id } });
    expect(unchanged.status).toBe(DocumentStatus.PENDING);
  });

  it("VIEWER พยายามไม่อนุมัติเอกสาร ต้องถูกปฏิเสธ (403)", async () => {
    const document = await createPendingDocument("เอกสารทดสอบ (VIEWER ไม่อนุมัติ)");
    setSession(Role.VIEWER);

    const response = await decide(document.id, "REJECTED", roleUserId[Role.VIEWER]);
    expect(response.status).toBe(403);
  });

  it("APPROVER อนุมัติเอกสารที่ PENDING ได้สำเร็จ (200) และบันทึก approvedById/approvedAt", async () => {
    const document = await createPendingDocument("เอกสารทดสอบ (APPROVER อนุมัติ)");
    setSession(Role.APPROVER);

    const response = await decide(document.id, "APPROVED", roleUserId[Role.APPROVER]);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.status).toBe(DocumentStatus.APPROVED);
    expect(body.data.approvedById).toBe(roleUserId[Role.APPROVER]);
    expect(body.data.approvedAt).not.toBeNull();
  });

  it("ADMIN ไม่อนุมัติเอกสารที่ PENDING ได้สำเร็จ (200)", async () => {
    const document = await createPendingDocument("เอกสารทดสอบ (ADMIN ไม่อนุมัติ)");
    setSession(Role.ADMIN);

    const response = await decide(document.id, "REJECTED", roleUserId[Role.ADMIN]);
    expect(response.status).toBe(200);

    const body = await response.json();
    expect(body.data.status).toBe(DocumentStatus.REJECTED);
  });

  it("APPROVER พยายามแก้เนื้อหาเอกสาร (ไม่ใช่แค่ตัดสินอนุมัติ) ต้องถูกปฏิเสธ (403)", async () => {
    const document = await createPendingDocument("เอกสารทดสอบ (APPROVER แก้เนื้อหา)");
    setSession(Role.APPROVER);

    const response = await putDocument(
      new NextRequest(`http://localhost/api/documents/${document.id}`, {
        method: "PUT",
        body: JSON.stringify({ title: "APPROVER พยายามแก้ชื่อเรื่อง" }),
      }),
      { params: Promise.resolve({ id: document.id }) }
    );
    expect(response.status).toBe(403);
  });
});
