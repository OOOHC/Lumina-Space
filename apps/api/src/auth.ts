import { betterAuth } from 'better-auth';
import { drizzleAdapter } from 'better-auth/adapters/drizzle';
import type { Database } from './db/client';
import * as schema from './db/schema';

/**
 * Better Auth, configured per request because the database client and secret
 * come from Worker bindings, not module scope. Email/password only for V3;
 * social providers are a later, separately-scoped addition.
 *
 * A fresh user triggers `afterCreate`, which provisions the personal workspace
 * that ADR 0003 requires — one owner, created atomically with the account.
 */
export function createAuth(
  db: Database,
  secret: string,
  trustedOrigins: string[],
  baseURL: string,
) {
  return betterAuth({
    secret,
    baseURL,
    trustedOrigins,
    database: drizzleAdapter(db, { provider: 'pg', schema }),
    emailAndPassword: {
      enabled: true,
      autoSignIn: true,
    },
    databaseHooks: {
      user: {
        create: {
          after: async (user) => {
            await db.insert(schema.workspace).values({
              id: crypto.randomUUID(),
              name: `${user.name || 'My'} Workspace`,
              ownerId: user.id,
            });
          },
        },
      },
    },
  });
}

export type Auth = ReturnType<typeof createAuth>;
