import type { NextAuthConfig } from "next-auth";

const PROTECTED_PREFIXES = ["/dashboard", "/astrologer", "/session", "/reports", "/profile"];

/**
 * Edge-safe base config (no Prisma/bcrypt here) shared between the full
 * auth.ts (used by API routes and server components) and middleware.ts
 * (which runs on the Edge runtime and can't bundle Node-only DB drivers).
 */
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
      const isProtected = PROTECTED_PREFIXES.some((prefix) =>
        request.nextUrl.pathname.startsWith(prefix)
      );
      if (isProtected) return isLoggedIn;
      return true;
    },
  },
} satisfies NextAuthConfig;
