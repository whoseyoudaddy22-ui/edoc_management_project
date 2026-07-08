"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { AlertCircle, UserPlus, UserRound } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertTitle } from "@/components/ui/alert";
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
import { createUserSchema } from "@/lib/validations/user";
import { DIVISION_LABELS, ROLE_LABELS, TITLE_PREFIX_LABELS } from "@/lib/labels";
import { Division, Role, TitlePrefix } from "@/generated/prisma/enums";

export function UserCreateForm() {
  const router = useRouter();
  const [submitError, setSubmitError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    control,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: zodResolver(createUserSchema),
    defaultValues: {
      titlePrefix: undefined,
      firstName: "",
      lastName: "",
      email: "",
      password: "",
      role: Role.SARABAN,
      division: undefined,
      position: "",
      departmentCode: "",
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const response = await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...values,
          position: values.position || undefined,
          departmentCode: values.departmentCode || undefined,
        }),
      });
      const body = await response.json();

      if (!response.ok) {
        setSubmitError(body?.error ?? "ไม่สามารถสร้างผู้ใช้งานได้ กรุณาลองใหม่อีกครั้ง");
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
        <h1 className="text-xl font-semibold text-foreground">เพิ่มผู้ใช้งาน</h1>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          <UserPlus className="h-4 w-4" />
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกผู้ใช้งาน"}
        </Button>
      </div>

      {submitError && (
        <Alert variant="destructive" className="border-destructive/30 bg-destructive/5">
          <AlertCircle />
          <AlertTitle>{submitError}</AlertTitle>
        </Alert>
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
              <Label htmlFor="titlePrefix">
                คำนำหน้าชื่อ <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="titlePrefix"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger id="titlePrefix" className="w-full">
                      <SelectValue placeholder="เลือกคำนำหน้าชื่อ">
                        {(value: TitlePrefix | null) =>
                          value ? TITLE_PREFIX_LABELS[value] : "เลือกคำนำหน้าชื่อ"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(TitlePrefix).map((value) => (
                        <SelectItem key={value} value={value}>
                          {TITLE_PREFIX_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.titlePrefix && (
                <p className="text-xs text-destructive">{errors.titlePrefix.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="firstName">
                ชื่อ <span className="text-destructive">*</span>
              </Label>
              <Input id="firstName" {...register("firstName")} />
              {errors.firstName && (
                <p className="text-xs text-destructive">{errors.firstName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="lastName">
                นามสกุล <span className="text-destructive">*</span>
              </Label>
              <Input id="lastName" {...register("lastName")} />
              {errors.lastName && (
                <p className="text-xs text-destructive">{errors.lastName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="email">
                อีเมล <span className="text-destructive">*</span>
              </Label>
              <Input id="email" type="email" {...register("email")} />
              {errors.email && <p className="text-xs text-destructive">{errors.email.message}</p>}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="password">
                รหัสผ่านเริ่มต้น <span className="text-destructive">*</span>
              </Label>
              <Input id="password" type="password" {...register("password")} />
              {errors.password && (
                <p className="text-xs text-destructive">{errors.password.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="division">
                ฝ่าย <span className="text-destructive">*</span>
              </Label>
              <Controller
                control={control}
                name="division"
                render={({ field }) => (
                  <Select
                    value={field.value ?? ""}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger id="division" className="w-full">
                      <SelectValue placeholder="เลือกฝ่าย">
                        {(value: Division | null) => (value ? DIVISION_LABELS[value] : "เลือกฝ่าย")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Division).map((value) => (
                        <SelectItem key={value} value={value}>
                          {DIVISION_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.division && (
                <p className="text-xs text-destructive">{errors.division.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="position">ตำแหน่งงาน</Label>
              <Input id="position" placeholder="เช่น หัวหน้าฝ่าย, เจ้าหน้าที่" {...register("position")} />
              {errors.position && (
                <p className="text-xs text-destructive">{errors.position.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="departmentCode">หน่วยงาน</Label>
              <Input id="departmentCode" {...register("departmentCode")} />
              <p className="text-xs text-muted-foreground">
                รหัสย่อสำหรับระบบออกเลขที่เอกสารอัตโนมัติ เช่น ศรพ, ทสบ (คนละส่วนกับฝ่ายด้านบน)
              </p>
              {errors.departmentCode && (
                <p className="text-xs text-destructive">{errors.departmentCode.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="role">
                สิทธิ์การใช้งาน <span className="text-destructive">*</span>
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
              {errors.role && <p className="text-xs text-destructive">{errors.role.message}</p>}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
