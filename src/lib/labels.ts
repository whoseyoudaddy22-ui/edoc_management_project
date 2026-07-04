import { Priority } from "@/generated/prisma/enums";

export const PRIORITY_LABELS: Record<Priority, string> = {
  [Priority.NORMAL]: "ปกติ",
  [Priority.URGENT]: "ด่วน",
  [Priority.VERY_URGENT]: "ด่วนมาก",
  [Priority.IMMEDIATE]: "ด่วนที่สุด",
};
