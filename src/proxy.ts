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
// /emblem/* IS excluded for a different reason: Next's built-in image optimizer (`next/image`)
// re-fetches local images through this same middleware internally (fetchInternalImage in
// next/dist/server/image-optimizer.js), and that internal request does not carry the viewer's
// session cookie. Without this exclusion the optimizer gets a 307-to-/login redirect instead of
// the image bytes and fails with "The requested resource isn't a valid image." — even though the
// page itself is already behind auth. Never store non-public files under public/emblem.
export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|logo/|emblem/).*)"],
};
