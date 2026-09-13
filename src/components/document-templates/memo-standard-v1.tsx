import Image from "next/image";
import { formatThaiMonthYear } from "@/lib/format";
import { CLOSING_TEXT_LABELS } from "@/lib/labels";
import { PageFrame } from "./shared/page-frame";
import { SignatureBlock } from "./shared/signature-block";
import type { TemplateProps } from "./types";

// เทมเพลต "บันทึกข้อความ" ตาม docs/reference/memo-template-phitsanulok.md
// ห้ามแก้โครงสร้าง/ระยะขอบที่นี่โดยไม่แก้ spec ในสกิลก่อน
// ตราครุฑเป็น placeholder — ต้องแทนที่ด้วยไฟล์จริงของหน่วยงานก่อน deploy
export function MemoStandardV1({ document: doc }: TemplateProps) {
  return (
    <PageFrame paddingTop="1.25cm" paddingBottom="0.5cm">
      <header className="relative flex items-center justify-center" style={{ minHeight: "1.5cm" }}>
        <Image
          src="/emblem/garuda.jpg"
          alt="ตราครุฑ"
          width={140}
          height={150}
          className="absolute left-0"
          style={{ width: "1.36cm", height: "1.5cm", top: "50%", transform: "translateY(-50%)" }}
        />
        <p className="text-[29pt] font-bold">บันทึกข้อความ</p>
      </header>

      <p className="text-[16pt]">
        <span className="text-[20pt] font-bold">ส่วนราชการ</span> {doc.departmentName}
      </p>

      <div className="flex items-baseline gap-10 text-[16pt]">
        <p>
          <span className="text-[20pt] font-bold">ที่</span> {doc.documentNumber}
        </p>
        <p>
          <span className="text-[20pt] font-bold">วันที่</span> {formatThaiMonthYear(doc.documentDate)}
        </p>
      </div>

      <p className="text-[16pt] font-bold">
        <span className="text-[20pt]">เรื่อง</span>: {doc.title}
      </p>

      <p className="text-[16pt]" style={{ marginTop: "6pt" }}>
        <span className="text-[20pt] font-bold">เรียน</span> {doc.recipient}
      </p>

      <div className="text-[16pt]" style={{ marginTop: "6pt" }}>
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
        showSender={false}
      />
    </PageFrame>
  );
}
