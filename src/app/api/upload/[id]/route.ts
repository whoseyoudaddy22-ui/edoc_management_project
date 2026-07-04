import { NextRequest, NextResponse } from "next/server";
import { unlink } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

type RouteParams = { params: Promise<{ id: string }> };

export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  const { id } = await params;

  const attachment = await prisma.attachment.findUnique({ where: { id } });
  if (!attachment) {
    return NextResponse.json({ error: "ไม่พบไฟล์แนบที่ระบุ" }, { status: 404 });
  }

  await prisma.attachment.delete({ where: { id } });

  try {
    await unlink(path.join(process.cwd(), "public", attachment.filePath));
  } catch (error) {
    console.error("Failed to remove attachment file from disk", error);
  }

  return NextResponse.json({ data: attachment });
}
