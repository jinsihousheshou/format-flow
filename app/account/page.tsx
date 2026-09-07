"use client";

import { CalendarDays, CheckCircle2, Clock3, KeyRound, LoaderCircle, LogOut, RefreshCw, ShieldCheck } from "lucide-react";
import { useState } from "react";
import AuthModal from "../../components/auth-modal";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";

const dateText = (value: string | null) => value ? new Date(value).toLocaleString("zh-CN") : "长期有效";

export default function AccountPage() {
  const auth = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const entitlement = auth.account.entitlement;
  const active = Boolean(entitlement && entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date()) && (entitlement.remaining_conversions === null || entitlement.remaining_conversions > 0));
  const updatePassword = async () => { setBusy(true); setMessage(""); try { await auth.updatePassword(password); setPassword(""); setMessage("密码已修改。"); } catch (error) { setMessage(error instanceof Error ? error.message : "修改失败。"); } finally { setBusy(false); } };
  return <main className="min-h-screen bg-[#fbfbfe]"><SiteHeader /><section className="mx-auto max-w-6xl px-5 py-10 sm:px-8 sm:py-14">
    <div className="flex flex-col justify-between gap-5 sm:flex-row sm:items-end"><div><p className="text-sm font-semibold text-violet-600">个人中心</p><h1 className="mt-2 text-3xl font-bold text-slate-900">你好，{auth.session?.user.email || "访客"}</h1><p className="mt-2 text-sm text-slate-500">查看授权状态、转换次数与最近记录。</p></div>{auth.session && <button onClick={() => void auth.signOut()} className="inline-flex h-10 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 text-sm font-medium text-slate-600"><LogOut className="h-4 w-4" />退出登录</button>}</div>
    {!auth.session ? <div className="mt-8 rounded-[28px] border border-violet-100 bg-white p-8 text-center shadow-sm"><ShieldCheck className="mx-auto h-10 w-10 text-violet-600" /><h2 className="mt-4 text-xl font-bold">请先登录账号</h2><p className="mt-2 text-sm text-slate-500">登录后可以兑换激活码并查看使用权益。</p><button onClick={() => setAuthOpen(true)} className="mt-5 rounded-xl bg-violet-600 px-5 py-3 text-sm font-semibold text-white">登录 / 注册</button></div> : <>
      <div className="mt-8 grid gap-5 md:grid-cols-3">
        <article className="rounded-[24px] border border-violet-100 bg-gradient-to-br from-violet-600 to-indigo-700 p-6 text-white shadow-lg shadow-violet-500/15"><span className="text-sm text-white/70">账号权限</span><h2 className="mt-3 text-2xl font-bold">{entitlement ? "已激活账号" : "尚未激活"}</h2><span className={`mt-5 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-semibold ${active ? "bg-white/15" : "bg-rose-400/25"}`}>{active ? <CheckCircle2 className="h-4 w-4" /> : <Clock3 className="h-4 w-4" />}{active ? "权限有效" : "需要激活"}</span></article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-6"><CalendarDays className="h-6 w-6 text-violet-600" /><p className="mt-4 text-sm text-slate-500">激活 / 到期时间</p><p className="mt-2 font-semibold text-slate-800">{entitlement ? dateText(entitlement.activated_at) : "—"}</p><p className="mt-1 text-sm text-slate-500">至 {entitlement ? dateText(entitlement.expires_at) : "—"}</p></article>
        <article className="rounded-[24px] border border-slate-200 bg-white p-6"><RefreshCw className="h-6 w-6 text-violet-600" /><p className="mt-4 text-sm text-slate-500">转换次数</p><p className="mt-2 text-3xl font-bold text-slate-900">{entitlement?.remaining_conversions === null ? "不限" : entitlement?.remaining_conversions ?? 0}</p>{!entitlement && <button onClick={() => setAuthOpen(true)} className="mt-3 inline-flex items-center gap-1.5 text-sm font-semibold text-violet-700"><KeyRound className="h-4 w-4" />输入激活码</button>}</article>
      </div>
      <div className="mt-6 grid gap-6 lg:grid-cols-[1.5fr_1fr]">
        <section className="rounded-[24px] border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-900">最近转换记录</h2><div className="mt-5 divide-y divide-slate-100">{auth.account.conversions.length ? auth.account.conversions.map((item) => <div key={item.id} className="flex items-center justify-between gap-4 py-4"><div><p className="text-sm font-semibold text-slate-800">{item.input_format.toUpperCase()} → {item.output_format.toUpperCase()}</p><p className="mt-1 text-xs text-slate-400">{new Date(item.created_at).toLocaleString("zh-CN")} · {item.kind}</p></div><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${item.status === "completed" ? "bg-emerald-50 text-emerald-700" : item.status === "failed" ? "bg-rose-50 text-rose-700" : "bg-amber-50 text-amber-700"}`}>{item.status === "completed" ? "已完成" : item.status === "failed" ? "失败" : "处理中"}</span></div>) : <p className="py-10 text-center text-sm text-slate-400">暂无转换记录</p>}</div></section>
        <section className="rounded-[24px] border border-slate-200 bg-white p-6"><h2 className="text-lg font-bold text-slate-900">修改密码</h2><p className="mt-2 text-sm text-slate-500">密码至少 8 位，请勿与其他网站共用。</p><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="输入新密码" className="mt-5 h-12 w-full rounded-xl border border-slate-200 px-4 text-sm outline-none focus:border-violet-400" /><button disabled={busy || password.length < 8} onClick={() => void updatePassword()} className="mt-3 flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-violet-600 text-sm font-semibold text-white disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}保存新密码</button>{message && <p className="mt-3 text-sm text-slate-600">{message}</p>}</section>
      </div></>}
  </section><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={auth.session ? "redeem" : "login"} /></main>;
}
