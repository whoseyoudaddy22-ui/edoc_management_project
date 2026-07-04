import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    include: {
      documentType: { select: { id: true, name: true, code: true } },
      createdBy: { select: { id: true, name: true, email: true, departmentCode: true } },
      approvedBy: { select: { id: true, name: true, email: true } },
      attachments: {
        select: { id: true, fileName: true, fileType: true, fileSize: true, createdAt: true },
        orderBy: { createdAt: "desc" },
      },
    },
  });

  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  return NextResponse.json({ data: document });
}
