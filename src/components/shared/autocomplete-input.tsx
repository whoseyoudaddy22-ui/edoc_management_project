"use client";

import { useEffect, useId, useState } from "react";
import { Input } from "@/components/ui/input";

type LookupField = "departmentName" | "title" | "recipient" | "position";

// input ธรรมดาที่พิมพ์อิสระได้ พร้อมเสนอค่าที่เคยกรอกไว้แล้วทั้งระบบ (ดึงจาก
// GET /api/lookups) ให้เลือกผ่าน native <datalist> — ไม่ผูก UI กับค่าที่เสนอ
// ผู้ใช้พิมพ์ค่าใหม่ที่ไม่อยู่ในลิสต์ได้เสมอ
export function AutocompleteInput({
  field,
  ...inputProps
}: { field: LookupField } & React.ComponentProps<typeof Input>) {
  const listId = useId();
  const [options, setOptions] = useState<string[]>([]);

  useEffect(() => {
    const controller = new AbortController();
    fetch(`/api/lookups?field=${field}`, { signal: controller.signal })
      .then((res) => (res.ok ? res.json() : { data: [] }))
      .then((body: { data?: string[] }) => setOptions(body.data ?? []))
      .catch(() => {});
    return () => controller.abort();
  }, [field]);

  return (
    <>
      <Input list={listId} {...inputProps} />
      <datalist id={listId}>
        {options.map((option) => (
          <option key={option} value={option} />
        ))}
      </datalist>
    </>
  );
}
