import { AuditAction, DocumentStatus, Priority, Role } from "@/generated/prisma/enums";
import { STATUS_LABEL } from "@/components/shared/status-badge";
import { PRIORITY_LABELS, ROLE_LABELS } from "@/lib/labels";
import { formatThaiDate } from "@/lib/format";

type ChangeEntry = { from: unknown; to: unknown };
type Changes = Record<string, ChangeEntry>;

export const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  DOCUMENT_CREATE: "สร้างเอกสาร",
  DOCUMENT_UPDATE: "แก้ไขเอกสาร",
  DOCUMENT_STATUS_CHANGE: "เปลี่ยนสถานะเอกสาร",
  DOCUMENT_DELETE: "ลบเอกสาร",
  ATTACHMENT_UPLOAD: "อัปโหลดไฟล์แนบ",
  ATTACHMENT_DELETE: "ลบไฟล์แนบ",
  DOCUMENT_PRINT: "พิมพ์ / ส่งออก PDF",
  USER_LOGIN: "เข้าสู่ระบบ",
  USER_LOGOUT: "ออกจากระบบ",
  USER_LOGIN_FAILED: "เข้าสู่ระบบไม่สำเร็จ",
  USER_CREATE: "สร้างผู้ใช้งาน",
  USER_UPDATE: "แก้ไขผู้ใช้งาน",
  USER_DEACTIVATE: "ปิดใช้งานบัญชี",
  PASSWORD_RESET_REQUESTED: "ขอรีเซ็ตรหัสผ่าน",
  PASSWORD_RESET_COMPLETED: "ตั้งรหัสผ่านใหม่สำเร็จ",
};

export const AUDIT_TARGET_TYPE_LABELS: Record<string, string> = {
  Document: "เอกสาร",
  User: "ผู้ใช้งาน",
  Attachment: "ไฟล์แนบ",
};

const AUDIT_ACTION_BADGE_CLASSNAME: Record<AuditAction, string> = {
  DOCUMENT_CREATE: "bg-green-100 text-green-700",
  DOCUMENT_UPDATE: "bg-sky-100 text-sky-700",
  DOCUMENT_STATUS_CHANGE: "bg-amber-100 text-amber-800",
  DOCUMENT_DELETE: "bg-red-100 text-red-700",
  ATTACHMENT_UPLOAD: "bg-green-100 text-green-700",
  ATTACHMENT_DELETE: "bg-red-100 text-red-700",
  DOCUMENT_PRINT: "bg-sky-100 text-sky-700",
  USER_LOGIN: "bg-green-100 text-green-700",
  USER_LOGOUT: "bg-gray-100 text-gray-700",
  USER_LOGIN_FAILED: "bg-red-100 text-red-700",
  USER_CREATE: "bg-green-100 text-green-700",
  USER_UPDATE: "bg-sky-100 text-sky-700",
  USER_DEACTIVATE: "bg-red-100 text-red-700",
  PASSWORD_RESET_REQUESTED: "bg-amber-100 text-amber-800",
  PASSWORD_RESET_COMPLETED: "bg-green-100 text-green-700",
};

export function getAuditActionBadgeClassName(action: AuditAction): string {
  return AUDIT_ACTION_BADGE_CLASSNAME[action];
}

// ป้ายกำกับ field ที่ใช้ร่วมกันทั้ง DOCUMENT_UPDATE, DOCUMENT_STATUS_CHANGE และ USER_UPDATE
// (มาจาก diffFields() ใน src/lib/audit.ts ซึ่งใช้ชื่อ field ตรงกับ Prisma model)
const FIELD_LABELS: Record<string, string> = {
  title: "ชื่อเรื่อง",
  priority: "ระดับความเร่งด่วน",
  recipient: "เรียน",
  sender: "จาก",
  referenceNumber: "เอกสารอ้างอิง",
  content: "เนื้อหา",
  signerName: "ผู้ลงนาม",
  signerPosition: "ตำแหน่งผู้ลงนาม",
  documentDate: "วันที่หนังสือ",
  status: "สถานะ",
  approvedById: "ผู้อนุมัติ",
  name: "ชื่อ",
  role: "สิทธิ์การใช้งาน",
  departmentCode: "หน่วยงาน",
};

function formatFieldValue(field: string, value: unknown): string {
  if (value === null || value === undefined || value === "") return "-";

  if (field === "status" && typeof value === "string" && value in STATUS_LABEL) {
    return STATUS_LABEL[value as DocumentStatus];
  }
  if (field === "priority" && typeof value === "string" && value in PRIORITY_LABELS) {
    return PRIORITY_LABELS[value as Priority];
  }
  if (field === "role" && typeof value === "string" && value in ROLE_LABELS) {
    return ROLE_LABELS[value as Role];
  }
  if (field === "documentDate") {
    const parsed = new Date(value as string);
    if (!Number.isNaN(parsed.getTime())) return formatThaiDate(parsed);
  }
  if (typeof value === "boolean") return value ? "ใช่" : "ไม่ใช่";
  return String(value);
}

// แปลง `changes` ให้เป็นข้อความอ่านง่าย เช่น "เปลี่ยนสถานะจาก 'รอดำเนินการ' → 'อนุมัติแล้ว'"
// แทนการแสดง JSON ดิบ ตามข้อกำหนดใน docs/modules/module-12-audit-log.md
export function formatAuditDetails(action: AuditAction, changesJson: unknown): string[] {
  const changes = (changesJson ?? null) as Changes | null;

  switch (action) {
    case "ATTACHMENT_UPLOAD":
      return [`ชื่อไฟล์: "${changes?.fileName?.to ?? "-"}"`];
    case "ATTACHMENT_DELETE":
      return [`ชื่อไฟล์: "${changes?.fileName?.from ?? "-"}"`];
    case "DOCUMENT_STATUS_CHANGE":
    case "DOCUMENT_UPDATE":
    case "USER_UPDATE": {
      if (!changes) return [];
      return Object.entries(changes).map(([field, entry]) => {
        const from = formatFieldValue(field, entry.from);
        const to = formatFieldValue(field, entry.to);
        if (field === "status") return `เปลี่ยนสถานะจาก "${from}" → "${to}"`;
        const label = FIELD_LABELS[field] ?? field;
        return `เปลี่ยน${label}จาก "${from}" → "${to}"`;
      });
    }
    default:
      return [];
  }
}
