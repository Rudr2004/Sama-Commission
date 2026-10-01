// Backend base URL. In dev, Vite proxies /api to localhost:5001 (vite.config.js),
// so this stays empty and requests use relative paths. In production (Vercel),
// set VITE_API_BASE_URL to the deployed Render backend's origin (no trailing slash).
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL?.replace(/\/$/, '') ?? '';

export function apiUrl(path) {
  return `${API_BASE_URL}${path}`;
}
