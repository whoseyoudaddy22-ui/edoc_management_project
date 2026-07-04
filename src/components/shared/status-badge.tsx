import { cn } from "@/lib/utils";
import { DocumentStatus } from "@/generated/prisma/enums";

const STATUS_LABEL: Record<DocumentStatus, string> = {
  DRAFT: "ฉบับร่าง",
  PENDING: "รอดำเนินการ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  ARCHIVED: "จัดเก็บแล้ว",
};

const STATUS_CLASSNAME: Record<DocumentStatus, string> = {
  DRAFT: "bg-gray-100 text-gray-700",
  PENDING: "bg-amber-100 text-amber-800",
  APPROVED: "bg-green-100 text-green-700",
  REJECTED: "bg-red-100 text-red-700",
  ARCHIVED: "bg-sky-100 text-sky-700",
};

export function StatusBadge({ status }: { status: DocumentStatus }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        STATUS_CLASSNAME[status]
      )}
    >
      {STATUS_LABEL[status]}
    </span>
  );
}
