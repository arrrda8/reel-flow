import NextAuth from "next-auth";
import { authConfig } from "@/lib/auth.config";

// Use lightweight auth config (no DB imports) for middleware
const { auth } = NextAuth(authConfig);

export default auth;

export const config = {
  matcher: [
    "/((?!_next/static|_next/image|favicon.ico|api/auth|api/storage/public).*)",
  ],
};
