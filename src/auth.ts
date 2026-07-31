import NextAuth from "next-auth";
import Credentials from "next-auth/providers/credentials";
import { authConfig } from "./auth.config";
import { getUserByUsername, getUserActiveStatusById } from "./lib/db";
import bcrypt from "bcryptjs";

// In-memory cache for active-status checks, scoped to the Node process.
// Keyed by user id; entries expire after ACTIVE_STATUS_TTL_MS.
const ACTIVE_STATUS_TTL_MS = 60 * 1000;
const activeStatusCache = new Map<number, { isActive: boolean; checkedAt: number }>();

/** El único parámetro que `authConfig.callbacks.session` realmente recibe aquí (estrategia "jwt"). */
type SessionCallbackArgs = Parameters<NonNullable<typeof authConfig.callbacks.session>>[0];

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
  // Auth.js registra por consola CUALQUIER AuthError con stack incluido, sin
  // distinguir un fallo real de un simple "contraseña incorrecta"
  // (CredentialsSignin, el resultado normal de que authorize() devuelva null).
  // Silenciamos sólo ese caso esperado; todo lo demás sigue logueándose igual.
  logger: {
    error(error) {
      if (error.name === 'CredentialsSignin') return;
      console.error(`[auth][error] ${error.name}: ${error.message}`);
    },
  },
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
          id: user.id,
          name: user.username,
          role: user.role,
          projects: user.projects || [],
        };
      },
    }),
  ],
  callbacks: {
    ...authConfig.callbacks,
    // Override session callback in the Node runtime to enforce active-status
    // (the base callback in auth.config.ts is edge-safe and shape-only).
    async session({ session, token }) {
      // authConfig.callbacks.session está tipado para cubrir tanto la
      // estrategia "database" (requiere `user`) como "jwt" (`session, token`),
      // porque NextAuthConfig no sabe de antemano cuál usamos. Esta app sólo
      // usa "jwt" (ver session.strategy en auth.config.ts), así que el
      // argumento real siempre encaja en esa rama; se lo indicamos al tipo con
      // el propio tipo de parámetro de la función en vez de `any`.
      const shaped = await authConfig.callbacks.session!(
        { session, token } as SessionCallbackArgs
      );
      const userId = Number(token.id);
      if (!userId || !shaped?.user) return shaped;

      const stillActive = await isUserStillActive(userId);
      if (!stillActive) {
        activeStatusCache.delete(userId);
        return { ...shaped, user: undefined };
      }
      return shaped;
    },
  },
});
