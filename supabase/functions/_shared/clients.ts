import { createClient } from "npm:@supabase/supabase-js@2";

const url = Deno.env.get("SUPABASE_URL")!;
const anonKey = Deno.env.get("SUPABASE_ANON_KEY")!;
const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

export function userClient(request: Request) {
  const authorization = request.headers.get("Authorization") || "";
  if (!authorization.startsWith("Bearer ")) throw new Error("请先登录。");
  return createClient(url, anonKey, { global: { headers: { Authorization: authorization } }, auth: { persistSession: false } });
}

export function serviceClient() {
  return createClient(url, serviceRoleKey, { auth: { persistSession: false, autoRefreshToken: false } });
}

export async function requireAdmin(request: Request) {
  const client = userClient(request);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("请先登录。");
  const service = serviceClient();
  const { data: admin } = await service.from("admin_users").select("user_id").eq("user_id", user.id).maybeSingle();
  if (!admin) throw new Error("无权访问管理员功能。");
  return { user, service };
}
