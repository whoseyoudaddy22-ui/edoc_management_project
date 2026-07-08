import { ClosingText, Division, Priority, Role, TitlePrefix } from "@/generated/prisma/enums";

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NORMAL]: "ปกติ",
  [Priority.URGENT]: "ด่วน",
  [Priority.VERY_URGENT]: "ด่วนมาก",
  [Priority.IMMEDIATE]: "ด่วนที่สุด",
};

export const CLOSING_TEXT_LABELS: Record<ClosingText, string> = {
  [ClosingText.THANK_YOU_INFORM]: "จึงเรียนมาเพื่อทราบ และดำเนินการตามอำนาจและหน้าที่ต่อไป",
  [ClosingText.RESPECTFULLY]: "ขอแสดงความนับถือ",
};

// รหัสประเภทเอกสาร "บันทึกข้อความ" (ดู prisma/seed-documents.ts, prisma/seed-test.ts)
// ใช้กำหนด default closingText และเลือก layout variant ใน document-template.tsx
// (ดู .claude/skills/official-document-template/SKILL.md ส่วน "บันทึกข้อความ (variant)")
export const MEMO_DOCUMENT_TYPE_CODE = "0005";

export function getDefaultClosingText(documentTypeCode: string): ClosingText {
  return documentTypeCode === MEMO_DOCUMENT_TYPE_CODE
    ? ClosingText.THANK_YOU_INFORM
    : ClosingText.RESPECTFULLY;
}

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SARABAN]: "เจ้าหน้าที่สารบรรณ",
  [Role.ADMIN]: "ผู้ดูแลระบบ",
  [Role.APPROVER]: "ผู้อนุมัติ",
  [Role.VIEWER]: "ผู้ใช้งานทั่วไป",
};

export const TITLE_PREFIX_LABELS: Record<TitlePrefix, string> = {
  [TitlePrefix.MR]: "นาย",
  [TitlePrefix.MRS]: "นาง",
  [TitlePrefix.MISS]: "นางสาว",
};

export const DIVISION_LABELS: Record<Division, string> = {
  [Division.ADMINISTRATION]: "ฝ่ายบริหาร",
  [Division.HR]: "ฝ่ายทรัพยากรบุคคล",
  [Division.FINANCE_ACCOUNTING]: "ฝ่ายการเงินและบัญชี",
  [Division.MARKETING]: "ฝ่ายการตลาด",
  [Division.SALES]: "ฝ่ายขาย",
  [Division.IT]: "ฝ่ายไอที",
  [Division.CUSTOMER_SERVICE]: "ฝ่ายบริการลูกค้า",
};
