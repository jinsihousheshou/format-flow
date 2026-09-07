"use client";

import { AlertCircle, Clipboard, Clock3, Download, ExternalLink, FileAudio2, LoaderCircle, Music2, Play, RefreshCw, ShieldCheck, Trash2 } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import AuthModal from "../../components/auth-modal";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";
import { isVideoApiConfigured, videoApiFile, videoApiRequest } from "../../lib/video-api";

type AudioResult = {
  parseId: string;
  platform: "audio_direct" | "netease" | "qqmusic" | "kugou";
  title: string;
  author: string | null;
  coverUrl: string | null;
  durationSeconds: number | null;
  qualities: { id: string; label: string; ext: string; contentType?: string }[];
  downloadAvailable: boolean;
  officialUrl: string;
  notice: string | null;
  usage: { usedToday: number; dailyLimit: number };
};

type DownloadRecord = { id: string; title: string; author: string | null; format: string; platform: string; createdAt: string };
const historyKey = (userId?: string) => `format-flow-audio-download-history:${userId || "guest"}`;

function hasAccess(auth: ReturnType<typeof useAuth>) {
  const item = auth.account.entitlement;
  return Boolean(item && item.status === "active" && (!item.expires_at || new Date(item.expires_at).getTime() > Date.now()) && (item.remaining_conversions === null || item.remaining_conversions > 0));
}

function sourceName(platform: AudioResult["platform"]) {
  return platform === "netease" ? "网易云音乐" : platform === "qqmusic" ? "QQ音乐" : platform === "kugou" ? "酷狗音乐" : "公开媒体直链";
}

function durationText(seconds: number | null) {
  if (!seconds) return "时长由来源提供";
  return `${Math.floor(seconds / 60)}:${String(Math.floor(seconds % 60)).padStart(2, "0")}`;
}

function downloadFilename(header: string | null, title: string, format: string) {
  const encoded = header?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  if (encoded) try { return decodeURIComponent(encoded); } catch { /* use safe fallback */ }
  return `${title.replace(/[\\/:*?"<>|]/g, "_").slice(0, 80) || "audio"}.${format}`;
}

