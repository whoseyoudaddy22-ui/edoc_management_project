import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireAuth } from "@/lib/authorize";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";
import { renderDocumentPdf } from "@/lib/pdf-generator";

type RouteParams = { params: Promise<{ id: string }> };

export async function GET(request: NextRequest, { params }: RouteParams) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  const { id } = await params;

  const document = await prisma.document.findFirst({
    where: { id, deletedAt: null },
    select: { id: true, documentNumber: true },
  });
  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  try {
    const pdf = await renderDocumentPdf({
      printUrl: new URL(`/documents/${id}/print`, request.nextUrl.origin).toString(),
      cookieHeader: request.headers.get("cookie"),
    });

    await logAction({
      action: AuditAction.DOCUMENT_PRINT,
      performedBy: session.user.id,
      targetType: "Document",
      targetId: document.id,
    });

    const fileName = `${document.documentNumber.replace(/[\\/:*?"<>|]/g, "-")}.pdf`;
    return new NextResponse(new Uint8Array(pdf), {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="${encodeURIComponent(fileName)}"`,
      },
    });
  } catch (error) {
    console.error("Failed to export document PDF", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างไฟล์ PDF ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
