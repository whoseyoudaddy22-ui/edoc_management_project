import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import fs from "node:fs/promises";
import path from "node:path";
import { prisma } from "@/lib/prisma";
import { Role, DocumentStatus, Priority, AuditAction } from "@/generated/prisma/enums";

// ทดสอบ "Audit log บันทึกครบทุก event ที่กำหนดไว้" ตาม module-14-testing.md > ระดับสำคัญ (Module 12)
//
// ครอบคลุมทุก AuditAction ที่ trigger ได้ผ่าน API โดยตรง (10/13 ค่าใน enum):
// DOCUMENT_CREATE, DOCUMENT_UPDATE, DOCUMENT_STATUS_CHANGE, DOCUMENT_DELETE, DOCUMENT_PRINT,
// ATTACHMENT_UPLOAD, ATTACHMENT_DELETE, USER_CREATE, USER_UPDATE, USER_DEACTIVATE
//
// ไม่ครอบคลุม USER_LOGIN / USER_LOGIN_FAILED / USER_LOGOUT เพราะ 3 ค่านี้ถูก log จากภายใน
// NextAuth Credentials provider (src/lib/auth.ts) ซึ่งไม่ได้ export ฟังก์ชัน authorize() แยกมาให้เรียก
// ตรงๆ ได้ — ต้องทดสอบผ่าน e2e (เช่น Playwright ยิง login form จริง) ไม่ใช่ unit/integration test แบบนี้
// (ดู module-14-testing.md > ระดับเสริม: "E2E test เต็ม flow" — ยังไม่ได้ทำในเทสนี้)

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));

const { auth } = await import("@/lib/auth");
const mockAuth = vi.mocked(auth);

const { POST: postDocuments } = await import("@/app/api/documents/route");
const { PUT: putDocument, DELETE: deleteDocument } = await import("@/app/api/documents/[id]/route");
const { POST: postPrint } = await import("@/app/api/documents/[id]/print/route");
const { POST: postUpload } = await import("@/app/api/upload/route");
const { DELETE: deleteAttachment } = await import("@/app/api/upload/[id]/route");
const { POST: postUsers } = await import("@/app/api/users/route");
const { PUT: putUser } = await import("@/app/api/users/[id]/route");
const { PATCH: deactivateUser } = await import("@/app/api/users/[id]/deactivate/route");

const TEST_DEPARTMENT_CODE = "ทบก"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น
const DOCUMENT_TYPE_CODE = "9501";

let actorId: string;
let adminId: string;
let documentTypeId: string;
let documentId: string;
let attachmentId: string;
let managedUserId: string;
const uploadDirsToCleanUp: string[] = [];

function setSession(role: Role, userId: string) {
  mockAuth.mockResolvedValue({
    user: { id: userId, role, departmentCode: TEST_DEPARTMENT_CODE },
  } as Awaited<ReturnType<typeof auth>>);
}

