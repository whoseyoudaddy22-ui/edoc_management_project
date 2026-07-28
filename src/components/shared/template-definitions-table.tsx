"use client";

import { useEffect, useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ActiveStatusBadge } from "@/components/shared/role-badge";
import { CLOSING_TEXT_LABELS } from "@/lib/labels";
import type { ClosingText } from "@/generated/prisma/enums";

type TemplateDefinitionRow = {
  id: string;
  documentTypeCode: string;
  name: string;
  componentKey: string;
  defaultClosingText: ClosingText | null;
  isActive: boolean;
  version: number;
  documentType: { name: string };
};

export function TemplateDefinitionsTable() {
  const [rows, setRows] = useState<TemplateDefinitionRow[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchTemplateDefinitions() {
      setIsLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/template-definitions", { signal: controller.signal });
        const body = await response.json();
        if (!response.ok) {
          setError(body?.error ?? "ไม่สามารถโหลดรายการเทมเพลตได้");
          return;
        }
        setRows(body.data);
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
        }
      } finally {
        setIsLoading(false);
      }
    }

    fetchTemplateDefinitions();
    return () => controller.abort();
  }, []);

  async function handleToggle(id: string, name: string, currentlyActive: boolean) {
    const confirmMessage = currentlyActive
      ? `ยืนยันการปิดใช้งานเทมเพลต "${name}"? ประเภทเอกสารนี้จะสร้างเอกสารใหม่ไม่ได้จนกว่าจะเปิดใช้งานอีกครั้ง`
      : `ยืนยันการเปิดใช้งานเทมเพลต "${name}"?`;
    if (!window.confirm(confirmMessage)) return;

    setUpdatingId(id);
    try {
      const response = await fetch(`/api/template-definitions/${id}/toggle`, { method: "PATCH" });
      const body = await response.json();
      if (!response.ok) {
        setError(body?.error ?? "ไม่สามารถเปลี่ยนสถานะเทมเพลตได้");
        return;
      }
      setRows((prev) => prev.map((row) => (row.id === id ? { ...row, isActive: body.data.isActive } : row)));
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div>
        <h1 className="text-xl font-semibold text-gray-900">จัดการเทมเพลต</h1>
        <p className="mt-1 text-sm text-gray-500">
          เปิด/ปิดใช้งานเทมเพลตเอกสารแต่ละประเภท — แก้ layout ได้ผ่านโค้ด + PR เท่านั้น
        </p>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col gap-4">
          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="py-2 pr-4">ประเภทเอกสาร</th>
                  <th className="py-2 pr-4">ชื่อเทมเพลต</th>
                  <th className="py-2 pr-4">Component Key</th>
                  <th className="py-2 pr-4">ข้อความปิดท้ายเริ่มต้น</th>
                  <th className="py-2 pr-4">เวอร์ชัน</th>
                  <th className="py-2 pr-4">สถานะ</th>
                  <th className="py-2 pl-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : rows.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="py-8 text-center text-sm text-gray-500">
                      ยังไม่มีเทมเพลตในระบบ
                    </td>
                  </tr>
                ) : (
                  rows.map((row) => (
                    <tr key={row.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-900">
                        {row.documentType.name}{" "}
                        <span className="text-gray-400">({row.documentTypeCode})</span>
                      </td>
                      <td className="py-3 pr-4 text-gray-600">{row.name}</td>
                      <td className="py-3 pr-4 font-mono text-xs text-gray-600">{row.componentKey}</td>
                      <td className="py-3 pr-4 text-gray-600">
                        {row.defaultClosingText ? CLOSING_TEXT_LABELS[row.defaultClosingText] : "-"}
                      </td>
                      <td className="py-3 pr-4 text-gray-600">v{row.version}</td>
                      <td className="py-3 pr-4">
                        <ActiveStatusBadge isActive={row.isActive} />
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex justify-end">
                          <Button
                            variant={row.isActive ? "destructive" : "outline"}
                            size="sm"
                            disabled={updatingId === row.id}
                            onClick={() => handleToggle(row.id, row.name, row.isActive)}
                          >
                            {row.isActive ? "ปิดใช้งาน" : "เปิดใช้งาน"}
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
