import { NextRequest } from 'next/server';
import NextAuth from 'next-auth';
import GoogleProvider from 'next-auth/providers/google';

function getAuthOptions() {
  return {
    providers: [
      GoogleProvider({
        clientId: process.env.GOOGLE_CLIENT_ID ?? '',
        clientSecret: process.env.GOOGLE_CLIENT_SECRET ?? '',
      }),
    ],
    callbacks: {
      async session({ session, token }: any) {
        if (session.user && token.sub) {
          session.user.id = token.sub;
        }
        return session;
      },
    },
    pages: { signIn: '/' },
    secret: process.env.NEXTAUTH_SECRET ?? 'fallback-secret',
  };
}

export async function GET(req: NextRequest) {
  return NextAuth(req as any, getAuthOptions() as any);
}

export async function POST(req: NextRequest) {
  return NextAuth(req as any, getAuthOptions() as any);
}