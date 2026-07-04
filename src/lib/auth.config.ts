import type { NextAuthConfig } from "next-auth";
import { Role } from "@/generated/prisma/enums";

// Edge-safe config: no Prisma/bcrypt here so it can run in middleware.
// Providers are added in `auth.ts`, which is only used in Node.js runtime
// (API route handlers, server components, server actions).
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
      const isOnLogin = request.nextUrl.pathname.startsWith("/login");

      if (isOnLogin) {
        if (isLoggedIn) {
          return Response.redirect(new URL("/dashboard", request.nextUrl));
        }
        return true;
      }

      return isLoggedIn;
    },
    jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role as Role;
        token.departmentCode = user.departmentCode ?? null;
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
