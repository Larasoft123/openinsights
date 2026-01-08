import NextAuth from 'next-auth';
import { PrismaAdapter } from '@auth/prisma-adapter';
import Credentials from 'next-auth/providers/credentials';
import Google from 'next-auth/providers/google';
import GitHub from 'next-auth/providers/github';
import bcrypt from 'bcryptjs';
import { prisma } from '@/lib/db';
import type { Adapter } from 'next-auth/adapters';
import './types';

export const { handlers, auth, signIn, signOut } = NextAuth({
  adapter: PrismaAdapter(prisma) as Adapter,
  session: {
    strategy: 'jwt',
  },
  pages: {
    signIn: '/login',
    error: '/login',
  },
  providers: [
    Google({
      clientId: process.env.AUTH_GOOGLE_ID,
      clientSecret: process.env.AUTH_GOOGLE_SECRET,
    }),
    GitHub({
      clientId: process.env.AUTH_GITHUB_ID,
      clientSecret: process.env.AUTH_GITHUB_SECRET,
    }),
    Credentials({
      name: 'credentials',
      credentials: {
        email: { label: 'Email', type: 'email' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          return null;
        }

        const email = credentials.email as string;
        const password = credentials.password as string;

        const user = await prisma.user.findUnique({
          where: { email },
        });

        if (!user || !user.password) {
          return null;
        }

        const isValid = await bcrypt.compare(password, user.password);
        if (!isValid) {
          return null;
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          image: user.image,
          workspaceId: user.workspaceId,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user, trigger }) {
      // Initial sign-in: add user data to token
      if (user) {
        token.id = user.id;
        token.workspaceId = user.workspaceId;
      }

      // Refresh workspace ID on update
      const tokenId = token.id as string | undefined;
      if (trigger === 'update' && tokenId) {
        const dbUser = await prisma.user.findUnique({
          where: { id: tokenId },
          select: { workspaceId: true },
        });
        if (dbUser) {
          token.workspaceId = dbUser.workspaceId;
        }
      }

      return token;
    },
    async session({ session, token }) {
      if (token) {
        session.user.id = (token.id as string) ?? '';
        session.user.workspaceId = (token.workspaceId as string | null) ?? null;
      }
      return session;
    },
  },
  events: {
    async createUser({ user }) {
      // Auto-create workspace for new users (solo-first model)
      if (user.id && user.email) {
        const slug = user.email
          .split('@')[0]
          .toLowerCase()
          .replace(/[^a-z0-9]/g, '-');
        const uniqueSlug = `${slug}-${Date.now().toString(36)}`;

        const workspace = await prisma.workspace.create({
          data: {
            name: user.name ? `${user.name}'s Workspace` : 'My Workspace',
            slug: uniqueSlug,
          },
        });

        await prisma.user.update({
          where: { id: user.id },
          data: { workspaceId: workspace.id },
        });
      }
    },
  },
});
