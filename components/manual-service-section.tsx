"use client";

import { ArrowRight, Check, FileArchive, FileSpreadsheet, FileText, KeyRound, LoaderCircle, Presentation, ScanText, ShieldCheck, Sparkles, UploadCloud, X } from "lucide-react";
import { useRef, useState } from "react";
import AuthModal from "./auth-modal";
import { useAuth } from "./auth-provider";
import { convertPdfToOffice, formatWord, processPdfFiles, rebuildPpt, recognizeFile, type OcrOutput, type PdfBatchMode, type PdfOfficeFormat } from "../lib/document-tools";

type ToolId = "pdf-office" | "ocr" | "word-format" | "resume" | "ppt-format" | "pdf-batch";
type ToolItem = { id: ToolId; title: string; eyebrow: string; description: string; results: string[]; icon: typeof FileText; tone: string; iconTone: string; accept: string; multiple?: boolean; warning: string };

const tools: ToolItem[] = [
  { id: "pdf-office", title: "PDF 转 Word / Excel / PPT", eyebrow: "真实 Office 文件", description: "提取文字生成 DOCX/XLSX，或将每页完整放入 PPT，完成后直接下载。", results: ["Word 可编辑文字", "Excel 分页分行", "PPT 保留页面视觉"], icon: FileSpreadsheet, tone: "from-blue-500 to-cyan-400", iconTone: "bg-blue-50 text-blue-600", accept: ".pdf,application/pdf", warning: "复杂表格、公式和特殊字体无法保证原样还原；扫描版 PDF 请先使用 OCR。" },
  { id: "ocr", title: "图片 / 扫描件转文字", eyebrow: "中英文 OCR", description: "识别 JPG、PNG、WEBP 或扫描版 PDF，导出 TXT 或 Word。", results: ["中文 + 英文识别", "多页 PDF 逐页处理", "TXT / DOCX 下载"], icon: ScanText, tone: "from-violet-500 to-fuchsia-400", iconTone: "bg-violet-50 text-violet-600", accept: ".jpg,.jpeg,.png,.webp,.pdf,image/jpeg,image/png,image/webp,application/pdf", warning: "已自动放大文字、灰度化并增强对比度。电脑内容请优先上传截图；手机拍屏会产生摩尔纹，仍可能影响识别。首次使用需下载 OCR 语言包。" },
  { id: "word-format", title: "Word 规范排版", eyebrow: "目录 · 页码 · 样式", description: "提取 DOCX 文字，重新生成标题层级、正文缩进、目录与页码。", results: ["标题样式统一", "自动目录字段", "页码与正文格式"], icon: FileText, tone: "from-orange-500 to-amber-400", iconTone: "bg-orange-50 text-orange-600", accept: ".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain", warning: "该功能会重建文档文字版式，原文件中的复杂表格、图片、批注和公式不会保留。" },
  { id: "resume", title: "简历美化", eyebrow: "一页式清晰版面", description: "从 DOCX 或 TXT 提取内容，自动生成层级清晰的蓝色商务简历。", results: ["信息层级优化", "统一字体与留白", "DOCX 源文件下载"], icon: Sparkles, tone: "from-rose-500 to-orange-400", iconTone: "bg-rose-50 text-rose-600", accept: ".docx,.txt,application/vnd.openxmlformats-officedocument.wordprocessingml.document,text/plain", warning: "工具只调整版式，不修改或虚构简历内容；复杂图片和表格不会保留。" },
  { id: "ppt-format", title: "PPT 简单排版", eyebrow: "统一文字视觉", description: "读取每页文字，重建为统一字体、颜色、间距和页码的 PPT。", results: ["页面文字提取", "统一商务风格", "PPTX 源文件下载"], icon: Presentation, tone: "from-emerald-500 to-teal-400", iconTone: "bg-emerald-50 text-emerald-600", accept: ".pptx,application/vnd.openxmlformats-officedocument.presentationml.presentation", warning: "当前为文字版式重建，源文件中的图片、动画、图表和音视频不会保留。" },
  { id: "pdf-batch", title: "PDF 合并 / 拆分 / 压缩", eyebrow: "浏览器本地处理", description: "选择多个 PDF 合并，或将单个 PDF 按页拆分、重新压缩。", results: ["多文件顺序合并", "逐页拆分 ZIP", "PDF 结构压缩"], icon: FileArchive, tone: "from-indigo-500 to-violet-500", iconTone: "bg-indigo-50 text-indigo-600", accept: ".pdf,application/pdf", multiple: true, warning: "结构压缩对扫描图片型 PDF 的体积改善有限；加密 PDF 无法处理。" },
];

function extensionOf(file: File) { return file.name.split(".").pop()?.toLowerCase() || "unknown"; }

