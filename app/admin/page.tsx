"use client";

import { AlertCircle, Ban, CheckCircle2, Copy, Download, Gauge, KeyRound, LoaderCircle, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";
import { edgeFunction } from "../../lib/supabase";

type Stats = { registeredUsers: number; activatedUsers: number; todayConversions: number; totalCodes: number };
type CodeRow = { id: string; code_prefix: string; plan_type: string; conversion_limit: number | null; expires_at: string | null; activated_at: string | null; disabled_at: string | null; note: string | null; activated_by_email?: string | null };
type UserRow = { id: string; email: string; created_at: string; banned_until: string | null; plan_type: string | null; expires_at: string | null; remaining_conversions: number | null };
type PlanVideoLimit = { plan_type: string; daily_parse_limit: number; daily_download_limit: number; max_video_bytes: number };
type Dashboard = { stats: Stats; codes: CodeRow[]; users: UserRow[]; planLimits: PlanVideoLimit[] };

const emptyDashboard: Dashboard = { stats: { registeredUsers: 0, activatedUsers: 0, todayConversions: 0, totalCodes: 0 }, codes: [], users: [], planLimits: [] };
const planNames: Record<string, string> = { trial: "历史体验码", monthly: "历史月卡", yearly: "历史年卡", lifetime: "长期权限", credits: "历史次数卡" };

export default function AdminPage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [toast, setToast] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [note, setNote] = useState("");

  const callAdmin = useCallback(async <T,>(action: string, data: Record<string, unknown> = {}) => {
    if (!auth.session) throw new Error("请先登录管理员账号。");
    return edgeFunction<T>("admin-api", { action, ...data }, await auth.getAccessToken());
  }, [auth.getAccessToken, auth.session]);

  const load = useCallback(async () => {
    if (!auth.account.isAdmin) return;
    setBusy(true); setMessage("");
    try { setDashboard(await callAdmin<Dashboard>("dashboard")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "加载失败。"); }
    finally { setBusy(false); }
  }, [auth.account.isAdmin, callAdmin]);

  useEffect(() => { void load(); }, [load]);
  useEffect(() => {
    if (!toast) return;
    const timer = window.setTimeout(() => setToast(null), 2600);
    return () => window.clearTimeout(timer);
  }, [toast]);

  const generate = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await callAdmin<{ codes: string[] }>("generate-codes", { note });
      setGeneratedCodes(result.codes); setMessage("激活码已生成。请立即复制保存，后台不保存明文。"); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败。"); }
    finally { setBusy(false); }
  };

  const toggleCode = async (code: CodeRow) => { await callAdmin("toggle-code", { codeId: code.id, disabled: !code.disabled_at }); await load(); };
  const updateUser = async (user: UserRow) => { if (!confirm(`确认把 ${user.email} 设置为长期不限次数？`)) return; await callAdmin("update-user", { userId: user.id }); await load(); };
  const toggleBan = async (user: UserRow) => { await callAdmin("toggle-ban", { userId: user.id, banned: !user.banned_until }); await load(); };
  const updateVideoLimit = async (limit: PlanVideoLimit) => {
    const parses = prompt(`${planNames[limit.plan_type] || limit.plan_type}每天允许解析多少次？`, String(limit.daily_parse_limit)); if (parses === null) return;
    const downloads = prompt("每天允许下载多少次？", String(limit.daily_download_limit)); if (downloads === null) return;
    const maxMb = prompt("单个媒体文件最大 MB（1–100）？", String(Math.round(limit.max_video_bytes / 1048576))); if (maxMb === null) return;
    setBusy(true); setMessage("");
    try { await callAdmin("update-video-limits", { planType: limit.plan_type, dailyParseLimit: Number(parses), dailyDownloadLimit: Number(downloads), maxVideoMb: Number(maxMb) }); setMessage("媒体链接限额已更新。"); await load(); }
    catch (error) { setMessage(error instanceof Error ? error.message : "更新失败。"); }
    finally { setBusy(false); }
  };
  const copyCodes = async () => {
    try {
      await navigator.clipboard.writeText(generatedCodes.join("\n"));
      setToast({ type: "success", text: "激活码已复制到剪贴板" });
    } catch {
      setToast({ type: "error", text: "复制失败，请长按激活码手动复制" });
    }
  };
  const exportCodes = () => { const blob = new Blob([generatedCodes.join("\n")], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `format-flow-codes-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(a.href); };

  if (auth.loading) return <main className="grid min-h-screen place-items-center bg-[#fbfbfe]"><LoaderCircle className="h-7 w-7 animate-spin text-violet-600" /></main>;
  if (!auth.session || !auth.account.isAdmin) return <main className="min-h-screen bg-[#fbfbfe]"><SiteHeader /><div className="mx-auto max-w-xl px-5 py-24 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-rose-500" /><h1 className="mt-5 text-2xl font-bold">无权访问管理后台</h1><p className="mt-3 text-sm leading-6 text-slate-500">管理员权限由数据库服务端验证，修改网址或前端代码无法获得后台权限。</p></div></main>;

  return <main className="min-h-screen bg-[#f7f7fc]"><SiteHeader />
    {toast && <div role="status" aria-live="polite" className={`fixed right-4 top-4 z-[100] flex max-w-[calc(100vw-2rem)] items-center gap-2 rounded-2xl border px-4 py-3 text-sm font-semibold shadow-xl backdrop-blur sm:right-6 sm:top-6 ${toast.type === "success" ? "border-emerald-200 bg-emerald-50/95 text-emerald-800" : "border-rose-200 bg-rose-50/95 text-rose-800"}`}>
      {toast.type === "success" ? <CheckCircle2 className="h-5 w-5 shrink-0" /> : <AlertCircle className="h-5 w-5 shrink-0" />}{toast.text}
    </div>}
    <section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-violet-600">安全管理后台</p><h1 className="mt-2 text-3xl font-bold text-slate-900">运营概览</h1></div><button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></button></div>
    {message && <p className="mt-5 rounded-xl bg-violet-50 p-3 text-sm text-violet-800">{message}</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["注册用户", dashboard.stats.registeredUsers], ["已激活用户", dashboard.stats.activatedUsers], ["今日转换", dashboard.stats.todayConversions], ["兑换码总数", dashboard.stats.totalCodes]].map(([label, value]) => <article key={String(label)} className="rounded-[22px] border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p></article>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold">生成一次性激活码</h2></div><p className="mt-3 rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-800">每次生成 1 个激活码，只能绑定 1 个账号。兑换后长期有效、转换次数不限。</p><div className="mt-5">
        <label className="text-sm text-slate-600">买家备注（选填）<input value={note} maxLength={100} onChange={(e) => setNote(e.target.value)} placeholder="例如：闲鱼订单号或买家昵称" className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      </div><button disabled={busy} onClick={() => void generate()} className="mt-5 h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:opacity-50">生成激活码</button>
      {generatedCodes.length > 0 && <div className="mt-5 rounded-xl bg-slate-950 p-4 text-white"><div className="flex justify-between"><span className="text-xs text-white/60">仅本次显示</span><span className="flex gap-3"><button onClick={() => void copyCodes()} aria-label="复制"><Copy className="h-4 w-4" /></button><button onClick={exportCodes} aria-label="导出"><Download className="h-4 w-4" /></button></span></div><pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap text-sm">{generatedCodes.join("\n")}</pre></div>}</section>
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"><div className="border-b border-slate-100 p-6"><h2 className="text-lg font-bold">激活码记录</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["激活码提示", "权限", "次数", "绑定用户", "状态", "操作"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{dashboard.codes.map((code) => <tr key={code.id}><td className="px-5 py-4 font-mono">{code.code_prefix}</td><td className="px-5 py-4">{planNames[code.plan_type] || "历史权限"}</td><td className="px-5 py-4">{code.conversion_limit ?? "不限"}</td><td className="px-5 py-4 text-xs">{code.activated_by_email || "未使用"}</td><td className="px-5 py-4">{code.disabled_at ? "已禁用" : code.activated_at ? "已使用" : "可使用"}</td><td className="px-5 py-4"><button onClick={() => void toggleCode(code)} className="text-xs font-semibold text-violet-700">{code.disabled_at ? "恢复" : "禁用"}</button></td></tr>)}</tbody></table></div></section>
    </div>
    <section className="mt-6 rounded-[24px] border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><Gauge className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold">媒体链接使用限额</h2></div><div className="mt-5 max-w-sm">{dashboard.planLimits.filter((limit) => limit.plan_type === "lifetime").map((limit) => <article key={limit.plan_type} className="rounded-2xl border border-slate-200 p-4"><p className="font-semibold text-slate-900">已激活账号</p><p className="mt-2 text-xs leading-6 text-slate-500">解析 {limit.daily_parse_limit} 次/天<br />下载 {limit.daily_download_limit} 次/天<br />单文件 {Math.round(limit.max_video_bytes / 1048576)} MB</p><button disabled={busy} onClick={() => void updateVideoLimit(limit)} className="mt-3 text-xs font-semibold text-violet-700 disabled:opacity-50">配置限额</button></article>)}</div></section>
    <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white"><div className="flex items-center gap-3 border-b border-slate-100 p-6"><Users className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold">用户管理</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["用户", "注册时间", "权限", "到期时间", "剩余次数", "操作"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{dashboard.users.map((user) => <tr key={user.id}><td className="px-5 py-4">{user.email}</td><td className="px-5 py-4 text-xs">{new Date(user.created_at).toLocaleDateString("zh-CN")}</td><td className="px-5 py-4">{user.plan_type ? "已激活" : "未激活"}</td><td className="px-5 py-4 text-xs">{user.expires_at ? new Date(user.expires_at).toLocaleDateString("zh-CN") : user.plan_type ? "长期" : "—"}</td><td className="px-5 py-4">{user.remaining_conversions ?? (user.plan_type ? "不限" : "—")}</td><td className="px-5 py-4"><span className="flex gap-3"><button onClick={() => void updateUser(user)} className="text-xs font-semibold text-violet-700">设为长期</button><button onClick={() => void toggleBan(user)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Ban className="h-3.5 w-3.5" />{user.banned_until ? "解封" : "封禁"}</button></span></td></tr>)}</tbody></table></div></section>
  </section></main>;
}
