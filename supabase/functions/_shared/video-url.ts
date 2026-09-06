export type VideoPlatform = "direct" | "douyin" | "kuaishou" | "bilibili";

const platformHosts: Record<Exclude<VideoPlatform, "direct">, string[]> = {
  douyin: ["douyin.com", "iesdouyin.com"],
  kuaishou: ["kuaishou.com"],
  bilibili: ["bilibili.com", "b23.tv"],
};

export function extractHttpsUrl(input: string) {
  const match = input.match(/https:\/\/[^\s<>"'，。；！？、]+/i);
  if (!match) throw new Error("没有找到有效的 HTTPS 视频链接。");
  const cleaned = match[0].replace(/[)\]}】）〉》」』]+$/g, "");
  if (cleaned.length > 2048) throw new Error("链接过长。");
  return new URL(cleaned);
}

function matchesHost(hostname: string, allowed: string) {
  return hostname === allowed || hostname.endsWith(`.${allowed}`);
}

export function detectVideoPlatform(hostname: string): VideoPlatform {
  const host = hostname.toLowerCase().replace(/\.$/, "");
  for (const [platform, hosts] of Object.entries(platformHosts)) {
    if (hosts.some((allowed) => matchesHost(host, allowed))) return platform as Exclude<VideoPlatform, "direct">;
  }
  return "direct";
}

export function validatePublicUrlShape(url: URL) {
  if (url.protocol !== "https:") throw new Error("只支持 HTTPS 视频链接。");
  if (url.username || url.password) throw new Error("链接不能包含账号信息。");
  if (url.port && url.port !== "443") throw new Error("链接端口不在允许范围内。");
  const host = url.hostname.toLowerCase().replace(/\.$/, "");
  if (!host || host === "localhost" || host.endsWith(".localhost") || host.endsWith(".local")) throw new Error("不能访问本机或内网地址。");
  if (host.includes("%") || host.includes("\\")) throw new Error("域名格式无效。");
  return host;
}

function isPrivateIpv4(address: string) {
  const parts = address.split(".").map(Number);
  if (parts.length !== 4 || parts.some((part) => !Number.isInteger(part) || part < 0 || part > 255)) return true;
  const [a, b] = parts;
  return a === 0 || a === 10 || a === 127 || (a === 100 && b >= 64 && b <= 127) ||
    (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
    (a === 192 && b === 0) || (a === 198 && (b === 18 || b === 19)) || a >= 224;
}

export function isPrivateIp(address: string) {
  const normalized = address.toLowerCase().replace(/^\[|\]$/g, "").split("%")[0];
  if (normalized.includes(".")) {
    const mapped = normalized.match(/(?:^|:)ffff:(\d+\.\d+\.\d+\.\d+)$/)?.[1];
    return isPrivateIpv4(mapped || normalized);
  }
  if (!normalized.includes(":")) return true;
  return normalized === "::" || normalized === "::1" || normalized.startsWith("fc") || normalized.startsWith("fd") || /^fe[89ab]/.test(normalized);
}

export function filenameFromUrl(url: URL) {
  const last = url.pathname.split("/").filter(Boolean).at(-1) || "video";
  try { return decodeURIComponent(last).slice(0, 160) || "video"; } catch { return last.slice(0, 160); }
}
