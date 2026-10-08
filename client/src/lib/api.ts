import axios from 'axios';

// Shared API client; Vite exposes only VITE_-prefixed variables to browser code.
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  headers: {
    'Content-Type': 'application/json'
  }
});

// Use the same bearer-token format for all endpoints that require authentication.
export const getAuthHeaders = (token: string | null) => ({
  headers: token ? { Authorization: `Bearer ${token}` } : {}
});

// Convert Axios and native errors into a user-displayable message.
export const normalizeApiError = (
  error: unknown,
  fallback = 'Something went wrong. Please try again.'
) => {
  if (axios.isAxiosError(error)) {
    return error.response?.data?.message || error.message || fallback;
  }

  if (error instanceof Error) {
    return error.message || fallback;
  }

  return fallback;
};

export default api;
