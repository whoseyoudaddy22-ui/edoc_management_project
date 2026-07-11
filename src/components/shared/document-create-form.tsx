"use client";

import { useState } from "react";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { FilePlus, FileStack, FileEdit, CheckCircle2 } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createDocumentSchema } from "@/lib/validations/document";
import { CLOSING_TEXT_LABELS, PRIORITY_LABELS, getDefaultClosingText } from "@/lib/labels";
import { ClosingText, Priority } from "@/generated/prisma/enums";

function todayAsInputValue() {
  return new Date().toISOString().slice(0, 10);
}

function getCurrentBuddhistYear() {
  return new Date().getFullYear() + 543;
}

export function DocumentCreateForm({
  documentTypes,
}: {
  documentTypes: { id: string; name: string; code: string }[];
}) {
  const [submitError, setSubmitError] = useState<string | null>(null);
  const [createdDocumentNumber, setCreatedDocumentNumber] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    reset,
    control,
    setValue,
    formState: { errors, isSubmitting, dirtyFields },
  } = useForm({
    resolver: zodResolver(createDocumentSchema),
    defaultValues: {
      documentTypeId: "",
      documentDate: todayAsInputValue(),
      priority: Priority.NORMAL,
      title: "",
      recipient: "",
      sender: "",
      departmentName: "",
      referenceNumber: "",
      content: "",
      closingText: ClosingText.RESPECTFULLY,
    },
  });

  const onSubmit = handleSubmit(async (values) => {
    setSubmitError(null);
    try {
      const response = await fetch("/api/documents", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });
      const body = await response.json();

      if (!response.ok) {
        setSubmitError(body?.error ?? "ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่อีกครั้ง");
        return;
      }

      setCreatedDocumentNumber(body.data.documentNumber);
      reset({
        documentTypeId: "",
        documentDate: todayAsInputValue(),
        priority: Priority.NORMAL,
        title: "",
        recipient: "",
        sender: "",
        departmentName: "",
        referenceNumber: "",
        content: "",
        closingText: ClosingText.RESPECTFULLY,
      });
    } catch {
      setSubmitError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    }
  });

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold text-gray-900">สร้างเอกสาร</h1>
        <Button type="button" onClick={onSubmit} disabled={isSubmitting}>
          <FilePlus className="h-4 w-4" />
          {isSubmitting ? "กำลังบันทึก..." : "บันทึกเอกสาร"}
        </Button>
      </div>

      {createdDocumentNumber && (
        <div className="flex items-center gap-2 rounded-lg border border-green-200 bg-green-50 p-4 text-sm text-green-800">
          <CheckCircle2 className="h-4 w-4 shrink-0" />
          บันทึกเอกสารสำเร็จ เลขที่เอกสาร:{" "}
          <span className="font-semibold">{createdDocumentNumber}</span>
        </div>
      )}

      {submitError && (
        <p className="rounded-lg border border-red-200 bg-red-50 p-4 text-sm text-red-700">
          {submitError}
        </p>
      )}

      <form onSubmit={onSubmit} className="flex flex-col gap-6">
        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileStack className="h-4 w-4" />
              ข้อมูลหนังสือ
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="flex flex-col gap-1.5">
              <Label>เลขที่หนังสือ</Label>
              <Input
                disabled
                value={`ระบบจะออกให้อัตโนมัติ (พ.ศ. ${getCurrentBuddhistYear()})`}
                className="text-gray-500"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documentDate">
                วันที่หนังสือ <span className="text-red-500">*</span>
              </Label>
              <Input id="documentDate" type="date" {...register("documentDate")} />
              {errors.documentDate && (
                <p className="text-xs text-red-600">{errors.documentDate.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="documentTypeId">
                ประเภทเอกสาร <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="documentTypeId"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => {
                      if (!value) return;
                      field.onChange(value);
                      const selectedType = documentTypes.find((type) => type.id === value);
                      if (selectedType && !dirtyFields.closingText) {
                        setValue("closingText", getDefaultClosingText(selectedType.code));
                      }
                    }}
                  >
                    <SelectTrigger id="documentTypeId" className="w-full">
                      <SelectValue placeholder="เลือกประเภทเอกสาร">
                        {(value: string | null) =>
                          documentTypes.find((type) => type.id === value)?.name ?? "เลือกประเภทเอกสาร"
                        }
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {documentTypes.map((type) => (
                        <SelectItem key={type.id} value={type.id}>
                          {type.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.documentTypeId && (
                <p className="text-xs text-red-600">{errors.documentTypeId.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="priority">
                ระดับความเร่งด่วน <span className="text-red-500">*</span>
              </Label>
              <Controller
                control={control}
                name="priority"
                render={({ field }) => (
                  <Select
                    value={field.value}
                    onValueChange={(value) => value && field.onChange(value)}
                  >
                    <SelectTrigger id="priority" className="w-full">
                      <SelectValue placeholder="เลือกระดับความเร่งด่วน">
                        {(value: Priority | null) => (value ? PRIORITY_LABELS[value] : "เลือกระดับความเร่งด่วน")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(Priority).map((value) => (
                        <SelectItem key={value} value={value}>
                          {PRIORITY_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.priority && (
                <p className="text-xs text-red-600">{errors.priority.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="title">
                ชื่อเรื่อง <span className="text-red-500">*</span>
              </Label>
              <Input id="title" {...register("title")} />
              {errors.title && (
                <p className="text-xs text-red-600">{errors.title.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="recipient">
                เรียน <span className="text-red-500">*</span>
              </Label>
              <Input id="recipient" {...register("recipient")} />
              {errors.recipient && (
                <p className="text-xs text-red-600">{errors.recipient.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="sender">
                จาก <span className="text-red-500">*</span>
              </Label>
              <Input id="sender" {...register("sender")} />
              {errors.sender && (
                <p className="text-xs text-red-600">{errors.sender.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="departmentName">ส่วนราชการ</Label>
              <Input
                id="departmentName"
                placeholder="เช่น กองพัสดุฯ องค์การบริหารส่วนจังหวัดพิษณุโลก โทร.0-5598-7718-20 ต่อ 800"
                {...register("departmentName")}
              />
              {errors.departmentName && (
                <p className="text-xs text-red-600">{errors.departmentName.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5 md:col-span-2">
              <Label htmlFor="referenceNumber">อ้างอิง</Label>
              <Input id="referenceNumber" {...register("referenceNumber")} />
              {errors.referenceNumber && (
                <p className="text-xs text-red-600">{errors.referenceNumber.message}</p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="border border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <FileEdit className="h-4 w-4" />
              เนื้อหาเอกสาร
            </CardTitle>
          </CardHeader>
          <CardContent className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="content">
                เนื้อหา <span className="text-red-500">*</span>
              </Label>
              <Textarea id="content" rows={8} {...register("content")} />
              {errors.content && (
                <p className="text-xs text-red-600">{errors.content.message}</p>
              )}
            </div>

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="closingText">ข้อความปิดท้าย</Label>
              <Controller
                control={control}
                name="closingText"
                render={({ field }) => (
                  <Select value={field.value} onValueChange={(value) => value && field.onChange(value)}>
                    <SelectTrigger id="closingText" className="w-full">
                      <SelectValue placeholder="เลือกข้อความปิดท้าย">
                        {(value: ClosingText | null) => (value ? CLOSING_TEXT_LABELS[value] : "เลือกข้อความปิดท้าย")}
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      {Object.values(ClosingText).map((value) => (
                        <SelectItem key={value} value={value}>
                          {CLOSING_TEXT_LABELS[value]}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
              />
              {errors.closingText && (
                <p className="text-xs text-red-600">{errors.closingText.message}</p>
              )}
            </div>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
