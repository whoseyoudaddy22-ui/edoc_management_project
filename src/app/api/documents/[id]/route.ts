import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDocumentSchema } from "@/lib/validations/document";
import { requireAuth, requireRole } from "@/lib/authorize";
import { Role, DocumentStatus } from "@/generated/prisma/enums";
import { logAction, diffFields } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: {
      documentType: true,
      createdBy: { select: { id: true, name: true, email: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      attachments: true,
    },
  });

  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  return NextResponse.json({ data: document });
}

// VIEWER ดูได้อย่างเดียว แก้ไขเอกสารไม่ได้เลยตาม docs/modules/module-10-user-management.md
export async function PUT(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN, Role.SARABAN, Role.APPROVER]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = updateDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const existing = await prisma.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  const { approvedById, status, ...contentRest } = parsed.data;

  // Approver มีหน้าที่แค่เปลี่ยนสถานะเป็นอนุมัติ/ไม่อนุมัติเท่านั้น แก้ไขเนื้อหาเอกสารไม่ได้
  const isApprovalDecision =
    approvedById !== undefined ||
    status === DocumentStatus.APPROVED ||
    status === DocumentStatus.REJECTED;

  const approverRoles: Role[] = [Role.ADMIN, Role.APPROVER];
  if (isApprovalDecision && !approverRoles.includes(session.user.role)) {
    return NextResponse.json(
      { error: "เฉพาะผู้มีสิทธิ์อนุมัติเท่านั้นที่เปลี่ยนสถานะอนุมัติ/ไม่อนุมัติได้" },
      { status: 403 }
    );
  }

  const hasContentChanges =
    Object.keys(contentRest).length > 0 || (status !== undefined && !isApprovalDecision);

  const editorRoles: Role[] = [Role.ADMIN, Role.SARABAN];
  if (hasContentChanges && !editorRoles.includes(session.user.role)) {
    return NextResponse.json(
      { error: "เฉพาะเจ้าหน้าที่สารบรรณเท่านั้นที่แก้ไขเนื้อหาเอกสารได้" },
      { status: 403 }
    );
  }

  const rest = { ...contentRest, ...(status !== undefined ? { status } : {}) };

  if (approvedById) {
    const approver = await prisma.user.findUnique({ where: { id: approvedById } });
    if (!approver) {
      return NextResponse.json(
        { error: "ไม่พบผู้ใช้ที่ระบุ (approvedById)" },
        { status: 404 }
      );
    }
  }

  try {
    const document = await prisma.document.update({
      where: { id },
      data: {
        ...rest,
        ...(approvedById !== undefined
          ? {
              approvedById,
              approvedAt: approvedById ? new Date() : null,
            }
          : {}),
      },
    });

    const { status: newStatus, ...otherRest } = rest;
    const fieldChanges = diffFields(existing, otherRest);
    if (approvedById !== undefined && approvedById !== existing.approvedById) {
      fieldChanges.approvedById = { from: existing.approvedById, to: approvedById };
    }

    if (Object.keys(fieldChanges).length > 0) {
      await logAction({
        action: AuditAction.DOCUMENT_UPDATE,
        performedBy: session.user.id,
        targetType: "Document",
        targetId: document.id,
        changes: fieldChanges,
      });
    }

    if (newStatus !== undefined && newStatus !== existing.status) {
      await logAction({
        action: AuditAction.DOCUMENT_STATUS_CHANGE,
        performedBy: session.user.id,
        targetType: "Document",
        targetId: document.id,
        changes: { status: { from: existing.status, to: newStatus } },
      });
    }

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error("Failed to update document", error);
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไขเอกสารได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

// ลบเอกสาร (soft delete) จำกัดเฉพาะ ADMIN ตาม docs/modules/module-10-user-management.md
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  const existing = await prisma.document.findFirst({
    where: { id, deletedAt: null },
  });
  if (!existing) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  // soft delete เท่านั้น ห้าม hard delete เพราะ documentNumber ที่ออกไปแล้วต้องไม่ถูกนำกลับมาใช้ซ้ำ
  const document = await prisma.document.update({
    where: { id },
    data: { deletedAt: new Date() },
  });

  await logAction({
    action: AuditAction.DOCUMENT_DELETE,
    performedBy: session.user.id,
    targetType: "Document",
    targetId: document.id,
  });

  return NextResponse.json({ data: document });
}
