import type { ClosingText, Priority, TitlePrefix } from "@/generated/prisma/enums";

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
  signerTitlePrefix: TitlePrefix | null;
  signerName: string | null;
  signerPosition: string | null;
  documentType: { name: string };
};

export type TemplateProps = { document: DocumentTemplateData };
