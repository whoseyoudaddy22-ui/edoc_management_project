"use client";

import { useCallback, useEffect, useState } from "react";
import { Database, FolderArchive, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { formatFileSize } from "@/lib/upload";
import { formatThaiDateTime } from "@/lib/format";
import type { BackupEntry, BackupRunResult } from "@/lib/backup";

const KIND_LABEL: Record<BackupEntry["kind"], string> = {
  database: "ฐานข้อมูล",
  files: "ไฟล์แนบ",
};

const KIND_ICON: Record<BackupEntry["kind"], typeof Database> = {
  database: Database,
  files: FolderArchive,
};

export function BackupPanel() {
  const [backups, setBackups] = useState<BackupEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastRunResults, setLastRunResults] = useState<BackupRunResult[] | null>(null);

  const fetchBackups = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await fetch("/api/backups");
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error ?? "ไม่สามารถโหลดรายการ backup ได้");
        return;
      }
      setBackups(body.data);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchBackups();
  }, [fetchBackups]);

  async function triggerBackup() {
    setIsRunning(true);
    setError(null);
    setLastRunResults(null);
    try {
      const response = await fetch("/api/backups", { method: "POST" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error ?? "ไม่สามารถสำรองข้อมูลได้");
        return;
      }
      setLastRunResults(body.results);
      setBackups(body.data);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsRunning(false);
    }
  }

  const latestDatabase = backups.find((b) => b.kind === "database");
  const latestFiles = backups.find((b) => b.kind === "files");

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">สำรองข้อมูล</h1>
        <Button onClick={triggerBackup} disabled={isRunning}>
          <RefreshCw className={isRunning ? "animate-spin" : ""} />
          {isRunning ? "กำลังสำรองข้อมูล..." : "สำรองข้อมูลทันที"}
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <Database className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Backup ฐานข้อมูลล่าสุด</p>
              <p className="truncate text-sm font-medium text-gray-900">
                {latestDatabase ? formatThaiDateTime(latestDatabase.createdAt) : "ยังไม่มีข้อมูล"}
              </p>
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardContent className="flex items-center gap-4">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-blue-100">
              <FolderArchive className="h-5 w-5 text-blue-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm text-gray-500">Backup ไฟล์แนบล่าสุด</p>
              <p className="truncate text-sm font-medium text-gray-900">
                {latestFiles ? formatThaiDateTime(latestFiles.createdAt) : "ยังไม่มีข้อมูล"}
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
      )}

      {lastRunResults && (
        <div className="flex flex-col gap-2">
          {lastRunResults.map((result) => (
            <p
              key={result.kind}
              className={
                "flex items-center gap-2 rounded-lg border p-3 text-sm " +
                (result.success
                  ? "border-green-200 bg-green-50 text-green-700"
                  : "border-red-200 bg-red-50 text-red-700")
              }
            >
              {result.success ? <CheckCircle2 className="h-4 w-4 shrink-0" /> : <XCircle className="h-4 w-4 shrink-0" />}
              สำรอง{KIND_LABEL[result.kind]}{result.success ? "สำเร็จ" : "ล้มเหลว"}
              {!result.success && `: ${result.message}`}
            </p>
          ))}
        </div>
      )}

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="py-2 pr-4">ประเภท</th>
                  <th className="py-2 pr-4">ชื่อไฟล์</th>
                  <th className="py-2 pr-4">วันที่สร้าง</th>
                  <th className="py-2 pl-4">ขนาดไฟล์</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : backups.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-8 text-center text-sm text-gray-500">
                      ยังไม่มีไฟล์ backup
                    </td>
                  </tr>
                ) : (
                  backups.map((backup) => {
                    const Icon = KIND_ICON[backup.kind];
                    return (
                      <tr
                        key={backup.fileName}
                        className="border-b border-gray-100 last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                          <span className="inline-flex items-center gap-1.5">
                            <Icon className="h-4 w-4" />
                            {KIND_LABEL[backup.kind]}
                          </span>
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-900">{backup.fileName}</td>
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                          {formatThaiDateTime(backup.createdAt)}
                        </td>
                        <td className="py-3 pl-4 whitespace-nowrap text-gray-600">
                          {formatFileSize(backup.sizeBytes)}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
