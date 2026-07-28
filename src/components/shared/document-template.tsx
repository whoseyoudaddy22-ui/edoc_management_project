import { getDefaultComponentKey } from "@/lib/document-templates/component-key";
import { templateRegistry } from "@/components/document-templates/registry";
import type { DocumentTemplateData } from "@/components/document-templates/types";
import { DocumentLayout } from "@/generated/prisma/enums";

export type { DocumentTemplateData };

export type DocumentTemplateWrapperData = DocumentTemplateData & {
  documentType: DocumentTemplateData["documentType"] & { layout: DocumentLayout };
  templateComponentKey?: string | null;
};

// เลือก component จาก registry ตาม TemplateDefinition.componentKey เสมอ (ดู
// docs/modules/module-17-smart-template-system.md) — ถ้าเอกสาร/ประเภทเอกสารยังไม่มี
// TemplateDefinition ผูกไว้ (ข้อมูลเก่าก่อนมี Module 17) ให้ fallback ตาม layout เดิม
export function DocumentTemplate({ document: doc }: { document: DocumentTemplateWrapperData }) {
  const fallbackKey = getDefaultComponentKey(doc.documentType.layout);
  const componentKey = doc.templateComponentKey ?? fallbackKey;
  const Template = templateRegistry[componentKey] ?? templateRegistry[fallbackKey];

  return <Template document={doc} />;
}
