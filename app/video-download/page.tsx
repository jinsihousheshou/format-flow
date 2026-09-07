"use client";

import Link from "next/link";
import { AlertCircle, CheckCircle2, Clipboard, Clock3, Download, ExternalLink, FileVideo2, LoaderCircle, Play, RefreshCw, ShieldCheck } from "lucide-react";
import { useCallback, useEffect, useMemo, useState } from "react";
import AuthModal from "../../components/auth-modal";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";
import { edgeFunction, isSupabaseConfigured, supabaseAnonKey, supabaseRequest, supabaseUrl } from "../../lib/supabase";
import { isVideoApiConfigured, videoApiFile, videoApiRequest } from "../../lib/video-api";

type ParseResult = {
  parseId?: string;
  platform: "direct" | "douyin" | "bilibili" | "kuaishou"; title: string; coverUrl: string | null; durationSeconds: number | null;
  contentType?: string; contentLength?: number;
  qualities: { id: string; label: string; contentType?: string; size?: number | null; width?: number | null; height?: number | null; ext?: string }[];
  width?: number | null; height?: number | null; embedUrl?: string; downloadAvailable?: boolean; notice?: string;
  usage: { usedToday: number; dailyLimit: number };
};
type VideoLog = { id: string; platform: string; source_host: string; status: "started" | "completed" | "failed"; title: string | null; error_code: string | null; created_at: string };

const platforms = [
  { name: "普通视频直链", detail: "白名单 HTTPS 地址", ready: true },
  { name: "抖音公开视频", detail: "当前仅官方预览", ready: false },
  { name: "快手公开视频", detail: "解析器支持不稳定", ready: false },
  { name: "哔哩哔哩公开视频", detail: "独立后端解析下载", ready: true },
];

function activeEntitlement(auth: ReturnType<typeof useAuth>) {
  const entitlement = auth.account.entitlement;
  return Boolean(entitlement && entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at).getTime() > Date.now()) && (entitlement.remaining_conversions === null || entitlement.remaining_conversions > 0));
}

function formatBytes(value?: number | null) {
  if (!value) return "大小由源站提供";
  if (value < 1048576) return `${Math.ceil(value / 1024)} KB`;
  return `${(value / 1048576).toFixed(1)} MB`;
}

function filenameFromDisposition(header: string | null, fallback: string) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) try { return decodeURIComponent(encoded); } catch { /* use fallback */ }
  return `${fallback.replace(/\.[a-z0-9]{1,6}$/i, "").replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "video"}.mp4`;
}

function inspectPastedLink(input: string) {
  const match = input.match(/https:\/\/[^\s<>"'，。；！？、]+/i);
  if (!match) return { error: "没有找到 HTTPS 链接，请重新复制视频分享内容。", platform: "unknown" };
  try {
    const url = new URL(match[0].replace(/[)\]}】）〉》」』]+$/g, ""));
    const host = url.hostname.toLowerCase();
    if (host === "douyin.com" || host.endsWith(".douyin.com")) {
      if (url.pathname.startsWith("/user/")) return { error: "这是抖音个人页或“我的喜欢”页面，不是单个公开视频链接。请打开具体视频，点击“分享 → 复制链接”后再粘贴。", platform: "douyin" };
      return { error: "", platform: "douyin" };
    }
    if (host === "kuaishou.com" || host.endsWith(".kuaishou.com")) {
      if (/\/(profile|user)\//i.test(url.pathname)) return { error: "这是快手个人页，不是单个公开视频分享链接。请从具体视频的分享菜单复制链接。", platform: "kuaishou" };
      return { error: "", platform: "kuaishou" };
    }
    if (host === "b23.tv" || host === "bilibili.com" || host.endsWith(".bilibili.com")) {
      if (host !== "b23.tv" && !url.pathname.startsWith("/video/")) return { error: "这不是哔哩哔哩单个视频页链接，请复制以 /video/BV… 开头的视频地址。", platform: "bilibili" };
      return { error: "", platform: "bilibili" };
    }
    return { error: "", platform: "direct" };
  } catch { return { error: "链接格式不正确，请重新复制。", platform: "unknown" }; }
}

