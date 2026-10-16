/**
 * Centralized Environment & URL Configuration for Factor Execution Terminal.
 * 
 * Supports:
 * 1. Local development with default backend on http://localhost:3001.
 * 2. Vercel deployments with custom backend via VITE_BACKEND_URL.
 * 3. Standalone Vercel deployments with zero configuration (no mixed-content errors).
 */

const rawBackendUrl = import.meta.env.VITE_BACKEND_URL as string | undefined;
const rawApiBase = import.meta.env.VITE_API_BASE_URL as string | undefined;
const rawSseUrl = import.meta.env.VITE_SSE_STREAM_URL as string | undefined;

const cleanUrl = (url?: string) => (url ? url.replace(/\/+$/, "") : "");

export const BACKEND_URL = cleanUrl(rawBackendUrl);

/**
 * Returns REST API base URL.
 * Priority: VITE_API_BASE_URL > VITE_BACKEND_URL/api > (Dev default) http://localhost:3001/api > /api
 */
export const getApiBaseUrl = (): string => {
  if (rawApiBase) return cleanUrl(rawApiBase);
  if (BACKEND_URL) return `${BACKEND_URL}/api`;
  if (import.meta.env.DEV) return "http://localhost:3001/api";
  return "/api";
};

/**
 * Returns SSE stream URL.
 * Priority: VITE_SSE_STREAM_URL > VITE_BACKEND_URL/api/stream > (Dev default) http://localhost:3001/api/stream
 * Returns null in production if no backend is specified, avoiding mixed-content blocks over HTTPS.
 */
export const getSseStreamUrl = (): string | null => {
  if (rawSseUrl) return rawSseUrl;
  if (BACKEND_URL) return `${BACKEND_URL}/api/stream`;
  if (import.meta.env.DEV) return "http://localhost:3001/api/stream";
  return "/api/stream";
};
