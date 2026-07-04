import { afterAll, afterEach, beforeAll, describe, expect, it } from "vitest";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { Role, AuditAction } from "@/generated/prisma/enums";
import { isLoginLocked, LOGIN_MAX_FAILED_ATTEMPTS, LOGIN_LOCKOUT_WINDOW_MINUTES } from "@/lib/login-rate-limit";

// ทดสอบ rate limiting หน้า login ตาม module-15-deployment.md > Security Hardening
// ("ตรวจสอบว่า rate limiting มีอยู่ในหน้า login (ป้องกัน brute-force) — เชื่อมกับ Module 12 (Audit Log)
// ที่บันทึก USER_LOGIN_FAILED ไว้อยู่แล้ว ใช้ข้อมูลนี้ตรวจจับได้")

const TEST_DEPARTMENT_CODE = "ทลอ"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น

let userId: string;

async function seedFailedAttempts(count: number, createdAt: Date) {
  await prisma.auditLog.createMany({
    data: Array.from({ length: count }, () => ({
      action: AuditAction.USER_LOGIN_FAILED,
      performedBy: userId,
      targetType: "User",
      targetId: userId,
      createdAt,
    })),
  });
}

beforeAll(async () => {
  const passwordHash = await bcrypt.hash("test1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "login-rate-limit-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ rate limiting",
      role: Role.VIEWER,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  userId = user.id;
}, 30_000);

afterEach(async () => {
  await prisma.auditLog.deleteMany({ where: { performedBy: userId } });
});

afterAll(async () => {
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
}, 30_000);

describe("Login rate limiting", () => {
  it(`ไม่ล็อก ถ้า login ผิดน้อยกว่า ${LOGIN_MAX_FAILED_ATTEMPTS} ครั้งในช่วงเวลาที่กำหนด`, async () => {
    await seedFailedAttempts(LOGIN_MAX_FAILED_ATTEMPTS - 1, new Date());

    expect(await isLoginLocked(userId)).toBe(false);
  });

  it(`ล็อก ถ้า login ผิดครบ ${LOGIN_MAX_FAILED_ATTEMPTS} ครั้งภายในช่วงเวลาที่กำหนด`, async () => {
    await seedFailedAttempts(LOGIN_MAX_FAILED_ATTEMPTS, new Date());

    expect(await isLoginLocked(userId)).toBe(true);
  });

  it(`ไม่ล็อก ถ้าครั้งที่ผิดเกิดขึ้นก่อนหน้าต่างเวลา ${LOGIN_LOCKOUT_WINDOW_MINUTES} นาทีทั้งหมด`, async () => {
    const outsideWindow = new Date(Date.now() - (LOGIN_LOCKOUT_WINDOW_MINUTES + 1) * 60 * 1000);
    await seedFailedAttempts(LOGIN_MAX_FAILED_ATTEMPTS + 5, outsideWindow);

    expect(await isLoginLocked(userId)).toBe(false);
  });

  it("ไม่ล็อกผู้ใช้อื่นที่ไม่เกี่ยวข้อง แม้จะมี user ที่ถูกล็อกอยู่ในระบบ", async () => {
    await seedFailedAttempts(LOGIN_MAX_FAILED_ATTEMPTS, new Date());
    expect(await isLoginLocked(userId)).toBe(true);

    const otherUser = await prisma.user.create({
      data: {
        email: "login-rate-limit-other-test@organization.go.th",
        passwordHash: await bcrypt.hash("test1234", 10),
        name: "ผู้ใช้อื่นที่ไม่เกี่ยวข้อง",
        role: Role.VIEWER,
        departmentCode: TEST_DEPARTMENT_CODE,
      },
    });

    expect(await isLoginLocked(otherUser.id)).toBe(false);

    await prisma.user.deleteMany({ where: { id: otherUser.id } });
  });
});
