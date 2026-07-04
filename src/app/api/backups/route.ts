import { NextResponse } from "next/server";
import { Role } from "@/generated/prisma/enums";
import { requireRole } from "@/lib/authorize";
import { listBackups, runManualBackup } from "@/lib/backup";

export async function GET() {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  const backups = await listBackups();
  return NextResponse.json({ data: backups });
}

export async function POST() {
  const authResult = await requireRole([Role.ADMIN]);
  if (authResult.error) {
    return authResult.error;
  }

  const results = await runManualBackup();
  const backups = await listBackups();

  return NextResponse.json({ results, data: backups });
}
