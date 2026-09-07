export const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:3000,https://jinsihousheshou.github.io").split(",").map((value) => value.trim());

export function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Expose-Headers": "Content-Disposition, Content-Length, Content-Type",
    "Vary": "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

export function errorResponse(request: Request, error: unknown) {
  const structuredMessage = error && typeof error === "object" && "message" in error
    ? String((error as { message?: unknown }).message || "")
    : "";
  const message = error instanceof Error ? error.message : structuredMessage || "服务器处理失败。";
  const forbidden = ["无权", "登录", "激活后使用", "已被停用"].some((text) => message.includes(text));
  return json(request, { error: message }, forbidden ? 403 : 400);
}
