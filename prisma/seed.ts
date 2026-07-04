import "dotenv/config";
import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";
import { Role } from "../src/generated/prisma/enums";

async function main() {
  const passwordHash = await bcrypt.hash("saraban1234", 10);

  const user = await prisma.user.upsert({
    where: { email: "saraban@organization.go.th" },
    update: {},
    create: {
      email: "saraban@organization.go.th",
      passwordHash,
      name: "เจ้าหน้าที่สารบรรณ",
      role: Role.SARABAN,
      departmentCode: "ศรพ",
    },
  });

  console.log(`Seeded user: ${user.email} (password: saraban1234)`);

  const adminPasswordHash = await bcrypt.hash("admin1234", 10);

  const admin = await prisma.user.upsert({
    where: { email: "admin@organization.go.th" },
    update: {},
    create: {
      email: "admin@organization.go.th",
      passwordHash: adminPasswordHash,
      name: "ผู้ดูแลระบบ",
      role: Role.ADMIN,
      departmentCode: "ศรพ",
    },
  });

  console.log(`Seeded user: ${admin.email} (password: admin1234)`);
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
