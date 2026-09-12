import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import { deleteAuditLogsForTest } from "./db-test-helpers";
import { AuditAction, DocumentStatus, Priority, Role } from "@/generated/prisma/enums";

// ทดสอบ GET /api/documents/[id]/export-pdf (เพิ่มใน commit 7c3c505 — สร้าง PDF จริงผ่าน puppeteer-core
// แทน window.print() เดิม) ดู src/app/api/documents/[id]/export-pdf/route.ts และ src/lib/pdf-generator.ts
//
// mock @/lib/pdf-generator แทนของจริงเสมอ — renderDocumentPdf ต้องเปิด headless Chromium จริง ซึ่งเครื่อง
// รันเทส (CI/dev) อาจไม่มีติดตั้งไว้เลย (ดู resolveExecutablePath ที่โยน error ถ้าไม่เจอ) เทสไฟล์นี้
// ตรวจแค่ "ตรรกะของ route" (auth, 404, ตั้งชื่อไฟล์, header, audit log) ไม่ตรวจว่า PDF ที่ได้หน้าตาถูกต้อง
// (module-14-testing.md > ระดับเสริม: "Preview/PDF parity" ให้ตรวจด้วยตาเปล่าพอสำหรับโครงงานนี้)

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/pdf-generator", () => ({
  renderDocumentPdf: vi.fn().mockResolvedValue(Buffer.from("%PDF-1.4 fake pdf for test")),
}));

const { auth } = await import("@/lib/auth");
const mockAuth = vi.mocked(auth);
const { renderDocumentPdf } = await import("@/lib/pdf-generator");
const mockRenderDocumentPdf = vi.mocked(renderDocumentPdf);

const { GET: exportPdf } = await import("@/app/api/documents/[id]/export-pdf/route");

const TEST_DEPARTMENT_CODE = "ทปด"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น
const DOCUMENT_TYPE_CODE = "9602";

let actorId: string;
let documentId: string;
let documentNumber: string;

function setSession(role: Role | null) {
  if (role === null) {
    mockAuth.mockResolvedValue(null);
    return;
  }
  mockAuth.mockResolvedValue({
    user: { id: actorId, role, departmentCode: TEST_DEPARTMENT_CODE },
  } as Awaited<ReturnType<typeof auth>>);
}

function requestExportPdf(id: string) {
  return exportPdf(new NextRequest(`http://localhost/api/documents/${id}/export-pdf`), {
    params: Promise.resolve({ id }),
  });
}

async function latestAuditLog(action: AuditAction, targetId: string) {
  return prisma.auditLog.findFirst({
    where: { action, targetType: "Document", targetId },
    orderBy: { createdAt: "desc" },
  });
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);
  const actor = await prisma.user.create({
    data: {
      email: "doc-export-pdf-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ export-pdf",
      role: Role.SARABAN,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  actorId = actor.id;

  const documentType = await prisma.documentType.create({
    data: { code: DOCUMENT_TYPE_CODE, name: "ประเภททดสอบ export-pdf", isActive: true },
  });

  const document = await createDocumentWithAutoNumber<{ id: string; documentNumber: string }>(
    TEST_DEPARTMENT_CODE,
    DOCUMENT_TYPE_CODE,
    ({ documentNumber, buddhistYear, runningNumber }) => ({
      documentNumber,
      buddhistYear,
      runningNumber,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: DOCUMENT_TYPE_CODE,
      documentDate: new Date(),
      title: "เอกสารทดสอบ export-pdf",
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ (ทดสอบ)",
      sender: "ผู้ทดสอบระบบ",
      content: "เนื้อหาเอกสารทดสอบสำหรับ document-export-pdf.test.ts",
      status: DocumentStatus.DRAFT,
      documentType: { connect: { id: documentType.id } },
      createdBy: { connect: { id: actorId } },
    })
  );
  documentId = document.id;
  documentNumber = document.documentNumber;
}, 30_000);

afterAll(async () => {
  await deleteAuditLogsForTest({ performedBy: actorId });
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: DOCUMENT_TYPE_CODE } });
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  vi.restoreAllMocks();
});

describe("GET /api/documents/[id]/export-pdf", () => {
  it("ไม่ได้เข้าสู่ระบบ ต้องได้ 401 และไม่เรียก renderDocumentPdf เลย", async () => {
    setSession(null);
    mockRenderDocumentPdf.mockClear();

    const response = await requestExportPdf(documentId);
    expect(response.status).toBe(401);
    expect(mockRenderDocumentPdf).not.toHaveBeenCalled();
  });

  it("เอกสารไม่มีอยู่จริง ต้องได้ 404", async () => {
    setSession(Role.SARABAN);
    const response = await requestExportPdf("nonexistent-document-id");
    expect(response.status).toBe(404);
  });

  it("เอกสารถูก soft-delete ไปแล้ว ต้องได้ 404 เหมือนไม่มีอยู่จริง", async () => {
    setSession(Role.SARABAN);
    await prisma.document.update({ where: { id: documentId }, data: { deletedAt: new Date() } });
    try {
      const response = await requestExportPdf(documentId);
      expect(response.status).toBe(404);
    } finally {
      await prisma.document.update({ where: { id: documentId }, data: { deletedAt: null } });
    }
  });

  it("ผู้ใช้ที่ login แล้วดาวน์โหลด PDF ได้ (200), header ถูกต้อง, ชื่อไฟล์ตรงกับเลขที่เอกสาร และมี audit log DOCUMENT_PRINT", async () => {
    setSession(Role.SARABAN);
    mockRenderDocumentPdf.mockClear();

    const response = await requestExportPdf(documentId);
    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("application/pdf");
    const sanitizedName = documentNumber.replace(/[\\/:*?"<>|]/g, "-");
    expect(response.headers.get("Content-Disposition")).toContain(encodeURIComponent(`${sanitizedName}.pdf`));

    const buffer = Buffer.from(await response.arrayBuffer());
    expect(buffer.toString()).toBe("%PDF-1.4 fake pdf for test");

    expect(mockRenderDocumentPdf).toHaveBeenCalledTimes(1);
    expect(mockRenderDocumentPdf).toHaveBeenCalledWith(
      expect.objectContaining({ printUrl: expect.stringContaining(`/documents/${documentId}/print`) })
    );

    const log = await latestAuditLog(AuditAction.DOCUMENT_PRINT, documentId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(actorId);
  });

  it("เลขที่เอกสารมีตัวอักษรที่ห้ามใช้ในชื่อไฟล์ (เช่น '/') ต้องถูกแทนที่ ไม่ทำให้ header พัง", async () => {
    setSession(Role.SARABAN);
    // documentNumber จริงมีรูปแบบ "ทปด.9602/2569-001" ซึ่งมี "/" อยู่แล้วตามปกติ — แค่ยืนยันว่า
    // Content-Disposition header ไม่มี "/" ดิบหลุดออกมา (จะทำให้ header ผิดรูปแบบ/เสี่ยง header injection)
    expect(documentNumber).toContain("/");

    const response = await requestExportPdf(documentId);
    const disposition = response.headers.get("Content-Disposition") ?? "";
    const sanitizedName = documentNumber.replace(/[\\/:*?"<>|]/g, "-");
    expect(disposition).toContain(encodeURIComponent(`${sanitizedName}.pdf`));
    expect(disposition).not.toContain(documentNumber);
  });
});
