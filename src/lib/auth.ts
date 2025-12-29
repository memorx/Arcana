import NextAuth from "next-auth";
import { PrismaAdapter } from "@auth/prisma-adapter";
import Credentials from "next-auth/providers/credentials";
import Google from "next-auth/providers/google";
import bcrypt from "bcryptjs";
import { prisma } from "./prisma";

export const { handlers, signIn, signOut, auth } = NextAuth({
  adapter: PrismaAdapter(prisma),
  session: { strategy: "jwt" },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    Google({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET,
    }),
    Credentials({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email y contraseña son requeridos");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email as string },
        });

        if (!user || !user.password) {
          throw new Error("Credenciales inválidas");
        }

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password
        );

        if (!isValid) {
          throw new Error("Credenciales inválidas");
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      if (user) {
        token.id = user.id;
        // Fetch user data on login/signup
        const dbUser = await prisma.user.findUnique({
          where: { id: user.id },
          select: {
            freeReadingsLeft: true,
            credits: true,
          },
        });
        if (dbUser) {
          token.freeReadingsLeft = dbUser.freeReadingsLeft;
          token.credits = dbUser.credits;
        }
      }
      // Refresh user data when session is updated
      if (trigger === "update" && token.id) {
        const dbUser = await prisma.user.findUnique({
          where: { id: token.id as string },
          select: {
            freeReadingsLeft: true,
            credits: true,
          },
        });
        if (dbUser) {
          token.freeReadingsLeft = dbUser.freeReadingsLeft;
          token.credits = dbUser.credits;
        }
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && token.id) {
        session.user.id = token.id as string;
        // Use cached values from JWT (no DB query per request)
        session.user.freeReadingsLeft = (token.freeReadingsLeft as number) ?? 0;
        session.user.credits = (token.credits as number) ?? 0;
      }
      return session;
    },
  },
});
