import { userClient } from "../_shared/clients.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  try {
    const { code } = await request.json();
    if (typeof code !== "string" || code.trim().length < 12) throw new Error("请输入有效的激活码。");
    const { data, error } = await userClient(request).rpc("redeem_code", { p_code: code });
    if (error) throw error;
    return json(request, { entitlement: data });
  } catch (error) { return errorResponse(request, error); }
});
