import { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';
import { prisma } from './prisma';

// Rate limiter proti brute-force útoku na login.
// In-memory Map (per-instance na Vercelu); pro interní appku s malým počtem
// uživatelů dostatečné — reálně brzdí i útočníka, který by se dostal na
// jednu warm lambdu.
const MAX_ATTEMPTS = 5;
const WINDOW_MS = 15 * 60 * 1000; // 15 minut
const loginAttempts = new Map<string, { count: number; firstAttempt: number }>();

function checkRateLimit(identifier: string): boolean {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  if (!record) return true;
  if (now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.delete(identifier);
    return true;
  }
  return record.count < MAX_ATTEMPTS;
}

function recordFailedAttempt(identifier: string) {
  const now = Date.now();
  const record = loginAttempts.get(identifier);
  if (!record || now - record.firstAttempt > WINDOW_MS) {
    loginAttempts.set(identifier, { count: 1, firstAttempt: now });
  } else {
    record.count++;
  }
  // Ochrana proti nekonečnému růstu mapy
  if (loginAttempts.size > 10000) {
    const cutoff = now - WINDOW_MS;
    for (const [key, value] of loginAttempts) {
      if (value.firstAttempt < cutoff) loginAttempts.delete(key);
    }
  }
}

function resetAttempts(identifier: string) {
  loginAttempts.delete(identifier);
}

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
        const identifier = login.toLowerCase();

        if (!checkRateLimit(identifier)) {
          throw new Error('Příliš mnoho pokusů o přihlášení. Zkuste to prosím za 15 minut.');
        }

        let user;

        if (login.includes('@')) {
          // Přihlášení emailem (dispečer)
          user = await prisma.user.findUnique({
            where: { email: login },
          });
        } else {
          // Přihlášení jménem (řidič / skladník)
          user = await prisma.user.findFirst({
            where: { name: login, role: { in: ['DRIVER', 'WAREHOUSE'] } },
          });
        }

        if (!user) {
          recordFailedAttempt(identifier);
          throw new Error('Nesprávné přihlašovací údaje');
        }

        if (!user.password) {
          recordFailedAttempt(identifier);
          throw new Error('Účet nemá nastavené heslo');
        }

        const isValid = await bcrypt.compare(credentials.password, user.password);
        if (!isValid) {
          recordFailedAttempt(identifier);
          throw new Error('Nesprávné přihlašovací údaje');
        }

        resetAttempts(identifier);

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
