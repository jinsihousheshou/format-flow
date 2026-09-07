export const videoApiUrl = process.env.NEXT_PUBLIC_VIDEO_API_URL?.replace(/\/$/, "") ?? "";
export const isVideoApiConfigured = /^https:\/\//.test(videoApiUrl) || /^http:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/.test(videoApiUrl);

function connectionMessage() {
  if (!videoApiUrl) return "视频下载后端尚未配置，请设置 NEXT_PUBLIC_VIDEO_API_URL。";
  if (typeof window !== "undefined" && window.location.protocol === "https:" && videoApiUrl.startsWith("http://")) {
    return "正式网站不能连接 HTTP 后端，请把视频 API 部署为 HTTPS。";
  }
  return "无法连接视频下载后端。请检查服务是否运行、API 地址、HTTPS 和 CORS 配置。";
}

export async function videoApiRequest<T>(
  path: string,
  token: string,
  init: RequestInit = {},
  timeoutMs = 45_000,
): Promise<T> {
  if (!isVideoApiConfigured) throw new Error(connectionMessage());
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(`${videoApiUrl}${path}`, {
      ...init,
      signal: controller.signal,
      headers: {
        Authorization: `Bearer ${token}`,
        ...(init.body ? { "Content-Type": "application/json" } : {}),
        ...init.headers,
      },
    });
    const payload = await response.json().catch(() => null);
    if (!response.ok) throw new Error(payload?.detail || payload?.error || `视频后端返回 HTTP ${response.status}。`);
    return payload as T;
  } catch (error) {
    if (error instanceof DOMException && error.name === "AbortError") throw new Error("视频后端响应超时，请稍后重试。");
    if (error instanceof TypeError) throw new Error(connectionMessage());
    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function videoApiFile(path: string, token: string): Promise<Response> {
  if (!isVideoApiConfigured) throw new Error(connectionMessage());
  try {
    const response = await fetch(`${videoApiUrl}${path}`, { headers: { Authorization: `Bearer ${token}` } });
    if (!response.ok) {
      const payload = await response.json().catch(() => null);
      throw new Error(payload?.detail || payload?.error || `视频文件下载失败（HTTP ${response.status}）。`);
    }
    return response;
  } catch (error) {
    if (error instanceof TypeError) throw new Error(connectionMessage());
    throw error;
  }
}
