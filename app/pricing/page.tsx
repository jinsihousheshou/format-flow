"use client";

import { Check, ExternalLink, KeyRound } from "lucide-react";
import { useState } from "react";
import AuthModal from "../../components/auth-modal";
import SiteHeader from "../../components/site-header";
import { useAuth } from "../../components/auth-provider";

const plans = [
  { name: "体验码", detail: "按有效期和次数体验", badge: "先试用", features: ["指定转换次数", "指定有效期", "支持全部已上线工具"] },
  { name: "月卡", detail: "激活后 30 天有效", badge: "灵活", features: ["30 天使用期", "转换次数由商品说明为准", "个人中心查看记录"] },
  { name: "年卡", detail: "激活后 365 天有效", badge: "推荐", features: ["365 天使用期", "适合长期文件处理", "持续获得功能更新"] },
  { name: "长期版", detail: "长期使用权限", badge: "省心", features: ["长期有效", "转换次数由商品说明为准", "一次购买长期使用"] },
];

export default function PricingPage() {
  const { session } = useAuth();
  const [authOpen, setAuthOpen] = useState(false);
  const xianyuUrl = process.env.NEXT_PUBLIC_XIANYU_URL?.trim();
  return <main className="min-h-screen bg-[#fbfbfe] text-slate-900"><SiteHeader />
    <section className="mx-auto max-w-6xl px-5 py-16 sm:px-8 sm:py-20">
      <div className="text-center"><span className="rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">购买后兑换</span><h1 className="mt-5 text-4xl font-bold tracking-tight sm:text-5xl">选择适合你的使用方案</h1><p className="mx-auto mt-4 max-w-2xl text-slate-500">在闲鱼完成购买后，你会收到一枚专属兑换码。注册账号并兑换，即可解锁转换功能。</p></div>
      <div className="mt-12 grid gap-5 md:grid-cols-2 lg:grid-cols-4">{plans.map((plan) => <article key={plan.name} className="rounded-[24px] border border-violet-100 bg-white p-6 shadow-[0_14px_40px_rgba(76,58,154,0.07)]"><span className="rounded-full bg-violet-50 px-2.5 py-1 text-xs font-semibold text-violet-700">{plan.badge}</span><h2 className="mt-5 text-2xl font-bold">{plan.name}</h2><p className="mt-2 text-sm text-slate-500">{plan.detail}</p><ul className="mt-6 space-y-3">{plan.features.map((feature) => <li key={feature} className="flex gap-2 text-sm text-slate-600"><Check className="mt-0.5 h-4 w-4 shrink-0 text-emerald-500" />{feature}</li>)}</ul></article>)}</div>
      <div className="mt-10 flex flex-col items-center justify-center gap-3 sm:flex-row">
        {xianyuUrl ? <a href={xianyuUrl} target="_blank" rel="noreferrer" className="inline-flex h-12 items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-6 text-sm font-semibold text-white">前往闲鱼购买 <ExternalLink className="h-4 w-4" /></a> : <span className="rounded-xl bg-amber-50 px-5 py-3 text-sm text-amber-800">闲鱼商品链接将在上架后显示</span>}
        <button onClick={() => setAuthOpen(true)} className="inline-flex h-12 items-center gap-2 rounded-xl border border-violet-200 bg-white px-6 text-sm font-semibold text-violet-700"><KeyRound className="h-4 w-4" />{session ? "输入兑换码" : "登录并兑换"}</button>
      </div>
      <p className="mx-auto mt-10 max-w-3xl rounded-2xl bg-slate-100 p-4 text-center text-sm leading-6 text-slate-600">本站不储存用户上传的文件。请仅转换您本人拥有合法使用权的文件。浏览器本地授权无法做到绝对防破解，关键账号、兑换和次数校验均由 Supabase 后端执行。</p>
    </section><AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={session ? "redeem" : "login"} /></main>;
}
