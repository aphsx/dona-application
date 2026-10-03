"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import {
  clearSession,
  getSession,
  restoreSession,
  type FarmerSession,
} from "@/lib/api";

type AuthContextValue = {
  session: FarmerSession | null;
  ready: boolean;
  setSession: (session: FarmerSession | null) => void;
  logout: () => void;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSessionState] = useState<FarmerSession | null>(null);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    setSessionState(restoreSession());
    setReady(true);
  }, []);

  function setSession(next: FarmerSession | null) {
    setSessionState(next);
  }

  function logout() {
    clearSession();
    setSessionState(null);
  }

  return (
    <AuthContext.Provider value={{ session, ready, setSession, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth outside AuthProvider");
  return value;
}

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { session, ready } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!ready) return;
    if (!session) router.replace(`/login?next=${encodeURIComponent(pathname)}`);
  }, [ready, session, router, pathname]);

  if (!ready || !session) {
    return (
      <div className="flex min-h-full items-center justify-center bg-brand-light text-brand-dark/60">
        กำลังโหลด…
      </div>
    );
  }
  return <>{children}</>;
}

export function useLiveSession() {
  return getSession();
}
