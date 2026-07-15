/** Base URL of the Lumina API (apps/api). */
export const API_BASE =
  (import.meta.env.VITE_API_URL as string | undefined) ?? 'http://localhost:8787';
