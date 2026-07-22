import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { authConfig } from "@/lib/auth.config";
import { verifyFirebaseIdToken } from "@/lib/firebase-token";
import type { User } from "@prisma/client";

async function findOrCreateFirebaseUser(claims: {
  uid: string;
  email: string;
  name: string;
}): Promise<User> {
  const existingByUid = await prisma.user.findUnique({ where: { firebaseUid: claims.uid } });
  if (existingByUid) return existingByUid;

  // Link to an existing email/password account with the same email, rather than
  // creating a duplicate, if someone signed up with a password before trying Google.
  const existingByEmail = await prisma.user.findUnique({ where: { email: claims.email } });
  if (existingByEmail) {
    return prisma.user.update({
      where: { id: existingByEmail.id },
      data: { firebaseUid: claims.uid },
    });
  }

  return prisma.user.create({
    data: { name: claims.name, email: claims.email, firebaseUid: claims.uid },
  });
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      id: "credentials",
      name: "Email and password",
      credentials: {
        email: { label: "Email" },
        password: { label: "Password", type: "password" },
      },
      authorize: async (credentials) => {
        const email = typeof credentials?.email === "string" ? credentials.email.trim().toLowerCase() : "";
        const password = typeof credentials?.password === "string" ? credentials.password : "";
        if (!email || !password) return null;

        const user = await prisma.user.findUnique({ where: { email } });
        if (!user?.passwordHash) return null; // no password set (e.g. Google-only account)

        const passwordMatches = await bcrypt.compare(password, user.passwordHash);
        if (!passwordMatches) return null;

        return { id: user.id, email: user.email, name: user.name };
      },
    }),
    Credentials({
      id: "firebase-google",
      name: "Google (Firebase)",
      credentials: { idToken: { label: "Firebase ID token" } },
      authorize: async (credentials) => {
        const idToken = typeof credentials?.idToken === "string" ? credentials.idToken : "";
        if (!idToken) return null;

        const claims = await verifyFirebaseIdToken(idToken);
        if (!claims) return null;

        const user = await findOrCreateFirebaseUser(claims);
        return { id: user.id, email: user.email, name: user.name };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user && typeof token.id === "string") {
        session.user.id = token.id;
      }
      return session;
    },
  },
});
