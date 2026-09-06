import { serviceClient, userClient } from "../_shared/clients.ts";
import { corsHeaders, json } from "../_shared/http.ts";
import { detectVideoPlatform, extractHttpsUrl, filenameFromUrl, isPrivateIp, validatePublicUrlShape, type VideoPlatform } from "../_shared/video-url.ts";

const MAX_REDIRECTS = 3;
const INSPECT_TIMEOUT_MS = 8_000;
const DOWNLOAD_TIMEOUT_MS = 30_000;

type Reservation = { actionId: string; maxVideoBytes: number; dailyLimit: number; usedToday: number };
type Inspection = { response: Response; finalUrl: URL; contentType: string; contentLength: number; title: string };

async function resolveDouyinVideoId(startUrl: URL) {
  let current = startUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    const host = validatePublicUrlShape(current);
    if (detectVideoPlatform(host) !== "douyin") throw new Error("抖音短链跳转到了未允许的域名。");
    const pathId = current.pathname.match(/\/(?:share\/)?video\/(\d{15,25})/i)?.[1];
    const modalId = current.searchParams.get("modal_id")?.match(/^\d{15,25}$/)?.[0];
    if (pathId || modalId) return pathId || modalId!;
    await assertPublicDns(host);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), INSPECT_TIMEOUT_MS);
    let response: Response;
    try { response = await fetch(current, { method: "HEAD", redirect: "manual", signal: controller.signal }); }
    finally { clearTimeout(timeout); }
    if (![301, 302, 303, 307, 308].includes(response.status)) throw new Error("该抖音链接不是单个公开视频分享链接。");
    if (redirect === MAX_REDIRECTS) throw new Error("抖音短链重定向次数过多。");
    const location = response.headers.get("location");
    if (!location) throw new Error("抖音短链返回了无效重定向。");
    current = new URL(location, current);
  }
  throw new Error("无法识别抖音视频 ID。");
}

async function inspectDouyin(url: URL) {
  const videoId = await resolveDouyinVideoId(url);
  const endpoint = new URL("https://open.douyin.com/api/douyin/v1/video/get_iframe_by_video");
  endpoint.searchParams.set("video_id", videoId);
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), INSPECT_TIMEOUT_MS);
  let response: Response;
  try { response = await fetch(endpoint, { signal: controller.signal, headers: { Accept: "application/json" } }); }
  finally { clearTimeout(timeout); }
  if (!response.ok) throw new Error(`抖音官方解析接口返回 HTTP ${response.status}。`);
  const payload = await response.json();
  if (payload.err_no !== 0 || !payload.data?.iframe_code) throw new Error(payload.err_msg || "该视频不是可公开预览的视频。");
  const src = String(payload.data.iframe_code).match(/\bsrc=["'](https:\/\/[^"']+)["']/i)?.[1];
  if (!src) throw new Error("抖音官方播放器地址无效。");
  const embedUrl = new URL(src.replaceAll("&amp;", "&"));
  if (embedUrl.hostname !== "open.douyin.com" || embedUrl.pathname !== "/player/video" || embedUrl.searchParams.get("vid") !== videoId) throw new Error("抖音官方播放器地址未通过安全检查。");
  return { title: String(payload.data.video_title || "抖音公开视频").slice(0, 200), width: Number(payload.data.video_width) || null, height: Number(payload.data.video_height) || null, embedUrl: embedUrl.toString() };
}

async function requireUser(request: Request) {
  const client = userClient(request);
  const { data: { user }, error } = await client.auth.getUser();
  if (error || !user) throw new Error("请先登录。");
  return client;
}

async function reserve(client: ReturnType<typeof userClient>, action: "parse" | "download", platform: VideoPlatform, host: string) {
  const { data, error } = await client.rpc("reserve_video_link_action", { p_action: action, p_platform: platform, p_source_host: host });
  if (error) throw new Error(error.message);
  return data as Reservation;
}

async function finish(client: ReturnType<typeof userClient>, actionId: string, status: "completed" | "failed", values: Record<string, unknown> = {}) {
  await client.rpc("finish_video_link_action", {
    p_action_id: actionId, p_status: status, p_title: values.title || null,
    p_content_type: values.contentType || null, p_content_length: values.contentLength || null,
    p_error_code: values.errorCode || null,
  });
}

