import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

// Seed บัญชีทดสอบสำหรับอาจารย์ที่ปรึกษา/กรรมการทดสอบระบบ — ใช้กับฐานข้อมูล dev (docs_management) เท่านั้น
// อีเมล/รหัสผ่านตั้งใจให้จำง่าย (ไม่ใช่บัญชีจริงที่ใช้งานถาวร) ครบทุก Role ให้ทดสอบสิทธิ์ต่างกันได้
// รหัสผ่านเดียวกันทุกบัญชีเพื่อความง่าย แต่ยังผ่าน passwordSchema (ตัวพิมพ์ใหญ่/เล็ก/ตัวเลข อย่างน้อย 8 ตัว)

const ADVISOR_PASSWORD = "Test1234";

const USER_SEEDS = [
  { email: "saraban@test.com", name: "อาจารย์ทดสอบ (สารบรรณ)", role: Role.SARABAN },
  { email: "admin@test.com", name: "อาจารย์ทดสอบ (ผู้ดูแลระบบ)", role: Role.ADMIN },
  { email: "approver@test.com", name: "อาจารย์ทดสอบ (ผู้อนุมัติ)", role: Role.APPROVER },
  { email: "viewer@test.com", name: "อาจารย์ทดสอบ (ผู้เยี่ยมชม)", role: Role.VIEWER },
] as const;

async function main() {
  const passwordHash = await bcrypt.hash(ADVISOR_PASSWORD, 10);

  for (const seed of USER_SEEDS) {
    const user = await prisma.user.upsert({
      where: { email: seed.email },
      update: {},
      create: {
        email: seed.email,
        passwordHash,
        name: seed.name,
        role: seed.role,
        departmentCode: "ศรพ",
      },
    });
    console.log(`Seeded user: ${user.email} (role: ${user.role}, password: ${ADVISOR_PASSWORD})`);
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
