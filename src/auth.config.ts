import type { NextAuthConfig } from "next-auth";

const SESSION_VERSION = process.env.AUTH_SESSION_VERSION ?? "1";

export const authConfig = {
  trustHost: true,
  pages: {
    signIn: "/login",
  },
  callbacks: {
    authorized({ auth, request: { nextUrl } }) {
      const isLoggedIn = !!auth?.user && !!(auth.user as any).id;
      const isLoginPage = nextUrl.pathname === "/login";

      if (!isLoggedIn && !isLoginPage) {
        return false; // Redirect to login
      }
      if (isLoggedIn && isLoginPage) {
        return Response.redirect(new URL("/dashboard", nextUrl));
      }
      return true;
    },
    async jwt({ token, user }) {
      if (user) {
        token.role = (user as any).role;
        token.id = (user as any).id;
        token.projects = (user as any).projects || [];
        token.sessionVersion = SESSION_VERSION;
      } else if (token.sessionVersion !== SESSION_VERSION) {
        return {};
      }
      return token;
    },
    async session({ session, token }) {
      if (token.sessionVersion !== SESSION_VERSION || !token.id) {
        (session as any).user = undefined;
        return session;
      }

      if (session.user) {
        (session.user as any).role = token.role;
        (session.user as any).id = token.id;
        (session.user as any).projects = token.projects || [];
      }
      return session;
    },
  },
  providers: [], // Providers are added in auth.ts
} satisfies NextAuthConfig;
