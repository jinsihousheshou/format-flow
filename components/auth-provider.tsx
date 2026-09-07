"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AuthSession,
  ConversionLog,
  Entitlement,
  edgeFunction,
  isSupabaseConfigured,
  sessionStorageKey,
  supabaseRequest,
} from "../lib/supabase";

type AccountData = {
  entitlement: Entitlement | null;
  conversions: ConversionLog[];
  isAdmin: boolean;
};

type Reservation = { conversionId: string; remainingConversions: number | null };

type AuthContextValue = {
  configured: boolean;
  loading: boolean;
  session: AuthSession | null;
  account: AccountData;
  signUp: (email: string, password: string) => Promise<string>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
  sendPasswordReset: (email: string) => Promise<void>;
  updatePassword: (password: string) => Promise<void>;
  redeemCode: (code: string) => Promise<void>;
  getAccessToken: () => Promise<string>;
  refreshAccount: () => Promise<void>;
  reserveConversion: (input: { kind: string; inputFormat: string; outputFormat: string; fileSize: number }) => Promise<Reservation>;
  finishConversion: (conversionId: string, status: "completed" | "failed", errorMessage?: string) => Promise<void>;
};

const emptyAccount: AccountData = { entitlement: null, conversions: [], isAdmin: false };
const AuthContext = createContext<AuthContextValue | null>(null);

