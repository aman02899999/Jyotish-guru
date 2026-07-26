import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Next.js 16 renamed the `middleware` file convention to `proxy`; it always
// runs on the Node.js runtime (not Edge), which is why this can safely wrap
// the full NextAuth `authorized` callback check.
export const proxy = NextAuth(authConfig).auth;

export const config = {
  matcher: ["/dashboard/:path*", "/astrologer/:path*", "/session/:path*", "/reports/:path*", "/profile/:path*"],
};
