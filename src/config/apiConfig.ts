// API configuration
// The API key is injected at build time via Vite's environment variables
// In development, use the default dev key if VITE_API_KEY is not set
const isDev = import.meta.env.DEV;
export const API_KEY = import.meta.env.VITE_API_KEY || (isDev ? 'dev-api-key-12345' : '');

// Helper function to get headers with API key
export function getApiHeaders(): HeadersInit {
  const headers: HeadersInit = {
    'Content-Type': 'application/json',
  };
  
  if (API_KEY) {
    headers['X-API-Key'] = API_KEY;
  }
  
  return headers;
}

