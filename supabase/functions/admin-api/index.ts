import { requireAdmin } from "../_shared/clients.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";

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
      const [{ data: authData, error: authError }, { count: activatedUsers }, { count: todayConversions }, { count: totalCodes }, { data: codes, error: codesError }, { data: entitlements }, { data: planLimits, error: limitsError }] = await Promise.all([
        service.auth.admin.listUsers({ page: 1, perPage: 1000 }),
        service.from("entitlements").select("user_id", { count: "exact", head: true }).eq("status", "active"),
        service.from("conversion_logs").select("id", { count: "exact", head: true }).gte("created_at", today.toISOString()),
        service.from("redemption_codes").select("id", { count: "exact", head: true }),
        service.from("redemption_codes").select("id,code_prefix,plan_type,conversion_limit,expires_at,activated_by,activated_at,disabled_at,note").order("generated_at", { ascending: false }).limit(100),
        service.from("entitlements").select("user_id,plan_type,expires_at,remaining_conversions,status"),
        service.from("plan_video_limits").select("plan_type,daily_parse_limit,daily_download_limit,max_video_bytes").eq("plan_type", "lifetime"),
      ]);
      if (authError) throw authError;
      if (codesError) throw codesError;
      if (limitsError) throw limitsError;
      const users = authData.users;
      const emails = new Map(users.map((user) => [user.id, user.email || ""]));
      const entitlementMap = new Map((entitlements || []).map((item) => [item.user_id, item]));
      return json(request, {
        stats: { registeredUsers: users.length, activatedUsers: activatedUsers || 0, todayConversions: todayConversions || 0, totalCodes: totalCodes || 0 },
        codes: (codes || []).map((code) => ({ ...code, activated_by_email: code.activated_by ? emails.get(code.activated_by) || "未知用户" : null })),
        users: users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, banned_until: user.banned_until, ...(entitlementMap.get(user.id) || {}) })),
        planLimits: planLimits || [],
      });
    }

    if (body.action === "generate-codes") {
      const codes = [randomCode()];
      const rows = await Promise.all(codes.map(async (code) => ({
        code_hash: await hashCode(code), code_prefix: `${code.slice(0, 4)}-••••-••••-${code.slice(-4)}`,
        plan_type: "lifetime", validity_days: null,
        conversion_limit: null, expires_at: null, note: String(body.note || "").slice(0, 200) || null,
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
      const { error } = await service.from("entitlements").upsert({ user_id: body.userId, plan_type: "lifetime", activated_at: new Date().toISOString(), expires_at: null, remaining_conversions: null, status: "active", updated_at: new Date().toISOString() });
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

    if (body.action === "update-video-limits") {
      if (body.planType !== "lifetime") throw new Error("只允许配置长期权限额度。");
      const dailyParseLimit = Number(body.dailyParseLimit);
      const dailyDownloadLimit = Number(body.dailyDownloadLimit);
      const maxVideoMb = Number(body.maxVideoMb);
      if (![dailyParseLimit, dailyDownloadLimit, maxVideoMb].every(Number.isInteger) || dailyParseLimit < 0 || dailyParseLimit > 1000 || dailyDownloadLimit < 0 || dailyDownloadLimit > 1000 || maxVideoMb < 1 || maxVideoMb > 100) throw new Error("视频限额超出允许范围。");
      const { error } = await service.from("plan_video_limits").update({
        daily_parse_limit: dailyParseLimit, daily_download_limit: dailyDownloadLimit,
        max_video_bytes: maxVideoMb * 1024 * 1024, updated_at: new Date().toISOString(),
      }).eq("plan_type", body.planType);
      if (error) throw error;
      return json(request, { ok: true });
    }

    throw new Error("未知的管理员操作。");
  } catch (error) { return errorResponse(request, error); }
});
