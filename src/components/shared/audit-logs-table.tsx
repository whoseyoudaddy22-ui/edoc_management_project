"use client";

import { useEffect, useState } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { AuditActionBadge } from "@/components/shared/audit-action-badge";
import { AUDIT_TARGET_TYPE_LABELS, formatAuditDetails } from "@/lib/audit-format";
import { formatThaiDateTime } from "@/lib/format";
import { AuditAction } from "@/generated/prisma/enums";

type AuditLogRow = {
  id: string;
  action: AuditAction;
  performedBy: { id: string; name: string; email: string };
  targetType: string;
  targetId: string;
  targetLabel: string | null;
  changes: unknown;
  createdAt: string;
};

type UserOption = { id: string; name: string; email: string };

const TARGET_TYPE_OPTIONS = Object.keys(AUDIT_TARGET_TYPE_LABELS);

export function AuditLogsTable() {
  const [targetType, setTargetType] = useState<string>("all");
  const [performedBy, setPerformedBy] = useState<string>("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");
  const [page, setPage] = useState(1);

  const [userOptions, setUserOptions] = useState<UserOption[]>([]);
  const [logs, setLogs] = useState<AuditLogRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/users?pageSize=100")
      .then((res) => res.json())
      .then((body) => setUserOptions(body.data ?? []))
      .catch(() => setUserOptions([]));
  }, []);

  function updateTargetType(value: string) {
    setTargetType(value);
    setPage(1);
  }

  function updatePerformedBy(value: string) {
    setPerformedBy(value);
    setPage(1);
  }

  function updateDateFrom(value: string) {
    setDateFrom(value);
    setPage(1);
  }

  function updateDateTo(value: string) {
    setDateTo(value);
    setPage(1);
  }

  useEffect(() => {
    const controller = new AbortController();

    async function fetchLogs() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), pageSize: "20" });
      if (targetType !== "all") params.set("targetType", targetType);
      if (performedBy !== "all") params.set("performedBy", performedBy);
      if (dateFrom) params.set("dateFrom", dateFrom);
      if (dateTo) params.set("dateTo", dateTo);

      try {
        const response = await fetch(`/api/audit-logs?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          setError(body?.error ?? "ไม่สามารถโหลดประวัติการใช้งานได้");
          return;
        }

        setLogs(body.data);
        setTotalPages(body.pagination.totalPages || 1);
        setTotal(body.pagination.total);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchLogs();
    return () => controller.abort();
  }, [targetType, performedBy, dateFrom, dateTo, page]);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">ประวัติการใช้งานระบบ</h1>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Select value={targetType} onValueChange={(value) => value && updateTargetType(value)}>
              <SelectTrigger>
                <SelectValue placeholder="ประเภทเป้าหมาย">
                  {(value: string | null) =>
                    value === "all" || !value ? "ทุกประเภท" : AUDIT_TARGET_TYPE_LABELS[value]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {TARGET_TYPE_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {AUDIT_TARGET_TYPE_LABELS[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={performedBy} onValueChange={(value) => value && updatePerformedBy(value)}>
              <SelectTrigger>
                <SelectValue placeholder="ผู้ดำเนินการ">
                  {(value: string | null) => {
                    if (value === "all" || !value) return "ทุกคน";
                    const user = userOptions.find((u) => u.id === value);
                    return user ? user.name : "ทุกคน";
                  }}
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกคน</SelectItem>
                {userOptions.map((user) => (
                  <SelectItem key={user.id} value={user.id}>
                    {user.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateFrom" className="text-xs text-gray-500">
                ตั้งแต่วันที่
              </Label>
              <Input
                id="dateFrom"
                type="date"
                value={dateFrom}
                onChange={(e) => updateDateFrom(e.target.value)}
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="dateTo" className="text-xs text-gray-500">
                ถึงวันที่
              </Label>
              <Input
                id="dateTo"
                type="date"
                value={dateTo}
                onChange={(e) => updateDateTo(e.target.value)}
              />
            </div>
          </div>

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="py-2 pr-4">เวลา</th>
                  <th className="py-2 pr-4">ผู้ดำเนินการ</th>
                  <th className="py-2 pr-4">การกระทำ</th>
                  <th className="py-2 pr-4">เป้าหมาย</th>
                  <th className="py-2 pl-4">รายละเอียด</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : logs.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-sm text-gray-500">
                      ไม่พบประวัติที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  logs.map((log) => {
                    const details = formatAuditDetails(log.action, log.changes);
                    return (
                      <tr
                        key={log.id}
                        className="border-b border-gray-100 align-top last:border-0 hover:bg-gray-50"
                      >
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                          {formatThaiDateTime(log.createdAt)}
                        </td>
                        <td className="py-3 pr-4 whitespace-nowrap text-gray-900">
                          {log.performedBy.name}
                        </td>
                        <td className="py-3 pr-4">
                          <AuditActionBadge action={log.action} />
                        </td>
                        <td className="py-3 pr-4 text-gray-600">
                          {log.targetLabel ?? `${AUDIT_TARGET_TYPE_LABELS[log.targetType] ?? log.targetType}`}
                        </td>
                        <td className="py-3 pl-4 text-gray-600">
                          {details.length === 0 ? (
                            "-"
                          ) : (
                            <ul className="flex flex-col gap-0.5">
                              {details.map((line, index) => (
                                <li key={index}>{line}</li>
                              ))}
                            </ul>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="flex items-center justify-between border-t border-gray-100 pt-4 text-sm text-gray-600">
            <p>
              ทั้งหมด {total} รายการ · หน้า {page} จาก {totalPages}
            </p>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button
                variant="outline"
                size="icon-sm"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
