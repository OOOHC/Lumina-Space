import { defineConfig } from 'drizzle-kit';

/**
 * Migration tooling runs on Node (not in the Worker), so it reads the same
 * connection string from apps/api/.dev.vars via `npm run db:push`.
 */
export default defineConfig({
  schema: './src/db/schema.ts',
  out: './drizzle',
  dialect: 'postgresql',
  dbCredentials: {
    url: process.env.DATABASE_URL!,
  },
});
