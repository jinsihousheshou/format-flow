import { userClient } from "../_shared/clients.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  try {
    const { conversionId, status, errorMessage } = await request.json();
    const { error } = await userClient(request).rpc("finish_conversion", {
      p_conversion_id: conversionId, p_status: status, p_error_message: errorMessage || null,
    });
    if (error) throw error;
    return json(request, { ok: true });
  } catch (error) { return errorResponse(request, error); }
});
