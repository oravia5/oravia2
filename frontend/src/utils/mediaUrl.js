/**
 * Centralized media URL resolver.
 *
 * - S3 / absolute URLs are returned as-is.
 * - Relative paths (e.g. /uploads/...) are prefixed with the backend origin
 *   so they work in both local dev and production.
 *
 * Environment variable:
 *   VITE_BACKEND_URL  – set to "http://127.0.0.1:5000" locally,
 *                       leave empty (or "/") in production where
 *                       Nginx proxies /uploads to the backend.
 */
export const getFullMediaUrl = (url) => {
  if (!url) return '';
  // Already an absolute URL (S3 or any CDN) — return as-is
  if (url.startsWith('http://') || url.startsWith('https://')) return url;
  // Relative path like /uploads/... — prefix with backend origin
  const backendBase = import.meta.env.VITE_BACKEND_URL || '';
  return `${backendBase}${url}`;
};
