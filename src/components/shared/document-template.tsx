import { formatThaiDate } from "@/lib/format";
import { PRIORITY_LABELS } from "@/lib/labels";
import { Priority } from "@/generated/prisma/enums";

export type DocumentTemplateData = {
  documentNumber: string;
  departmentCode: string;
  documentDate: Date | string;
  title: string;
  priority: Priority;
  recipient: string;
  sender: string;
  referenceNumber: string | null;
  content: string;
  signerName: string | null;
  signerPosition: string | null;
  documentType: { name: string };
};

// Layout ตาม .claude/skills/official-document-template — ห้ามแก้โครงสร้าง/ระยะขอบที่นี่โดยไม่แก้ spec ในสกิลก่อน
// ระยะขอบ A4: บน 2.5cm ล่าง 2cm ซ้าย 3cm ขวา 2cm ฝังเป็น padding ของหน้ากระดาษเพื่อให้ preview กับพิมพ์จริงตรงกัน
export function DocumentTemplate({ document: doc }: { document: DocumentTemplateData }) {
  return (
    <div
      className="document-page font-document mx-auto bg-white text-black shadow-lg"
      style={{
        width: "210mm",
        minHeight: "297mm",
        paddingTop: "2.5cm",
        paddingBottom: "2cm",
        paddingLeft: "3cm",
        paddingRight: "2cm",
        fontSize: "16pt",
        lineHeight: 1.5,
      }}
    >
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
      </div>

      <div className="mt-16 ml-auto w-[7cm] text-center text-[16pt]">
        <p className="mb-16">ลงชื่อ .......................................................</p>
        {doc.signerName && <p>({doc.signerName})</p>}
        {doc.signerPosition && <p>{doc.signerPosition}</p>}
        <p>จาก {doc.sender}</p>
      </div>
    </div>
  );
}
