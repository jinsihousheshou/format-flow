"use client";

import {
  ArrowRight,
  Check,
  ClipboardCheck,
  Copy,
  FileArchive,
  FileSearch,
  FileSpreadsheet,
  FileText,
  Presentation,
  ScanText,
  ShieldCheck,
  Sparkles,
  X,
} from "lucide-react";
import { useMemo, useState } from "react";

type ServiceItem = {
  title: string;
  eyebrow: string;
  description: string;
  deliverables: string[];
  price: string;
  icon: typeof FileText;
  tone: string;
  iconTone: string;
};

const services: ServiceItem[] = [
  {
    title: "PDF 转 Word / Excel / PPT",
    eyebrow: "复杂版式还原",
    description: "不只是机器转换，人工检查字体、段落、表格和图片位置。",
    deliverables: ["可编辑 Office 文件", "基础版式校对", "交付前抽查"],
    price: "9.9 元起",
    icon: FileSpreadsheet,
    tone: "from-blue-500 to-cyan-400",
    iconTone: "bg-blue-50 text-blue-600",
  },
  {
    title: "图片 / 扫描件转文字",
    eyebrow: "OCR + 人工校对",
    description: "识别截图、照片和扫描版 PDF，整理为可复制、可编辑文字。",
    deliverables: ["文字识别", "错字与段落校对", "Word / TXT 交付"],
    price: "9.9 元起",
    icon: ScanText,
    tone: "from-violet-500 to-fuchsia-400",
    iconTone: "bg-violet-50 text-violet-600",
  },
  {
    title: "Word 规范排版",
    eyebrow: "目录 · 页码 · 样式",
    description: "统一标题、正文、行距与页眉页脚，自动目录可更新。",
    deliverables: ["标题层级统一", "自动目录与页码", "一次修改"],
    price: "20 元起",
    icon: FileText,
    tone: "from-orange-500 to-amber-400",
    iconTone: "bg-orange-50 text-orange-600",
  },
  {
    title: "简历美化",
    eyebrow: "突出重点信息",
    description: "在不虚构经历的前提下，改善层级、留白与阅读顺序。",
    deliverables: ["一页式版面优化", "Word + PDF", "一次细节修改"],
    price: "30 元起",
    icon: Sparkles,
    tone: "from-rose-500 to-orange-400",
    iconTone: "bg-rose-50 text-rose-600",
  },
  {
    title: "PPT 简单排版",
    eyebrow: "统一视觉风格",
    description: "统一字体、颜色、间距和页面结构，让内容更清晰易读。",
    deliverables: ["母版风格统一", "图文对齐", "源文件交付"],
    price: "30 元起",
    icon: Presentation,
    tone: "from-emerald-500 to-teal-400",
    iconTone: "bg-emerald-50 text-emerald-600",
  },
  {
    title: "合并 / 拆分 / 压缩",
    eyebrow: "批量文件处理",
    description: "按指定顺序整理多个文件，也可拆页、压缩或批量改名。",
    deliverables: ["顺序确认", "批量处理", "文件清单核对"],
    price: "5 元起",
    icon: FileArchive,
    tone: "from-indigo-500 to-violet-500",
    iconTone: "bg-indigo-50 text-indigo-600",
  },
];

