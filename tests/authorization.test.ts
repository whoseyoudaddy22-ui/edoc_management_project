import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import bcrypt from "bcryptjs";
import { NextRequest } from "next/server";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import { Role, DocumentStatus, Priority } from "@/generated/prisma/enums";

// ทดสอบ "Authorization: role ที่ไม่มีสิทธิ์เข้าไม่ได้จริง" ตาม module-14-testing.md > ระดับวิกฤต (Module 10)
// ครอบคลุมทุก endpoint ที่มีการจำกัดสิทธิ์ด้วย requireRole() ใน src/lib/authorize.ts x ทุก role
//
// mock เฉพาะ @/lib/auth (แทน session จริงจาก next-auth) และ @/lib/backup (กันไม่ให้ POST /api/backups
// สั่งรัน pg_dump/สคริปต์จริงระหว่างเทส authorization) — ส่วนอื่นใช้ prisma จริงกับฐานข้อมูลทดสอบ

vi.mock("@/lib/auth", () => ({ auth: vi.fn() }));
vi.mock("@/lib/backup", () => ({
  listBackups: vi.fn().mockResolvedValue([]),
  runManualBackup: vi.fn().mockResolvedValue([]),
}));

const { auth } = await import("@/lib/auth");
const mockAuth = vi.mocked(auth);

const { GET: getBackups, POST: postBackups } = await import("@/app/api/backups/route");
const { GET: getAuditLogs } = await import("@/app/api/audit-logs/route");
const { GET: getDocumentAuditLogs } = await import("@/app/api/audit-logs/document/[id]/route");
const { GET: getUsers, POST: postUsers } = await import("@/app/api/users/route");
const { PUT: putUser } = await import("@/app/api/users/[id]/route");
const { PATCH: deactivateUser } = await import("@/app/api/users/[id]/deactivate/route");

const TEST_DEPARTMENT_CODE = "ทสอ"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น
const DOCUMENT_TYPE_CODE = "9201";
const ALL_ROLES = [Role.SARABAN, Role.ADMIN, Role.APPROVER, Role.VIEWER] as const;

const roleUserId = {} as Record<Role, string>;
let involvedDocumentId: string;
let uninvolvedDocumentId: string;

function setSession(role: Role | null) {
  if (role === null) {
    mockAuth.mockResolvedValue(null);
    return;
  }
  mockAuth.mockResolvedValue({
    user: { id: roleUserId[role], role, departmentCode: TEST_DEPARTMENT_CODE },
  } as Awaited<ReturnType<typeof auth>>);
}

/** ทดสอบ endpoint หนึ่งตัวกับทุก role: ไม่ login -> 401, role นอก allowedRoles -> 403, role ใน allowedRoles -> ผ่าน (ไม่ใช่ 401/403) */
function describeAuthorization(label: string, allowedRoles: Role[], invoke: () => Promise<Response>) {
  describe(label, () => {
    it("ไม่ได้เข้าสู่ระบบ ต้องได้ 401", async () => {
      setSession(null);
      const response = await invoke();
      expect(response.status).toBe(401);
    });

    for (const role of ALL_ROLES) {
      const allowed = allowedRoles.includes(role);
      it(`role ${role} ${allowed ? "ต้องผ่านการตรวจสิทธิ์ (ไม่ใช่ 401/403)" : "ต้องถูกปฏิเสธ (403)"}`, async () => {
        setSession(role);
        const response = await invoke();
        if (allowed) {
          expect(response.status).not.toBe(401);
          expect(response.status).not.toBe(403);
        } else {
          expect(response.status).toBe(403);
        }
      });
    }
  });
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);

  for (const role of ALL_ROLES) {
    const user = await prisma.user.create({
      data: {
        email: `authz-${role.toLowerCase()}-test@organization.go.th`,
        passwordHash,
        name: `ผู้ทดสอบ authorization (${role})`,
        role,
        departmentCode: TEST_DEPARTMENT_CODE,
      },
    });
    roleUserId[role] = user.id;
  }

  const documentType = await prisma.documentType.create({
    data: { code: DOCUMENT_TYPE_CODE, name: "ประเภททดสอบ authorization", isActive: true },
  });

  const buildDocumentData =
    (overrides: { title: string; status: DocumentStatus; approvedById?: string }) =>
    ({
      documentNumber,
      buddhistYear,
      runningNumber,
    }: {
      documentNumber: string;
      buddhistYear: number;
      runningNumber: number;
    }) => ({
      documentNumber,
      buddhistYear,
      runningNumber,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: DOCUMENT_TYPE_CODE,
      documentDate: new Date(),
      title: overrides.title,
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ (ทดสอบ)",
      sender: "ผู้ทดสอบระบบ",
      content: "เนื้อหาเอกสารทดสอบสำหรับ authorization.test.ts",
      status: overrides.status,
      documentType: { connect: { id: documentType.id } },
      createdBy: { connect: { id: roleUserId[Role.SARABAN] } },
      ...(overrides.approvedById
        ? { approvedBy: { connect: { id: overrides.approvedById } }, approvedAt: new Date() }
        : {}),
    });

  const involvedDocument = await createDocumentWithAutoNumber<{ id: string }>(
    TEST_DEPARTMENT_CODE,
    DOCUMENT_TYPE_CODE,
    buildDocumentData({
      title: "เอกสารทดสอบ (approver เกี่ยวข้อง)",
      status: DocumentStatus.APPROVED,
      approvedById: roleUserId[Role.APPROVER],
    })
  );
  involvedDocumentId = involvedDocument.id;

  const uninvolvedDocument = await createDocumentWithAutoNumber<{ id: string }>(
    TEST_DEPARTMENT_CODE,
    DOCUMENT_TYPE_CODE,
    buildDocumentData({
      title: "เอกสารทดสอบ (approver ไม่เกี่ยวข้อง)",
      status: DocumentStatus.DRAFT,
    })
  );
  uninvolvedDocumentId = uninvolvedDocument.id;
});