export default function AudioDownloadPage() {
  const auth = useAuth();
  const [input, setInput] = useState("");
  const [confirmed, setConfirmed] = useState(false);
  const [result, setResult] = useState<AudioResult | null>(null);
  const [format, setFormat] = useState("mp3");
  const [busy, setBusy] = useState<"parse" | "download" | null>(null);
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "redeem">("login");
  const [history, setHistory] = useState<DownloadRecord[]>([]);
  const activated = useMemo(() => hasAccess(auth), [auth]);

  useEffect(() => {
    try { setHistory(JSON.parse(localStorage.getItem(historyKey(auth.session?.user.id)) || "[]")); } catch { setHistory([]); }
  }, [auth.session?.user.id]);

  const requireAccess = () => {
    if (!auth.session) { setAuthMode("login"); setAuthOpen(true); return false; }
    if (!activated) { setAuthMode("redeem"); setAuthOpen(true); return false; }
    return true;
  };

  const paste = async () => {
    try { setInput(await navigator.clipboard.readText()); setError(""); }
    catch { setError("浏览器未允许读取剪贴板，请长按输入框手动粘贴。"); }
  };

  const parseAudio = async () => {
    setError(""); setResult(null);
    if (!confirmed) { setError("请先勾选内容权利确认。"); return; }
    if (!input.trim()) { setError("请粘贴音频链接或包含链接的分享文案。"); return; }
    if (!requireAccess()) return;
    if (!isVideoApiConfigured) { setError("媒体处理后端尚未连接，请管理员检查 API 地址和服务状态。"); return; }
    setBusy("parse");
    try {
      const parsed = await videoApiRequest<AudioResult>("/api/audio/parse", await auth.getAccessToken(), {
        method: "POST", body: JSON.stringify({ input, rights_confirmed: true }),
      });
      setResult(parsed); setFormat(parsed.qualities[0]?.id || "mp3");
    } catch (reason) { setError(reason instanceof Error ? reason.message : "音频解析失败，请稍后重试。"); }
    finally { setBusy(null); }
  };

  const downloadAudio = async () => {
    if (!result || !result.downloadAvailable || !requireAccess()) return;
    setBusy("download"); setProgress(0); setError("");
    try {
      const created = await videoApiRequest<{ jobId: string }>("/api/audio/download", await auth.getAccessToken(), {
        method: "POST", body: JSON.stringify({ parse_id: result.parseId, format_id: format, rights_confirmed: true }),
      });
      const deadline = Date.now() + 10 * 60_000;
      while (true) {
        const job = await videoApiRequest<{ status: string; progress: number; error: string | null }>(`/api/jobs/${created.jobId}`, await auth.getAccessToken(), {}, 15_000);
        setProgress(job.progress);
        if (job.status === "completed") break;
        if (job.status === "failed") throw new Error(job.error || "音频处理失败。");
        if (Date.now() >= deadline) throw new Error("音频处理超时，请稍后重试。");
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      const response = await videoApiFile(`/api/jobs/${created.jobId}/file`, await auth.getAccessToken());
      const blob = await response.blob();
      const objectUrl = URL.createObjectURL(blob); const anchor = document.createElement("a");
      anchor.href = objectUrl; anchor.download = downloadFilename(response.headers.get("content-disposition"), result.title, format); anchor.click();
      setTimeout(() => URL.revokeObjectURL(objectUrl), 1000); setProgress(100);
      const record = { id: crypto.randomUUID(), title: result.title, author: result.author, format: format.toUpperCase(), platform: sourceName(result.platform), createdAt: new Date().toISOString() };
      const next = [record, ...history].slice(0, 10); setHistory(next); localStorage.setItem(historyKey(auth.session?.user.id), JSON.stringify(next));
    } catch (reason) { setError(reason instanceof Error ? reason.message : "音频下载失败，请稍后重试。"); }
    finally { setBusy(null); }
  };

  const clearHistory = () => { setHistory([]); localStorage.removeItem(historyKey(auth.session?.user.id)); };

  return <main className="min-h-screen overflow-hidden bg-[#fafafe] text-slate-900">
    <SiteHeader />
    <div className="pointer-events-none absolute inset-x-0 top-16 h-[520px] bg-[radial-gradient(circle_at_35%_20%,rgba(124,58,237,0.16),transparent_32%),radial-gradient(circle_at_70%_30%,rgba(6,182,212,0.12),transparent_30%)]" />
    <section className="relative z-10 mx-auto max-w-6xl px-5 pb-16 pt-14 sm:px-8 sm:pt-20">
      <div className="mx-auto max-w-3xl text-center"><span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-violet-700"><ShieldCheck className="h-3.5 w-3.5" />后端鉴权与音频处理</span><h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">音频下载</h1><p className="mx-auto mt-4 max-w-2xl text-sm leading-7 text-slate-600 sm:text-base">解析公开媒体直链，并通过 ffmpeg 输出所选音频格式。音乐平台受限内容仅提供官方播放入口。</p></div>
      <div className="mx-auto mt-10 max-w-4xl rounded-[28px] border border-white/80 bg-white/90 p-5 shadow-[0_24px_70px_rgba(79,70,229,0.12)] backdrop-blur sm:p-8">
        <label htmlFor="audio-link" className="text-sm font-semibold text-slate-800">音频链接或分享文案</label>
        <div className="relative mt-2"><textarea id="audio-link" value={input} onChange={(event) => { setInput(event.target.value); setResult(null); setError(""); }} rows={5} placeholder="粘贴公开音频直链、音乐平台分享链接，或包含链接的完整文案" className="w-full resize-none rounded-2xl border border-slate-200 bg-slate-50/60 p-4 pr-28 text-sm leading-6 outline-none transition focus:border-violet-400 focus:bg-white focus:ring-4 focus:ring-violet-100" /><button onClick={() => void paste()} className="absolute right-3 top-3 inline-flex h-9 items-center gap-2 rounded-xl border border-violet-200 bg-white px-3 text-xs font-semibold text-violet-700"><Clipboard className="h-3.5 w-3.5" />粘贴链接</button></div>
        <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-2xl border border-slate-200 p-4 text-sm leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-1 h-4 w-4 accent-violet-600" /><span>我确认对该音频或视频拥有下载、转换和使用权限。</span></label>
        <button disabled={Boolean(busy)} onClick={() => void parseAudio()} className="mt-5 flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-violet-600 to-blue-600 px-5 py-3.5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 disabled:opacity-50">{busy === "parse" ? <><LoaderCircle className="h-4 w-4 animate-spin" />正在安全解析</> : <><Play className="h-4 w-4 fill-current" />开始解析</>}</button>
        {error && <div role="alert" className="mt-5 flex items-start gap-3 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm leading-6 text-rose-700"><AlertCircle className="mt-0.5 h-4 w-4 shrink-0" /><div><p>{error}</p><button onClick={() => void parseAudio()} className="mt-1 inline-flex items-center gap-1 font-semibold"><RefreshCw className="h-3.5 w-3.5" />重新解析</button></div></div>}
        {result && <section className="mt-6 overflow-hidden rounded-2xl border border-slate-200">
          <div className="flex flex-col gap-4 bg-gradient-to-br from-slate-950 to-violet-950 p-5 text-white sm:flex-row sm:items-center">{result.coverUrl ? <img src={result.coverUrl} alt="音频封面" className="aspect-square w-full rounded-xl object-cover sm:w-36" referrerPolicy="no-referrer" /> : <div className="grid aspect-square w-full place-items-center rounded-xl bg-white/10 sm:w-36"><Music2 className="h-12 w-12 text-violet-200" /></div>}<div className="min-w-0 flex-1"><span className="rounded-full bg-cyan-400/15 px-2.5 py-1 text-xs text-cyan-200">{sourceName(result.platform)}</span><h2 className="mt-3 text-lg font-semibold">{result.title}</h2><p className="mt-2 text-xs text-white/60">{result.author || "作者信息未公开"} · {durationText(result.durationSeconds)}</p></div></div>
          <div className="p-5">{result.notice && <p className="rounded-xl bg-amber-50 p-3 text-sm leading-6 text-amber-800">{result.notice}</p>}{result.downloadAvailable ? <><label className="mt-4 block text-xs font-semibold text-slate-500">选择音质或格式<select value={format} onChange={(event) => setFormat(event.target.value)} className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm text-slate-800">{result.qualities.map((item) => <option key={item.id} value={item.id}>{item.label}</option>)}</select></label><button disabled={Boolean(busy)} onClick={() => void downloadAudio()} className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:bg-slate-300">{busy === "download" ? <><LoaderCircle className="h-4 w-4 animate-spin" />处理中 {progress}%</> : <><Download className="h-4 w-4" />下载音频</>}</button></> : <a href={result.officialUrl} target="_blank" rel="noreferrer" className="mt-4 flex h-12 w-full items-center justify-center gap-2 rounded-xl border border-violet-200 text-sm font-semibold text-violet-700">前往官方平台播放 <ExternalLink className="h-4 w-4" /></a>}<p className="mt-3 text-xs text-slate-500">今日解析 {result.usage.usedToday}/{result.usage.dailyLimit}</p></div>
        </section>}
      </div>
      <section className="mx-auto mt-10 max-w-4xl rounded-[24px] border border-slate-200 bg-white p-6"><div className="flex items-center justify-between gap-3"><div className="flex items-center gap-2"><Clock3 className="h-5 w-5 text-violet-600" /><h2 className="font-bold">最近下载记录</h2></div>{history.length > 0 && <button onClick={clearHistory} className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-rose-600"><Trash2 className="h-3.5 w-3.5" />清空记录</button>}</div>{history.length ? <div className="mt-4 divide-y divide-slate-100">{history.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-3 text-sm"><div className="min-w-0"><p className="truncate font-medium">{item.title}</p><p className="mt-1 text-xs text-slate-400">{item.author || item.platform} · {new Date(item.createdAt).toLocaleString("zh-CN")}</p></div><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{item.format}</span></div>)}</div> : <p className="mt-4 text-sm text-slate-500">暂无下载记录。</p>}</section>
      <p className="mx-auto mt-8 max-w-3xl text-center text-xs leading-6 text-slate-500">请仅下载本人拥有或已获得授权的内容，受版权或平台限制的资源不提供下载。本站不要求平台账号、密码或 Cookie。</p>
    </section>
    <AuthModal key={authMode} open={authOpen} onClose={() => setAuthOpen(false)} initialMode={authMode} />
  </main>;
}
