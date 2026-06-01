import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { authApi } from "@/lib/api";
import {
  clearAccessToken,
  getAccessToken,
  setAccessToken,
  setUnauthorizedHandler,
} from "@/lib/auth-session";

export type UserRole = "admin" | "recruiter" | "viewer";

export type AuthUser = {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  createdAt: string;
  lastLoginAt?: string | null;
};

type AuthContextValue = {
  user: AuthUser | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (payload: { email: string; password: string }) => Promise<void>;
  register: (payload: { name: string; email: string; password: string }) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (payload: { name: string; currentPassword?: string; newPassword?: string }) => Promise<AuthUser>;
  refreshSession: () => Promise<string>;
  loadCurrentUser: () => Promise<AuthUser>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

const PUBLIC_PATHS = ["/", "/login"];
const PUBLIC_PREFIXES = ["/apply/", "/status/"];

const isPublicPath = (pathname: string) =>
  PUBLIC_PATHS.includes(pathname) || PUBLIC_PREFIXES.some((prefix) => pathname.startsWith(prefix));

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const loadCurrentUser = async () => {
    const { data } = await authApi.me();
    setUser(data);
    return data;
  };

  const refreshSession = async () => {
    const { data } = await authApi.refresh();
    setAccessToken(data.accessToken);
    return data.accessToken;
  };

  const clearSession = () => {
    clearAccessToken();
    setUser(null);
  };

  const redirectToLogin = () => {
    if (!isPublicPath(location.pathname)) {
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
    }
  };

  const login = async (payload: { email: string; password: string }) => {
    const { data } = await authApi.login(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const register = async (payload: { name: string; email: string; password: string }) => {
    const { data } = await authApi.register(payload);
    setAccessToken(data.accessToken);
    setUser(data.user);
  };

  const logout = async () => {
    try {
      await authApi.logout();
    } finally {
      clearSession();
      navigate("/login", { replace: true });
    }
  };

  const updateProfile = async (payload: { name: string; currentPassword?: string; newPassword?: string }) => {
    const { data } = await authApi.updateMe(payload);
    setUser(data.user);
    return data.user;
  };

  useEffect(() => {
    setUnauthorizedHandler(() => {
      clearSession();
      redirectToLogin();
    });

    return () => {
      setUnauthorizedHandler(null);
    };
  }, [location.pathname, navigate]);

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      setIsLoading(true);

      try {
        if (getAccessToken()) {
          await loadCurrentUser();
        } else {
          await refreshSession();
          await loadCurrentUser();
        }
      } catch (error) {
        if (isMounted) {
          clearSession();
        }
      } finally {
        if (isMounted) {
          setIsLoading(false);
        }
      }
    };

    void bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  const value = useMemo(
    () => ({
      user,
      isAuthenticated: Boolean(user),
      isLoading,
      login,
      register,
      logout,
      updateProfile,
      refreshSession,
      loadCurrentUser,
    }),
    [isLoading, user]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used within an AuthProvider");
  }

  return context;
}
