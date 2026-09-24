import type { NextAuthConfig } from "next-auth";
import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import connectDB from "@/lib/mongodb";
import User from "@/models/User";

export const authConfig = {
  trustHost: true,
  providers: [
    Credentials({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          console.log('[Authorize Failed] Missing email or password credentials');
          return null;
        }

        try {
          console.log('[Authorize] Connecting to DB...');
          await connectDB();

          const emailLower = (credentials.email as string).toLowerCase();
          console.log('[Authorize] Looking up user by email:', emailLower);

          const user = await User.findOne({
            email: emailLower,
          }).select("+password");

          if (!user) {
            console.log('[Authorize Failed] User not found in DB for email:', emailLower);
            return null;
          }

          if (!user.isActive) {
            console.log('[Authorize Failed] User account is inactive:', emailLower);
            return null;
          }

          const isPasswordValid = await user.comparePassword(
            credentials.password as string
          );

          if (!isPasswordValid) {
            console.log('[Authorize Failed] Invalid password for email:', emailLower);
            return null;
          }

          console.log('[Authorize Success] Returning user:', { id: user._id.toString(), email: user.email, role: user.role });

          return {
            id: user._id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
          };
        } catch (error) {
          console.error("[Authorize Error] Exception during authorization:", error);
          return null;
        }
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        console.log('[JWT Callback] User object:', { id: user.id, email: user.email, role: (user as { role?: string }).role });
        token.id = user.id;
        token.role = (user as { id: string; role: string }).role;
        console.log('[JWT Callback] Token after update:', { id: token.id, role: token.role });
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
  },
  pages: {
    signIn: "/login",
  },
  session: {
    strategy: "jwt",
  },
  cookies: {
    sessionToken: {
      name: process.env.NODE_ENV === 'production' ? '__Secure-authjs.session-token' : 'authjs.session-token',
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: process.env.NODE_ENV === 'production',
      },
    },
  },
  secret: process.env.NEXTAUTH_SECRET,
} satisfies NextAuthConfig;

export const { handlers, auth, signIn, signOut } = NextAuth(authConfig);
