import type { NextAuthConfig } from "next-auth";

const SESSION_VERSION = process.env.AUTH_SESSION_VERSION ?? "1";
const AUTH_BASE_URL = process.env.AUTH_URL || process.env.NEXTAUTH_URL;
const AUTH_SESSION_MAX_AGE = Number(process.env.AUTH_SESSION_MAX_AGE ?? 60 * 60 * 8);

export const authConfig = {
  trustHost: true,
  session: {
    strategy: "jwt",
    maxAge: AUTH_SESSION_MAX_AGE,
  },
  jwt: {
    maxAge: AUTH_SESSION_MAX_AGE,
  },
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isExpired = !!auth?.expires && new Date(auth.expires).getTime() <= Date.now();
      const isLoggedIn = !!auth?.user && !!auth.user.id && !isExpired;
      const isLoginPage = nextUrl.pathname === "/login";
      const baseUrl = AUTH_BASE_URL || nextUrl.origin;

      if (!isLoggedIn && !isLoginPage) {
        return Response.redirect(new URL("/login", baseUrl));
      }
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard", baseUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      const nowInSeconds = Math.floor(Date.now() / 1000);
      if (typeof token.exp === "number" && token.exp <= nowInSeconds) {
        return {};
      }

      if (user) {
        token.role = user.role;
        token.id = user.id;
        token.projects = user.projects || [];
        token.sessionVersion = SESSION_VERSION;
      } else if (token.sessionVersion !== SESSION_VERSION) {
        return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sessionVersion !== SESSION_VERSION || !token.id) {
        return { ...session, user: undefined } as any;
      }

      if (session.user) {
        session.user.role = token.role as 'user' | 'technician';
        session.user.id = token.id as string;
        session.user.projects = (token.projects as string[]) || [];
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
