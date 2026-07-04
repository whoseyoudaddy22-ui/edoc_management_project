import { cn } from "@/lib/utils";
import { AuditAction } from "@/generated/prisma/enums";
import { AUDIT_ACTION_LABELS, getAuditActionBadgeClassName } from "@/lib/audit-format";

export function AuditActionBadge({ action }: { action: AuditAction }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        getAuditActionBadgeClassName(action)
      )}
    >
      {AUDIT_ACTION_LABELS[action]}
    </span>
  );
}
