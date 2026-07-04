"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  Search,
  Eye,
  Printer,
  Trash2,
  ChevronLeft,
  ChevronRight,
  FilePlus,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { StatusBadge, STATUS_LABEL } from "@/components/shared/status-badge";
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

type DocumentType = { id: string; name: string };

const STATUS_FILTER_OPTIONS = Object.values(DocumentStatus);

export function DocumentsTable({ documentTypes }: { documentTypes: DocumentType[] }) {
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [status, setStatus] = useState<string>("all");
  const [documentTypeId, setDocumentTypeId] = useState<string>("all");
  const [page, setPage] = useState(1);

  const [documents, setDocuments] = useState<DocumentRow[]>([]);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    const timeout = setTimeout(() => {
      setDebouncedSearch(search.trim());
      setPage(1);
    }, 400);
    return () => clearTimeout(timeout);
  }, [search]);

  useEffect(() => {
    setPage(1);
  }, [status, documentTypeId]);

  useEffect(() => {
    const controller = new AbortController();

    async function fetchDocuments() {
      setIsLoading(true);
      setError(null);

      const params = new URLSearchParams({ page: String(page), pageSize: "10" });
      if (debouncedSearch) params.set("search", debouncedSearch);
      if (status !== "all") params.set("status", status);
      if (documentTypeId !== "all") params.set("documentTypeId", documentTypeId);

      try {
        const response = await fetch(`/api/documents?${params.toString()}`, {
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
  }, [debouncedSearch, status, documentTypeId, page]);

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
                onChange={(e) => setSearch(e.target.value)}
                placeholder="ค้นหาเลขที่เอกสาร หรือ ชื่อเรื่อง"
                className="pl-9"
              />
            </div>

            <Select value={documentTypeId} onValueChange={(value) => value && setDocumentTypeId(value)}>
              <SelectTrigger className="w-full sm:w-48">
                <SelectValue placeholder="ประเภทเอกสาร">
                  {(value: string | null) =>
                    value === "all" || !value
                      ? "ทุกประเภท"
                      : documentTypes.find((type) => type.id === value)?.name ?? "ทุกประเภท"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกประเภท</SelectItem>
                {documentTypes.map((type) => (
                  <SelectItem key={type.id} value={type.id}>
                    {type.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Select value={status} onValueChange={(value) => value && setStatus(value)}>
              <SelectTrigger className="w-full sm:w-44">
                <SelectValue placeholder="สถานะ">
                  {(value: string | null) =>
                    value === "all" || !value
                      ? "ทุกสถานะ"
                      : STATUS_LABEL[value as DocumentStatus]
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">ทุกสถานะ</SelectItem>
                {STATUS_FILTER_OPTIONS.map((value) => (
                  <SelectItem key={value} value={value}>
                    {STATUS_LABEL[value]}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
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