function normalizeSession(session: AuthSession): AuthSession {
  return { ...session, expires_at: session.expires_at ?? Math.floor(Date.now() / 1000) + session.expires_in };
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [session, setSession] = useState<AuthSession | null>(null);
  const [account, setAccount] = useState<AccountData>(emptyAccount);
  const [loading, setLoading] = useState(true);

  const persistSession = useCallback((next: AuthSession | null) => {
    setSession(next);
    if (next) localStorage.setItem(sessionStorageKey, JSON.stringify(next));
    else localStorage.removeItem(sessionStorageKey);
  }, []);

  const refreshSession = useCallback(async (current: AuthSession) => {
    const next = normalizeSession(await supabaseRequest<AuthSession>("/auth/v1/token?grant_type=refresh_token", {
      method: "POST",
      body: JSON.stringify({ refresh_token: current.refresh_token }),
    }));
    persistSession(next);
    return next;
  }, [persistSession]);

  const getValidSession = useCallback(async () => {
    if (!session) throw new Error("请先登录。");
    const almostExpired = (session.expires_at ?? 0) * 1000 < Date.now() + 60_000;
    return almostExpired ? refreshSession(session) : session;
  }, [refreshSession, session]);

  const loadAccount = useCallback(async (current: AuthSession) => {
    const [entitlements, conversions, roles] = await Promise.all([
      supabaseRequest<Entitlement[]>("/rest/v1/entitlements?select=plan_type,activated_at,expires_at,remaining_conversions,status&limit=1", {}, current.access_token),
      supabaseRequest<ConversionLog[]>("/rest/v1/conversion_logs?select=id,kind,input_format,output_format,status,created_at,error_message&order=created_at.desc&limit=10", {}, current.access_token),
      supabaseRequest<{ user_id: string }[]>("/rest/v1/admin_users?select=user_id&limit=1", {}, current.access_token),
    ]);
    setAccount({ entitlement: entitlements[0] ?? null, conversions, isAdmin: roles.length > 0 });
  }, []);

  const refreshAccount = useCallback(async () => {
    if (!session) {
      setAccount(emptyAccount);
      return;
    }
    try {
      await loadAccount(await getValidSession());
    } catch (error) {
      console.error(error);
      setAccount(emptyAccount);
    }
  }, [getValidSession, loadAccount, session]);

  useEffect(() => {
    if (!isSupabaseConfigured) {
      setLoading(false);
      return;
    }
    const hash = new URLSearchParams(window.location.hash.replace(/^#/, ""));
    const hashToken = hash.get("access_token");
    const hashRefresh = hash.get("refresh_token");
    if (hashToken && hashRefresh) {
      supabaseRequest<{ user: AuthSession["user"] }>("/auth/v1/user", {}, hashToken)
        .then(({ user }) => {
          persistSession({ access_token: hashToken, refresh_token: hashRefresh, expires_in: Number(hash.get("expires_in") || 3600), user });
          history.replaceState(null, "", window.location.pathname + window.location.search);
        })
        .finally(() => setLoading(false));
      return;
    }
    const saved = localStorage.getItem(sessionStorageKey);
    if (!saved) {
      setLoading(false);
      return;
    }
    try {
      const parsed = JSON.parse(saved) as AuthSession;
      const almostExpired = (parsed.expires_at ?? 0) * 1000 < Date.now() + 60_000;
      (almostExpired ? refreshSession(parsed) : Promise.resolve(parsed))
        .then(persistSession)
        .catch(() => persistSession(null))
        .finally(() => setLoading(false));
    } catch {
      persistSession(null);
      setLoading(false);
    }
  }, [persistSession, refreshSession]);

  useEffect(() => { void refreshAccount(); }, [refreshAccount]);

  const signUp = async (email: string, password: string) => {
    const redirectTo = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/account/`;
    const result = await supabaseRequest<AuthSession & { identities?: unknown[] }>(`/auth/v1/signup?redirect_to=${encodeURIComponent(redirectTo)}`, {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });
    if (result.access_token) persistSession(normalizeSession(result));
    return result.access_token ? "注册成功，已登录。" : "注册成功，请打开验证邮件完成确认。";
  };

  const signIn = async (email: string, password: string) => {
    const result = normalizeSession(await supabaseRequest<AuthSession>("/auth/v1/token?grant_type=password", {
      method: "POST", body: JSON.stringify({ email, password }),
    }));
    persistSession(result);
  };

  const signOut = async () => {
    if (session) await supabaseRequest("/auth/v1/logout", { method: "POST" }, session.access_token).catch(() => null);
    persistSession(null);
    setAccount(emptyAccount);
  };

  const sendPasswordReset = async (email: string) => {
    const redirectTo = `${window.location.origin}${process.env.NEXT_PUBLIC_BASE_PATH ?? ""}/account/`;
    await supabaseRequest("/auth/v1/recover", { method: "POST", body: JSON.stringify({ email, redirect_to: redirectTo }) });
  };

  const updatePassword = async (password: string) => {
    const current = await getValidSession();
    await supabaseRequest("/auth/v1/user", { method: "PUT", body: JSON.stringify({ password }) }, current.access_token);
  };

  const redeemCode = async (code: string) => {
    const current = await getValidSession();
    await edgeFunction("redeem-code", { code }, current.access_token);
    await loadAccount(current);
  };

  const reserveConversion = async (input: { kind: string; inputFormat: string; outputFormat: string; fileSize: number }) => {
    if (!session) throw new Error("该功能需要激活后使用，请先登录并输入兑换码。");
    const current = await getValidSession();
    const result = await edgeFunction<Reservation>("authorize-conversion", input, current.access_token);
    await loadAccount(current);
    return result;
  };

  const finishConversion = async (conversionId: string, status: "completed" | "failed", errorMessage?: string) => {
    if (!session) return;
    const current = await getValidSession().catch(() => null);
    if (!current) return;
    await edgeFunction("finish-conversion", { conversionId, status, errorMessage }, current.access_token).catch(console.error);
    await loadAccount(current).catch(console.error);
  };

  const getAccessToken = useCallback(async () => (await getValidSession()).access_token, [getValidSession]);

  const value = useMemo<AuthContextValue>(() => ({
    configured: isSupabaseConfigured, loading, session, account, signUp, signIn, signOut,
    sendPasswordReset, updatePassword, redeemCode, getAccessToken, refreshAccount, reserveConversion, finishConversion,
  }), [loading, session, account, refreshAccount, getAccessToken]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const value = useContext(AuthContext);
  if (!value) throw new Error("useAuth must be used inside AuthProvider");
  return value;
}
