import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";
import os from "node:os";
import crypto from "node:crypto";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { Role, DocumentStatus, Priority } from "@/generated/prisma/enums";
import bcrypt from "bcryptjs";

// ทดสอบ "Backup/Restore ทำงานได้จริง" ตาม module-14-testing.md > ระดับวิกฤต (Module 13)
// รันสคริปต์ backup/restore ตัวจริงใน scripts/ (ไม่ mock) เพราะ backup ที่ไม่เคยทดสอบ restore ถือว่าใช้ไม่ได้
// ตาม Testing Checklist ของ module-13-backup-recovery.md — เทสนี้แปลง checklist ที่เคยทำมือให้รันซ้ำได้อัตโนมัติ
//
// - Backup ฐานข้อมูล: สำรองจาก docs_management_test แล้ว restore เข้า docs_management_test_restore
//   (คนละฐานข้อมูลกับต้นฉบับ ตามที่ checklist กำหนด) แล้วเทียบข้อมูลทุก field ต้องตรงกัน
// - Backup ไฟล์แนบ: ใช้โฟลเดอร์ทดสอบชั่วคราวแทน public/uploads จริง (ผ่าน UPLOADS_DIR override)
//   แล้วแตกไฟล์กลับมาเทียบ sha256
// - Retention policy: ไฟล์เก่ากว่า 30 วันต้องถูกลบ ไฟล์ใหม่กว่าต้องยังอยู่

const execFileAsync = promisify(execFile);
const PROJECT_ROOT = process.cwd();
// bash executable เดียวกับที่ src/lib/backup.ts ใช้ (ดูคอมเมนต์ที่นั่น) — คัดลอกมาที่นี่เพราะ
// runScript() ใน backup.ts เป็น private ไม่ export ออกมา และเทสนี้ตั้งใจรันสคริปต์จริงตรงๆ
const BASH_EXECUTABLE =
  process.env.BACKUP_BASH_PATH ?? (process.platform === "win32" ? "C:\\Program Files\\Git\\usr\\bin\\bash.exe" : "bash");

async function runScript(scriptName: string, env: Record<string, string>, extraArgs: string[] = []): Promise<string> {
  const scriptPath = path.join(PROJECT_ROOT, "scripts", scriptName);
  const args = process.platform === "win32" ? ["--login", scriptPath, ...extraArgs] : [scriptPath, ...extraArgs];
  const { stdout } = await execFileAsync(BASH_EXECUTABLE, args, {
    cwd: PROJECT_ROOT,
    env: { ...process.env, ...env },
  });
  return stdout.trim();
}

// สคริปต์รันผ่าน Git Bash แล้ว print path แบบ POSIX (เช่น /c/Users/...) เสมอ ไม่ว่าจะรันจาก
// Node บน Windows หรือไม่ก็ตาม — ดึงมาแค่ชื่อไฟล์แล้วประกอบ path ฝั่ง Node เองแทนที่จะ parse path เต็ม
function parseCreatedFileName(scriptOutput: string): string {
  const match = scriptOutput.match(/Backup created: .*[\\/]([^\\/]+)$/m);
  if (!match) {
    throw new Error(`ไม่พบชื่อไฟล์ backup ใน output: "${scriptOutput}"`);
  }
  return match[1].trim();
}

// แปลง path แบบ Windows (C:\foo\bar) เป็น POSIX แบบที่ Git Bash เข้าใจ (/c/foo/bar) สำหรับส่งเป็น
// argument ให้สคริปต์ bash — ต้องแยกจาก path ที่ใช้กับ fs.* ของ Node (ต้องเป็น Windows path)
function winToPosix(windowsPath: string): string {
  return windowsPath.replace(/\\/g, "/").replace(/^([A-Za-z]):/, (_, drive: string) => `/${drive.toLowerCase()}`);
}

async function sha256(filePath: string): Promise<string> {
  const buffer = await fs.readFile(filePath);
  return crypto.createHash("sha256").update(buffer).digest("hex");
}

const RESTORE_DB_URL = (process.env.DATABASE_URL ?? "").replace(
  "docs_management_test",
  "docs_management_test_restore"
);

