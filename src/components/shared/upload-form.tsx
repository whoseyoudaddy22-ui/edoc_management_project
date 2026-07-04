"use client";

import { useEffect, useRef, useState } from "react";
import { UploadCloud, Paperclip, Trash2, FileStack } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { cn } from "@/lib/utils";
import {
  ALLOWED_FILE_EXTENSIONS_DISPLAY,
  formatFileSize,
  isAllowedFileExtension,
} from "@/lib/upload";

type DocumentOption = { id: string; documentNumber: string; title: string };

type Attachment = {
  id: string;
  fileName: string;
  filePath: string;
  fileType: string;
  fileSize: number;
  createdAt: string;
};

const dateTimeFormatter = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export function UploadForm({
  documents,
  currentUserId,
}: {
  documents: DocumentOption[];
  currentUserId: string;
}) {
  const [documentId, setDocumentId] = useState<string>("");
  const [attachments, setAttachments] = useState<Attachment[]>([]);
  const [isLoadingAttachments, setIsLoadingAttachments] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!documentId) {
      setAttachments([]);
      return;
    }

    const controller = new AbortController();

    async function fetchAttachments() {
      setIsLoadingAttachments(true);
      try {
        const response = await fetch(`/api/upload?documentId=${documentId}`, {
          signal: controller.signal,
        });
        const body = await response.json();
        if (response.ok) {
          setAttachments(body.data);
        }
      } catch (err) {
        if ((err as Error).name !== "AbortError") {
          setError("ไม่สามารถโหลดรายการไฟล์แนบได้");
        }
      } finally {
        setIsLoadingAttachments(false);
      }
    }

    fetchAttachments();
    return () => controller.abort();
  }, [documentId]);

  async function refreshAttachments(docId: string) {
    const response = await fetch(`/api/upload?documentId=${docId}`);
    const body = await response.json();
    if (response.ok) {
      setAttachments(body.data);
    }
  }

  async function uploadFiles(fileList: FileList | File[]) {
    setError(null);
    setSuccessMessage(null);

    if (!documentId) {
      setError("กรุณาเลือกเอกสารก่อนแนบไฟล์");
      return;
    }

    const files = Array.from(fileList);
    if (files.length === 0) return;

    const invalidFile = files.find((file) => !isAllowedFileExtension(file.name));
    if (invalidFile) {
      setError(`ไม่รองรับไฟล์ประเภทนี้: ${invalidFile.name}`);
      return;
    }

    const formData = new FormData();
    formData.set("documentId", documentId);
    formData.set("uploadedById", currentUserId);
    files.forEach((file) => formData.append("files", file));

    setIsUploading(true);
    try {
      const response = await fetch("/api/upload", { method: "POST", body: formData });
      const body = await response.json();

      if (!response.ok) {
        setError(body?.error ?? "ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      setSuccessMessage(`อัปโหลดไฟล์สำเร็จ ${files.length} รายการ`);
      await refreshAttachments(documentId);
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setIsUploading(false);
    }
  }

  async function handleDelete(id: string, fileName: string) {
    if (!window.confirm(`ยืนยันการลบไฟล์แนบ "${fileName}"?`)) return;

    setDeletingId(id);
    setError(null);
    try {
      const response = await fetch(`/api/upload/${id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? "ไม่สามารถลบไฟล์แนบได้");
        return;
      }
      setAttachments((prev) => prev.filter((item) => item.id !== id));
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setDeletingId(null);
    }
  }

  const selectedDocument = documents.find((doc) => doc.id === documentId);

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">อัปโหลดไฟล์</h1>
      </div>

      {successMessage && (
        <p className="rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          {successMessage}
        </p>
      )}

      {error && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {error}
        </p>
      )}

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileStack className="h-4 w-4" />
            เลือกเอกสาร
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="documentId">
              เอกสารที่ต้องการแนบไฟล์ <span className="text-red-500">*</span>
            </Label>
            <Select value={documentId} onValueChange={(value) => value && setDocumentId(value)}>
              <SelectTrigger id="documentId" className="w-full">
                <SelectValue placeholder="เลือกเอกสาร">
                  {() =>
                    selectedDocument
                      ? `${selectedDocument.documentNumber} — ${selectedDocument.title}`
                      : "เลือกเอกสาร"
                  }
                </SelectValue>
              </SelectTrigger>
              <SelectContent>
                {documents.map((doc) => (
                  <SelectItem key={doc.id} value={doc.id}>
                    {doc.documentNumber} — {doc.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <UploadCloud className="h-4 w-4" />
            แนบไฟล์
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setIsDragging(true);
            }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              uploadFiles(e.dataTransfer.files);
            }}
            onClick={() => fileInputRef.current?.click()}
            className={cn(
              "flex cursor-pointer flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors",
              isDragging ? "border-blue-400 bg-blue-50" : "border-gray-300 hover:bg-gray-50",
              isUploading && "pointer-events-none opacity-60"
            )}
          >
            <UploadCloud className="h-8 w-8 text-gray-400" />
            <p className="text-sm text-gray-600">
              {isUploading ? "กำลังอัปโหลด..." : "คลิกเพื่อเลือกไฟล์ หรือ ลากไฟล์มาวางที่นี่"}
            </p>
            <div className="flex flex-wrap justify-center gap-1.5">
              {ALLOWED_FILE_EXTENSIONS_DISPLAY.map((ext) => (
                <span
                  key={ext}
                  className="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-600"
                >
                  {ext}
                </span>
              ))}
            </div>
            <input
              ref={fileInputRef}
              type="file"
              multiple
              className="hidden"
              onChange={(e) => {
                if (e.target.files) uploadFiles(e.target.files);
                e.target.value = "";
              }}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4" />
            ไฟล์แนบของเอกสารนี้
          </CardTitle>
        </CardHeader>
        <CardContent>
          {!documentId ? (
            <p className="py-6 text-center text-sm text-gray-500">กรุณาเลือกเอกสารก่อน</p>
          ) : isLoadingAttachments ? (
            <p className="py-6 text-center text-sm text-gray-500">กำลังโหลดข้อมูล...</p>
          ) : attachments.length === 0 ? (
            <p className="py-6 text-center text-sm text-gray-500">ยังไม่มีไฟล์แนบ</p>
          ) : (
            <div className="flex flex-col divide-y divide-gray-100">
              {attachments.map((attachment) => (
                <div key={attachment.id} className="flex items-center justify-between gap-3 py-3">
                  <a
                    href={attachment.filePath}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex min-w-0 items-center gap-2 text-sm text-gray-900 hover:underline"
                  >
                    <Paperclip className="h-4 w-4 shrink-0 text-gray-400" />
                    <span className="truncate">{attachment.fileName}</span>
                  </a>
                  <div className="flex shrink-0 items-center gap-3">
                    <span className="text-xs text-gray-500">{formatFileSize(attachment.fileSize)}</span>
                    <span className="hidden text-xs text-gray-500 sm:inline">
                      {dateTimeFormatter.format(new Date(attachment.createdAt))}
                    </span>
                    <Button
                      variant="destructive"
                      size="icon-sm"
                      title="ลบไฟล์แนบ"
                      disabled={deletingId === attachment.id}
                      onClick={() => handleDelete(attachment.id, attachment.fileName)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
