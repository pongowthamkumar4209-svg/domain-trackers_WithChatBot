import { createContext, useContext, useState, useEffect, ReactNode } from "react";
import { login as apiLogin, logout as apiLogout, getMe } from "@/services/api";

interface UserProfile {
  id: string;
  email: string;
  display_name: string;
  mobile_number?: string;
  role: string;
  created_at?: string;
}

interface AuthContextType {
  user: UserProfile | null;
  profile: UserProfile | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("auth_token");
    if (token) {
      getMe()
        .then((u) => setUser(u))
        .catch(() => localStorage.removeItem("auth_token"))
        .finally(() => setIsLoading(false));
    } else {
      setIsLoading(false);
    }
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const data = await apiLogin(email, password);
      localStorage.setItem("auth_token", data.token);
      setUser(data.user);
      return {};
    } catch (err: unknown) {
      return { error: err instanceof Error ? err.message : "Login failed" };
    }
  };

  const signOut = async () => {
    await apiLogout().catch(() => {});
    localStorage.removeItem("auth_token");
    setUser(null);
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        profile: user,
        isAuthenticated: !!user,
        isLoading,
        signIn,
        signOut,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
