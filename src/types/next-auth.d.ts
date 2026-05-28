import NextAuth, { type DefaultSession } from 'next-auth';

declare module 'next-auth' {
  interface User {
    id: string;
    role: 'user' | 'technician';
    projects: string[];
  }

  interface Session {
    user: User & {
      name: string;
    } & DefaultSession['user'];
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string;
    role: 'user' | 'technician';
    projects: string[];
    sessionVersion: string;
  }
}
