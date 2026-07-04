import { NextRequest, NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { Prisma } from "@/generated/prisma/client";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { createUserSchema, listUsersQuerySchema } from "@/lib/validations/user";

const userListSelect = {
  id: true,
  name: true,
  email: true,
  role: true,
  departmentCode: true,
  isActive: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export async function GET(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  const parsedQuery = listUsersQuerySchema.safeParse(
    Object.fromEntries(request.nextUrl.searchParams)
  );

  if (!parsedQuery.success) {
    return NextResponse.json(
      { error: "พารามิเตอร์ค้นหาไม่ถูกต้อง", issues: parsedQuery.error.flatten() },
      { status: 400 }
    );
  }

  const { search, role, isActive, page, pageSize } = parsedQuery.data;

  const where: Prisma.UserWhereInput = {
    ...(role ? { role } : {}),
    ...(isActive !== undefined ? { isActive } : {}),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: "insensitive" } },
            { email: { contains: search, mode: "insensitive" } },
          ],
        }
      : {}),
  };

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
      select: userListSelect,
      orderBy: { createdAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({
    data: users,
    pagination: {
      page,
      pageSize,
      total,
      totalPages: Math.ceil(total / pageSize),
    },
  });
}

export async function POST(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "รูปแบบ JSON ไม่ถูกต้อง" }, { status: 400 });
  }

  const parsed = createUserSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json(
      { error: "ข้อมูลไม่ถูกต้อง", issues: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const input = parsed.data;

  const existing = await prisma.user.findUnique({ where: { email: input.email } });
  if (existing) {
    return NextResponse.json({ error: "อีเมลนี้ถูกใช้งานแล้ว" }, { status: 409 });
  }

  const passwordHash = await bcrypt.hash(input.password, 10);

  try {
    const user = await prisma.user.create({
      data: {
        name: input.name,
        email: input.email,
        passwordHash,
        role: input.role,
        departmentCode: input.departmentCode,
      },
      select: userListSelect,
    });

    return NextResponse.json({ data: user }, { status: 201 });
  } catch (error) {
    console.error("Failed to create user", error);
    return NextResponse.json(
      { error: "ไม่สามารถสร้างผู้ใช้ได้ กรุณาลองใหม่อีกครั้ง" },
      { status: 500 }
    );
  }
}
