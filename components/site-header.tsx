"use client";

import Link from "next/link";
import { Menu, ShieldCheck, X } from "lucide-react";
import { useState } from "react";
import AuthModal from "./auth-modal";
import { useAuth } from "./auth-provider";

export default function SiteHeader() {
  const { session, account } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const [authOpen, setAuthOpen] = useState(false);
  const links = [{ label: "首页", href: "/" }, { label: "视频下载", href: "/video-download/" }, { label: "音频下载", href: "/audio-download/" }, { label: "购买说明", href: "/pricing/" }, ...(session ? [{ label: "个人中心", href: "/account/" }] : []), ...(account.isAdmin ? [{ label: "管理后台", href: "/admin/" }] : [])];
  return <>
    <header className="relative z-40 border-b border-slate-200/70 bg-white/85 backdrop-blur-xl">
      <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
        <Link href="/" className="flex items-center gap-3"><span className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-500/20"><ShieldCheck className="h-5 w-5" /></span><span className="text-[19px] font-semibold tracking-tight">格式工坊</span></Link>
        <nav className="hidden items-center gap-1 lg:flex">{links.map((item) => <Link key={item.href} href={item.href} className="rounded-lg px-4 py-2 text-sm font-medium text-slate-600 hover:bg-violet-50 hover:text-violet-700">{item.label}</Link>)}</nav>
        <div className="hidden lg:block">{session ? <Link href="/account/" className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">我的账号</Link> : <button onClick={() => setAuthOpen(true)} className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-semibold text-white">登录 / 激活</button>}</div>
        <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 lg:hidden">{menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}</button>
      </div>
      {menuOpen && <nav className="border-t border-slate-100 bg-white px-5 py-3 lg:hidden">{links.map((item) => <Link key={item.href} href={item.href} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700">{item.label}</Link>)}{!session && <button onClick={() => setAuthOpen(true)} className="w-full rounded-lg px-3 py-3 text-left text-sm font-semibold text-violet-700">登录 / 激活</button>}</nav>}
    </header>
    <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} />
  </>;
}
