import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "../lib/supabase";
import type { Role } from "../types/common";

const ROLE_PERMISSIONS: Record<Role, string[]> = {
  admin: [
    "scm:read",
    "pnl:read",
    "pnl:cost_detail",
    "reco:scm",
    "reco:pnl",
    "constraint:read",
    "coverage:read",
    "pipeline:run",
    "pipeline:rollback",
    "pipeline:close",
    "pipeline:lock",
    "pipeline:unlock",
    "admin:manage",
    "upload:access",
  ],
  scm: ["scm:read", "reco:scm", "constraint:read", "coverage:read", "upload:access"],
  pnl: ["pnl:read", "pnl:cost_detail", "reco:pnl", "coverage:read", "upload:access"],
  ops: [
    "scm:read",
    "reco:scm",
    "constraint:read",
    "coverage:read",
    "pipeline:run",
    "pipeline:close",
    "upload:access",
  ],
  readonly: [
    "scm:read",
    "pnl:read",
    "reco:scm",
    "reco:pnl",
    "constraint:read",
    "coverage:read",
  ],
};

interface User {
  id: string;
  email: string;
  name: string;
}

function isRole(value: unknown): value is Role {
  return value === "admin" || value === "scm" || value === "pnl" || value === "ops" || value === "readonly";
}

function decodeJwtPayload(token: string | undefined): Record<string, unknown> | null {
  if (!token) return null;

  const [, payload] = token.split(".");
  if (!payload) return null;

  try {
    const normalized = payload.replace(/-/g, "+").replace(/_/g, "/");
    const padded = normalized.padEnd(Math.ceil(normalized.length / 4) * 4, "=");
    return JSON.parse(atob(padded)) as Record<string, unknown>;
  } catch {
    return null;
  }
}

function extractRole(
  user: {
    app_metadata?: Record<string, unknown>;
    user_metadata?: Record<string, unknown>;
  },
  accessToken?: string,
): Role {
  const jwtPayload = decodeJwtPayload(accessToken);
  const candidates = [jwtPayload?.role, user.app_metadata?.role, user.user_metadata?.role];

  for (const candidate of candidates) {
    if (isRole(candidate)) return candidate;
  }

  return "readonly";
}

interface AuthState {
  user: User | null;
  role: Role | null;
  permissions: string[];
  isDemo: boolean;
  signIn: (email: string, password: string) => Promise<{ error: string | null }>;
  signOut: () => Promise<void>;
  loginDemo: (role: Role) => void;
  setFromSession: (user: User, role: Role) => void;
}

export const useAuthStore = create<AuthState>()(
  persist(
    (set) => ({
      user: null,
      role: null,
      permissions: [],
      isDemo: false,

      signIn: async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) return { error: error.message };

        const supaUser = data.user;
        const role = extractRole(supaUser ?? {}, data.session?.access_token);

        set({
          user: {
            id: supaUser.id,
            email: supaUser.email ?? "",
            name: supaUser.user_metadata?.name ?? supaUser.email ?? "",
          },
          role,
          permissions: ROLE_PERMISSIONS[role] ?? [],
          isDemo: false,
        });

        return { error: null };
      },

      signOut: async () => {
        await supabase.auth.signOut();
        set({ user: null, role: null, permissions: [], isDemo: false });
      },

      loginDemo: (role) => {
        set({
          user: { id: "demo", email: "demo@example.com", name: "Demo User" },
          role,
          permissions: ROLE_PERMISSIONS[role] ?? [],
          isDemo: true,
        });
      },

      setFromSession: (user, role) => {
        set({
          user,
          role,
          permissions: ROLE_PERMISSIONS[role] ?? [],
          isDemo: false,
        });
      },
    }),
    { name: "auth" },
  ),
);

supabase.auth.onAuthStateChange((_event, session) => {
  const store = useAuthStore.getState();
  if (store.isDemo) return;

  if (session?.user) {
    const u = session.user;
    const role = extractRole(u, session.access_token);
    store.setFromSession(
      {
        id: u.id,
        email: u.email ?? "",
        name: u.user_metadata?.name ?? u.email ?? "",
      },
      role,
    );
  } else {
    useAuthStore.setState({ user: null, role: null, permissions: [], isDemo: false });
  }
});
