import "server-only";
import type { User } from "@prisma/client";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

/** Resolves the authenticated user's full DB row, or null if not logged in. */
export async function getCurrentUser() {
  const session = await auth();
  const userId = session?.user?.id;
  if (!userId) return null;
  return prisma.user.findUnique({ where: { id: userId } });
}

export type SafeUser = Omit<User, "passwordHash">;

/** Strips the password hash before a User row is sent to the client. */
export function toSafeUser(user: User): SafeUser {
  const safeUser: Partial<User> = { ...user };
  delete safeUser.passwordHash;
  return safeUser as SafeUser;
}
