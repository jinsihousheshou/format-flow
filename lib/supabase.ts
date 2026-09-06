export const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL?.replace(/\/$/, "") ?? "";
export const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? "";
export const isSupabaseConfigured = Boolean(supabaseUrl && supabaseAnonKey);

export type AuthUser = { id: string; email?: string };
export type AuthSession = {
  access_token: string;
  refresh_token: string;
  expires_in: number;
  expires_at?: number;
  user: AuthUser;
};

export type Entitlement = {
  plan_type: "trial" | "monthly" | "yearly" | "lifetime" | "credits";
  activated_at: string;
  expires_at: string | null;
  remaining_conversions: number | null;
  status: "active" | "disabled";
};

export type ConversionLog = {
  id: string;
  kind: string;
  input_format: string;
  output_format: string;
  status: "started" | "completed" | "failed";
  created_at: string;
  error_message: string | null;
};

export const sessionStorageKey = "format-flow-auth-session";

export async function supabaseRequest<T>(path: string, init: RequestInit = {}, accessToken?: string): Promise<T> {
  if (!isSupabaseConfigured) throw new Error("尚未配置 Supabase，请先填写环境变量。");
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...init,
    headers: {
      apikey: supabaseAnonKey,
      Authorization: `Bearer ${accessToken || supabaseAnonKey}`,
      "Content-Type": "application/json",
      ...init.headers,
    },
  });
  const payload = response.status === 204 ? null : await response.json().catch(() => null);
  if (!response.ok) {
    const message = payload?.message || payload?.msg || payload?.error_description || payload?.error || "请求失败，请稍后重试。";
    throw new Error(message);
  }
  return payload as T;
}

export async function edgeFunction<T>(name: string, body: unknown, accessToken: string): Promise<T> {
  return supabaseRequest<T>(`/functions/v1/${name}`, { method: "POST", body: JSON.stringify(body) }, accessToken);
}
