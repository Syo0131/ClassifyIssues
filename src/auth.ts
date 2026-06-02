import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { getUserByUsername, getUserActiveStatusById } from "./lib/db";
import bcrypt from "bcryptjs";

// In-memory cache for active-status checks, scoped to the Node process.
// Keyed by user id; entries expire after ACTIVE_STATUS_TTL_MS.
const ACTIVE_STATUS_TTL_MS = 60 * 1000;
const activeStatusCache = new Map<number, { isActive: boolean; checkedAt: number }>();

async function isUserStillActive(userId: number): Promise<boolean> {
  const now = Date.now();
  const cached = activeStatusCache.get(userId);
  if (cached && now - cached.checkedAt < ACTIVE_STATUS_TTL_MS) {
    return cached.isActive;
  }
  const isActive = await getUserActiveStatusById(userId);
  // null = user no longer exists; treat as inactive to force re-login.
  activeStatusCache.set(userId, { isActive: isActive === true, checkedAt: now });
  return isActive === true;
}

export const { handlers, auth, signIn, signOut } = NextAuth({
  ...authConfig,
  providers: [
    Credentials({
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) return null;

        const user = await getUserByUsername(credentials.username as string);
        if (!user || !user.password_hash) return null;

        // Block inactive users from logging in.
        if (user.is_active === false) return null;

        const isValid = await bcrypt.compare(
          credentials.password as string,
          user.password_hash
        );

        if (!isValid) return null;

        return {
          id: user.id.toString(),
          name: user.username,
          role: user.role,
          projects: user.projects,
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Override session callback in the Node runtime to enforce active-status
    // (the base callback in auth.config.ts is edge-safe and shape-only).
    async session({ session, token }) {
      const shaped = await authConfig.callbacks.session!({ session, token } as any);
      const userId = Number((token as any).id);
      if (!userId || !shaped?.user) return shaped;

      const stillActive = await isUserStillActive(userId);
      if (!stillActive) {
        activeStatusCache.delete(userId);
        return { ...(shaped as any), user: undefined } as any;
      }
      return shaped;
    },
  },
});
