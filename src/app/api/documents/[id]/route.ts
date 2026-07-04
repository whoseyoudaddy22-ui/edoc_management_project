import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { updateDocumentSchema } from "@/lib/validations/document";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
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

export async function PUT(request: NextRequest, { params }: RouteParams) {
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

  const { approvedById, ...rest } = parsed.data;

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

    return NextResponse.json({ data: document });
  } catch (error) {
    console.error("Failed to update document", error);
    return NextResponse.json(
      { error: "ไม่สามารถแก้ไขเอกสารได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
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

  return NextResponse.json({ data: document });
}
