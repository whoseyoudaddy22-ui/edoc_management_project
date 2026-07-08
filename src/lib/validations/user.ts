import { z } from "zod";
import { Division, Role, TitlePrefix } from "@/generated/prisma/enums";
import { passwordSchema } from "@/lib/validations/password";

// ช่องข้อความที่ไม่บังคับกรอก แต่ฟอร์ม (react-hook-form) จะส่งค่าเป็น "" แทน undefined
// เมื่อผู้ใช้ไม่ได้พิมพ์อะไร — ถ้าไม่แปลง "" เป็น undefined ก่อน .min(1) จะ error ทั้งที่ควรถือว่า "ไม่ได้กรอก"
const optionalNonEmptyString = () =>
  z.preprocess(
    (val) => (typeof val === "string" && val.trim() === "" ? undefined : val),
    z.string().min(1).optional()
  );

export const createUserSchema = z.object({
  titlePrefix: z.enum(TitlePrefix, { message: "กรุณาเลือกคำนำหน้าชื่อ" }),
  firstName: z.string().min(1, "กรุณาระบุชื่อ"),
  lastName: z.string().min(1, "กรุณาระบุนามสกุล"),
  email: z.email("อีเมลไม่ถูกต้อง"),
  password: passwordSchema,
  role: z.enum(Role).default(Role.SARABAN),
  division: z.enum(Division, { message: "กรุณาเลือกฝ่าย" }),
  position: optionalNonEmptyString(),
  departmentCode: optionalNonEmptyString(),
});

export type CreateUserInput = z.infer<typeof createUserSchema>;

export const updateUserSchema = z
  .object({
    titlePrefix: z.enum(TitlePrefix).optional(),
    firstName: z.string().min(1).optional(),
    lastName: z.string().min(1).optional(),
    role: z.enum(Role).optional(),
    division: z.enum(Division).nullable().optional(),
    position: optionalNonEmptyString().nullable(),
    departmentCode: optionalNonEmptyString().nullable(),
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
