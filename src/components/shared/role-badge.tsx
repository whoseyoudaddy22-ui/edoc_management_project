import { cn } from "@/lib/utils";
import { Role } from "@/generated/prisma/enums";
import { ROLE_LABELS } from "@/lib/labels";

const ROLE_CLASSNAME: Record<Role, string> = {
  [Role.ADMIN]: "bg-blue-100 text-blue-700",
  [Role.APPROVER]: "bg-green-100 text-green-700",
  [Role.SARABAN]: "bg-sky-100 text-sky-700",
  [Role.VIEWER]: "bg-gray-100 text-gray-700",
};

export function RoleBadge({ role }: { role: Role }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        ROLE_CLASSNAME[role]
      )}
    >
      {ROLE_LABELS[role]}
    </span>
  );
}

export function ActiveStatusBadge({ isActive }: { isActive: boolean }) {
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full px-3 py-1 text-xs font-medium whitespace-nowrap",
        isActive ? "bg-green-100 text-green-700" : "bg-gray-100 text-gray-600"
      )}
    >
      {isActive ? "ใช้งาน" : "ปิดใช้งาน"}
    </span>
  );
}
