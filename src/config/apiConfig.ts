// API configuration
// The API key is injected at build time via Vite's environment variables
export const API_KEY = import.meta.env.VITE_API_KEY || '';

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

