import NextAuth from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import type { NextAuthOptions } from 'next-auth';

declare module "next-auth" {
  interface User {
    id: string
    role: string
    username?: string
    algorandAddress?: string 
  }
  
  interface Session {
    user: {
      id: string
      email?: string
      username?: string
      role: string
      algorandAddress?: string
    }
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string
    role: string
    username?: string
    algorandAddress?: string 
  }
}

export const authOptions: NextAuthOptions = {
  secret: process.env.NEXTAUTH_SECRET as string,
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: '/auth/signin',
    error: '/auth/error',
  },
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: "Username or Email", type: "text" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          throw new Error('Please provide both username/email and password');
        }

        try {
          const response = await fetch('https://plane-spotter-backend.onrender.com/api/auth/login', {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Accept': 'application/json'
            },
            body: JSON.stringify({
              login: credentials.login,
              password: credentials.password
            }),
          });

          const data = await response.json();
          
          console.log('Login response status:', response.status);
          console.log('Login response data:', data);

          if (!response.ok) {
            throw new Error(data.error || 'Authentication failed');
          }

          if (data.success && data.user) {
            return {
              id: data.user.id,
              email: data.user.email,
              username: data.user.username,
              role: data.user.role || 'user'
            };
          } else {
            throw new Error('Invalid response format from server');
          }
        } catch (error) {
          console.error('Authorization error:', error);
          throw error instanceof Error ? error : new Error('Authentication failed');
        }
      }
    })
  ],

  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.username = user.username;
        token.algorandAddress = user.algorandAddress; 
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id;
        session.user.role = token.role;
        session.user.username = token.username;
        session.user.algorandAddress = token.algorandAddress;
      }
      return session;
    }
  },

  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);