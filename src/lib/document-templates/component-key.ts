import { DocumentLayout } from "@/generated/prisma/enums";

// Mapping ชั่วคราวจาก layout -> componentKey เริ่มต้น ใช้ตอน seed เท่านั้น
// (ปัจจุบัน componentKey ผูก 1:1 กับ DocumentLayout เพราะมีแค่ 2 เทมเพลต ดู
// docs/modules/module-17-smart-template-system.md — เทมเพลตใหม่ในอนาคตต้องกำหนด
// componentKey ของตัวเองตรงๆ ไม่ต้องพึ่งฟังก์ชันนี้)
export function getDefaultComponentKey(layout: DocumentLayout): string {
  return layout === DocumentLayout.MEMO ? "memo-standard-v1" : "external-letter-standard";
}
