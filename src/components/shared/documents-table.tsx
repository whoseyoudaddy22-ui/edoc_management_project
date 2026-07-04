"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Search, Eye, Printer, Trash2, ChevronLeft, ChevronRight, FilePlus, X } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { StatusBadge, STATUS_LABEL } from "@/components/shared/status-badge";
import {
  AdvancedSearchPanel,
  EMPTY_ADVANCED_FILTERS,
  type AdvancedSearchFilters,
} from "@/components/shared/advanced-search-panel";
import { PRIORITY_LABELS } from "@/lib/labels";
import { DocumentStatus } from "@/generated/prisma/enums";

const dateFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

type DocumentRow = {
  id: string;
  documentNumber: string;
  title: string;
  documentDate: string;
  status: DocumentStatus;
  documentType: { id: string; name: string };
};

type DocumentTypeOption = { id: string; name: string; code: string };
type UserOption = { id: string; name: string };

type Chip = { key: string; label: string; onRemove: () => void };

export function DocumentsTable({
  documentTypes,
  users,
  departmentCodes,
}: {
  documentTypes: DocumentTypeOption[];
  users: UserOption[];
  departmentCodes: string[];
}) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [advancedOpen, setAdvancedOpen] = useState(false);
  const [filters, setFilters] = useState<AdvancedSearchFilters>(EMPTY_ADVANCED_FILTERS);
  const [debouncedReferenceNumber, setDebouncedReferenceNumber] = useState("");
  const [page, setPage] = useState(1);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // ทุกครั้งที่เปลี่ยนเงื่อนไขค้นหา (ขั้นสูงหรือ chip) ให้กลับไปหน้า 1 เสมอ
  function updateFilters(
    update: AdvancedSearchFilters | ((prev: AdvancedSearchFilters) => AdvancedSearchFilters)
  ) {
    setFilters(update);
    setPage(1);
  }

  const documentTypeCodesKey = filters.documentTypeCodes.join(",");
  const statusesKey = filters.statuses.join(",");
  const prioritiesKey = filters.priorities.join(",");
  const createdByIdsKey = filters.createdByIds.join(",");
  const departmentCodesKey = filters.departmentCodes.join(",");

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setDebouncedReferenceNumber(filters.referenceNumber.trim());
    }, 400);
    return () => clearTimeout(timeout);
  }, [search, filters.referenceNumber]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDocuments() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (debouncedSearch) params.set("keyword", debouncedSearch);
      if (filters.documentTypeCodes.length)
        params.set("documentTypeCodes", filters.documentTypeCodes.join(","));
      if (filters.statuses.length) params.set("statuses", filters.statuses.join(","));
      if (filters.priorities.length) params.set("priorities", filters.priorities.join(","));
      if (filters.createdByIds.length)
        params.set("createdByIds", filters.createdByIds.join(","));
      if (filters.departmentCodes.length)
        params.set("departmentCodes", filters.departmentCodes.join(","));
      if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
      if (filters.dateTo) params.set("dateTo", filters.dateTo);
      if (debouncedReferenceNumber) params.set("referenceNumber", debouncedReferenceNumber);
      if (filters.hasAttachment !== "all")
        params.set("hasAttachment", filters.hasAttachment === "yes" ? "true" : "false");

      try {
        const response = await fetch(`/api/documents/search?${params.toString()}`, {
          signal: controller.signal,
        });
        const body = await response.json();

        if (!response.ok) {
          setError(body?.error ?? "ไม่สามารถโหลดรายการเอกสารได้");
          return;
        }

        setDocuments(body.data);
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

    fetchDocuments();
    return () => controller.abort();
  }, [
    debouncedSearch,
    debouncedReferenceNumber,
    documentTypeCodesKey,
    statusesKey,
    prioritiesKey,
    createdByIdsKey,
    departmentCodesKey,
    filters.dateFrom,
    filters.dateTo,
    filters.hasAttachment,
    page,
  ]);

  async function handleDelete(id: string, documentNumber: string) {
    if (!window.confirm(`ยืนยันการลบเอกสารเลขที่ ${documentNumber}?`)) return;

    setDeletingId(id);
    try {
      const response = await fetch(`/api/documents/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "ไม่สามารถลบเอกสารได้");
        return;
      }
      setDocuments((prev) => prev.filter((doc) => doc.id !== id));
      setTotal((prev) => prev - 1);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  }

  const chips: Chip[] = [];

  if (search.trim()) {
    chips.push({
      key: "search",
      label: `ค้นหา: "${search.trim()}"`,
      onRemove: () => {
        setSearch("");
        setPage(1);
      },
    });
  }

  for (const code of filters.documentTypeCodes) {
    const name = documentTypes.find((type) => type.code === code)?.name ?? code;
    chips.push({
      key: `type-${code}`,
      label: `ประเภท: ${name}`,
      onRemove: () =>
        updateFilters((prev) => ({
          ...prev,
          documentTypeCodes: prev.documentTypeCodes.filter((c) => c !== code),
        })),
    });
  }

  for (const status of filters.statuses) {
    chips.push({
      key: `status-${status}`,
      label: `สถานะ: ${STATUS_LABEL[status]}`,
      onRemove: () =>
        updateFilters((prev) => ({
          ...prev,
          statuses: prev.statuses.filter((s) => s !== status),
        })),
    });
  }

  for (const priority of filters.priorities) {
    chips.push({
      key: `priority-${priority}`,
      label: `ความเร่งด่วน: ${PRIORITY_LABELS[priority]}`,
      onRemove: () =>
        updateFilters((prev) => ({
          ...prev,
          priorities: prev.priorities.filter((p) => p !== priority),
        })),
    });
  }

  for (const userId of filters.createdByIds) {
    const name = users.find((user) => user.id === userId)?.name ?? userId;
    chips.push({
      key: `creator-${userId}`,
      label: `ผู้สร้าง: ${name}`,
      onRemove: () =>
        updateFilters((prev) => ({
          ...prev,
          createdByIds: prev.createdByIds.filter((id) => id !== userId),
        })),
    });
  }

  for (const code of filters.departmentCodes) {
    chips.push({
      key: `dept-${code}`,
      label: `หน่วยงาน: ${code}`,
      onRemove: () =>
        updateFilters((prev) => ({
          ...prev,
          departmentCodes: prev.departmentCodes.filter((c) => c !== code),
        })),
    });
  }

  if (filters.dateFrom || filters.dateTo) {
    const fromLabel = filters.dateFrom
      ? dateFormatter.format(new Date(filters.dateFrom))
      : "เริ่มต้น";
    const toLabel = filters.dateTo ? dateFormatter.format(new Date(filters.dateTo)) : "ปัจจุบัน";
    chips.push({
      key: "date-range",
      label: `วันที่: ${fromLabel} - ${toLabel}`,
      onRemove: () => updateFilters((prev) => ({ ...prev, dateFrom: "", dateTo: "" })),
    });
  }

  if (filters.referenceNumber.trim()) {
    chips.push({
      key: "reference",
      label: `อ้างอิง: "${filters.referenceNumber.trim()}"`,
      onRemove: () => updateFilters((prev) => ({ ...prev, referenceNumber: "" })),
    });
  }

  if (filters.hasAttachment !== "all") {
    chips.push({
      key: "attachment",
      label: `ไฟล์แนบ: ${filters.hasAttachment === "yes" ? "มี" : "ไม่มี"}`,
      onRemove: () => updateFilters((prev) => ({ ...prev, hasAttachment: "all" })),
    });
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">เอกสารทั้งหมด</h1>
        <Button nativeButton={false} render={<Link href="/documents/create" />}>
          <FilePlus className="h-4 w-4" />
          สร้างเอกสาร
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardContent className="flex flex-col gap-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-gray-400" />
              <Input
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
                placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อเรื่อง"
                className="pl-9"
              />
            </div>
          </div>

          <AdvancedSearchPanel
            open={advancedOpen}
            onOpenChange={setAdvancedOpen}
            filters={filters}
            onFiltersChange={updateFilters}
            documentTypes={documentTypes}
            users={users}
            departmentCodes={departmentCodes}
          />

          {chips.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {chips.map((chip) => (
                <Badge key={chip.key} variant="secondary" className="gap-1 py-1">
                  {chip.label}
                  <button
                    type="button"
                    onClick={chip.onRemove}
                    aria-label={`ลบเงื่อนไข ${chip.label}`}
                    className="rounded-full hover:bg-black/10"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </Badge>
              ))}
            </div>
          )}

          {error && (
            <p className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700">
              {error}
            </p>
          )}

          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead>
                <tr className="border-b border-gray-200 text-xs font-medium text-gray-500 uppercase">
                  <th className="py-2 pr-4">เลขที่เอกสาร</th>
                  <th className="py-2 pr-4">ชื่อเรื่อง</th>
                  <th className="py-2 pr-4">ประเภท</th>
                  <th className="py-2 pr-4">วันที่</th>
                  <th className="py-2 pr-4">สถานะ</th>
                  <th className="py-2 pl-4 text-right">จัดการ</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                      กำลังโหลดข้อมูล...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-sm text-gray-500">
                      ไม่พบเอกสารที่ตรงกับเงื่อนไข
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => (
                    <tr key={doc.id} className="border-b border-gray-100 last:border-0 hover:bg-gray-50">
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-900">
                        {doc.documentNumber}
                      </td>
                      <td className="py-3 pr-4 max-w-xs truncate text-gray-900">{doc.title}</td>
                      <td className="py-3 pr-4 text-gray-600">{doc.documentType.name}</td>
                      <td className="py-3 pr-4 whitespace-nowrap text-gray-600">
                        {dateFormatter.format(new Date(doc.documentDate))}
                      </td>
                      <td className="py-3 pr-4">
                        <StatusBadge status={doc.status} />
                      </td>
                      <td className="py-3 pl-4">
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="ดูเอกสาร"
                            nativeButton={false}
                            render={<Link href={`/documents/${doc.id}`} />}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon-sm"
                            title="พิมพ์เอกสาร"
                            nativeButton={false}
                            render={<Link href={`/documents/${doc.id}/print`} />}
                          >
                            <Printer className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="destructive"
                            size="icon-sm"
                            title="ลบเอกสาร"
                            disabled={deletingId === doc.id}
                            onClick={() => handleDelete(doc.id, doc.documentNumber)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  ))
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
