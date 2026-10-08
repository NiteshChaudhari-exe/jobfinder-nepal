import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import api, { getAuthHeaders } from '../lib/api';

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: 'user' | 'employer' | 'admin';
};

// Public authentication actions and state shared across the route tree.
type AuthContextValue = {
  user: AuthUser | null;
  token: string | null;
  isAuthenticated: boolean;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: { name: string; email: string; password: string; role?: 'user' | 'employer' }) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The token is persisted locally; user identity is revalidated with the API on startup.
const TOKEN_KEY = 'jobfinder-token';

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [token, setToken] = useState<string | null>(() => localStorage.getItem(TOKEN_KEY));
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (token) {
      localStorage.setItem(TOKEN_KEY, token);
    } else {
      localStorage.removeItem(TOKEN_KEY);
    }
  }, [token]);

  useEffect(() => {
    const loadCurrentUser = async () => {
      if (!token) {
        setUser(null);
        return;
      }

      try {
        setLoading(true);
        // Treat the server as the source of truth; a locally stored token alone is not a session.
        const response = await api.get('/auth/me', getAuthHeaders(token));
        setUser(response.data.user);
      } catch (error) {
        setUser(null);
        setToken(null);
      } finally {
        setLoading(false);
      }
    };

    loadCurrentUser();
  }, [token]);

  // Store the session returned by the server after credentials are verified.
  const login = async (email: string, password: string) => {
    const response = await api.post('/auth/login', { email, password });
    setToken(response.data.token);
    setUser(response.data.user);
  };

  // New public accounts are candidates unless a trusted caller specifies employer.
  const register = async (data: { name: string; email: string; password: string; role?: 'user' | 'employer' }) => {
    const response = await api.post('/auth/register', data);
    setToken(response.data.token);
    setUser(response.data.user);
  };

  // Clearing state also removes the token through the persistence effect above.
  const logout = () => {
    setToken(null);
    setUser(null);
  };

  const value = useMemo<AuthContextValue>(
    () => ({
      user,
      token,
      isAuthenticated: Boolean(token && user),
      loading,
      login,
      register,
      logout
    }),
    [user, token, loading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }

  return context;
}
