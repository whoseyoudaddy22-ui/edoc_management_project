"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Download, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DocumentTemplate, type DocumentTemplateData } from "@/components/shared/document-template";

type DocumentOption = { id: string; documentNumber: string; title: string };

export function PrintView({
  document: doc,
  documentId,
  documentOptions,
}: {
  document: DocumentTemplateData;
  documentId: string;
  documentOptions: DocumentOption[];
}) {
  const router = useRouter();

  async function handlePrint() {
    try {
      await fetch(`/api/documents/${documentId}/print`, { method: "POST" });
    } catch (error) {
      console.error("Failed to log print action", error);
    }
    window.print();
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
            <Button onClick={handlePrint}>
              <Download className="h-4 w-4" />
              Export PDF
            </Button>
          </div>
        </div>

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