afterAll(async () => {
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: DOCUMENT_TYPE_CODE } });
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  vi.restoreAllMocks();
});

describeAuthorization("GET /api/backups", [Role.ADMIN], () => getBackups());

describeAuthorization("POST /api/backups", [Role.ADMIN], () => postBackups());

describeAuthorization("GET /api/audit-logs", [Role.ADMIN], () =>
  getAuditLogs(new NextRequest("http://localhost/api/audit-logs"))
);

describeAuthorization("GET /api/users", [Role.ADMIN], () =>
  getUsers(new NextRequest("http://localhost/api/users"))
);

describeAuthorization("POST /api/users", [Role.ADMIN], () =>
  postUsers(new NextRequest("http://localhost/api/users", { method: "POST", body: "{}" }))
);

describeAuthorization("PUT /api/users/[id]", [Role.ADMIN], () =>
  putUser(new NextRequest("http://localhost/api/users/nonexistent", { method: "PUT", body: "{}" }), {
    params: Promise.resolve({ id: "nonexistent" }),
  })
);

describeAuthorization("PATCH /api/users/[id]/deactivate", [Role.ADMIN], () =>
  deactivateUser(new NextRequest("http://localhost/api/users/nonexistent/deactivate", { method: "PATCH" }), {
    params: Promise.resolve({ id: "nonexistent" }),
  })
);

describeAuthorization(
  "GET /api/audit-logs/document/[id] (เอกสารที่ approver เกี่ยวข้อง)",
  [Role.ADMIN, Role.APPROVER],
  () =>
    getDocumentAuditLogs(new NextRequest(`http://localhost/api/audit-logs/document/${involvedDocumentId}`), {
      params: Promise.resolve({ id: involvedDocumentId }),
    })
);

describe("GET /api/audit-logs/document/[id] (เอกสารที่ approver ไม่เกี่ยวข้อง)", () => {
  it("APPROVER ที่ไม่เกี่ยวข้องกับเอกสาร ต้องถูกปฏิเสธ (403) แม้ role จะอนุญาตโดยทั่วไป", async () => {
    setSession(Role.APPROVER);
    const response = await getDocumentAuditLogs(
      new NextRequest(`http://localhost/api/audit-logs/document/${uninvolvedDocumentId}`),
      { params: Promise.resolve({ id: uninvolvedDocumentId }) }
    );
    expect(response.status).toBe(403);
  });

  it("ADMIN ยังดูได้แม้ไม่เกี่ยวข้องกับเอกสาร (ไม่มีเงื่อนไข involved สำหรับ ADMIN)", async () => {
    setSession(Role.ADMIN);
    const response = await getDocumentAuditLogs(
      new NextRequest(`http://localhost/api/audit-logs/document/${uninvolvedDocumentId}`),
      { params: Promise.resolve({ id: uninvolvedDocumentId }) }
    );
    expect(response.status).not.toBe(401);
    expect(response.status).not.toBe(403);
  });
});
