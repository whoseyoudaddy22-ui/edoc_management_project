import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/dashboard-stats";
import { requireAuth } from "@/lib/authorize";

export async function GET() {
  const authResult = await requireAuth();
  if (authResult.error) {
    return authResult.error;
  }

  const stats = await getDashboardStats();
  return NextResponse.json({ data: stats });
}
