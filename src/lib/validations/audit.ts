import { z } from "zod";

export const AUDIT_TARGET_TYPES = ["Document", "User", "Attachment"] as const;

export const auditLogQuerySchema = z.object({
  targetType: z.enum(AUDIT_TARGET_TYPES).optional(),
  performedBy: z.string().min(1).optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type AuditLogQuery = z.infer<typeof auditLogQuerySchema>;
