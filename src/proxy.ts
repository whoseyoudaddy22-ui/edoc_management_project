import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

const { auth } = NextAuth(authConfig);

export default auth;

// /api/* excluded entirely: API routes enforce auth themselves via requireAuth()/requireRole()
// (src/lib/authorize.ts) and must return JSON 401/403, not an HTML redirect to /login.
// /uploads/* is intentionally NOT excluded here: those are static files served by Next.js from
// public/uploads, and gating them through this middleware is what requires a logged-in session
// before an attachment can be downloaded (see security-review Finding #4).
// /logo/* IS excluded: public branding assets (ตราวิทยาลัย) must load on the login page itself,
// so they cannot sit behind the auth redirect — never store non-public files under public/logo.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo/).*)"],
};
