"use client";

import { Ban, Copy, Download, KeyRound, LoaderCircle, RefreshCw, ShieldAlert, Users } from "lucide-react";
import { useCallback, useEffect, useState } from "react";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";
import { edgeFunction } from "../../lib/supabase";

type Stats = { registeredUsers: number; activatedUsers: number; todayConversions: number; totalCodes: number };
type CodeRow = { id: string; code_prefix: string; plan_type: string; conversion_limit: number | null; expires_at: string | null; activated_at: string | null; disabled_at: string | null; note: string | null; activated_by_email?: string | null };
type UserRow = { id: string; email: string; created_at: string; banned_until: string | null; plan_type: string | null; expires_at: string | null; remaining_conversions: number | null };
type Dashboard = { stats: Stats; codes: CodeRow[]; users: UserRow[] };

const emptyDashboard: Dashboard = { stats: { registeredUsers: 0, activatedUsers: 0, todayConversions: 0, totalCodes: 0 }, codes: [], users: [] };

export default function AdminPage() {
  const auth = useAuth();
  const [dashboard, setDashboard] = useState(emptyDashboard);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const [generatedCodes, setGeneratedCodes] = useState<string[]>([]);
  const [form, setForm] = useState({ planType: "monthly", count: 1, validityDays: 30, conversionLimit: 50, codeExpiresDays: 30, note: "" });

  const callAdmin = useCallback(async <T,>(action: string, data: Record<string, unknown> = {}) => {
    if (!auth.session) throw new Error("请先登录管理员账号。");
    return edgeFunction<T>("admin-api", { action, ...data }, auth.session.access_token);
  }, [auth.session]);

  const load = useCallback(async () => {
    if (!auth.account.isAdmin) return;
    setBusy(true); setMessage("");
    try { setDashboard(await callAdmin<Dashboard>("dashboard")); }
    catch (error) { setMessage(error instanceof Error ? error.message : "加载失败。"); }
    finally { setBusy(false); }
  }, [auth.account.isAdmin, callAdmin]);

  useEffect(() => { void load(); }, [load]);

  const generate = async () => {
    setBusy(true); setMessage("");
    try {
      const result = await callAdmin<{ codes: string[] }>("generate-codes", { ...form, conversionLimit: form.planType === "lifetime" ? null : form.conversionLimit, validityDays: form.planType === "lifetime" || form.planType === "credits" ? null : form.validityDays });
      setGeneratedCodes(result.codes); setMessage(`已生成 ${result.codes.length} 个兑换码。请立即复制保存，后台不保存明文。`); await load();
    } catch (error) { setMessage(error instanceof Error ? error.message : "生成失败。"); }
    finally { setBusy(false); }
  };

  const toggleCode = async (code: CodeRow) => { await callAdmin("toggle-code", { codeId: code.id, disabled: !code.disabled_at }); await load(); };
  const updateUser = async (user: UserRow) => { const days = prompt("从现在起设置多少天有效？长期版请输入 0", "30"); if (days === null) return; const count = prompt("剩余转换次数；不限次数请输入 -1", String(user.remaining_conversions ?? -1)); if (count === null) return; await callAdmin("update-user", { userId: user.id, expiresInDays: Number(days), remainingConversions: Number(count) < 0 ? null : Number(count) }); await load(); };
  const toggleBan = async (user: UserRow) => { await callAdmin("toggle-ban", { userId: user.id, banned: !user.banned_until }); await load(); };
  const copyCodes = async () => { await navigator.clipboard.writeText(generatedCodes.join("\n")); setMessage("兑换码已复制。"); };
  const exportCodes = () => { const blob = new Blob([generatedCodes.join("\n")], { type: "text/plain;charset=utf-8" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `format-flow-codes-${new Date().toISOString().slice(0, 10)}.txt`; a.click(); URL.revokeObjectURL(a.href); };

  if (auth.loading) return <main className="grid min-h-screen place-items-center bg-[#fbfbfe]"><LoaderCircle className="h-7 w-7 animate-spin text-violet-600" /></main>;
  if (!auth.session || !auth.account.isAdmin) return <main className="min-h-screen bg-[#fbfbfe]"><SiteHeader /><div className="mx-auto max-w-xl px-5 py-24 text-center"><ShieldAlert className="mx-auto h-12 w-12 text-rose-500" /><h1 className="mt-5 text-2xl font-bold">无权访问管理后台</h1><p className="mt-3 text-sm leading-6 text-slate-500">管理员权限由数据库服务端验证，修改网址或前端代码无法获得后台权限。</p></div></main>;

  return <main className="min-h-screen bg-[#f7f7fc]"><SiteHeader /><section className="mx-auto max-w-7xl px-5 py-10 sm:px-8">
    <div className="flex items-center justify-between"><div><p className="text-sm font-semibold text-violet-600">安全管理后台</p><h1 className="mt-2 text-3xl font-bold text-slate-900">运营概览</h1></div><button onClick={() => void load()} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white"><RefreshCw className={`h-4 w-4 ${busy ? "animate-spin" : ""}`} /></button></div>
    {message && <p className="mt-5 rounded-xl bg-violet-50 p-3 text-sm text-violet-800">{message}</p>}
    <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">{[["注册用户", dashboard.stats.registeredUsers], ["已激活用户", dashboard.stats.activatedUsers], ["今日转换", dashboard.stats.todayConversions], ["兑换码总数", dashboard.stats.totalCodes]].map(([label, value]) => <article key={String(label)} className="rounded-[22px] border border-slate-200 bg-white p-5"><p className="text-sm text-slate-500">{label}</p><p className="mt-3 text-3xl font-bold text-slate-900">{value}</p></article>)}</div>
    <div className="mt-6 grid gap-6 lg:grid-cols-[0.9fr_1.6fr]">
      <section className="rounded-[24px] border border-slate-200 bg-white p-6"><div className="flex items-center gap-3"><KeyRound className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold">生成兑换码</h2></div><div className="mt-5 grid gap-4 sm:grid-cols-2 lg:grid-cols-1 xl:grid-cols-2">
        <label className="text-sm text-slate-600">套餐<select value={form.planType} onChange={(e) => setForm({ ...form, planType: e.target.value, validityDays: e.target.value === "yearly" ? 365 : 30 })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3"><option value="trial">体验码</option><option value="monthly">月卡</option><option value="yearly">年卡</option><option value="lifetime">长期版</option><option value="credits">次数卡</option></select></label>
        <label className="text-sm text-slate-600">生成数量<input type="number" min={1} max={100} value={form.count} onChange={(e) => setForm({ ...form, count: Number(e.target.value) })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        <label className="text-sm text-slate-600">激活后有效天数<input type="number" min={1} disabled={["lifetime", "credits"].includes(form.planType)} value={form.validityDays} onChange={(e) => setForm({ ...form, validityDays: Number(e.target.value) })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 disabled:bg-slate-50" /></label>
        <label className="text-sm text-slate-600">转换次数<input type="number" min={1} disabled={form.planType === "lifetime"} value={form.conversionLimit} onChange={(e) => setForm({ ...form, conversionLimit: Number(e.target.value) })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3 disabled:bg-slate-50" /></label>
        <label className="text-sm text-slate-600">兑换码本身有效天数<input type="number" min={1} value={form.codeExpiresDays} onChange={(e) => setForm({ ...form, codeExpiresDays: Number(e.target.value) })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
        <label className="text-sm text-slate-600">备注<input value={form.note} maxLength={100} onChange={(e) => setForm({ ...form, note: e.target.value })} className="mt-1.5 h-11 w-full rounded-xl border border-slate-200 px-3" /></label>
      </div><button disabled={busy} onClick={() => void generate()} className="mt-5 h-11 w-full rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:opacity-50">{form.count > 1 ? "批量生成" : "生成兑换码"}</button>
      {generatedCodes.length > 0 && <div className="mt-5 rounded-xl bg-slate-950 p-4 text-white"><div className="flex justify-between"><span className="text-xs text-white/60">仅本次显示</span><span className="flex gap-3"><button onClick={() => void copyCodes()} aria-label="复制"><Copy className="h-4 w-4" /></button><button onClick={exportCodes} aria-label="导出"><Download className="h-4 w-4" /></button></span></div><pre className="mt-3 max-h-44 overflow-auto whitespace-pre-wrap text-sm">{generatedCodes.join("\n")}</pre></div>}</section>
      <section className="overflow-hidden rounded-[24px] border border-slate-200 bg-white"><div className="border-b border-slate-100 p-6"><h2 className="text-lg font-bold">兑换码记录</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[760px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["兑换码提示", "套餐", "次数", "绑定用户", "状态", "操作"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{dashboard.codes.map((code) => <tr key={code.id}><td className="px-5 py-4 font-mono">{code.code_prefix}</td><td className="px-5 py-4">{code.plan_type}</td><td className="px-5 py-4">{code.conversion_limit ?? "不限"}</td><td className="px-5 py-4 text-xs">{code.activated_by_email || "未使用"}</td><td className="px-5 py-4">{code.disabled_at ? "已禁用" : code.activated_at ? "已使用" : "可使用"}</td><td className="px-5 py-4"><button onClick={() => void toggleCode(code)} className="text-xs font-semibold text-violet-700">{code.disabled_at ? "恢复" : "禁用"}</button></td></tr>)}</tbody></table></div></section>
    </div>
    <section className="mt-6 overflow-hidden rounded-[24px] border border-slate-200 bg-white"><div className="flex items-center gap-3 border-b border-slate-100 p-6"><Users className="h-5 w-5 text-violet-600" /><h2 className="text-lg font-bold">用户管理</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[820px] text-left text-sm"><thead className="bg-slate-50 text-xs text-slate-500"><tr>{["用户", "注册时间", "套餐", "到期时间", "剩余次数", "操作"].map((h) => <th key={h} className="px-5 py-3 font-medium">{h}</th>)}</tr></thead><tbody className="divide-y divide-slate-100">{dashboard.users.map((user) => <tr key={user.id}><td className="px-5 py-4">{user.email}</td><td className="px-5 py-4 text-xs">{new Date(user.created_at).toLocaleDateString("zh-CN")}</td><td className="px-5 py-4">{user.plan_type || "未激活"}</td><td className="px-5 py-4 text-xs">{user.expires_at ? new Date(user.expires_at).toLocaleDateString("zh-CN") : user.plan_type ? "长期" : "—"}</td><td className="px-5 py-4">{user.remaining_conversions ?? (user.plan_type ? "不限" : "—")}</td><td className="px-5 py-4"><span className="flex gap-3"><button onClick={() => void updateUser(user)} className="text-xs font-semibold text-violet-700">调整权益</button><button onClick={() => void toggleBan(user)} className="inline-flex items-center gap-1 text-xs font-semibold text-rose-600"><Ban className="h-3.5 w-3.5" />{user.banned_until ? "解封" : "封禁"}</button></span></td></tr>)}</tbody></table></div></section>
  </section></main>;
}
