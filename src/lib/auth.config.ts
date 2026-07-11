import type { NextAuthConfig } from "next-auth";
import { Role } from "@/generated/prisma/enums";
import { prisma } from "@/lib/prisma";

// Since Next.js 16, `src/proxy.ts` (the file that consumes this config in middleware)
// always runs on the Node.js runtime — it cannot opt into the edge runtime at all
// (Next throws build error E1031 if you try). That makes a Prisma call in jwt() below safe.
// Providers are still added separately in `auth.ts` (only used for the Credentials provider
// itself, which never needs to run inside proxy.ts).
export const authConfig = {
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  providers: [],
  callbacks: {
    authorized({ auth, request }) {
      const isLoggedIn = !!auth?.user;
      const { pathname } = request.nextUrl;
      const isOnLogin = pathname.startsWith("/login");
      const isOnPublicAuthPage =
        pathname.startsWith("/forgot-password") || pathname.startsWith("/reset-password");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      if (isOnPublicAuthPage) {
        return true;
      }

      return isLoggedIn;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.departmentCode = user.departmentCode ?? null;
        return token;
      }

      // Not a fresh sign-in: re-validate the existing token against the DB on every
      // request (see security-review 2026-07-11, CWE-613 — JWT strategy is stateless,
      // so without this check a captured token keeps working after logout/deactivation).
      // Returning null here signals next-auth to drop the session (session cookie is
      // cleared and `auth()`/proxy.ts both see an unauthenticated request).
      if (typeof token.id !== "string") return null;

      const dbUser = await prisma.user.findUnique({
        where: { id: token.id },
        select: { isActive: true, sessionInvalidatedAt: true },
      });

      if (!dbUser || !dbUser.isActive) return null;

      const issuedAtMs = typeof token.iat === "number" ? token.iat * 1000 : 0;
      if (dbUser.sessionInvalidatedAt && issuedAtMs < dbUser.sessionInvalidatedAt.getTime()) {
        return null;
      }

      return token;
    },
    session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.departmentCode = (token.departmentCode as string | null) ?? null;
      }
      return session;
    },
  },
} satisfies NextAuthConfig;
