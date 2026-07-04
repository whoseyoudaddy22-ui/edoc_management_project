import { NextResponse } from "next/server";
import { getDashboardStats } from "@/lib/dashboard-stats";

export async function GET() {
  const stats = await getDashboardStats();
  return NextResponse.json({ data: stats });
}
