import { z } from "zod";
import { Role } from "@/generated/prisma/enums";

export const createUserSchema = z.object({
  name: z.string().min(1, "กรุณาระบุชื่อ"),
  email: z.email("อีเมลไม่ถูกต้อง"),
  password: z.string().min(8, "รหัสผ่านต้องมีอย่างน้อย 8 ตัวอักษร"),
  role: z.enum(Role).default(Role.SARABAN),
  departmentCode: z.string().min(1).optional(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    name: z.string().min(1).optional(),
    role: z.enum(Role).optional(),
    departmentCode: z.string().min(1).nullable().optional(),
  })
  .refine((data) => Object.keys(data).length > 0, {
    message: "ไม่มีข้อมูลที่ต้องการแก้ไข",
  });

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

export const listUsersQuerySchema = z.object({
  search: z.string().trim().min(1).optional(),
  role: z.enum(Role).optional(),
  isActive: z.coerce.boolean().optional(),
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});

export type ListUsersQuery = z.infer<typeof listUsersQuerySchema>;
