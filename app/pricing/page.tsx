"use client";

import { Check, ExternalLink, KeyRound } from "lucide-react";
import { useState } from "react";
import AuthModal from "../../components/auth-modal";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";

const features = ["一个账号绑定一个激活码", "激活一次即可长期使用", "不限格式转换次数", "个人中心查看使用记录"];

export default function PricingPage() {
  const { session } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const xianyuUrl = process.env.NEXT_PUBLIC_XIANYU_URL?.trim();
  return <main className="min-h-screen bg-[#fbfbfe] text-slate-900"><SiteHeader />
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="text-center"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">购买后兑换</span><h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">一次激活，长期使用</h1><p className="mx-auto mt-4 max-w-2xl text-slate-500">在闲鱼完成购买后，你会收到一个专属激活码。注册账号并兑换一次，即可长期解锁转换功能。</p></div>
      <article className="mx-auto mt-12 max-w-xl rounded-[28px] border border-violet-100 bg-white p-7 shadow-[0_18px_50px_rgba(76,58,154,0.09)] sm:p-8"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">唯一方案</span><h2 className="mt-5 text-3xl font-bold">长期使用权限</h2><p className="mt-2 text-sm text-slate-500">每个激活码只能绑定一个注册账号，使用后立即失效。</p><ul className="mt-7 grid gap-3 sm:grid-cols-2">{features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{feature}</li>)}</ul></article>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {xianyuUrl ? <a href={xianyuUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-semibold text-white">前往闲鱼购买 <ExternalLink className="h-4 w-4" /></a> : <span className="rounded-xl bg-amber-50 px-5 py-3 text-sm text-amber-800">闲鱼商品链接将在上架后显示</span>}
        <button onClick={() => setAuthOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-xl border border-violet-200 bg-white px-6 text-sm font-semibold text-violet-700"><KeyRound className="h-4 w-4" />{session ? "输入激活码" : "登录并激活"}</button>
      </div>
      <p className="mx-auto mt-10 max-w-3xl rounded-2xl bg-slate-100 p-4 text-center text-sm leading-6 text-slate-600">本站不储存用户上传的文件。请仅转换您本人拥有合法使用权的文件。浏览器本地授权无法做到绝对防破解，关键账号、兑换和次数校验均由 Supabase 后端执行。</p>
    </section><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={session ? "redeem" : "login"} /></main>;
}
