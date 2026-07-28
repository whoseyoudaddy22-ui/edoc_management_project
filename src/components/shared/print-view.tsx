"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Loader2, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTemplate, type DocumentTemplateWrapperData } from "@/components/shared/document-template";

type DocumentOption = { id: string; documentNumber: string; title: string };

export function PrintView({
  document: doc,
  documentId,
  documentOptions,
}: {
  document: DocumentTemplateWrapperData;
  documentId: string;
  documentOptions: DocumentOption[];
}) {
  const router = useRouter();
  const [isExporting, setIsExporting] = useState(false);
  const [exportError, setExportError] = useState<string | null>(null);

  async function handlePrint() {
    try {
      await fetch(`/api/documents/${documentId}/print`, { method: "POST" });
    } catch (error) {
      console.error("Failed to log print action", error);
    }
    window.print();
  }

  async function handleExportPdf() {
    setExportError(null);
    setIsExporting(true);
    try {
      const response = await fetch(`/api/documents/${documentId}/export-pdf`);
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setExportError(body?.error ?? "ไม่สามารถสร้างไฟล์ PDF ได้");
        return;
      }

      const blob = await response.blob();
      const disposition = response.headers.get("content-disposition") ?? "";
      const fileNameMatch = disposition.match(/filename="?([^"]+)"?/);
      const fileName = fileNameMatch ? decodeURIComponent(fileNameMatch[1]) : `${documentId}.pdf`;

      const url = URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = fileName;
      link.click();
      URL.revokeObjectURL(url);
    } catch {
      setExportError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsExporting(false);
    }
  }

  return (
    <div className="flex flex-col gap-6">
      <div className="no-print flex flex-col gap-4">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/documents" />}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <h1 className="text-xl font-semibold text-gray-900">พิมพ์เอกสาร</h1>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="outline" onClick={handlePrint}>
              <Printer className="h-4 w-4" />
              พิมพ์เอกสาร
            </Button>
            <Button onClick={handleExportPdf} disabled={isExporting}>
              {isExporting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Download className="h-4 w-4" />
              )}
              Export PDF
            </Button>
          </div>
        </div>

        {exportError && (
          <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
            {exportError}
          </p>
        )}

        <div className="flex items-center gap-3 rounded-lg border border-gray-200 bg-white p-4 shadow-sm">
          <label className="text-sm font-medium whitespace-nowrap text-gray-700">เลือกเอกสาร</label>
          <Select
            value={documentId}
            onValueChange={(value) => value && router.push(`/documents/${value}/print`)}
          >
            <SelectTrigger className="w-full sm:w-96">
              <SelectValue placeholder="เลือกเอกสาร">
                {() => {
                  const current = documentOptions.find((option) => option.id === documentId);
                  return current ? `${current.documentNumber} · ${current.title}` : "เลือกเอกสาร";
                }}
              </SelectValue>
            </SelectTrigger>
            <SelectContent>
              {documentOptions.map((option) => (
                <SelectItem key={option.id} value={option.id}>
                  {option.documentNumber} · {option.title}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="print-area overflow-x-auto bg-gray-100 py-8">
        <DocumentTemplate document={doc} />
      </div>
    </div>
  );
}
