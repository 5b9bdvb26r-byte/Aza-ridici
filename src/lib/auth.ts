import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        login: { label: 'Jméno nebo email', type: 'text' },
        password: { label: 'Heslo', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.login || !credentials?.password) {
          throw new Error('Zadejte jméno/email a heslo');
        }

        const login = credentials.login.trim();
        let user;

        if (login.includes('@')) {
          // Přihlášení emailem (dispečer)
          user = await prisma.user.findUnique({
            where: { email: login },
          });
        } else {
          // Přihlášení jménem (řidič)
          user = await prisma.user.findFirst({
            where: { name: login, role: 'DRIVER' },
          });
        }

        if (!user) {
          throw new Error('Nesprávné přihlašovací údaje');
        }

        if (!user.password) {
          throw new Error('Účet nemá nastavené heslo');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          throw new Error('Nesprávné přihlašovací údaje');
        }

        return {
          id: user.id,
          email: user.email,
          name: user.name,
          role: user.role,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
      }
      return session;
    },
  },
  pages: {
    signIn: '/prihlaseni',
  },
  session: {
    strategy: 'jwt',
  },
  secret: process.env.NEXTAUTH_SECRET,
};