async function hostIsAllowed(host: string) {
  const service = serviceClient();
  const { data, error } = await service.from("video_source_domains").select("hostname,allow_subdomains").eq("enabled", true);
  if (error) throw new Error(error.message);
  return (data || []).some((row) => host === row.hostname || (row.allow_subdomains && host.endsWith(`.${row.hostname}`)));
}

async function assertPublicDns(host: string) {
  if (/^(\d{1,3}\.){3}\d{1,3}$/.test(host) || host.includes(":")) {
    if (isPrivateIp(host)) throw new Error("不能访问本机或内网地址。");
    return;
  }
  const lookups = await Promise.allSettled([Deno.resolveDns(host, "A"), Deno.resolveDns(host, "AAAA")]);
  const addresses = lookups.flatMap((result) => result.status === "fulfilled" ? result.value : []);
  if (!addresses.length) throw new Error("无法解析视频域名。");
  if (addresses.some(isPrivateIp)) throw new Error("不能访问本机或内网地址。");
}

async function validateDirectUrl(url: URL) {
  const host = validatePublicUrlShape(url);
  if (!await hostIsAllowed(host)) throw new Error("该视频域名不在管理员白名单中。");
  await assertPublicDns(host);
  return host;
}

async function safeFetch(startUrl: URL, method: "HEAD" | "GET", timeoutMs: number, rangeProbe = false) {
  let current = startUrl;
  for (let redirect = 0; redirect <= MAX_REDIRECTS; redirect++) {
    await validateDirectUrl(current);
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    let response: Response;
    try {
      response = await fetch(current, { method, redirect: "manual", signal: controller.signal, headers: rangeProbe ? { Range: "bytes=0-0" } : undefined });
    } finally { clearTimeout(timeout); }
    if ([301, 302, 303, 307, 308].includes(response.status)) {
      if (redirect === MAX_REDIRECTS) throw new Error("视频链接重定向次数过多。");
      const location = response.headers.get("location");
      if (!location) throw new Error("视频源返回了无效重定向。");
      current = new URL(location, current);
      continue;
    }
    return { response, finalUrl: current };
  }
  throw new Error("视频链接重定向次数过多。");
}

