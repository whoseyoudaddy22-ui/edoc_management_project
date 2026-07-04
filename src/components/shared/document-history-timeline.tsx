"use client";

import { useEffect, useState } from "react";
import { AuditActionBadge } from "@/components/shared/audit-action-badge";
import { formatAuditDetails } from "@/lib/audit-format";
import { formatThaiDateTime } from "@/lib/format";
import { AuditAction } from "@/generated/prisma/enums";

type HistoryEntry = {
  id: string;
  action: AuditAction;
  performedBy: { name: string; email: string };
  changes: unknown;
  createdAt: string;
};

export function DocumentHistoryTimeline({ documentId }: { documentId: string }) {
  const [entries, setEntries] = useState<HistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchHistory() {
      setIsLoading(true);
      setError(null);

      try {
        const response = await fetch(`/api/audit-logs/document/${documentId}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          setError(body?.error ?? "ไม่สามารถโหลดประวัติเอกสารได้");
          return;
        }

        setEntries(body.data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchHistory();
    return () => controller.abort();
  }, [documentId]);

  if (isLoading) {
    return <p className="py-6 text-center text-sm text-gray-500">กำลังโหลดประวัติ...</p>;
  }

  if (error) {
    return (
      <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
        {error}
      </p>
    );
  }

  if (entries.length === 0) {
    return <p className="py-6 text-center text-sm text-gray-500">ยังไม่มีประวัติของเอกสารนี้</p>;
  }

  return (
    <ol className="flex flex-col gap-4">
      {entries.map((entry, index) => {
        const details = formatAuditDetails(entry.action, entry.changes);
        return (
          <li key={entry.id} className="relative flex gap-3 pb-4">
            {index !== entries.length - 1 && (
              <span className="absolute top-3 left-[5px] h-full w-px bg-gray-200" />
            )}
            <span className="relative z-10 mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full bg-blue-600" />
            <div className="flex flex-1 flex-col gap-1">
              <div className="flex flex-wrap items-center gap-2">
                <AuditActionBadge action={entry.action} />
                <span className="text-sm font-medium text-gray-900">{entry.performedBy.name}</span>
                <span className="text-xs text-gray-500">{formatThaiDateTime(entry.createdAt)}</span>
              </div>
              {details.length > 0 && (
                <ul className="flex flex-col gap-0.5 text-sm text-gray-600">
                  {details.map((line, lineIndex) => (
                    <li key={lineIndex}>{line}</li>
                  ))}
                </ul>
              )}
            </div>
          </li>
        );
      })}
    </ol>
  );
}
