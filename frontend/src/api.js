import axios from 'axios';

/**
 * Single axios instance used by every component.
 *
 * Development  → VITE_API_URL is not set → baseURL = ''
 *                Vite proxy forwards /api/* to localhost:4000
 *
 * Production   → VITE_API_URL = https://image-vault-api.vercel.app
 *                All /api/* calls go straight to the deployed backend
 */
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL ?? '',
});

export default api;
