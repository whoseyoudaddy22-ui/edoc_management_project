import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireRole } from "@/lib/authorize";
import { Role } from "@/generated/prisma/enums";

// ค่าที่เคยกรอกไว้แล้วทั้งระบบ (distinct) สำหรับ autocomplete ในฟอร์มสร้างเอกสาร — เช่น
// ส่วนราชการ/เรื่อง/เรียน ที่เคยมีมาก่อน และตำแหน่งที่มีอยู่จริงในทำเนียบผู้ใช้งาน
// ไม่ใช่ตารางแยกต่างหาก อ่านจากข้อมูลจริงใน Document/User โดยตรง
const LOOKUP_FIELDS = ["departmentName", "title", "recipient", "position"] as const;
type LookupField = (typeof LOOKUP_FIELDS)[number];

function isLookupField(value: string | null): value is LookupField {
  return value !== null && (LOOKUP_FIELDS as readonly string[]).includes(value);
}

const MAX_RESULTS = 20;

async function fetchDistinctValues(field: LookupField, search: string | undefined) {
  const contains = search ? { contains: search, mode: "insensitive" as const } : {};

  if (field === "position") {
    const rows = await prisma.user.findMany({
      where: { position: { not: null, ...contains } },
      distinct: ["position"],
      select: { position: true },
      orderBy: { position: "asc" },
      take: MAX_RESULTS,
    });
    return rows.map((row) => row.position);
  }

  switch (field) {
    case "departmentName": {
      const rows = await prisma.document.findMany({
        where: { deletedAt: null, departmentName: { not: null, ...contains } },
        distinct: ["departmentName"],
        select: { departmentName: true },
        orderBy: { departmentName: "asc" },
        take: MAX_RESULTS,
      });
      return rows.map((row) => row.departmentName);
    }
    case "title": {
      const rows = await prisma.document.findMany({
        where: { deletedAt: null, title: { ...contains } },
        distinct: ["title"],
        select: { title: true },
        orderBy: { title: "asc" },
        take: MAX_RESULTS,
      });
      return rows.map((row) => row.title);
    }
    case "recipient": {
      const rows = await prisma.document.findMany({
        where: { deletedAt: null, recipient: { ...contains } },
        distinct: ["recipient"],
        select: { recipient: true },
        orderBy: { recipient: "asc" },
        take: MAX_RESULTS,
      });
      return rows.map((row) => row.recipient);
    }
  }
}

export async function GET(request: NextRequest) {
  const authResult = await requireRole([Role.ADMIN, Role.SARABAN]);
  if (authResult.error) {
    return authResult.error;
  }

  const field = request.nextUrl.searchParams.get("field");
  if (!isLookupField(field)) {
    return NextResponse.json(
      { error: `field ต้องเป็นหนึ่งใน: ${LOOKUP_FIELDS.join(", ")}` },
      { status: 400 }
    );
  }

  const search = request.nextUrl.searchParams.get("search")?.trim() || undefined;
  const rows = await fetchDistinctValues(field, search);
  const values = rows.filter((value): value is string => Boolean(value));

  return NextResponse.json({ data: values });
}
