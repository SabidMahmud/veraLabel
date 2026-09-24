// Edge-compatible auth config (no MongoDB imports)
import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";

// This config is used ONLY in middleware (Edge Runtime)
// It doesn't include the authorize function that requires MongoDB
export const authConfig = {
    providers: [
        Credentials({
            name: "Credentials",
            credentials: {
                email: { label: "Email", type: "email" },
                password: { label: "Password", type: "password" },
            },
            // In edge runtime, we can't access MongoDB
            // The actual authorization happens in the main auth.ts
            async authorize() {
                return null;
            },
        }),
    ],
    callbacks: {
        async jwt({ token, user }) {
            if (user) {
                token.id = user.id;
                token.role = (user as { id: string; role: string }).role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                (session.user as { id?: string; role?: string }).id = token.id as string;
                (session.user as { id?: string; role?: string }).role = token.role as string;
            }
            return session;
        },
        // Used by middleware to check auth
        authorized({ auth, request }) {
            const isLoggedIn = !!auth?.user;
            const { pathname } = request.nextUrl;
            const bypass = process.env.AUTH_BYPASS === "true";

            if (bypass) return true;

            const publicPaths = ["/login", "/api/auth"];
            const isPublicPath = publicPaths.some(p => pathname.startsWith(p));

            if (isPublicPath) return true;
            if (isLoggedIn) return true;

            return false; // Redirect to login
        },
    },
    pages: {
        signIn: "/login",
    },
    session: {
        strategy: "jwt",
    },
    secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { auth: authMiddleware, handlers } = NextAuth(authConfig);
