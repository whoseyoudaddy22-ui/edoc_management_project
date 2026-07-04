import { NextRequest, NextResponse } from "next/server";
import { Prisma } from "@/generated/prisma/client";
import { prisma } from "@/lib/prisma";
import { createDocumentWithAutoNumber } from "@/lib/document-number";
import {
  createDocumentSchema,
  listDocumentsQuerySchema,
} from "@/lib/validations/document";

export async function GET(request: NextRequest) {
  const parsedQuery = listDocumentsQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "พารามิเตอร์ค้นหาไม่ถูกต้อง", issues: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  const { search, status, documentTypeId, page, pageSize } = parsedQuery.data;

  const where: Prisma.DocumentWhereInput = {
    deletedAt: null,
    ...(status ? { status } : {}),
    ...(documentTypeId ? { documentTypeId } : {}),
    ...(search
      ? {
          OR: [
            { documentNumber: { contains: search, mode: "insensitive" } },
            { title: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [documents, total] = await Promise.all([
    prisma.document.findMany({
      where,
      include: {
        documentType: true,
        createdBy: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.document.count({ where }),
  ]);

  return NextResponse.json({
    data: documents,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = createDocumentSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  const [creator, documentType] = await Promise.all([
    prisma.user.findUnique({ where: { id: input.createdById } }),
    prisma.documentType.findUnique({ where: { id: input.documentTypeId } }),
  ]);

  if (!creator) {
    return NextResponse.json(
      { error: "ไม่พบผู้ใช้ที่ระบุ (createdById)" },
      { status: 404 }
    );
  }

  const departmentCode = creator.departmentCode;
  if (!departmentCode) {
    return NextResponse.json(
      { error: "ผู้ใช้นี้ยังไม่ได้กำหนดรหัสหน่วยงาน (departmentCode)" },
      { status: 400 }
    );
  }

  if (!documentType || !documentType.isActive) {
    return NextResponse.json(
      { error: "ไม่พบประเภทเอกสารที่ระบุ หรือประเภทเอกสารถูกปิดใช้งาน" },
      { status: 404 }
    );
  }

  try {
    const document = await createDocumentWithAutoNumber(
      departmentCode,
      documentType.code,
      ({ documentNumber, buddhistYear, runningNumber }) => ({
        documentNumber,
        buddhistYear,
        runningNumber,
        departmentCode,
        documentTypeCode: documentType.code,
        documentDate: input.documentDate,
        title: input.title,
        priority: input.priority,
        recipient: input.recipient,
        sender: input.sender,
        referenceNumber: input.referenceNumber,
        content: input.content,
        signerName: input.signerName,
        signerPosition: input.signerPosition,
        documentType: { connect: { id: documentType.id } },
        createdBy: { connect: { id: creator.id } },
      })
    );

    return NextResponse.json({ data: document }, { status: 201 });
  } catch (error) {
    console.error("Failed to create document", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างเอกสารได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
