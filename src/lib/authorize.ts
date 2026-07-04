import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import type { Role } from "@/generated/prisma/enums";

type AuthorizedSession = {
  user: {
    id: string;
    role: Role;
    departmentCode: string | null;
  };
};

type AuthorizeResult =
  | { session: AuthorizedSession; error?: undefined }
  | { session?: undefined; error: NextResponse };

async function requireAuth(): Promise<AuthorizeResult> {
  const session = await auth();

  if (!session?.user) {
    return {
      error: NextResponse.json({ error: "กรุณาเข้าสู่ระบบ" }, { status: 401 }),
    };
  }

  return { session: session as AuthorizedSession };
}

export async function requireRole(allowedRoles: Role[]): Promise<AuthorizeResult> {
  const result = await requireAuth();
  if (result.error) {
    return result;
  }

  if (!allowedRoles.includes(result.session.user.role)) {
    return {
      error: NextResponse.json(
        { error: "คุณไม่มีสิทธิ์เข้าถึงข้อมูลนี้" },
        { status: 403 }
      ),
    };
  }

  return result;
}

export { requireAuth };
