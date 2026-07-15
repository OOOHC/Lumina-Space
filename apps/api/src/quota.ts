/**
 * Storage ceilings enforced by the API before any presigned upload is issued.
 * These are engineering limits per workspace; provider-level budgets are an
 * owner-side operational matter and intentionally not encoded here.
 */
export const WORKSPACE_QUOTA_BYTES = 512 * 1024 * 1024; // 512 MB per workspace
export const MAX_UPLOAD_BYTES = 25 * 1024 * 1024; // 25 MB per photograph

export interface StorageSummary {
  usedBytes: number;
  quotaBytes: number;
  remainingBytes: number;
}

/** Quota counts every stored asset, archived included — archived bytes still exist. */
export function storageSummary(
  sizes: readonly number[],
  quotaBytes = WORKSPACE_QUOTA_BYTES,
): StorageSummary {
  const usedBytes = sizes.reduce((sum, n) => sum + n, 0);
  return {
    usedBytes,
    quotaBytes,
    remainingBytes: Math.max(0, quotaBytes - usedBytes),
  };
}

export type UploadRejection = 'file-too-large' | 'quota-exceeded' | null;

/** Returns why an incoming upload must be rejected, or null when it fits. */
export function rejectUpload(
  usedBytes: number,
  incomingBytes: number,
  quotaBytes = WORKSPACE_QUOTA_BYTES,
  maxUploadBytes = MAX_UPLOAD_BYTES,
): UploadRejection {
  if (incomingBytes > maxUploadBytes) return 'file-too-large';
  if (usedBytes + incomingBytes > quotaBytes) return 'quota-exceeded';
  return null;
}
