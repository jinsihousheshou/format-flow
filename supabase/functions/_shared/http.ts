export const allowedOrigins = (Deno.env.get("ALLOWED_ORIGINS") || "http://localhost:3000,https://jinsihousheshou.github.io").split(",").map((value) => value.trim());

export function corsHeaders(request: Request) {
  const origin = request.headers.get("Origin") || "";
  return {
    "Access-Control-Allow-Origin": allowedOrigins.includes(origin) ? origin : allowedOrigins[0],
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Vary": "Origin",
  };
}

export function json(request: Request, body: unknown, status = 200) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders(request), "Content-Type": "application/json" } });
}

export function errorResponse(request: Request, error: unknown) {
  const message = error instanceof Error ? error.message : "服务器处理失败。";
  return json(request, { error: message }, message.includes("无权") ? 403 : 400);
}