const allowedExtensions: Record<ToolId, string[]> = {
  "pdf-office": ["pdf"],
  ocr: ["jpg", "jpeg", "png", "webp", "pdf"],
  "word-format": ["docx", "txt"],
  resume: ["docx", "txt"],
  "ppt-format": ["pptx"],
  "pdf-batch": ["pdf"],
};

function invalidFileMessage(tool: ToolItem, selected: File[]) {
  const invalid = selected.find((file) => !allowedExtensions[tool.id].includes(extensionOf(file)));
  if (!invalid) return "";
  if (tool.id === "ocr") return `“${invalid.name}”不是图片或 PDF。请上传 JPG、PNG、WEBP 或扫描版 PDF；Word 文档请使用“Word 规范排版”。`;
  if (tool.id === "word-format" || tool.id === "resume") return `“${invalid.name}”格式不支持。请上传 DOCX 或 TXT 文件。`;
  if (tool.id === "ppt-format") return `“${invalid.name}”格式不支持。请上传 PPTX 文件。`;
  return `“${invalid.name}”格式不支持。请上传 PDF 文件。`;
}

export default function ManualServiceSection() {
  const auth = useAuth();
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedTool, setSelectedTool] = useState<ToolItem | null>(null);
  const [files, setFiles] = useState<File[]>([]);
  const [pdfOfficeFormat, setPdfOfficeFormat] = useState<PdfOfficeFormat>("docx");
  const [ocrOutput, setOcrOutput] = useState<OcrOutput>("docx");
  const [pdfBatchMode, setPdfBatchMode] = useState<PdfBatchMode>("merge");
  const [processing, setProcessing] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [authOpen, setAuthOpen] = useState(false);
  const entitlement = auth.account.entitlement;
  const hasActiveEntitlement = Boolean(entitlement && entitlement.status === "active" && (!entitlement.expires_at || new Date(entitlement.expires_at) > new Date()) && (entitlement.remaining_conversions === null || entitlement.remaining_conversions > 0));

  const openTool = (tool: ToolItem) => {
    if (!hasActiveEntitlement) { setAuthOpen(true); return; }
    setSelectedTool(tool); setFiles([]); setDragging(false); setProgress(0); setMessage(""); setPdfBatchMode("merge");
  };

  const chooseFiles = (list: FileList | null) => {
    if (!selectedTool || !list?.length) return;
    const chosen = Array.from(list);
    const selected = selectedTool.id === "pdf-batch" && pdfBatchMode === "merge" ? chosen : chosen.slice(0, 1);
    const invalidMessage = invalidFileMessage(selectedTool, selected);
    if (invalidMessage) { setMessage(invalidMessage); setFiles([]); setProgress(0); return; }
    if (selected.reduce((sum, file) => sum + file.size, 0) > 50 * 1024 * 1024) { setMessage("文件总大小超过 50MB，请选择更小的文件。"); setFiles([]); return; }
    setFiles(selected); setMessage(""); setProgress(0);
  };

  const outputFormat = () => {
    if (!selectedTool) return "unknown";
    if (selectedTool.id === "pdf-office") return pdfOfficeFormat;
    if (selectedTool.id === "ocr") return ocrOutput;
    if (selectedTool.id === "pdf-batch") return pdfBatchMode === "split" ? "zip" : "pdf";
    if (selectedTool.id === "ppt-format") return "pptx";
    return "docx";
  };

  const runTool = async () => {
    if (!selectedTool || !files.length || processing) return;
    const invalidMessage = invalidFileMessage(selectedTool, files);
    if (invalidMessage) { setMessage(invalidMessage); setFiles([]); setProgress(0); return; }
    if (selectedTool.id === "pdf-batch" && pdfBatchMode === "merge" && files.length < 2) { setMessage("合并至少需要选择 2 个 PDF 文件。"); return; }
    setProcessing(true); setProgress(2); setMessage("正在验证激活权限...");
    let conversionId: string | null = null;
    try {
      const reservation = await auth.reserveConversion({ kind: "document", inputFormat: selectedTool.id === "pdf-batch" && files.length > 1 ? "pdf-multiple" : extensionOf(files[0]), outputFormat: outputFormat(), fileSize: files.reduce((sum, file) => sum + file.size, 0) });
      conversionId = reservation.conversionId;
      const update = (nextProgress: number, nextMessage: string) => { setProgress(Math.max(2, Math.min(96, nextProgress))); setMessage(nextMessage); };
      if (selectedTool.id === "pdf-office") await convertPdfToOffice(files[0], pdfOfficeFormat, update);
      if (selectedTool.id === "ocr") await recognizeFile(files[0], ocrOutput, update);
      if (selectedTool.id === "word-format") await formatWord(files[0], false, update);
      if (selectedTool.id === "resume") await formatWord(files[0], true, update);
      if (selectedTool.id === "ppt-format") await rebuildPpt(files[0], update);
      if (selectedTool.id === "pdf-batch") await processPdfFiles(files, pdfBatchMode, update);
      setProgress(100); setMessage("处理完成，文件已开始下载。");
      await auth.finishConversion(conversionId, "completed");
    } catch (error) {
      console.error(error);
      const errorMessage = error instanceof Error ? error.message : "文件处理失败";
      setMessage(errorMessage.includes("激活") || errorMessage.includes("登录") ? errorMessage : `处理失败：${errorMessage}`);
      if (conversionId) await auth.finishConversion(conversionId, "failed", errorMessage);
    } finally { setProcessing(false); }
  };

  return (
    <section id="manual-services" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 pb-10 pt-12 sm:px-8 sm:pt-16 lg:px-10">
      <div className="overflow-hidden rounded-[30px] border border-slate-200/80 bg-white shadow-[0_22px_70px_rgba(15,23,42,0.08)]">
        <div className="border-b border-slate-100 bg-[linear-gradient(135deg,#f8f7ff_0%,#ffffff_48%,#f0f9ff_100%)] px-6 py-9 sm:px-9 lg:flex lg:items-end lg:justify-between lg:gap-10">
          <div className="max-w-3xl"><span className="inline-flex items-center gap-2 rounded-full border border-violet-200 bg-white px-3 py-1.5 text-xs font-semibold text-violet-700 shadow-sm"><KeyRound className="h-3.5 w-3.5" /> 激活码解锁工具</span><h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-950 sm:text-4xl">文档转换与智能排版</h2><p className="mt-3 max-w-2xl text-sm leading-6 text-slate-500 sm:text-base">选择工具、上传文件、完成转换并直接下载。处理前会验证登录账号和激活权益，每次成功授权计入转换记录。</p></div>
          <div className="mt-5 flex shrink-0 flex-wrap gap-2 text-xs font-semibold text-slate-600 lg:mt-0"><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-sm"><Check className="h-3.5 w-3.5 text-emerald-500" /> 实际生成文件</span><span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-2 shadow-sm"><ShieldCheck className="h-3.5 w-3.5 text-blue-500" /> 浏览器本地处理</span></div>
        </div>
        <div className="grid gap-4 p-5 sm:grid-cols-2 sm:p-7 lg:grid-cols-3">
          {tools.map((tool) => { const Icon = tool.icon; return <article key={tool.id} className="group flex flex-col rounded-[22px] border border-slate-200 bg-white p-5 transition duration-200 hover:-translate-y-1 hover:border-violet-200 hover:shadow-xl hover:shadow-violet-950/5"><div className="flex items-start justify-between gap-4"><span className={`grid h-12 w-12 place-items-center rounded-2xl ${tool.iconTone}`}><Icon className="h-5 w-5" /></span><span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${hasActiveEntitlement ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-700"}`}>{hasActiveEntitlement ? "已解锁" : "激活后使用"}</span></div><p className="mt-5 text-xs font-semibold text-violet-600">{tool.eyebrow}</p><h3 className="mt-1 text-lg font-bold text-slate-900">{tool.title}</h3><p className="mt-2 text-sm leading-6 text-slate-500">{tool.description}</p><ul className="mt-4 space-y-2 text-xs text-slate-600">{tool.results.map((item) => <li key={item} className="flex items-center gap-2"><Check className="h-3.5 w-3.5 text-emerald-500" />{item}</li>)}</ul><button type="button" onClick={() => openTool(tool)} className={`mt-5 inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r ${tool.tone} px-4 py-3 text-sm font-semibold text-white shadow-sm transition group-hover:shadow-md`}>{hasActiveEntitlement ? "立即使用" : "登录并激活"} <ArrowRight className="h-4 w-4" /></button></article>; })}
        </div>
        <div className="mx-5 mb-5 flex items-start gap-2 rounded-2xl border border-blue-100 bg-blue-50/80 px-5 py-4 text-sm leading-6 text-blue-950 sm:mx-7 sm:mb-7"><ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-blue-600" />文件内容在当前浏览器中处理，不上传到本站服务器。请先阅读每项工具的格式保留限制，并只处理你拥有合法使用权的文件。</div>
      </div>

      {selectedTool && <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => !processing && setSelectedTool(null)}><div role="dialog" aria-modal="true" aria-labelledby="document-tool-title" className="max-h-[calc(100vh-32px)] w-full max-w-xl overflow-auto rounded-[26px] bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}><div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7"><div><p className="text-xs font-semibold text-violet-600">激活码工具</p><h3 id="document-tool-title" className="mt-1 text-xl font-bold text-slate-900">{selectedTool.title}</h3></div><button type="button" disabled={processing} onClick={() => setSelectedTool(null)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 disabled:opacity-40" aria-label="关闭"><X className="h-4 w-4" /></button></div><div className="space-y-4 p-5 sm:p-7">
        {selectedTool.id === "pdf-office" && <label className="block text-sm font-semibold text-slate-700">输出格式<select value={pdfOfficeFormat} onChange={(event) => setPdfOfficeFormat(event.target.value as PdfOfficeFormat)} disabled={processing} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-violet-400"><option value="docx">Word（DOCX，可编辑文字）</option><option value="xlsx">Excel（XLSX，分页分行）</option><option value="pptx">PowerPoint（PPTX，每页为图片）</option></select></label>}
        {selectedTool.id === "ocr" && <label className="block text-sm font-semibold text-slate-700">输出格式<select value={ocrOutput} onChange={(event) => setOcrOutput(event.target.value as OcrOutput)} disabled={processing} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-violet-400"><option value="docx">Word（DOCX）</option><option value="txt">纯文字（TXT）</option></select></label>}
        {selectedTool.id === "pdf-batch" && <label className="block text-sm font-semibold text-slate-700">处理方式<select value={pdfBatchMode} onChange={(event) => { setPdfBatchMode(event.target.value as PdfBatchMode); setFiles([]); setMessage(""); }} disabled={processing} className="mt-2 h-11 w-full rounded-xl border border-slate-200 bg-white px-3 font-normal outline-none focus:border-violet-400"><option value="merge">合并多个 PDF</option><option value="split">按页拆分为 ZIP</option><option value="compress">重新压缩 PDF</option></select></label>}
        <input ref={inputRef} type="file" accept={selectedTool.accept} multiple={Boolean(selectedTool.multiple && pdfBatchMode === "merge")} className="sr-only" onChange={(event) => { chooseFiles(event.target.files); event.currentTarget.value = ""; }} />
        <button type="button" disabled={processing} onClick={() => inputRef.current?.click()} onDragEnter={(event) => { event.preventDefault(); if (!processing) setDragging(true); }} onDragOver={(event) => { event.preventDefault(); event.dataTransfer.dropEffect = "copy"; if (!processing) setDragging(true); }} onDragLeave={(event) => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) setDragging(false); }} onDrop={(event) => { event.preventDefault(); setDragging(false); if (!processing) chooseFiles(event.dataTransfer.files); }} className={`flex min-h-36 w-full flex-col items-center justify-center rounded-2xl border-2 border-dashed px-5 py-6 text-center transition disabled:cursor-wait disabled:opacity-60 ${dragging ? "scale-[1.01] border-violet-500 bg-violet-100 shadow-lg shadow-violet-500/10" : "border-violet-200 bg-violet-50/40 hover:border-violet-400 hover:bg-violet-50"}`}><span className={`grid h-12 w-12 place-items-center rounded-2xl text-violet-600 transition ${dragging ? "bg-white" : "bg-violet-100"}`}><UploadCloud className="h-5 w-5" /></span><span className="mt-3 text-sm font-semibold text-slate-800">{dragging ? "松开鼠标即可上传" : files.length ? `已选择 ${files.length} 个文件` : selectedTool.id === "pdf-batch" && pdfBatchMode === "merge" ? "点击选择，或拖入两个以上 PDF" : "点击选择，或从桌面拖到这里"}</span><span className="mt-1 max-w-md break-all text-xs leading-5 text-slate-500">{files.length ? files.map((file) => file.name).join("、") : "文件总大小不超过 50MB"}</span></button>
        <div className="rounded-xl border border-amber-100 bg-amber-50 px-4 py-3 text-xs leading-5 text-amber-900">{selectedTool.warning}</div>
        {(processing || progress > 0 || message) && <div className="rounded-xl bg-slate-50 p-4"><div className="flex items-center justify-between gap-3 text-xs"><span className={message.startsWith("处理失败") || message.includes("需要") || message.includes("不支持") ? "text-rose-600" : "text-slate-600"}>{message}</span><span className="shrink-0 font-semibold text-violet-600">{progress}%</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-200"><div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all duration-300" style={{ width: `${progress}%` }} /></div></div>}
        <button type="button" disabled={processing || !files.length} onClick={() => void runTool()} className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-50">{processing ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <KeyRound className="h-4 w-4" />}{processing ? "正在处理" : "验证激活码并开始转换"}</button>
      </div></div></div>}
      <AuthModal open={authOpen} onClose={() => setAuthOpen(false)} initialMode={auth.session ? "redeem" : "login"} />
    </section>
  );
}
