"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { DocumentStatus } from "@/generated/prisma/enums";

// แสดงเฉพาะเอกสารสถานะ PENDING เท่านั้น — การ gate ตามบทบาท (ADMIN/APPROVER)
// ทำที่ server component (page.tsx) ผ่าน prop canApprove, endpoint เองก็เช็คสิทธิ์ซ้ำอีกชั้น
export function DocumentApprovalActions({
  documentId,
  status,
  currentUserId,
}: {
  documentId: string;
  status: DocumentStatus;
  currentUserId: string;
}) {
  const router = useRouter();
  const [pendingAction, setPendingAction] = useState<"APPROVED" | "REJECTED" | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (status !== DocumentStatus.PENDING) {
    return null;
  }

  async function decide(nextStatus: "APPROVED" | "REJECTED") {
    const label = nextStatus === "APPROVED" ? "อนุมัติ" : "ไม่อนุมัติ";
    if (!window.confirm(`ยืนยันการ${label}เอกสารนี้?`)) return;

    setError(null);
    setPendingAction(nextStatus);
    try {
      const response = await fetch(`/api/documents/${documentId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus, approvedById: currentUserId }),
      });
      if (!response.ok) {
        const body = await response.json().catch(() => null);
        setError(body?.error ?? `ไม่สามารถ${label}เอกสารได้`);
        return;
      }
      router.refresh();
    } catch {
      setError("เกิดข้อผิดพลาดในการเชื่อมต่อ กรุณาลองใหม่อีกครั้ง");
    } finally {
      setPendingAction(null);
    }
  }

  return (
    <div className="flex flex-col items-end gap-1.5">
      <div className="flex items-center gap-2">
        <Button
          onClick={() => decide("APPROVED")}
          disabled={pendingAction !== null}
        >
          <Check className="h-4 w-4" />
          อนุมัติ
        </Button>
        <Button
          variant="destructive"
          onClick={() => decide("REJECTED")}
          disabled={pendingAction !== null}
        >
          <X className="h-4 w-4" />
          ไม่อนุมัติ
        </Button>
      </div>
      {error && <p className="text-sm text-red-600">{error}</p>}
    </div>
  );
}
