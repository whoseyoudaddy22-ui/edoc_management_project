import Image from "next/image";
import { formatThaiDate, formatThaiMonthYear } from "@/lib/format";
import { CLOSING_TEXT_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { ClosingText, DocumentLayout, Priority } from "@/generated/prisma/enums";

export type DocumentTemplateData = {
  documentNumber: string;
  departmentCode: string;
  departmentName: string | null;
  documentTypeCode: string;
  documentDate: Date | string;
  title: string;
  priority: Priority;
  recipient: string;
  sender: string;
  referenceNumber: string | null;
  content: string;
  closingText: ClosingText | null;
  signerName: string | null;
  signerPosition: string | null;
  documentType: { name: string; layout: DocumentLayout };
};

// ระยะขอบ A4 ต่อ layout ตาม .claude/skills/official-document-template
// ห้ามแก้ตัวเลขที่นี่โดยไม่แก้ spec ในสกิลก่อน
const PAGE_PADDING: Record<DocumentLayout, { top: string; bottom: string }> = {
  [DocumentLayout.MEMO]: { top: "1.25cm", bottom: "0.5cm" },
  [DocumentLayout.OFFICIAL_LETTER]: { top: "2.5cm", bottom: "2cm" },
};

function MemoHeaderFields({ doc }: { doc: DocumentTemplateData }) {
  return (
    <>
      <header className="relative text-center">
        <Image
          src="/emblem/garuda.jpg"
          alt="ตราครุฑ"
          width={140}
          height={150}
          className="absolute top-0 left-0"
          style={{ width: "1.4cm", height: "1.5cm" }}
        />
        <p className="text-[29pt] font-bold">บันทึกข้อความ</p>
      </header>
      <hr className="mt-1 mb-3 border-t-2 border-black" />

      <p className="text-[16pt]">
        <span className="text-[20pt] font-bold">ส่วนราชการ</span> {doc.departmentName}
      </p>

      <div className="mt-3 flex items-baseline gap-10 text-[16pt]">
        <p>
          <span className="text-[20pt] font-bold">ที่</span> {doc.documentNumber}
        </p>
        <p>
          <span className="text-[20pt] font-bold">วันที่</span> {formatThaiMonthYear(doc.documentDate)}
        </p>
      </div>

      <p className="mt-4 text-[16pt]">
        <span className="text-[20pt] font-bold">เรียน</span> {doc.recipient}
      </p>

      <p className="mt-4 border-l-4 border-blue-600 pl-3 text-[16pt] font-bold">
        <span className="text-[20pt]">เรื่อง</span>: {doc.title}
      </p>
    </>
  );
}

function OfficialLetterHeaderFields({ doc }: { doc: DocumentTemplateData }) {
  return (
    <>
      <header className="flex flex-col items-center text-center">
        <p className="text-[18pt] font-bold">หนังสือราชการ</p>
        <p className="text-[18pt] font-bold">หน่วยงาน {doc.departmentCode}</p>
      </header>

      <div className="mt-6 flex items-baseline justify-between text-[16pt]">
        <p>เลขที่: {doc.documentNumber}</p>
        <p>วันที่: {formatThaiDate(doc.documentDate)}</p>
      </div>
      <div className="flex items-baseline justify-between text-[16pt]">
        <p>ประเภท: {doc.documentType.name}</p>
        <p>ความเร่งด่วน: {PRIORITY_LABELS[doc.priority]}</p>
      </div>

      <p className="mt-4 text-[16pt]">เรียน {doc.recipient}</p>

      <p className="mt-4 border-l-4 border-blue-600 pl-3 text-[16pt] font-bold">
        เรื่อง: {doc.title}
      </p>
    </>
  );
}

// Layout ตาม .claude/skills/official-document-template — ห้ามแก้โครงสร้าง/ระยะขอบที่นี่โดยไม่แก้ spec ในสกิลก่อน
export function DocumentTemplate({ document: doc }: { document: DocumentTemplateData }) {
  const isMemo = doc.documentType.layout === DocumentLayout.MEMO;
  const padding = PAGE_PADDING[doc.documentType.layout];

  return (
    <div
      className="document-page font-document mx-auto bg-white text-black shadow-lg"
      style={{
        width: "210mm",
        minHeight: "297mm",
        paddingTop: padding.top,
        paddingBottom: padding.bottom,
        paddingLeft: "3cm",
        paddingRight: "2cm",
        fontSize: "16pt",
        lineHeight: 1.5,
      }}
    >
      {isMemo ? <MemoHeaderFields doc={doc} /> : <OfficialLetterHeaderFields doc={doc} />}

      <div className="mt-4 text-[16pt]">
        {doc.referenceNumber && <p>อ้างถึง {doc.referenceNumber}</p>}
        <p className="whitespace-pre-wrap" style={{ textIndent: "2.5cm" }}>
          {doc.content}
        </p>
        {doc.closingText && (
          <p className="mt-2" style={{ textIndent: "2.5cm" }}>
            {CLOSING_TEXT_LABELS[doc.closingText]}
          </p>
        )}
      </div>

      <div className="mt-16 ml-auto w-[7cm] text-center text-[16pt]">
        <p className="mb-16">ลงชื่อ .......................................................</p>
        {doc.signerName && <p>({doc.signerName})</p>}
        {doc.signerPosition && <p>{doc.signerPosition}</p>}
        {!isMemo && <p>จาก {doc.sender}</p>}
      </div>
    </div>
  );
}
