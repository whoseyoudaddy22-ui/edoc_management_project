import { Priority, Role } from "@/generated/prisma/enums";

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NORMAL]: "ปกติ",
  [Priority.URGENT]: "ด่วน",
  [Priority.VERY_URGENT]: "ด่วนมาก",
  [Priority.IMMEDIATE]: "ด่วนที่สุด",
};

export const ROLE_LABELS: Record<Role, string> = {
  [Role.SARABAN]: "เจ้าหน้าที่สารบรรณ",
  [Role.ADMIN]: "ผู้ดูแลระบบ",
  [Role.APPROVER]: "ผู้อนุมัติ",
  [Role.VIEWER]: "ผู้ใช้งานทั่วไป",
};
