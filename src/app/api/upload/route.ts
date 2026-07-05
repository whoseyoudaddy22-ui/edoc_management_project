import { NextRequest, NextResponse } from "next/server";
import { mkdir, writeFile } from "fs/promises";
import path from "path";
import { randomUUID } from "crypto";
import { prisma } from "@/lib/prisma";
import {
  MAX_FILE_SIZE_BYTES,
  formatFileSize,
  getFileExtension,
  isAllowedFileExtension,
} from "@/lib/upload";
import { requireAuth } from "@/lib/authorize";
import { logAction } from "@/lib/audit";
import { AuditAction } from "@/generated/prisma/enums";

export async function GET(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  const documentId = request.nextUrl.searchParams.get("documentId");

  if (!documentId) {
    return NextResponse.json({ error: "กรุณาระบุเอกสาร (documentId)" }, { status: 400 });
  }

  const attachments = await prisma.attachment.findMany({
    where: { documentId },
    orderBy: { createdAt: "desc" },
  });

  return NextResponse.json({ data: attachments });
}

export async function POST(request: NextRequest) {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }
  const { session } = authResult;

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: "รูปแบบข้อมูลไม่ถูกต้อง" }, { status: 400 });
  }

  const documentId = formData.get("documentId");
  const uploadedById = formData.get("uploadedById");
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (typeof documentId !== "string" || !documentId) {
    return NextResponse.json({ error: "กรุณาเลือกเอกสารที่ต้องการแนบไฟล์" }, { status: 400 });
  }

  if (typeof uploadedById !== "string" || !uploadedById) {
    return NextResponse.json({ error: "กรุณาระบุผู้อัปโหลด" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด" }, { status: 400 });
  }

  const [document, uploader] = await Promise.all([
    prisma.document.findFirst({ where: { id: documentId, deletedAt: null } }),
    prisma.user.findUnique({ where: { id: uploadedById } }),
  ]);

  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  if (!uploader) {
    return NextResponse.json({ error: "ไม่พบผู้ใช้ที่ระบุ (uploadedById)" }, { status: 404 });
  }

  for (const file of files) {
    if (!isAllowedFileExtension(file.name)) {
      return NextResponse.json(
        { error: `ไม่รองรับไฟล์ประเภทนี้: ${file.name}` },
        { status: 400 }
      );
    }
    if (file.size > MAX_FILE_SIZE_BYTES) {
      return NextResponse.json(
        {
          error: `ไฟล์ ${file.name} มีขนาดเกิน ${formatFileSize(MAX_FILE_SIZE_BYTES)}`,
        },
        { status: 400 }
      );
    }
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", documentId);
  await mkdir(uploadDir, { recursive: true });

  try {
    const created = await Promise.all(
      files.map(async (file) => {
        const extension = getFileExtension(file.name);
        const storedFileName = `${randomUUID()}${extension}`;
        const buffer = Buffer.from(await file.arrayBuffer());
        await writeFile(path.join(uploadDir, storedFileName), buffer);

        return prisma.attachment.create({
          data: {
            documentId,
            fileName: file.name,
            filePath: `/uploads/${documentId}/${storedFileName}`,
            fileType: extension.replace(".", ""),
            fileSize: file.size,
            uploadedById,
          },
        });
      })
    );

    await Promise.all(
      created.map((attachment) =>
        logAction({
          action: AuditAction.ATTACHMENT_UPLOAD,
          performedBy: session.user.id,
          targetType: "Attachment",
          targetId: attachment.id,
          changes: { fileName: { from: null, to: attachment.fileName } },
        })
      )
    );

    return NextResponse.json({ data: created }, { status: 201 });
  } catch (error) {
    console.error("Failed to upload attachment", error);
    return NextResponse.json(
      { error: "ไม่สามารถอัปโหลดไฟล์ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
