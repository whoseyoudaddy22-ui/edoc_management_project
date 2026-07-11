import { cn } from "@/lib/utils";
import { DocumentStatus } from "@/generated/prisma/enums";

export const STATUS_LABEL: Record<DocumentStatus, string> = {
  DRAFT: "ฉบับร่าง",
  PENDING: "รอดำเนินการ",
  APPROVED: "อนุมัติแล้ว",
  REJECTED: "ไม่อนุมัติ",
  ARCHIVED: "จัดเก็บแล้ว",
};

const STATUS_CLASSNAME: Record<DocumentStatus, string> = {
  DRAFT: "bg-status-draft-bg text-status-draft-fg",
  PENDING: "bg-status-pending-bg text-status-pending-fg",
  APPROVED: "bg-status-approved-bg text-status-approved-fg",
  REJECTED: "bg-status-rejected-bg text-status-rejected-fg",
  ARCHIVED: "bg-status-external-bg text-status-external-fg",
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
