import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

interface User {
  username: string;
}

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (username: string, password: string) => Promise<boolean>;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

// Default credentials (change in production)
const DEFAULT_USERNAME = 'admin';
const DEFAULT_PASSWORD = 'admin@123';

const AUTH_TOKEN_KEY = 'cn-clarification-auth';

interface StoredAuth {
  username: string;
  token: string;
  expiry: number;
}

function generateToken(): string {
  return btoa(crypto.randomUUID() + Date.now());
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);

  // Check for existing session on mount
  useEffect(() => {
    const stored = localStorage.getItem(AUTH_TOKEN_KEY);
    if (stored) {
      try {
        const auth: StoredAuth = JSON.parse(stored);
        if (auth.expiry > Date.now()) {
          setUser({ username: auth.username });
        } else {
          localStorage.removeItem(AUTH_TOKEN_KEY);
        }
      } catch {
        localStorage.removeItem(AUTH_TOKEN_KEY);
      }
    }
  }, []);

  const login = async (username: string, password: string): Promise<boolean> => {
    // Simple credential check (in production, use proper auth)
    if (username === DEFAULT_USERNAME && password === DEFAULT_PASSWORD) {
      const auth: StoredAuth = {
        username,
        token: generateToken(),
        expiry: Date.now() + 24 * 60 * 60 * 1000, // 24 hours
      };
      
      localStorage.setItem(AUTH_TOKEN_KEY, JSON.stringify(auth));
      setUser({ username });
      return true;
    }
    
    return false;
  };

  const logout = () => {
    localStorage.removeItem(AUTH_TOKEN_KEY);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{
      user,
      isAuthenticated: !!user,
      login,
      logout,
    }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
