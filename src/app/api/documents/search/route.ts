import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { buildDocumentSearchWhere } from "@/lib/document-search";
import { documentSearchQuerySchema } from "@/lib/validations/document";

export async function GET(request: NextRequest) {
  const parsedQuery = documentSearchQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "พารามิเตอร์ค้นหาไม่ถูกต้อง", issues: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  const { page, pageSize, ...searchParams } = parsedQuery.data;
  const where = buildDocumentSearchWhere(searchParams);

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
