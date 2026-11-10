import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { tokenStorage } from "./tokenStorage";
import { useQueryClient } from "@tanstack/react-query";
import { api, setAuthToken, setUnauthorizedHandler } from "./api";
import type { User } from "./types";
import { clearReminders } from "./reminders";
import { clearActiveWorkout } from "./activeWorkout";

const TOKEN_KEY = "auth-token";

interface AuthState {
  loading: boolean;
  user: User | null;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (name: string, email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  updateProfile: (patch: Partial<User>) => Promise<User>;
  setUser: (u: User) => void;
}

const AuthContext = createContext<AuthState | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const queryClient = useQueryClient();

  const signOut = useCallback(async () => {
    await tokenStorage.remove(TOKEN_KEY);
    setAuthToken(null);
    setUser(null);
    queryClient.clear();
    await clearReminders();
    await clearActiveWorkout();
  }, [queryClient]);

  useEffect(() => {
    setUnauthorizedHandler(() => void signOut());
    (async () => {
      try {
        const token = await tokenStorage.get(TOKEN_KEY);
        if (token) {
          setAuthToken(token);
          setUser(await api.get<User>("/me"));
        }
      } catch {
        // Bad/expired token or server unreachable: start signed out.
        setAuthToken(null);
      } finally {
        setLoading(false);
      }
    })();
  }, [signOut]);

  const finishAuth = async (res: { token: string; user: User }) => {
    await tokenStorage.set(TOKEN_KEY, res.token);
    setAuthToken(res.token);
    setUser(res.user);
  };

  const value = useMemo<AuthState>(
    () => ({
      loading,
      user,
      signIn: async (email, password) => finishAuth(await api.post("/auth/login", { email, password })),
      signUp: async (name, email, password) => finishAuth(await api.post("/auth/register", { name, email, password })),
      signOut,
      updateProfile: async (patch) => {
        const updated = await api.put<User>("/me", patch);
        setUser(updated);
        return updated;
      },
      setUser,
    }),
    [loading, user, signOut],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}

/** For screens behind the auth guard, where a user always exists. */
export function useUser(): User {
  const { user } = useAuth();
  if (!user) throw new Error("No signed-in user");
  return user;
}
