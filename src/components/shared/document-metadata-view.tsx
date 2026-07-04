import Link from "next/link";
import { ArrowLeft, FileText, Paperclip, Printer } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { StatusBadge } from "@/components/shared/status-badge";
import { formatFileSize } from "@/lib/upload";
import { formatThaiDate } from "@/lib/format";
import { PRIORITY_LABELS } from "@/lib/labels";
import { DocumentStatus, Priority } from "@/generated/prisma/enums";

function formatThaiDateTime(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const time = d.toLocaleTimeString("th-TH", { hour: "2-digit", minute: "2-digit" });
  return `${formatThaiDate(d)} ${time} น.`;
}

function Field({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-1">
      <dt className="text-sm text-gray-500">{label}</dt>
      <dd className="text-sm font-medium break-words text-gray-900">{value ?? "-"}</dd>
    </div>
  );
}

export type DocumentMetadata = {
  id: string;
  documentNumber: string;
  departmentCode: string;
  title: string;
  priority: Priority;
  status: DocumentStatus;
  recipient: string;
  sender: string;
  referenceNumber: string | null;
  content: string;
  documentDate: Date | string;
  signerName: string | null;
  signerPosition: string | null;
  approvedAt: Date | string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  documentType: { name: string; code: string };
  createdBy: { name: string; email: string; departmentCode: string | null };
  approvedBy: { name: string; email: string } | null;
  attachments: {
    id: string;
    fileName: string;
    fileType: string;
    fileSize: number;
    createdAt: Date | string;
  }[];
};

export function DocumentMetadataView({ document: doc }: { document: DocumentMetadata }) {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="ghost" size="icon-sm" nativeButton={false} render={<Link href="/documents" />}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-xl font-semibold text-gray-900">รายละเอียดเอกสาร (Metadata)</h1>
        </div>
        <Button nativeButton={false} render={<Link href={`/documents/${doc.id}/print`} />}>
          <Printer className="h-4 w-4" />
          พิมพ์เอกสาร
        </Button>
      </div>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <FileText className="h-4 w-4 text-blue-600" />
            ข้อมูลทั่วไป
          </CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field label="เลขที่เอกสาร" value={doc.documentNumber} />
            <Field label="ชื่อเรื่อง" value={doc.title} />
            <Field label="ประเภทเอกสาร" value={doc.documentType.name} />
            <Field label="สถานะ" value={<StatusBadge status={doc.status} />} />
            <Field label="ระดับความเร่งด่วน" value={PRIORITY_LABELS[doc.priority]} />
            <Field label="หน่วยงาน/แผนก" value={doc.departmentCode} />
            <Field label="วันที่หนังสือ" value={formatThaiDate(doc.documentDate)} />
            <Field label="เอกสารอ้างอิง" value={doc.referenceNumber} />
          </dl>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>บุคคลและวันที่เกี่ยวข้อง</CardTitle>
        </CardHeader>
        <CardContent>
          <dl className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Field
              label="ผู้สร้างเอกสาร"
              value={`${doc.createdBy.name} (${doc.createdBy.email})`}
            />
            <Field
              label="ผู้อนุมัติ"
              value={doc.approvedBy ? `${doc.approvedBy.name} (${doc.approvedBy.email})` : null}
            />
            <Field
              label="วันที่อนุมัติ"
              value={doc.approvedAt ? formatThaiDateTime(doc.approvedAt) : null}
            />
            <Field label="เรียน" value={doc.recipient} />
            <Field label="จาก" value={doc.sender} />
            <Field label="ผู้ลงนาม" value={doc.signerName} />
            <Field label="ตำแหน่งผู้ลงนาม" value={doc.signerPosition} />
            <Field label="สร้างเมื่อ" value={formatThaiDateTime(doc.createdAt)} />
            <Field label="แก้ไขล่าสุด" value={formatThaiDateTime(doc.updatedAt)} />
          </dl>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle>เนื้อหาเอกสาร</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm whitespace-pre-wrap text-gray-900">{doc.content}</p>
        </CardContent>
      </Card>

      <Card className="border border-gray-200 shadow-sm">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Paperclip className="h-4 w-4 text-blue-600" />
            ไฟล์แนบ ({doc.attachments.length})
          </CardTitle>
        </CardHeader>
        <CardContent>
          {doc.attachments.length === 0 ? (
            <p className="text-sm text-gray-500">ไม่มีไฟล์แนบ</p>
          ) : (
            <ul className="flex flex-col gap-2">
              {doc.attachments.map((attachment) => (
                <li
                  key={attachment.id}
                  className="flex items-center justify-between rounded-lg border border-gray-200 px-3 py-2 text-sm"
                >
                  <span className="truncate text-gray-900">{attachment.fileName}</span>
                  <span className="whitespace-nowrap text-gray-500">
                    {formatFileSize(attachment.fileSize)}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