const TEST_DEPARTMENT_CODE = "ทสร"; // สงวนไว้เฉพาะไฟล์เทสนี้ ไม่ปนกับไฟล์เทส/seed อื่น
const DOCUMENT_TYPE_CODE = "9301";

const restorePrisma = new PrismaClient({ adapter: new PrismaPg({ connectionString: RESTORE_DB_URL }) });

let originalUserId: string;
let originalDocumentId: string;
const artifactsToCleanUp: string[] = [];
let tmpUploadsDir: string;

beforeAll(async () => {
  if (!RESTORE_DB_URL.includes("docs_management_test_restore")) {
    throw new Error("RESTORE_DB_URL ต้องชี้ไปที่ docs_management_test_restore เท่านั้น (กันไม่ให้ restore ทับฐานข้อมูลอื่น)");
  }

  const passwordHash = await bcrypt.hash("test1234", 10);
  const user = await prisma.user.create({
    data: {
      email: "backup-restore-test@organization.go.th",
      passwordHash,
      name: "ผู้ทดสอบ backup/restore",
      role: Role.SARABAN,
      departmentCode: TEST_DEPARTMENT_CODE,
    },
  });
  originalUserId = user.id;

  const documentType = await prisma.documentType.create({
    data: { code: DOCUMENT_TYPE_CODE, name: "ประเภททดสอบ backup/restore", isActive: true },
  });

  const document = await prisma.document.create({
    data: {
      documentNumber: `${TEST_DEPARTMENT_CODE}.${DOCUMENT_TYPE_CODE}/2569-001`,
      departmentCode: TEST_DEPARTMENT_CODE,
      documentTypeCode: DOCUMENT_TYPE_CODE,
      buddhistYear: 2569,
      runningNumber: 1,
      documentDate: new Date(),
      title: "เอกสารทดสอบ backup/restore",
      priority: Priority.NORMAL,
      recipient: "ผู้อำนวยการ (ทดสอบ)",
      sender: "ผู้ทดสอบระบบ",
      content: "เนื้อหาเอกสารทดสอบสำหรับ backup-restore.test.ts",
      status: DocumentStatus.DRAFT,
      documentType: { connect: { id: documentType.id } },
      createdBy: { connect: { id: user.id } },
    },
  });
  originalDocumentId = document.id;

  tmpUploadsDir = await fs.mkdtemp(path.join(os.tmpdir(), "backup-test-uploads-"));
  await fs.writeFile(path.join(tmpUploadsDir, "probe.txt"), "ไฟล์แนบทดสอบสำหรับ backup-restore.test.ts");
}, 30_000);

afterAll(async () => {
  await prisma.document.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await prisma.documentType.deleteMany({ where: { code: DOCUMENT_TYPE_CODE } });
  await prisma.user.deleteMany({ where: { departmentCode: TEST_DEPARTMENT_CODE } });
  await restorePrisma.$disconnect();

  if (tmpUploadsDir) {
    await fs.rm(tmpUploadsDir, { recursive: true, force: true });
  }
  await Promise.all(artifactsToCleanUp.map((filePath) => fs.rm(filePath, { force: true })));
}, 30_000);

describe("Database backup + restore", () => {
  it("สำรองข้อมูลจาก docs_management_test แล้ว restore เข้า docs_management_test_restore ข้อมูลต้องตรงกับต้นฉบับทุก field", async () => {
    const originalUser = await prisma.user.findUniqueOrThrow({ where: { id: originalUserId } });
    const originalDocument = await prisma.document.findUniqueOrThrow({ where: { id: originalDocumentId } });

    const backupOutput = await runScript("backup-db.sh", { DB_NAME: "docs_management_test" });
    const dumpFileName = parseCreatedFileName(backupOutput);
    const dumpPath = path.join(PROJECT_ROOT, "backups", "database", dumpFileName);
    artifactsToCleanUp.push(dumpPath);

    const stat = await fs.stat(dumpPath);
    expect(stat.size).toBeGreaterThan(0);

    await runScript("restore-db.sh", { DB_NAME: "docs_management_test_restore" }, [winToPosix(dumpPath)]);

    const restoredUser = await restorePrisma.user.findUniqueOrThrow({ where: { id: originalUserId } });
    const restoredDocument = await restorePrisma.document.findUniqueOrThrow({ where: { id: originalDocumentId } });

    expect(restoredUser).toEqual(originalUser);
    expect(restoredDocument).toEqual(originalDocument);
  }, 30_000);
});