async function latestAuditLog(action: AuditAction, targetType: string, targetId: string) {
  return prisma.auditLog.findFirst({
    where: { action, targetType, targetId },
    orderBy: { createdAt: "desc" },
  });
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);

  const actor = await prisma.user.create({
    data: {
      email: "audit-log-actor-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ audit log (เจ้าหน้าที่)",
      role: Role.SARABAN,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  actorId = actor.id;

  const admin = await prisma.user.create({
    data: {
      email: "audit-log-admin-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ audit log (admin)",
      role: Role.ADMIN,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  adminId = admin.id;

  const documentType = await prisma.documentType.create({
    data: { code: DOCUMENT_TYPE_CODE, name: "ประเภททดสอบ audit log", isActive: true },
  });
  documentTypeId = documentType.id;
}, 30_000);

afterAll(async () => {
  // ต้องลบ AuditLog ที่ performedBy ชี้มาที่ user ทดสอบเหล่านี้ก่อน ไม่งั้นลบ User ไม่ได้ (FK constraint)
  await prisma.auditLog.deleteMany({ where: { performedBy: { in: [actorId, adminId] } } });
  if (documentId) {
    await prisma.attachment.deleteMany({ where: { documentId } });
  }
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: DOCUMENT_TYPE_CODE } });
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  if (managedUserId) {
    await prisma.user.deleteMany({ where: { id: managedUserId } });
  }
  await Promise.all(uploadDirsToCleanUp.map((dir) => fs.rm(dir, { recursive: true, force: true })));
}, 30_000);

describe("Audit log — เอกสาร", () => {
  it("DOCUMENT_CREATE: สร้างเอกสารแล้วต้องมี audit log", async () => {
    setSession(Role.SARABAN, actorId);

    const response = await postDocuments(
      new NextRequest("http://localhost/api/documents", {
        method: "POST",
        body: JSON.stringify({
          documentTypeId,
          documentDate: new Date().toISOString(),
          title: "เอกสารทดสอบ audit log",
          priority: Priority.NORMAL,
          recipient: "ผู้อำนวยการ",
          sender: "ผู้ทดสอบระบบ",
          content: "เนื้อหาเอกสารทดสอบสำหรับ audit-log.test.ts",
          createdById: actorId,
        }),
      })
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    documentId = body.data.id;

    const log = await latestAuditLog(AuditAction.DOCUMENT_CREATE, "Document", documentId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(actorId);
  });

  it("DOCUMENT_UPDATE + DOCUMENT_STATUS_CHANGE: แก้ไขชื่อเรื่องพร้อมเปลี่ยนสถานะในคำขอเดียว ต้องได้ audit log 2 รายการแยกกัน", async () => {
    setSession(Role.SARABAN, actorId);

    const response = await putDocument(
      new NextRequest(`http://localhost/api/documents/${documentId}`, {
        method: "PUT",
        body: JSON.stringify({ title: "เอกสารทดสอบ audit log (แก้ไขแล้ว)", status: DocumentStatus.PENDING }),
      }),
      { params: Promise.resolve({ id: documentId }) }
    );
    expect(response.status).toBe(200);

    const updateLog = await latestAuditLog(AuditAction.DOCUMENT_UPDATE, "Document", documentId);
    expect(updateLog).not.toBeNull();
    expect((updateLog?.changes as { title?: { to: string } } | null)?.title?.to).toBe(
      "เอกสารทดสอบ audit log (แก้ไขแล้ว)"
    );

    const statusLog = await latestAuditLog(AuditAction.DOCUMENT_STATUS_CHANGE, "Document", documentId);
    expect(statusLog).not.toBeNull();
    expect((statusLog?.changes as { status?: { from: string; to: string } } | null)?.status).toEqual({
      from: DocumentStatus.DRAFT,
      to: DocumentStatus.PENDING,
    });
  });

  it("DOCUMENT_PRINT: สั่งพิมพ์เอกสารต้องมี audit log", async () => {
    setSession(Role.SARABAN, actorId);

    const response = await postPrint(new NextRequest(`http://localhost/api/documents/${documentId}/print`, { method: "POST" }), {
      params: Promise.resolve({ id: documentId }),
    });
    expect(response.status).toBe(200);

    const log = await latestAuditLog(AuditAction.DOCUMENT_PRINT, "Document", documentId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(actorId);
  });
});

describe("Audit log — ไฟล์แนบ", () => {
  it("ATTACHMENT_UPLOAD: อัปโหลดไฟล์แนบต้องมี audit log", async () => {
    setSession(Role.SARABAN, actorId);

    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("uploadedById", actorId);
    formData.set("files", new File(["เนื้อหาไฟล์ทดสอบ"], "probe.txt", { type: "text/plain" }));

    const response = await postUpload(
      new NextRequest("http://localhost/api/upload", { method: "POST", body: formData })
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    attachmentId = body.data[0].id;
    uploadDirsToCleanUp.push(path.join(process.cwd(), "public", "uploads", documentId));

    const log = await latestAuditLog(AuditAction.ATTACHMENT_UPLOAD, "Attachment", attachmentId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(actorId);
  });

  it("ATTACHMENT_DELETE: ลบไฟล์แนบต้องมี audit log", async () => {
    setSession(Role.SARABAN, actorId);

    const response = await deleteAttachment(
      new NextRequest(`http://localhost/api/upload/${attachmentId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: attachmentId }) }
    );
    expect(response.status).toBe(200);

    const log = await latestAuditLog(AuditAction.ATTACHMENT_DELETE, "Attachment", attachmentId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(actorId);
  });
});

describe("Audit log — เอกสาร (ลบ)", () => {
  it("DOCUMENT_DELETE: ลบเอกสาร (soft delete) ต้องมี audit log", async () => {
    // ลบเอกสารจำกัดเฉพาะ ADMIN ตาม docs/modules/module-10-user-management.md
    setSession(Role.ADMIN, adminId);

    const response = await deleteDocument(
      new NextRequest(`http://localhost/api/documents/${documentId}`, { method: "DELETE" }),
      { params: Promise.resolve({ id: documentId }) }
    );
    expect(response.status).toBe(200);

    const log = await latestAuditLog(AuditAction.DOCUMENT_DELETE, "Document", documentId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(adminId);
  });
});

describe("Audit log — ผู้ใช้งาน", () => {
  it("USER_CREATE: admin สร้างผู้ใช้ใหม่ต้องมี audit log", async () => {
    setSession(Role.ADMIN, adminId);

    const response = await postUsers(
      new NextRequest("http://localhost/api/users", {
        method: "POST",
        body: JSON.stringify({
          name: "ผู้ใช้ทดสอบ audit log",
          email: "audit-log-managed-user-test@organization.go.th",
          password: "test12345",
          role: Role.VIEWER,
          departmentCode: TEST_DEPARTMENT_CODE,
        }),
      })
    );
    expect(response.status).toBe(201);

    const body = await response.json();
    managedUserId = body.data.id;

    const log = await latestAuditLog(AuditAction.USER_CREATE, "User", managedUserId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(adminId);
  });

  it("USER_UPDATE: admin แก้ไขข้อมูลผู้ใช้ต้องมี audit log", async () => {
    setSession(Role.ADMIN, adminId);

    const response = await putUser(
      new NextRequest(`http://localhost/api/users/${managedUserId}`, {
        method: "PUT",
        body: JSON.stringify({ name: "ผู้ใช้ทดสอบ audit log (แก้ไขแล้ว)" }),
      }),
      { params: Promise.resolve({ id: managedUserId }) }
    );
    expect(response.status).toBe(200);

    const log = await latestAuditLog(AuditAction.USER_UPDATE, "User", managedUserId);
    expect(log).not.toBeNull();
    expect((log?.changes as { name?: { to: string } } | null)?.name?.to).toBe("ผู้ใช้ทดสอบ audit log (แก้ไขแล้ว)");
  });

  it("USER_DEACTIVATE: admin ปิดใช้งานผู้ใช้ต้องมี audit log", async () => {
    setSession(Role.ADMIN, adminId);

    const response = await deactivateUser(
      new NextRequest(`http://localhost/api/users/${managedUserId}/deactivate`, { method: "PATCH" }),
      { params: Promise.resolve({ id: managedUserId }) }
    );
    expect(response.status).toBe(200);

    const log = await latestAuditLog(AuditAction.USER_DEACTIVATE, "User", managedUserId);
    expect(log).not.toBeNull();
    expect(log?.performedBy).toBe(adminId);
  });
});
