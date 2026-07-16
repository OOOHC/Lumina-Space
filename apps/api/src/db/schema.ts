import {
  bigint,
  boolean,
  index,
  integer,
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
 * An exhibition draft (V4). The row IS the mutable draft; publishing (V5)
 * snapshots it into a separate immutable revision table per ADR 0005, so
 * editing here can never change anything already live.
 */
export const exhibition = pgTable(
  'exhibition',
  {
    id: text('id').primaryKey(),
    workspaceId: text('workspace_id')
      .notNull()
      .references(() => workspace.id, { onDelete: 'cascade' }),
    title: text('title').notNull(),
    description: text('description'),
    coverPhotoId: text('cover_photo_id'),
    status: text('status', { enum: ['active', 'archived'] })
      .notNull()
      .default('active'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
    updatedAt: timestamp('updated_at').notNull().defaultNow(),
  },
  (table) => [index('exhibition_workspace_id_idx').on(table.workspaceId)],
);

/**
 * Ordered membership of library photos in an exhibition draft. The FK to
 * photo_asset deliberately has no cascade: it is the database-level backstop
 * for ADR 0002's rule that referenced photographs cannot be deleted (the API
 * refuses first; this refuses even if the API check ever regresses).
 */
export const exhibitionPhoto = pgTable(
  'exhibition_photo',
  {
    exhibitionId: text('exhibition_id')
      .notNull()
      .references(() => exhibition.id, { onDelete: 'cascade' }),
    photoAssetId: text('photo_asset_id')
      .notNull()
      .references(() => photoAsset.id),
    position: integer('position').notNull(),
  },
  (table) => [
    uniqueIndex('exhibition_photo_pk').on(table.exhibitionId, table.photoAssetId),
    index('exhibition_photo_asset_idx').on(table.photoAssetId),
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
    sizeBytes: bigint('size_bytes', { mode: 'number' }).notNull(),
    width: integer('width').notNull(),
    height: integer('height').notNull(),
    /** Null until the browser confirms all objects reached storage. */
    uploadedAt: timestamp('uploaded_at'),
    archivedAt: timestamp('archived_at'),
    createdAt: timestamp('created_at').notNull().defaultNow(),
  },
  (table) => [index('photo_asset_workspace_id_idx').on(table.workspaceId)],
);
