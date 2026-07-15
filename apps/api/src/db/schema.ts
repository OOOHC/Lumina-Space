import {
  boolean,
  index,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
} from 'drizzle-orm/pg-core';

/**
 * V3 schema. Better Auth owns `user`, `session`, `account`, and `verification`
 * (their names and columns follow its expected shape). Everything the product
 * owns hangs off `workspace`, per ADR 0003: resources belong to a workspace,
 * never directly to a user, so V6 collaboration needs no data migration.
 */

export const user = pgTable('user', {
  id: text('id').primaryKey(),
  name: text('name').notNull(),
  email: text('email').notNull().unique(),
  emailVerified: boolean('email_verified').notNull().default(false),
  image: text('image'),
  createdAt: timestamp('created_at').notNull().defaultNow(),
  updatedAt: timestamp('updated_at').notNull().defaultNow(),
});

export const session = pgTable(
  'session',
  {
    id: text('id').primaryKey(),
    token: text('token').notNull().unique(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    expiresAt: timestamp('expires_at').notNull(),
    ipAddress: text('ip_address'),
    userAgent: text('user_agent'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('session_user_id_idx').on(table.userId)],
);

export const account = pgTable(
  'account',
  {
    id: text('id').primaryKey(),
    userId: text('user_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    accountId: text('account_id').notNull(),
    providerId: text('provider_id').notNull(),
    accessToken: text('access_token'),
    refreshToken: text('refresh_token'),
    accessTokenExpiresAt: timestamp('access_token_expires_at'),
    refreshTokenExpiresAt: timestamp('refresh_token_expires_at'),
    scope: text('scope'),
    idToken: text('id_token'),
    /** Hashed by Better Auth; never a plaintext password. */
    password: text('password'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('account_user_id_idx').on(table.userId)],
);

export const verification = pgTable(
  'verification',
  {
    id: text('id').primaryKey(),
    identifier: text('identifier').notNull(),
    value: text('value').notNull(),
    expiresAt: timestamp('expires_at').notNull(),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('verification_identifier_idx').on(table.identifier)],
);

/**
 * The ownership boundary (ADR 0003). Every photographer gets exactly one
 * personal workspace at sign-up; V6 may add more members without moving data.
 */
export const workspace = pgTable(
  'workspace',
  {
    id: text('id').primaryKey(),
    name: text('name').notNull(),
    ownerId: text('owner_id')
      .notNull()
      .references(() => user.id, { onDelete: 'cascade' }),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [
    // One personal workspace per user in V3; V6 relaxes this deliberately.
    uniqueIndex('workspace_owner_id_idx').on(table.ownerId),
  ],
);

/**
 * A photo asset is immutable (ADR 0002): replacing a photograph creates a new
 * row rather than overwriting `storage_key`, so published revisions keep
 * pointing at the bytes they were published with.
 */
export const photoAsset = pgTable(
  'photo_asset',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    caption: text('caption'),
    /** R2 object key, always under the owning workspace's prefix. */
    storageKey: text('storage_key').notNull(),
    contentType: text('content_type').notNull(),
    /** Bytes; used to enforce the workspace storage quota. */
    sizeBytes: text('size_bytes').notNull(),
    width: text('width').notNull(),
    height: text('height').notNull(),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('photo_asset_workspace_id_idx').on(table.workspaceId)],
);