export default function ManualServiceSection() {
  const [selectedService, setSelectedService] = useState<ServiceItem | null>(null);
  const [pageCount, setPageCount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [notes, setNotes] = useState("");
  const [copied, setCopied] = useState(false);
  const xianyuUrl = process.env.NEXT_PUBLIC_XIANYU_URL?.trim();

  const consultationText = useMemo(() => {
    if (!selectedService) return "";
    return [
      `你好，我想咨询：${selectedService.title}`,
      pageCount.trim() ? `文件数量/页数：${pageCount.trim()}` : "文件数量/页数：待确认",
      deadline.trim() ? `期望时间：${deadline.trim()}` : "期望时间：不加急",
      notes.trim() ? `具体要求：${notes.trim()}` : "具体要求：请先帮我看文件后报价",
      "我会先发送脱敏截图或样例，请确认价格和交付时间后再开始。",
    ].join("\n");
  }, [deadline, notes, pageCount, selectedService]);

  const copyConsultation = async () => {
    if (!consultationText) return;
    await navigator.clipboard.writeText(consultationText);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 2400);
  };

  const continueToXianyu = async () => {
    await copyConsultation();
    if (xianyuUrl) window.open(xianyuUrl, "_blank", "noopener,noreferrer");
  };

  return (
    <section id="manual-services" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:px-10">
      <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8f7ff_0%,#ffffff_48%,#f0f9ff_100%)] px-6 py-9 sm:px-9 lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-3xl">
            <span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm">
              <ClipboardCheck className="h-3.5 w-3.5" /> 人工精修服务
            </span>
            <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">机器转换解决不了的，交给人工处理</h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">先看文件、确认价格和交付时间，再开始处理。复杂表格、扫描件、目录页码和版式还原都可以单独说明。</p>
          </div>
          <div className="mt-5 flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-slate-600 lg:mt-0">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-sm"><Check className="h-3.5 w-3.5 text-emerald-500" /> 先确认再下单</span>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-sm"><ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> 隐私文件可脱敏</span>
          </div>
        </div>

        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
          {services.map((service) => {
            const Icon = service.icon;
            return (
              <article key={service.title} className="group flex flex-col rounded-[22px] border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-950/5">
                <div className="flex items-start justify-between gap-4">
                  <span className={`grid h-12 w-12 place-items-center rounded-2xl ${service.iconTone}`}><Icon className="h-5 w-5" /></span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600">{service.price}</span>
                </div>
                <p className="mt-5 text-xs font-semibold text-violet-600">{service.eyebrow}</p>
                <h3 className="mt-1 text-lg font-bold text-slate-900">{service.title}</h3>
                <p className="mt-2 text-sm leading-6 text-slate-500">{service.description}</p>
                <ul className="mt-4 space-y-2 text-xs text-slate-600">
                  {service.deliverables.map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" />{item}</li>)}
                </ul>
                <button type="button" onClick={() => { setSelectedService(service); setCopied(false); }} className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${service.tone} px-4 py-3 text-sm font-semibold text-white shadow-sm transition group-hover:shadow-md`}>
                  免费看文件报价 <ArrowRight className="h-4 w-4" />
                </button>
              </article>
            );
          })}
        </div>

        <div className="mx-5 mb-5 flex flex-col gap-3 rounded-2xl border border-amber-200 bg-amber-50/80 px-5 py-4 text-sm text-amber-950 sm:mx-7 sm:mb-7 sm:flex-row sm:items-center sm:justify-between">
          <span className="flex items-start gap-2"><FileSearch className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />涉及身份证、合同、成绩单等敏感内容时，请先遮挡姓名、号码和联系方式。</span>
          <span className="shrink-0 text-xs font-semibold text-amber-700">不承接代写、证件制作及违规内容</span>
        </div>
      </div>

      {selectedService && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setSelectedService(null)}>
          <div role="dialog" aria-modal="true" aria-labelledby="service-dialog-title" className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-auto rounded-[26px] bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold text-violet-600">免费预估工作量</p>
                <h3 id="service-dialog-title" className="mt-1 text-xl font-bold text-slate-900">{selectedService.title}</h3>
              </div>
              <button type="button" onClick={() => setSelectedService(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50" aria-label="关闭"><X className="h-4 w-4" /></button>
            </div>
            <div className="space-y-4 p-5 sm:p-7">
              <label className="block text-sm font-semibold text-slate-700">文件数量或页数
                <input value={pageCount} onChange={(event) => setPageCount(event.target.value)} maxLength={40} placeholder="例如：1 个 PDF，共 26 页" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">期望完成时间
                <input value={deadline} onChange={(event) => setDeadline(event.target.value)} maxLength={40} placeholder="例如：明天下午 6 点前" className="mt-2 h-11 w-full rounded-xl border border-slate-200 px-3 text-sm font-normal outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <label className="block text-sm font-semibold text-slate-700">具体要求
                <textarea value={notes} onChange={(event) => setNotes(event.target.value)} maxLength={300} rows={4} placeholder="例如：需要保留原表格，标题样式统一，最终交付 Word 和 PDF" className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-3 py-3 text-sm font-normal leading-6 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100" />
              </label>
              <div className="rounded-xl bg-slate-50 p-4">
                <p className="text-xs font-semibold text-slate-500">将自动生成以下咨询内容</p>
                <pre className="mt-2 whitespace-pre-wrap font-sans text-xs leading-5 text-slate-700">{consultationText}</pre>
              </div>
              <button type="button" onClick={() => void continueToXianyu()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">
                {copied ? <ClipboardCheck className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                {copied ? "咨询内容已复制" : xianyuUrl ? "复制并前往闲鱼咨询" : "复制咨询内容"}
              </button>
              {!xianyuUrl && <p className="text-center text-xs leading-5 text-amber-700">闲鱼商品链接尚未配置；内容复制后，可直接粘贴给卖家。配置链接后会自动跳转。</p>}
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
