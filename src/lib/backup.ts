import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import fs from "node:fs/promises";

const execFileAsync = promisify(execFile);

const PROJECT_ROOT = process.cwd();
const SCRIPTS_DIR = path.join(PROJECT_ROOT, "scripts");

// เครื่อง dev เป็น Windows ไม่มี bash ใน PATH ของ Windows โดยตรง จึงต้องระบุ path เต็มไปที่ Git Bash
// และเรียกแบบ --login เพื่อให้โหลด PATH ของ /usr/bin (docker, tar ฯลฯ) — ดู docs/runbooks/disaster-recovery.md
const BASH_EXECUTABLE =
  process.env.BACKUP_BASH_PATH ?? (process.platform === "win32" ? "C:\\Program Files\\Git\\usr\\bin\\bash.exe" : "bash");

async function runScript(scriptName: string): Promise<string> {
  const scriptPath = path.join(SCRIPTS_DIR, scriptName);
  const args = process.platform === "win32" ? ["--login", scriptPath] : [scriptPath];
  const { stdout } = await execFileAsync(BASH_EXECUTABLE, args, { cwd: PROJECT_ROOT });
  return stdout.trim();
}

export type BackupKind = "database" | "files";

export type BackupEntry = {
  kind: BackupKind;
  fileName: string;
  sizeBytes: number;
  createdAt: string;
};

async function listDir(dir: string, kind: BackupKind, extension: string): Promise<BackupEntry[]> {
  let fileNames: string[];
  try {
    fileNames = await fs.readdir(dir);
  } catch (error) {
    if ((error as NodeJS.ErrnoException).code === "ENOENT") return [];
    throw error;
  }

  return Promise.all(
    fileNames
      .filter((fileName) => fileName.endsWith(extension))
      .map(async (fileName) => {
        const stat = await fs.stat(path.join(dir, fileName));
        return { kind, fileName, sizeBytes: stat.size, createdAt: stat.mtime.toISOString() };
      })
  );
}

export async function listBackups(): Promise<BackupEntry[]> {
  const [database, files] = await Promise.all([
    listDir(path.join(PROJECT_ROOT, "backups", "database"), "database", ".dump"),
    listDir(path.join(PROJECT_ROOT, "backups", "files"), "files", ".tar.gz"),
  ]);

  return [...database, ...files].sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}

export type BackupRunResult = {
  kind: BackupKind;
  success: boolean;
  message: string;
};

export async function runManualBackup(): Promise<BackupRunResult[]> {
  const results: BackupRunResult[] = [];

  for (const { kind, script } of [
    { kind: "database" as const, script: "backup-db.sh" },
    { kind: "files" as const, script: "backup-files.sh" },
  ]) {
    try {
      const message = await runScript(script);
      results.push({ kind, success: true, message });
    } catch (error) {
      results.push({ kind, success: false, message: (error as Error).message });
    }
  }

  return results;
}
