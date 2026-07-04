"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Save, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateUserSchema } from "@/lib/validations/user";
import { ROLE_LABELS } from "@/lib/labels";
import { Role } from "@/generated/prisma/enums";

type EditableUser = {
  id: string;
  name: string;
  email: string;
  role: Role;
  departmentCode: string | null;
};

export function UserEditForm({ user }: { user: EditableUser }) {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: user.name,
      role: user.role,
      departmentCode: user.departmentCode ?? "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const response = await fetch(`/api/users/${user.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          departmentCode: values.departmentCode || null,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setSubmitError(body?.error ?? "ไม่สามารถแก้ไขผู้ใช้งานได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      router.push("/users");
      router.refresh();
    } catch {
      setSubmitError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">แก้ไขผู้ใช้งาน</h1>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          <Save className="h-4 w-4" />
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกการแก้ไข"}
        </Button>
      </div>

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <UserRound className="h-4 w-4" />
              ข้อมูลผู้ใช้งาน
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="name">
                ชื่อ <span className="text-red-500">*</span>
              </Label>
              <Input id="name" {...register("name")} />
              {errors.name && <p className="text-xs text-red-600">{errors.name.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">อีเมล</Label>
              <Input id="email" value={user.email} disabled className="text-gray-500" />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="departmentCode">หน่วยงาน</Label>
              <Input id="departmentCode" {...register("departmentCode")} />
              {errors.departmentCode && (
                <p className="text-xs text-red-600">{errors.departmentCode.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="role">
                สิทธิ์การใช้งาน <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="role"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger id="role" className="w-full">
                      <SelectValue placeholder="เลือกสิทธิ์การใช้งาน">
                        {(value: Role | null) => (value ? ROLE_LABELS[value] : "เลือกสิทธิ์การใช้งาน")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Role).map((value) => (
                        <SelectItem key={value} value={value}>
                          {ROLE_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.role && <p className="text-xs text-red-600">{errors.role.message}</p>}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
