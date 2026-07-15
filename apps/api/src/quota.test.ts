import { describe, expect, it } from 'vitest';
import {
  MAX_UPLOAD_BYTES,
  WORKSPACE_QUOTA_BYTES,
  rejectUpload,
  storageSummary,
} from './quota';

const MB = 1024 * 1024;

describe('storageSummary', () => {
  it('sums every stored asset, archived included by the caller contract', () => {
    const summary = storageSummary([10 * MB, 20 * MB, 5 * MB]);
    expect(summary.usedBytes).toBe(35 * MB);
    expect(summary.quotaBytes).toBe(WORKSPACE_QUOTA_BYTES);
    expect(summary.remainingBytes).toBe(WORKSPACE_QUOTA_BYTES - 35 * MB);
  });

  it('never reports negative remaining space', () => {
    const summary = storageSummary([WORKSPACE_QUOTA_BYTES, 50 * MB]);
    expect(summary.remainingBytes).toBe(0);
  });

  it('handles an empty library', () => {
    const summary = storageSummary([]);
    expect(summary.usedBytes).toBe(0);
    expect(summary.remainingBytes).toBe(WORKSPACE_QUOTA_BYTES);
  });
});

describe('rejectUpload', () => {
  it('accepts an upload that fits', () => {
    expect(rejectUpload(0, 10 * MB)).toBeNull();
  });

  it('rejects a single file above the per-upload ceiling', () => {
    expect(rejectUpload(0, MAX_UPLOAD_BYTES + 1)).toBe('file-too-large');
  });

  it('rejects an upload that would cross the workspace quota', () => {
    expect(rejectUpload(WORKSPACE_QUOTA_BYTES - 5 * MB, 10 * MB)).toBe('quota-exceeded');
  });

  it('accepts an upload that exactly fills the quota', () => {
    expect(rejectUpload(WORKSPACE_QUOTA_BYTES - 10 * MB, 10 * MB)).toBeNull();
  });

  it('checks the per-file ceiling before the quota', () => {
    expect(rejectUpload(WORKSPACE_QUOTA_BYTES, MAX_UPLOAD_BYTES + 1)).toBe('file-too-large');
  });
});
