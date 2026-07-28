import type { ReactNode } from "react";

// กรอบ A4 + margin ร่วมกันทุกเทมเพลต ตาม .claude/skills/official-document-template
// ห้ามแก้ตัวเลขที่นี่โดยไม่แก้ spec ในสกิลก่อน
export function PageFrame({
  paddingTop,
  paddingBottom,
  children,
}: {
  paddingTop: string;
  paddingBottom: string;
  children: ReactNode;
}) {
  return (
    <div
      className="document-page font-document mx-auto bg-white text-black shadow-lg"
      style={{
        width: "210mm",
        minHeight: "297mm",
        paddingTop,
        paddingBottom,
        paddingLeft: "3cm",
        paddingRight: "2cm",
        fontSize: "16pt",
        lineHeight: 1.5,
      }}
    >
      {children}
    </div>
  );
}
