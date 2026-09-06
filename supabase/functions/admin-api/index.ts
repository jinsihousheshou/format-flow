import { requireAdmin } from "../_shared/clients.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";

const planTypes = new Set(["trial", "monthly", "yearly", "lifetime", "credits"]);
const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function randomCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(16));
  const raw = Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
  return raw.match(/.{1,4}/g)!.join("-");
}

async function hashCode(code: string) {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  try {
    const { service } = await requireAdmin(request);
    const body = await request.json();

    if (body.action === "dashboard") {
      const today = new Date(); today.setUTCHours(0, 0, 0, 0);
      const [{ data: authData, error: authError }, { count: activatedUsers }, { count: todayConversions }, { count: totalCodes }, { data: codes, error: codesError }, { data: entitlements }] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("entitlements").select("user_id", { count: "exact", head: true }).eq("status", "active"),
        service.from("conversion_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        service.from("redemption_codes").select("id", { count: "exact", head: true }),
        service.from("redemption_codes").select("id,code_prefix,plan_type,conversion_limit,expires_at,activated_by,activated_at,disabled_at,note").order("generated_at", { ascending: false }).limit(100),
        service.from("entitlements").select("user_id,plan_type,expires_at,remaining_conversions,status"),
      ]);
      if (authError) throw authError;
      if (codesError) throw codesError;
      const users = authData.users;
      const emails = new Map(users.map((user) => [user.id, user.email || ""]));
      const entitlementMap = new Map((entitlements || []).map((item) => [item.user_id, item]));
      return json(request, {
        stats: { registeredUsers: users.length, activatedUsers: activatedUsers || 0, todayConversions: todayConversions || 0, totalCodes: totalCodes || 0 },
        codes: (codes || []).map((code) => ({ ...code, activated_by_email: code.activated_by ? emails.get(code.activated_by) || "未知用户" : null })),
        users: users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, banned_until: user.banned_until, ...(entitlementMap.get(user.id) || {}) })),
      });
    }

    if (body.action === "generate-codes") {
      const count = Math.max(1, Math.min(100, Number(body.count) || 1));
      if (!planTypes.has(body.planType)) throw new Error("套餐类型无效。");
      const codes = Array.from({ length: count }, randomCode);
      const expiresAt = new Date(Date.now() + Math.max(1, Number(body.codeExpiresDays) || 30) * 86400000).toISOString();
      const rows = await Promise.all(codes.map(async (code) => ({
        code_hash: await hashCode(code), code_prefix: `${code.slice(0, 4)}-••••-••••-${code.slice(-4)}`,
        plan_type: body.planType, validity_days: body.validityDays || null,
        conversion_limit: body.conversionLimit || null, expires_at: expiresAt, note: String(body.note || "").slice(0, 200) || null,
      })));
      const { error } = await service.from("redemption_codes").insert(rows);
      if (error) throw error;
      return json(request, { codes });
    }

    if (body.action === "toggle-code") {
      const { error } = await service.from("redemption_codes").update({ disabled_at: body.disabled ? new Date().toISOString() : null }).eq("id", body.codeId);
      if (error) throw error;
      return json(request, { ok: true });
    }

    if (body.action === "update-user") {
      const expiresAt = Number(body.expiresInDays) === 0 ? null : new Date(Date.now() + Math.max(1, Number(body.expiresInDays)) * 86400000).toISOString();
      const { error } = await service.from("entitlements").upsert({ user_id: body.userId, plan_type: expiresAt ? "monthly" : "lifetime", activated_at: new Date().toISOString(), expires_at: expiresAt, remaining_conversions: body.remainingConversions, status: "active", updated_at: new Date().toISOString() });
      if (error) throw error;
      return json(request, { ok: true });
    }

    if (body.action === "toggle-ban") {
      const [{ error: authError }, { error: profileError }] = await Promise.all([
        service.auth.admin.updateUserById(body.userId, { ban_duration: body.banned ? "876000h" : "none" }),
        service.from("profiles").update({ is_banned: Boolean(body.banned), updated_at: new Date().toISOString() }).eq("id", body.userId),
      ]);
      if (authError) throw authError;
      if (profileError) throw profileError;
      return json(request, { ok: true });
    }

    throw new Error("未知的管理员操作。");
  } catch (error) { return errorResponse(request, error); }
});
