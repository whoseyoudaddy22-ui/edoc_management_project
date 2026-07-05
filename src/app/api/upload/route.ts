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
  isDangerousFileContent,
  matchesDeclaredFileType,
} from "@/lib/upload";
import { requireAuth, requireRole } from "@/lib/authorize";
import { Role } from "@/generated/prisma/enums";
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

// อัปโหลดไฟล์แนบได้เฉพาะ ADMIN/SARABAN ตาม docs/modules/module-10-user-management.md
export async function POST(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN, Role.SARABAN]);
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
  const files = formData.getAll("files").filter((value): value is File => value instanceof File);

  if (typeof documentId !== "string" || !documentId) {
    return NextResponse.json({ error: "กรุณาเลือกเอกสารที่ต้องการแนบไฟล์" }, { status: 400 });
  }

  if (files.length === 0) {
    return NextResponse.json({ error: "กรุณาเลือกไฟล์ที่ต้องการอัปโหลด" }, { status: 400 });
  }

  // ผู้อัปโหลดต้องเป็นผู้ใช้ที่ login อยู่เท่านั้น (จาก session) ห้ามรับค่านี้จาก client (IDOR)
  const document = await prisma.document.findFirst({ where: { id: documentId, deletedAt: null } });

  if (!document) {
    return NextResponse.json({ error: "ไม่พบเอกสารที่ระบุ" }, { status: 404 });
  }

  // อ่าน buffer ครั้งเดียวต่อไฟล์ ใช้ทั้งตรวจ magic bytes และเขียนลงดิสก์ทีหลัง
  const filesWithBuffer: { file: File; buffer: Buffer; extension: string }[] = [];

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

    const extension = getFileExtension(file.name);
    const buffer = Buffer.from(await file.arrayBuffer());

    // ตรวจ content จริงของไฟล์ (magic bytes) เสริมจากนามสกุล กันไฟล์ execute ได้ที่แค่เปลี่ยนนามสกุล
    // ปลอมเป็นประเภทที่อนุญาต (CWE-434)
    if (isDangerousFileContent(buffer) || !matchesDeclaredFileType(buffer, extension)) {
      return NextResponse.json(
        { error: `ไฟล์ ${file.name} มีเนื้อหาไม่ตรงกับประเภทไฟล์ที่ระบุ หรือเป็นไฟล์ที่ไม่อนุญาต` },
        { status: 400 }
      );
    }

    filesWithBuffer.push({ file, buffer, extension });
  }

  const uploadDir = path.join(process.cwd(), "public", "uploads", documentId);
  await mkdir(uploadDir, { recursive: true });

  try {
    const created = await Promise.all(
      filesWithBuffer.map(async ({ file, buffer, extension }) => {
        const storedFileName = `${randomUUID()}${extension}`;
        await writeFile(path.join(uploadDir, storedFileName), buffer);

        return prisma.attachment.create({
          data: {
            documentId,
            fileName: file.name,
            filePath: `/uploads/${documentId}/${storedFileName}`,
            fileType: extension.replace(".", ""),
            fileSize: file.size,
            uploadedById: session.user.id,
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
