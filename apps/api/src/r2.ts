import { AwsClient } from 'aws4fetch';
import type { Env } from './env';

/**
 * Presigned-URL helpers for R2's S3-compatible API (ADR 0006). Image bytes
 * never transit the Workers API: the browser PUTs directly against a signed,
 * short-lived, single-object URL, and reads come back the same way.
 */

export type ObjectKind = 'original' | 'preview' | 'thumb';

export const UPLOAD_URL_TTL_SECONDS = 15 * 60;
export const VIEW_URL_TTL_SECONDS = 60 * 60;

/** All keys live under the owning workspace's prefix (ARD/ADR 0003). */
export function objectKey(workspaceId: string, assetId: string, kind: ObjectKind): string {
  return `${workspaceId}/${assetId}/${kind}`;
}

function client(env: Env): AwsClient {
  return new AwsClient({
    accessKeyId: env.R2_ACCESS_KEY_ID,
    secretAccessKey: env.R2_SECRET_ACCESS_KEY,
    region: 'auto',
    service: 's3',
  });
}

function objectUrl(env: Env, key: string, ttlSeconds: number): string {
  return (
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}` +
    `?X-Amz-Expires=${ttlSeconds}`
  );
}

export async function presignPut(env: Env, key: string): Promise<string> {
  const signed = await client(env).sign(
    new Request(objectUrl(env, key, UPLOAD_URL_TTL_SECONDS), { method: 'PUT' }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

export async function presignGet(env: Env, key: string): Promise<string> {
  const signed = await client(env).sign(
    new Request(objectUrl(env, key, VIEW_URL_TTL_SECONDS), { method: 'GET' }),
    { aws: { signQuery: true } },
  );
  return signed.url;
}

/** Server-side delete (token permits object writes, which includes delete). */
export async function deleteObject(env: Env, key: string): Promise<void> {
  await client(env).fetch(
    `https://${env.R2_ACCOUNT_ID}.r2.cloudflarestorage.com/${env.R2_BUCKET}/${key}`,
    { method: 'DELETE' },
  );
}
