"use client";

import { useState } from "react";
import { KeyRound, LoaderCircle, LockKeyhole, Mail, X } from "lucide-react";
import { useAuth } from "./auth-provider";

type Mode = "login" | "signup" | "reset" | "redeem";

export default function AuthModal({ open, onClose, initialMode = "login" }: { open: boolean; onClose: () => void; initialMode?: Mode }) {
  const auth = useAuth();
  const [mode, setMode] = useState<Mode>(initialMode);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [code, setCode] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  if (!open) return null;

  const run = async () => {
    setBusy(true); setMessage("");
    try {
      if (mode !== "redeem" && !email.trim()) throw new Error("请输入邮箱地址。");
      if ((mode === "login" || mode === "signup") && password.length < 8) throw new Error("密码至少需要 8 位。");
      if (mode === "signup" && password !== confirmPassword) throw new Error("两次输入的密码不一致。");
      if (mode === "login") { await auth.signIn(email, password); onClose(); }
      if (mode === "signup") {
        const result = await auth.signUp(email, password);
        setMode("login");
        setPassword("");
        setConfirmPassword("");
        setMessage(`${result} 验证完成后，请在这里登录。`);
      }
      if (mode === "reset") { await auth.sendPasswordReset(email); setMessage("重置邮件已发送，请检查邮箱。"); }
      if (mode === "redeem") { await auth.redeemCode(code); onClose(); }
    } catch (error) { setMessage(error instanceof Error ? error.message : "操作失败，请重试。"); }
    finally { setBusy(false); }
  };

  const switchMode = (next: Mode) => { setMode(next); setPassword(""); setConfirmPassword(""); setMessage(""); };
  const title = mode === "login" ? "登录格式工坊" : mode === "signup" ? "创建账号" : mode === "reset" ? "找回密码" : "兑换使用权限";

  return (
    <div className="fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/50 p-4 backdrop-blur-sm" onMouseDown={onClose}>
      <div role="dialog" aria-modal="true" className="w-full max-w-md rounded-[28px] bg-white p-6 shadow-2xl sm:p-8" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-semibold text-violet-600">账号与授权</p><h2 className="mt-1 text-2xl font-bold text-slate-900">{title}</h2></div>
          <button onClick={onClose} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500" aria-label="关闭"><X className="h-4 w-4" /></button>
        </div>
        {!auth.configured && <p className="mt-5 rounded-xl bg-amber-50 p-3 text-sm text-amber-800">站点管理员尚未完成 Supabase 环境变量配置，账号功能暂不可用。</p>}
        {mode === "login" && <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-600">使用注册时填写的邮箱和密码登录。</p>}
        {mode === "signup" && <p className="mt-4 rounded-xl bg-violet-50 p-3 text-sm leading-6 text-violet-700">创建新账号后，请打开验证邮件完成确认，再登录并输入激活码。</p>}
        {mode === "redeem" ? (
          <label className="mt-6 block"><span className="mb-2 block text-sm font-medium text-slate-700">激活码</span><span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-violet-400"><KeyRound className="h-4 w-4 text-slate-400" /><input value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="XXXX-XXXX-XXXX-XXXX" className="w-full bg-transparent text-sm uppercase outline-none" /></span></label>
        ) : (
          <div className="mt-6 space-y-4">
            <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">邮箱</span><span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-violet-400"><Mail className="h-4 w-4 text-slate-400" /><input type="email" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="email" className="w-full bg-transparent text-sm outline-none" /></span></label>
            {mode !== "reset" && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">密码</span><span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-violet-400"><LockKeyhole className="h-4 w-4 text-slate-400" /><input type="password" minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder={mode === "signup" ? "至少 8 位" : "请输入密码"} autoComplete={mode === "signup" ? "new-password" : "current-password"} className="w-full bg-transparent text-sm outline-none" /></span></label>}
            {mode === "signup" && <label className="block"><span className="mb-2 block text-sm font-medium text-slate-700">确认密码</span><span className="flex h-12 items-center gap-3 rounded-xl border border-slate-200 px-4 focus-within:border-violet-400"><LockKeyhole className="h-4 w-4 text-slate-400" /><input type="password" minLength={8} value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} placeholder="再次输入密码" autoComplete="new-password" className="w-full bg-transparent text-sm outline-none" /></span></label>}
          </div>
        )}
        {message && <p className={`mt-4 rounded-xl p-3 text-sm ${message.includes("成功") || message.includes("发送") ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-700"}`}>{message}</p>}
        <button onClick={() => void run()} disabled={busy || !auth.configured} className="mt-5 flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-sm font-semibold text-white disabled:opacity-50">{busy && <LoaderCircle className="h-4 w-4 animate-spin" />}{mode === "login" ? "登录" : mode === "signup" ? "注册" : mode === "reset" ? "发送重置邮件" : "立即激活"}</button>
        <div className="mt-5 flex flex-wrap justify-center gap-x-4 gap-y-2 text-xs font-medium text-violet-700">
          {!auth.session && mode !== "login" && <button onClick={() => switchMode("login")}>返回登录</button>}
          {!auth.session && mode !== "signup" && <button onClick={() => switchMode("signup")}>注册账号</button>}
          {!auth.session && mode !== "reset" && <button onClick={() => switchMode("reset")}>忘记密码</button>}
          {auth.session && mode !== "redeem" && <button onClick={() => switchMode("redeem")}>输入激活码</button>}
        </div>
      </div>
    </div>
  );
}
