"use client";

import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";

export function FooterCredits() {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger
          render={
            <p className="cursor-default text-xs text-muted-foreground">
              ระบบบริหารจัดการการสร้างและจัดเก็บแฟ้มเอกสารอิเล็กทรอนิกส์
            </p>
          }
        />
        <TooltipContent className="max-w-xs text-left">
          <div className="flex flex-col gap-1 py-0.5">
            <p>
              <span className="font-semibold">นักศึกษาผู้จัดทำ:</span>{" "}
              นายกรณ์ดนัย นาคคงคำ, นางสาวศันย์สนี มุ่งดี
            </p>
            <p>
              <span className="font-semibold">ที่ปรึกษาโครงงาน:</span>{" "}
              อาจารย์บุญหลง ขำบางโพธิ์, นางสาวอภิรดี บุญเกิดกุล
            </p>
            <p>
              <span className="font-semibold">ที่ปรึกษาโครงงานกิตติมศักดิ์:</span>{" "}
              นายภัทรนิธิ แพมงคล
            </p>
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