function ResultCard({ result, quality, setQuality, busy, progress, onDownload }: {
  result: ParseResult;
  quality: string;
  setQuality: (value: string) => void;
  busy: "parse" | "download" | null;
  progress: number;
  onDownload: () => void;
}) {
  const sourceName = result.platform === "douyin" ? "抖音" : result.platform === "bilibili" ? "哔哩哔哩" : result.platform === "kuaishou" ? "快手" : "普通视频直链";
  return <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
    {result.embedUrl ? <div className="bg-slate-950 p-3 sm:p-5"><iframe src={result.embedUrl} title={result.title} className="mx-auto aspect-[9/16] max-h-[560px] w-full max-w-[315px] rounded-xl bg-black" allow="autoplay; fullscreen" allowFullScreen referrerPolicy="strict-origin-when-cross-origin" /></div> : <div className="flex flex-col gap-4 bg-gradient-to-br from-slate-950 to-violet-950 p-5 text-white sm:flex-row sm:items-center">
      {result.coverUrl ? <img src={result.coverUrl} alt="视频封面" className="aspect-video w-full rounded-xl object-cover sm:w-56" referrerPolicy="no-referrer" /> : <div className="grid aspect-video w-full place-items-center rounded-xl bg-white/10 sm:w-44"><FileVideo2 className="h-10 w-10 text-violet-200" /></div>}
      <div className="min-w-0 flex-1"><span className="rounded-full bg-emerald-400/15 px-2.5 py-1 text-xs text-emerald-200">{sourceName}</span><h2 className="mt-3 text-lg font-semibold">{result.title}</h2><p className="mt-2 text-xs text-white/60">{result.durationSeconds ? `${Math.floor(result.durationSeconds / 60)}:${String(Math.floor(result.durationSeconds % 60)).padStart(2, "0")} · ` : ""}{result.contentType || "公开视频"}</p></div>
    </div>}
    <div className="p-5">
      {result.notice && <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">{result.notice}</p>}
      {result.qualities.length > 0 && <label className="mt-4 block text-xs font-semibold text-slate-500">选择清晰度<select value={quality} onChange={(event) => setQuality(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800">{result.qualities.map((item) => <option key={item.id} value={item.id}>{item.label} · {formatBytes(item.size)}</option>)}</select></label>}
      <button onClick={onDownload} disabled={Boolean(busy) || result.downloadAvailable === false} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:bg-slate-300">{result.downloadAvailable === false ? "平台未开放直接下载" : busy === "download" ? <><LoaderCircle className="h-4 w-4 animate-spin" />处理中 {progress}%</> : <><Download className="h-4 w-4" />下载视频</>}</button>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-500"><span>今日解析 {result.usage.usedToday}/{result.usage.dailyLimit}</span>{result.downloadAvailable !== false && <Link href="/" className="inline-flex items-center gap-1 font-semibold text-violet-700">下载后继续转换为 MP4、MP3 <ExternalLink className="h-3 w-3" /></Link>}</div>
    </div>
  </section>;
}

export default function VideoDownloadPage() {
  const auth = useAuth();
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "redeem">("login");
  const [busy, setBusy] = useState<"parse" | "download" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [result, setResult] = useState<ParseResult | null>(null);
  const [quality, setQuality] = useState("original");
  const [history, setHistory] = useState<VideoLog[]>([]);
  const activated = useMemo(() => activeEntitlement(auth), [auth]);

  const loadHistory = useCallback(async () => {
    if (!auth.session || !isSupabaseConfigured) { setHistory([]); return; }
    try {
      setHistory(await supabaseRequest<VideoLog[]>("/rest/v1/video_link_logs?select=id,platform,source_host,status,title,error_code,created_at&action=eq.parse&order=created_at.desc&limit=8", {}, await auth.getAccessToken()));
    } catch { setHistory([]); }
  }, [auth.getAccessToken, auth.session]);
  useEffect(() => { void loadHistory(); }, [loadHistory]);

  const requireAccess = () => {
    if (!auth.session) { setAuthMode("login"); setAuthOpen(true); return false; }
    if (!activated) { setAuthMode("redeem"); setAuthOpen(true); return false; }
    return true;
  };

  const paste = async () => {
    try { setInput(await navigator.clipboard.readText()); setError(""); }
    catch { setError("浏览器未允许读取剪贴板，请长按输入框手动粘贴。"); }
  };

  const parse = async () => {
    setError(""); setResult(null);
    if (!confirmed) { setError("请先勾选权利确认。 "); return; }
    if (!input.trim()) { setError("请粘贴视频链接或包含链接的分享文案。"); return; }
    const inspection = inspectPastedLink(input);
    if (inspection.error) { setError(inspection.error); return; }
    if (!auth.configured) {
      setError(inspection.platform === "direct" ? "链接格式检查通过，但站点管理员尚未启用 Supabase 后端，当前不能执行下载。" : `${inspection.platform === "douyin" ? "抖音" : inspection.platform === "kuaishou" ? "快手" : "哔哩哔哩"}视频链接识别成功；该平台下载目前处于维护状态，同时站点后端尚未启用。`);
      return;
    }
    if (!requireAccess()) return;
    setBusy("parse");
    try {
      const accessToken = await auth.getAccessToken();
      const parsed = isVideoApiConfigured
        ? await videoApiRequest<ParseResult>("/api/parse", accessToken, { method: "POST", body: JSON.stringify({ input, rights_confirmed: true }) })
        : await edgeFunction<ParseResult>("video-link", { action: "parse", input, rightsConfirmed: true }, accessToken);
      setResult(parsed); setQuality(parsed.qualities[0]?.id || "");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "解析失败，请稍后重试。"); }
    finally { setBusy(null); await loadHistory(); }
  };

  const downloadVideo = async () => {
    if (!result || !requireAccess()) return;
    setBusy("download"); setProgress(0); setError("");
    try {
      let response: Response;
      if (result.parseId && isVideoApiConfigured) {
        const created = await videoApiRequest<{ jobId: string }>("/api/download", await auth.getAccessToken(), {
          method: "POST", body: JSON.stringify({ parse_id: result.parseId, format_id: quality, rights_confirmed: true }),
        });
        const deadline = Date.now() + 10 * 60_000;
        while (true) {
          const job = await videoApiRequest<{ status: string; progress: number; error: string | null }>(`/api/jobs/${created.jobId}`, await auth.getAccessToken(), {}, 15_000);
          setProgress(job.progress);
          if (job.status === "completed") break;
          if (job.status === "failed") throw new Error(job.error || "视频下载任务失败。");
          if (Date.now() >= deadline) throw new Error("视频下载任务超时。");
          await new Promise((resolve) => setTimeout(resolve, 1000));
        }
        response = await videoApiFile(`/api/jobs/${created.jobId}/file`, await auth.getAccessToken());
      } else {
        const accessToken = await auth.getAccessToken();
        response = await fetch(`${supabaseUrl}/functions/v1/video-link`, {
          method: "POST", headers: { apikey: supabaseAnonKey, Authorization: `Bearer ${accessToken}`, "Content-Type": "application/json" },
          body: JSON.stringify({ action: "download", input, qualityId: quality, rightsConfirmed: true }),
        });
      }
      if (!response.ok) { const payload = await response.json().catch(() => null); throw new Error(payload?.error || "下载失败，请稍后重试。"); }
      if (!response.body) throw new Error("浏览器无法读取下载内容。");
      const total = Number(response.headers.get("content-length")) || result.contentLength || 0;
      const reader = response.body.getReader(); const chunks: ArrayBuffer[] = []; let received = 0;
      while (true) { const { done, value } = await reader.read(); if (done) break; if (value) { const copy = new Uint8Array(value.byteLength); copy.set(value); chunks.push(copy.buffer); received += value.byteLength; if (total) setProgress(Math.min(100, Math.round(received / total * 100))); } }
      const blob = new Blob(chunks, { type: response.headers.get("content-type") || result.contentType || "video/mp4" });
      const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = filenameFromDisposition(response.headers.get("content-disposition"), result.title); anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); setProgress(100);
    } catch (reason) { setError(reason instanceof Error ? reason.message : "下载失败，请稍后重试。"); }
    finally { setBusy(null); await loadHistory(); }
  };

  return <main className="min-h-screen overflow-hidden bg-[#fafafe] text-slate-900">
    <SiteHeader />
    <div className="pointer-events-none absolute inset-x-0 top-16 -z-0 h-[520px] bg-[radial-gradient(circle_at_35%_20%,rgba(124,58,237,0.16),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(37,99,235,0.12),transparent_30%)]" />
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-violet-700"><ShieldCheck className="h-3.5 w-3.5" />后端鉴权与安全校验</span><h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">视频链接下载</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">粘贴公开视频直链，服务端会验证账号权限、域名、重定向和文件大小。仅处理您本人发布、拥有版权或已获授权的视频。</p></div>

      <div className="mx-auto mt-10 max-w-4xl rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(79,70,229,0.12)] backdrop-blur sm:p-8">
        {!auth.configured && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">站点后端尚未启用。你仍可点击“开始解析”检查链接是否正确，登录与下载暂不可用。</div>}
        {auth.configured && !isVideoApiConfigured && <div className="mb-5 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm leading-6 text-amber-800">独立视频下载后端尚未配置。普通直链仍使用现有接口，抖音只能官方预览；部署 FastAPI 后端并设置 VIDEO_API_URL 后才会启用 yt-dlp 下载。</div>}
        <label className="text-sm font-semibold text-slate-800" htmlFor="video-link">视频分享链接或分享文案</label>
        <div className="relative mt-2"><textarea id="video-link" value={input} onChange={(event) => { setInput(event.target.value); setResult(null); setError(""); }} rows={5} placeholder="例如：复制这段内容打开应用…… https://example.com/video.mp4" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-4 pr-28 text-sm leading-6 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /><button type="button" onClick={() => void paste()} className="absolute right-3 top-3 inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700"><Clipboard className="h-3.5 w-3.5" />粘贴链接</button></div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" /><span>我确认对该视频拥有下载、保存和使用权限。</span></label>
        <button type="button" disabled={Boolean(busy)} onClick={() => void parse()} className="mt-5 flex h-13 w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:cursor-not-allowed disabled:opacity-50">{busy === "parse" ? <><LoaderCircle className="h-4 w-4 animate-spin" />正在安全解析</> : <><Play className="h-4 w-4 fill-current" />开始解析</>}</button>
        {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div className="flex-1"><p>{error}</p><button onClick={() => void parse()} className="mt-1 inline-flex items-center gap-1 font-semibold"><RefreshCw className="h-3.5 w-3.5" />重新解析</button></div></div>}

        {result && <ResultCard result={result} quality={quality} setQuality={setQuality} busy={busy} progress={progress} onDownload={() => void downloadVideo()} />}
      </div>

      <section className="mx-auto mt-10 max-w-5xl"><h2 className="text-center text-xl font-bold">第一阶段支持状态</h2><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{platforms.map((platform) => <article key={platform.name} className="rounded-2xl border border-slate-200 bg-white p-5"><div className={`grid h-10 w-10 place-items-center rounded-xl ${platform.ready ? "bg-emerald-50 text-emerald-600" : "bg-slate-100 text-slate-500"}`}><FileVideo2 className="h-5 w-5" /></div><h3 className="mt-4 text-sm font-semibold">{platform.name}</h3><p className="mt-1 text-xs text-slate-500">{platform.detail}</p><span className={`mt-3 inline-flex rounded-full px-2.5 py-1 text-[11px] font-semibold ${platform.ready ? "bg-emerald-50 text-emerald-700" : "bg-amber-50 text-amber-700"}`}>{platform.ready ? "可用" : "维护中"}</span></article>)}</div></section>

      {auth.session && <section className="mx-auto mt-10 max-w-4xl rounded-[24px] border border-slate-200 bg-white p-6"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-violet-600" /><h2 className="font-bold">最近解析记录</h2></div>{history.length ? <div className="mt-4 divide-y divide-slate-100">{history.map((item) => <div key={item.id} className="flex flex-col gap-1 py-3 text-sm sm:flex-row sm:items-center sm:justify-between"><div className="min-w-0"><p className="truncate font-medium text-slate-800">{item.title || item.source_host}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("zh-CN")} · {item.platform}</p></div><span className={`inline-flex items-center gap-1 text-xs font-semibold ${item.status === "completed" ? "text-emerald-600" : item.status === "failed" ? "text-rose-600" : "text-amber-600"}`}>{item.status === "completed" && <CheckCircle2 className="h-3.5 w-3.5" />}{item.status === "completed" ? "成功" : item.status === "failed" ? item.error_code === "PLATFORM_MAINTENANCE" ? "平台维护中" : "失败" : "处理中"}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">暂无解析记录。</p>}</section>}
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-slate-500">本站不会要求平台账号、密码或登录 Cookie，不处理私密、付费、会员或 DRM 内容，不提供批量采集或专门去除水印功能。下载流不写入服务器临时文件，日志仅保存域名与任务状态。</p>
    </section>
    <AuthModal key={authMode} open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
  </main>;
}