async function inspectVideo(url: URL, maxBytes: number): Promise<Inspection> {
  let fetched = await safeFetch(url, "HEAD", INSPECT_TIMEOUT_MS);
  if (fetched.response.status === 405 || fetched.response.status === 501) fetched = await safeFetch(url, "GET", INSPECT_TIMEOUT_MS, true);
  if (!fetched.response.ok && fetched.response.status !== 206) throw new Error(`视频源返回 HTTP ${fetched.response.status}。`);
  const contentType = (fetched.response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
  if (!contentType.startsWith("video/")) throw new Error("该地址没有返回可下载的视频文件。");
  const totalFromRange = fetched.response.headers.get("content-range")?.match(/\/(\d+)$/)?.[1];
  const contentLength = Number(totalFromRange || fetched.response.headers.get("content-length"));
  if (!Number.isFinite(contentLength) || contentLength <= 0) throw new Error("视频源未提供文件大小，暂时无法安全下载。");
  if (contentLength > maxBytes) throw new Error(`视频超过当前套餐的 ${Math.floor(maxBytes / 1048576)} MB 限制。`);
  return { ...fetched, contentType, contentLength, title: filenameFromUrl(fetched.finalUrl) };
}

function codeFor(error: unknown) {
  const message = error instanceof Error ? error.message : String(error);
  if (message.includes("白名单")) return "DOMAIN_NOT_ALLOWED";
  if (message.includes("内网")) return "PRIVATE_NETWORK_BLOCKED";
  if (message.includes("次数")) return "DAILY_LIMIT_REACHED";
  if (message.includes("频繁") || message.includes("进行中")) return "RATE_LIMITED";
  if (message.includes("大小") || message.includes("MB")) return "SIZE_LIMIT";
  if (message.includes("HTTP")) return "UPSTREAM_HTTP_ERROR";
  return "PARSE_FAILED";
}

function downloadName(title: string, contentType: string) {
  const extension = contentType.split("/")[1]?.replace("quicktime", "mov").replace(/[^a-z0-9]/g, "") || "mp4";
  const stem = title.replace(/\.[a-z0-9]{1,6}$/i, "").replace(/[\\/:*?"<>|\r\n]/g, "_").slice(0, 100) || "video";
  return `${stem}.${extension}`;
}

Deno.serve(async (request) => {
  if (request.method === "OPTIONS") return new Response("ok", { headers: corsHeaders(request) });
  let client: ReturnType<typeof userClient> | null = null;
  let actionId = "";
  try {
    if (request.method !== "POST") return json(request, { error: "只支持 POST 请求。" }, 405);
    client = await requireUser(request);
    const body = await request.json();
    if (body.rightsConfirmed !== true) return json(request, { error: "请先确认您拥有该视频的下载和使用权限。" }, 400);
    const url = extractHttpsUrl(String(body.input || ""));
    const host = validatePublicUrlShape(url);
    const platform = detectVideoPlatform(host);
    const action = body.action === "download" ? "download" : body.action === "parse" ? "parse" : null;
    if (!action) return json(request, { error: "请求类型无效。" }, 400);
    const reserved = await reserve(client, action, platform, host);
    actionId = reserved.actionId;

    if (platform === "douyin") {
      if (action === "download") {
        await finish(client, actionId, "failed", { errorCode: "DOWNLOAD_NOT_AVAILABLE" });
        return json(request, { error: "抖音官方目前只开放公开视频播放器，没有提供可下载的 MP4 地址。", code: "DOWNLOAD_NOT_AVAILABLE", platform }, 422);
      }
      const inspected = await inspectDouyin(url);
      await finish(client, actionId, "completed", { title: inspected.title, contentType: "text/html" });
      return json(request, {
        platform, title: inspected.title, coverUrl: null, durationSeconds: null,
        width: inspected.width, height: inspected.height, embedUrl: inspected.embedUrl,
        contentType: "text/html", contentLength: 0, qualities: [], downloadAvailable: false,
        notice: "已通过抖音官方公开接口解析，可在线播放；官方未提供直接下载地址。",
        usage: { usedToday: reserved.usedToday, dailyLimit: reserved.dailyLimit },
      });
    }

    if (platform !== "direct") {
      await finish(client, actionId, "failed", { errorCode: "PLATFORM_MAINTENANCE" });
      return json(request, { error: "该平台目前没有稳定、合规的公开下载接口，暂时维护中。", code: "PLATFORM_MAINTENANCE", platform, maintenance: true }, 422);
    }

    const inspected = await inspectVideo(url, Number(reserved.maxVideoBytes));
    if (action === "parse") {
      await finish(client, actionId, "completed", inspected);
      return json(request, {
        platform, title: inspected.title, coverUrl: null, durationSeconds: null,
        contentType: inspected.contentType, contentLength: inspected.contentLength,
        qualities: [{ id: "original", label: "原始清晰度", contentType: inspected.contentType, size: inspected.contentLength }],
        usage: { usedToday: reserved.usedToday, dailyLimit: reserved.dailyLimit },
      });
    }

    if (body.qualityId !== "original") throw new Error("所选清晰度无效，请重新解析。");
    const fetched = await safeFetch(url, "GET", DOWNLOAD_TIMEOUT_MS);
    if (!fetched.response.ok || !fetched.response.body) throw new Error(`视频源返回 HTTP ${fetched.response.status}。`);
    const type = (fetched.response.headers.get("content-type") || "").split(";")[0].trim().toLowerCase();
    const length = Number(fetched.response.headers.get("content-length"));
    if (!type.startsWith("video/")) throw new Error("下载地址没有返回视频内容。");
    if (!Number.isFinite(length) || length <= 0) throw new Error("视频源未提供文件大小，暂时无法安全下载。");
    if (length > Number(reserved.maxVideoBytes)) throw new Error("下载文件超过当前套餐大小限制。");
    await finish(client, actionId, "completed", { title: inspected.title, contentType: type, contentLength: inspected.contentLength });
    const filename = downloadName(inspected.title, type);
    return new Response(fetched.response.body, { status: 200, headers: {
      ...corsHeaders(request), "Content-Type": type, "Content-Length": String(inspected.contentLength),
      "Content-Disposition": `attachment; filename="video.${filename.split(".").at(-1)}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "private, no-store", "X-Content-Type-Options": "nosniff",
    } });
  } catch (error) {
    const message = error instanceof Error ? error.message : "服务器处理失败。";
    if (client && actionId) await finish(client, actionId, "failed", { errorCode: codeFor(error) }).catch(() => undefined);
    const status = message.includes("登录") ? 401 : message.includes("激活") || message.includes("权限") ? 403 : message.includes("频繁") || message.includes("次数") || message.includes("进行中") ? 429 : 400;
    return json(request, { error: message, code: codeFor(error) }, status);
  }
});
