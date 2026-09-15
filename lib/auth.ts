import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { connectDB } from "./db";
import User from "../models/User";

declare module "next-auth" {
  interface User {
    id: string;
    role: string;
    organizationName?: string;
  }

  interface Session {
    user: {
      id: string;
      role: string;
      name?: string | null;
      email?: string | null;
      image?: string | null;
      organizationName?: string;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id?: string;
    role?: string;
    organizationName?: string;
  }
}

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        await connectDB();

        const normalizedEmail = credentials.email.trim().toLowerCase();
        const user = await User.findOne({ email: normalizedEmail });
        if (!user || !user.passwordHash) {
          return null;
        }

        const isPasswordValid = await bcrypt.compare(
          credentials.password,
          user.passwordHash
        );

        if (!isPasswordValid) {
          return null;
        }

        return {
          id: user._id.toString(),
          email: user.email,
          name: user.name,
          role: user.role,
          organizationName: user.organizationName,
          greenCreditBalance: user.greenCreditBalance || 0,
        };
      },
    }),
  ],
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.organizationName = user.organizationName;
        token.greenCreditBalance = (user as any).greenCreditBalance;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.organizationName = token.organizationName as string;
        (session.user as any).greenCreditBalance = token.greenCreditBalance as number;
      }
      return session;
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    "ciirs-marketplace-production-jwt-auth-secret-key-32chars",
};
