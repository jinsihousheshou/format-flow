import { userClient } from "../_shared/clients.ts";
import { corsHeaders, errorResponse, json } from "../_shared/http.ts";

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  try {
    const { kind, inputFormat, outputFormat, fileSize } = await request.json();
    const { data, error } = await userClient(request).rpc("reserve_conversion", {
      p_kind: kind, p_input_format: inputFormat, p_output_format: outputFormat, p_file_size: fileSize,
    });
    if (error) throw error;
    return json(request, data);
  } catch (error) { return errorResponse(request, error); }
});
