import { formatThaiDate } from "@/lib/format";
import { CLOSING_TEXT_LABELS, PRIORITY_LABELS } from "@/lib/labels";
import { PageFrame } from "./shared/page-frame";
import { SignatureBlock } from "./shared/signature-block";
import type { TemplateProps } from "./types";

// เทมเพลต "หนังสือภายนอก" ตาม .claude/skills/official-document-template
// ห้ามแก้โครงสร้าง/ระยะขอบที่นี่โดยไม่แก้ spec ในสกิลก่อน
export function ExternalLetterStandard({ document: doc }: TemplateProps) {
  return (
    <PageFrame paddingTop="2.5cm" paddingBottom="2cm">
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

      <SignatureBlock
        signerTitlePrefix={doc.signerTitlePrefix}
        signerName={doc.signerName}
        signerPosition={doc.signerPosition}
        sender={doc.sender}
        showSender
      />
    </PageFrame>
  );
}
