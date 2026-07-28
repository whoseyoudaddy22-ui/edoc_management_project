import type { ComponentType } from "react";
import { ExternalLetterStandard } from "./external-letter-standard";
import { MemoStandardV1 } from "./memo-standard-v1";
import type { TemplateProps } from "./types";

// map componentKey (TemplateDefinition.componentKey ใน DB) -> component จริง
// เพิ่มเทมเพลตใหม่ที่นี่ตาม workflow ใน docs/modules/module-17-smart-template-system.md
export const templateRegistry: Record<string, ComponentType<TemplateProps>> = {
  "external-letter-standard": ExternalLetterStandard,
  "memo-standard-v1": MemoStandardV1,
};
