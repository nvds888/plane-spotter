import 'next-auth';

declare module 'next-auth' {
  interface Session {
    user: {
      email: string;
      role: string;
    };
  }

  interface JWT {
    user?: {
      email: string;
      role: string;
    };
  }

  interface User {
    email: string;
    role: string;
  }
}