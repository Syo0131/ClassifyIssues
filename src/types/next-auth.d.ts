import { DefaultSession, DefaultUser } from 'next-auth';
import { DefaultJWT } from 'next-auth/jwt';

// Extend the NextAuth interfaces
declare module 'next-auth' {
  interface Session {
    user: {
      id: number;
      role: 'user' | 'technician' | 'admin';
      projects: string[];
    } & DefaultSession['user'];
  }

  interface User extends DefaultUser {
    id: number;
    role: 'user' | 'technician' | 'admin';
    projects: string[];
  }
}

// Extend the JWT interface
declare module 'next-auth/jwt' {
  interface JWT extends DefaultJWT {
    id: number;
    role: 'user' | 'technician' | 'admin';
    projects: string[];
    sessionVersion?: string; // Add sessionVersion if it's part of your token
  }
}