describe("File attachment backup + restore", () => {
  it("สำรองไฟล์แนบแล้วแตกกลับมาเปิดได้ปกติ (sha256 ตรงกับต้นฉบับ)", async () => {
    const originalFilePath = path.join(tmpUploadsDir, "probe.txt");
    const originalChecksum = await sha256(originalFilePath);

    const backupOutput = await runScript("backup-files.sh", { UPLOADS_DIR: tmpUploadsDir });
    const tarFileName = parseCreatedFileName(backupOutput);
    const tarPath = path.join(PROJECT_ROOT, "backups", "files", tarFileName);
    artifactsToCleanUp.push(tarPath);

    const stat = await fs.stat(tarPath);
    expect(stat.size).toBeGreaterThan(0);

    const extractDir = await fs.mkdtemp(path.join(os.tmpdir(), "backup-test-extract-"));
    try {
      await execFileAsync(BASH_EXECUTABLE, [
        "--login",
        "-c",
        `tar -xzf "${winToPosix(tarPath)}" -C "${winToPosix(extractDir)}"`,
      ]);

      const uploadsFolderName = path.basename(tmpUploadsDir);
      const extractedFilePath = path.join(extractDir, uploadsFolderName, "probe.txt");
      const extractedChecksum = await sha256(extractedFilePath);

      expect(extractedChecksum).toBe(originalChecksum);
    } finally {
      await fs.rm(extractDir, { recursive: true, force: true });
    }
  }, 30_000);
});

describe("Retention policy", () => {
  it("ลบไฟล์ backup ที่เก่ากว่า 30 วันจริง แต่ไม่ลบไฟล์ที่ใหม่กว่า", async () => {
    const dbDir = path.join(PROJECT_ROOT, "backups", "database");
    const filesDir = path.join(PROJECT_ROOT, "backups", "files");
    await fs.mkdir(dbDir, { recursive: true });
    await fs.mkdir(filesDir, { recursive: true });

    const oldDbFile = path.join(dbDir, "retention-test-old.dump");
    const recentDbFile = path.join(dbDir, "retention-test-recent.dump");
    const oldFilesFile = path.join(filesDir, "retention-test-old.tar.gz");
    const recentFilesFile = path.join(filesDir, "retention-test-recent.tar.gz");

    const now = Date.now();
    const daysAgo = (days: number) => new Date(now - days * 24 * 60 * 60 * 1000);

    await fs.writeFile(oldDbFile, "dummy");
    await fs.writeFile(recentDbFile, "dummy");
    await fs.writeFile(oldFilesFile, "dummy");
    await fs.writeFile(recentFilesFile, "dummy");

    await fs.utimes(oldDbFile, daysAgo(35), daysAgo(35));
    await fs.utimes(oldFilesFile, daysAgo(35), daysAgo(35));
    await fs.utimes(recentDbFile, daysAgo(10), daysAgo(10));
    await fs.utimes(recentFilesFile, daysAgo(10), daysAgo(10));

    artifactsToCleanUp.push(recentDbFile, recentFilesFile);

    const dbBackupOutput = await runScript("backup-db.sh", { DB_NAME: "docs_management_test", RETENTION_DAYS: "30" });
    artifactsToCleanUp.push(path.join(dbDir, parseCreatedFileName(dbBackupOutput)));

    const filesBackupOutput = await runScript("backup-files.sh", { UPLOADS_DIR: tmpUploadsDir, RETENTION_DAYS: "30" });
    artifactsToCleanUp.push(path.join(filesDir, parseCreatedFileName(filesBackupOutput)));

    await expect(fs.stat(oldDbFile)).rejects.toThrow();
    await expect(fs.stat(oldFilesFile)).rejects.toThrow();
    await expect(fs.stat(recentDbFile)).resolves.toBeDefined();
    await expect(fs.stat(recentFilesFile)).resolves.toBeDefined();
  }, 30_000);
});
