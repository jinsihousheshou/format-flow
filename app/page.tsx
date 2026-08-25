"use client";

import {
  ArrowRight,
  Check,
  FileAudio,
  FileImage,
  FileText,
  FileVideoCamera,
  Images,
  LoaderCircle,
  Menu,
  Merge,
  MousePointer2,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Zap,
} from "lucide-react";
import { useRef, useState } from "react";

const navItems = [
  { label: "首页", href: "#" },
  { label: "图片转换", href: "#image-tools" },
  { label: "文档转换", href: "#document-tools" },
  { label: "音频转换", href: "#audio-tools" },
  { label: "视频转换", href: "#video-tools" },
];

type ConverterMode = "pdf-jpg" | "audio" | "video";
type AudioFormat = "mp3" | "wav" | "m4a" | "ogg";
type VideoFormat = "mp4" | "webm" | "mov";
type ToolCategory = "image" | "document" | "audio" | "video";
type ToolItem = {
  from: string;
  to: string;
  label: string;
  icon: typeof FileImage;
  color: string;
  tint: string;
  category: ToolCategory;
  mode?: ConverterMode;
  audioOutput?: AudioFormat;
  videoOutput?: VideoFormat;
};

const tools: ToolItem[] = [
  { from: "JPG", to: "PNG", label: "JPG 转 PNG", icon: Images, color: "from-blue-500 to-cyan-400", tint: "bg-blue-50 text-blue-600", category: "image" },
  { from: "PNG", to: "JPG", label: "PNG 转 JPG", icon: FileImage, color: "from-violet-500 to-purple-400", tint: "bg-violet-50 text-violet-600", category: "image" },
  { from: "WEBP", to: "JPG", label: "WEBP 转 JPG", icon: Sparkles, color: "from-fuchsia-500 to-pink-400", tint: "bg-fuchsia-50 text-fuchsia-600", category: "image" },
  { from: "IMG", to: "PDF", label: "图片转 PDF", icon: FileText, color: "from-indigo-500 to-blue-400", tint: "bg-indigo-50 text-indigo-600", category: "image" },
  { from: "PDF", to: "JPG", label: "PDF 转 JPG", icon: FileImage, color: "from-orange-500 to-amber-400", tint: "bg-orange-50 text-orange-600", category: "document", mode: "pdf-jpg" },
  { from: "PDF", to: "PDF", label: "PDF 合并", icon: Merge, color: "from-emerald-500 to-teal-400", tint: "bg-emerald-50 text-emerald-600", category: "document" },
  { from: "MP3", to: "WAV", label: "MP3 转 WAV", icon: FileAudio, color: "from-cyan-500 to-blue-500", tint: "bg-cyan-50 text-cyan-600", category: "audio", mode: "audio", audioOutput: "wav" },
  { from: "WAV", to: "MP3", label: "WAV 转 MP3", icon: FileAudio, color: "from-pink-500 to-rose-500", tint: "bg-pink-50 text-pink-600", category: "audio", mode: "audio", audioOutput: "mp3" },
  { from: "M4A", to: "MP3", label: "M4A 转 MP3", icon: FileAudio, color: "from-teal-500 to-emerald-500", tint: "bg-teal-50 text-teal-600", category: "audio", mode: "audio", audioOutput: "mp3" },
  { from: "MP4", to: "WEBM", label: "MP4 转 WebM", icon: FileVideoCamera, color: "from-violet-500 to-fuchsia-500", tint: "bg-violet-50 text-violet-600", category: "video", mode: "video", videoOutput: "webm" },
  { from: "WEBM", to: "MP4", label: "WebM 转 MP4", icon: FileVideoCamera, color: "from-fuchsia-500 to-pink-500", tint: "bg-fuchsia-50 text-fuchsia-600", category: "video", mode: "video", videoOutput: "mp4" },
  { from: "MOV", to: "MP4", label: "MOV 转 MP4", icon: FileVideoCamera, color: "from-purple-500 to-violet-500", tint: "bg-purple-50 text-purple-600", category: "video", mode: "video", videoOutput: "mp4" },
];

const toolGroups: { id: ToolCategory; title: string; description: string; icon: typeof FileImage; accent: string }[] = [
  { id: "image", title: "图片格式转换", description: "常用图片格式与 PDF 输出", icon: Images, accent: "from-blue-500 to-violet-500" },
  { id: "document", title: "文档格式转换", description: "PDF 页面转换与文档处理", icon: FileText, accent: "from-orange-500 to-amber-400" },
  { id: "audio", title: "音频格式转换", description: "音乐、录音与播客格式", icon: FileAudio, accent: "from-cyan-500 to-emerald-500" },
  { id: "video", title: "视频格式转换", description: "常见视频容器与播放格式", icon: FileVideoCamera, accent: "from-violet-500 to-fuchsia-500" },
];

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [converterMode, setConverterMode] = useState<ConverterMode>("pdf-jpg");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("mp4");
  const inputRef = useRef<HTMLInputElement>(null);

  const selectFile = (file?: File) => {
    if (!file) return;
    setSelectedFile(file);
    setProgress(0);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(file.name);
    if (isPdf) {
      setConverterMode("pdf-jpg");
      setMessage("");
    } else if (isAudio) {
      setConverterMode("audio");
      setMessage("");
    } else if (isVideo) {
      setConverterMode("video");
      setMessage("");
    } else {
      setMessage("请选择 PDF、音频或视频文件。");
    }
  };

  const downloadBlob = (blob: Blob, fileName: string) => {
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  };

  const convertPdfToJpg = async () => {
    if (!selectedFile || converting) return;
    if (!(selectedFile.type === "application/pdf" || selectedFile.name.toLowerCase().endsWith(".pdf"))) {
      setMessage("请选择 PDF 文件后再转换。");
      return;
    }

    setConverting(true);
    setProgress(0);
    setMessage("正在读取 PDF...");

    try {
      const [pdfjs, JSZipModule] = await Promise.all([import("pdfjs-dist"), import("jszip")]);
      pdfjs.GlobalWorkerOptions.workerSrc = "/pdf.worker.min.mjs";
      const data = new Uint8Array(await selectedFile.arrayBuffer());
      const loadingTask = pdfjs.getDocument({ data });
      const pdf = await loadingTask.promise;
      const zip = new JSZipModule.default();
      const baseName = selectedFile.name.replace(/\.pdf$/i, "");
      let singlePageBlob: Blob | null = null;

      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
        setMessage(`正在转换第 ${pageNumber} / ${pdf.numPages} 页...`);
        const page = await pdf.getPage(pageNumber);
        const viewport = page.getViewport({ scale: 2 });
        const canvas = document.createElement("canvas");
        const context = canvas.getContext("2d", { alpha: false });
        if (!context) throw new Error("浏览器无法创建图片画布");

        canvas.width = Math.ceil(viewport.width);
        canvas.height = Math.ceil(viewport.height);
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
        await page.render({ canvas, canvasContext: context, viewport }).promise;

        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error("图片生成失败")), "image/jpeg", 0.92);
        });

        if (pdf.numPages === 1) {
          singlePageBlob = blob;
        } else {
          zip.file(`${baseName}-${String(pageNumber).padStart(3, "0")}.jpg`, blob);
        }
        setProgress(Math.round((pageNumber / pdf.numPages) * 100));
        page.cleanup();
      }

      if (singlePageBlob) {
        downloadBlob(singlePageBlob, `${baseName}.jpg`);
      } else {
        setMessage("正在打包图片...");
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        downloadBlob(zipBlob, `${baseName}-JPG图片.zip`);
      }

      await loadingTask.destroy();
      setProgress(100);
      setMessage(`转换完成，${pdf.numPages === 1 ? "JPG 图片" : "ZIP 压缩包"}已开始下载。`);
    } catch (error) {
      console.error(error);
      setMessage("转换失败。请确认 PDF 没有损坏或设置密码，然后重试。");
    } finally {
      setConverting(false);
    }
  };

  const convertAudio = async () => {
    if (!selectedFile || converting) return;
    const isAudio = selectedFile.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac|webm)$/i.test(selectedFile.name);
    if (!isAudio) {
      setMessage("请选择音频文件后再转换。");
      return;
    }

    setConverting(true);
    setProgress(2);
    setMessage("正在加载本地音频转换引擎（首次约 32MB）...");

    try {
      const [{ FFmpeg }, { fetchFile }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: currentProgress }) => {
        if (Number.isFinite(currentProgress)) {
          setProgress(Math.max(10, Math.min(96, Math.round(currentProgress * 100))));
        }
      });
      await ffmpeg.load({
        classWorkerURL: `${window.location.origin}/ffmpeg/worker.js`,
        coreURL: `${window.location.origin}/ffmpeg/ffmpeg-core.js`,
        wasmURL: `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`,
      });

      setProgress(10);
      setMessage(`正在转换为 ${audioFormat.toUpperCase()}...`);
      const originalExtension = selectedFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "audio";
      const inputName = `input.${originalExtension}`;
      const outputName = `output.${audioFormat}`;
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));

      const formatArguments: Record<AudioFormat, string[]> = {
        mp3: ["-vn", "-c:a", "libmp3lame", "-b:a", "192k"],
        wav: ["-vn", "-c:a", "pcm_s16le", "-ar", "44100", "-ac", "2"],
        m4a: ["-vn", "-c:a", "aac", "-b:a", "192k"],
        ogg: ["-vn", "-c:a", "libvorbis", "-q:a", "5"],
      };
      const exitCode = await ffmpeg.exec(["-i", inputName, ...formatArguments[audioFormat], outputName]);
      if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);

      const outputData = await ffmpeg.readFile(outputName);
      const bytes = typeof outputData === "string" ? new TextEncoder().encode(outputData) : new Uint8Array(outputData);
      const mimeTypes: Record<AudioFormat, string> = {
        mp3: "audio/mpeg",
        wav: "audio/wav",
        m4a: "audio/mp4",
        ogg: "audio/ogg",
      };
      const baseName = selectedFile.name.replace(/\.[^.]+$/, "");
      downloadBlob(new Blob([bytes.buffer], { type: mimeTypes[audioFormat] }), `${baseName}.${audioFormat}`);
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      ffmpeg.terminate();

      setProgress(100);
      setMessage(`转换完成，${audioFormat.toUpperCase()} 文件已开始下载。`);
    } catch (error) {
      console.error(error);
      setMessage("音频转换失败。请更换文件或输出格式后重试。");
    } finally {
      setConverting(false);
    }
  };

  const convertVideo = async () => {
    if (!selectedFile || converting) return;
    const isVideo = selectedFile.type.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(selectedFile.name);
    if (!isVideo) {
      setMessage("请选择视频文件后再转换。");
      return;
    }

    setConverting(true);
    setProgress(2);
    setMessage("正在加载本地视频转换引擎（首次约 32MB）...");

    try {
      const [{ FFmpeg }, { fetchFile }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: currentProgress }) => {
        if (Number.isFinite(currentProgress)) {
          setProgress(Math.max(10, Math.min(96, Math.round(currentProgress * 100))));
        }
      });
      await ffmpeg.load({
        classWorkerURL: `${window.location.origin}/ffmpeg/worker.js`,
        coreURL: `${window.location.origin}/ffmpeg/ffmpeg-core.js`,
        wasmURL: `${window.location.origin}/ffmpeg/ffmpeg-core.wasm`,
      });

      setProgress(10);
      setMessage(`正在转换为 ${videoFormat.toUpperCase()}，视频越长耗时越久...`);
      const originalExtension = selectedFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "video";
      const inputName = `input.${originalExtension}`;
      const outputName = `output.${videoFormat}`;
      await ffmpeg.writeFile(inputName, await fetchFile(selectedFile));

      const formatArguments: Record<VideoFormat, string[]> = {
        mp4: ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k", "-movflags", "+faststart"],
        webm: ["-c:v", "libvpx-vp9", "-deadline", "realtime", "-cpu-used", "8", "-crf", "34", "-b:v", "0", "-c:a", "libopus", "-b:a", "128k"],
        mov: ["-c:v", "mpeg4", "-q:v", "4", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k"],
      };
      const exitCode = await ffmpeg.exec(["-i", inputName, ...formatArguments[videoFormat], outputName]);
      if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);

      const outputData = await ffmpeg.readFile(outputName);
      const bytes = typeof outputData === "string" ? new TextEncoder().encode(outputData) : new Uint8Array(outputData);
      const mimeTypes: Record<VideoFormat, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime" };
      const baseName = selectedFile.name.replace(/\.[^.]+$/, "");
      downloadBlob(new Blob([bytes.buffer], { type: mimeTypes[videoFormat] }), `${baseName}.${videoFormat}`);
      await ffmpeg.deleteFile(inputName);
      await ffmpeg.deleteFile(outputName);
      ffmpeg.terminate();

      setProgress(100);
      setMessage(`转换完成，${videoFormat.toUpperCase()} 视频已开始下载。`);
    } catch (error) {
      console.error(error);
      setMessage("视频转换失败。请尝试较短的视频或更换输出格式。");
    } finally {
      setConverting(false);
    }
  };

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#fbfbfe] text-ink">
      <div className="pointer-events-none absolute inset-x-0 top-0 h-[760px] overflow-hidden" aria-hidden="true">
        <div className="absolute left-1/2 top-[-420px] h-[820px] w-[1000px] -translate-x-1/2 rounded-full bg-[radial-gradient(circle,rgba(109,87,255,0.16)_0%,rgba(83,125,255,0.06)_42%,transparent_70%)]" />
        <div className="orb absolute left-[9%] top-44 h-52 w-52 rounded-full bg-blue-300/20 blur-3xl" />
        <div className="orb-delay absolute right-[8%] top-60 h-64 w-64 rounded-full bg-purple-300/20 blur-3xl" />
        <div className="dot-grid absolute inset-0 opacity-45" />
      </div>

      <header className="relative z-30 border-b border-slate-200/60 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-[72px] max-w-7xl items-center justify-between px-5 sm:px-8 lg:px-10">
          <a href="#" className="group flex items-center gap-3" aria-label="格式工坊首页">
            <span className="relative grid h-10 w-10 place-items-center overflow-hidden rounded-xl bg-gradient-to-br from-blue-600 to-violet-600 text-white shadow-lg shadow-violet-500/20 transition-transform duration-300 group-hover:-rotate-3 group-hover:scale-105">
              <span className="absolute h-4 w-4 -translate-x-1 translate-y-1 rounded-sm border-2 border-white/70" />
              <span className="absolute h-4 w-4 translate-x-1 -translate-y-1 rounded-sm border-2 border-white" />
            </span>
            <span className="text-[19px] font-semibold tracking-tight">格式工坊</span>
          </a>

          <nav className="hidden items-center gap-1 md:flex" aria-label="主导航">
            {navItems.map((item, index) => (
              <a key={item.label} href={item.href} className={`rounded-lg px-4 py-2 text-sm font-medium transition-colors ${index === 0 ? "bg-violet-50 text-violet-700" : "text-slate-600 hover:bg-slate-50 hover:text-violet-700"}`}>
                {item.label}
              </a>
            ))}
          </nav>

          <div className="hidden items-center gap-2 text-xs font-medium text-slate-500 md:flex">
            <ShieldCheck className="h-4 w-4 text-emerald-500" />
            本地安全处理
          </div>
          <button onClick={() => setMenuOpen(!menuOpen)} className="grid h-10 w-10 place-items-center rounded-xl border border-slate-200 bg-white text-slate-700 md:hidden" aria-label="打开菜单" aria-expanded={menuOpen}>
            {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
        </div>
        {menuOpen && (
          <nav className="border-t border-slate-100 bg-white px-5 py-3 md:hidden" aria-label="移动端导航">
            {navItems.map((item) => <a key={item.label} href={item.href} onClick={() => setMenuOpen(false)} className="block rounded-lg px-3 py-3 text-sm font-medium text-slate-700 hover:bg-violet-50 hover:text-violet-700">{item.label}</a>)}
          </nav>
        )}
      </header>

      <section className="relative z-10 mx-auto max-w-5xl px-5 pb-10 pt-16 text-center sm:px-8 sm:pt-20 lg:pt-24">
        <div className="fade-up inline-flex items-center gap-2 rounded-full border border-violet-200/70 bg-white/80 px-3.5 py-1.5 text-xs font-semibold text-violet-700 shadow-sm backdrop-blur">
          <Sparkles className="h-3.5 w-3.5" />
          简单、高效的文件处理体验
        </div>
        <h1 className="fade-up-delay mt-6 text-[42px] font-bold leading-[1.12] tracking-[-0.045em] text-slate-950 sm:text-6xl lg:text-[68px]">
          文件格式<span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-violet-600 bg-clip-text text-transparent">转换</span>
        </h1>
        <p className="fade-up-delay-2 mx-auto mt-5 max-w-2xl text-base leading-7 text-slate-500 sm:text-lg">
          快速、安全、免费的在线文件转换工具
          <span className="hidden sm:inline">，让每一次转换都轻松顺畅</span>
        </p>

        <div className="fade-up-delay-2 mx-auto mt-10 max-w-3xl sm:mt-12">
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`upload-zone group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-dashed bg-white/90 p-7 shadow-glow backdrop-blur-sm transition-all duration-300 sm:p-10 ${dragging ? "scale-[1.01] border-violet-500 bg-violet-50/80" : "border-indigo-200 hover:-translate-y-1 hover:border-violet-400 hover:shadow-[0_28px_80px_-30px_rgba(91,67,255,0.55)]"}`}
          >
            <input ref={inputRef} type="file" accept="application/pdf,.pdf,audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.mkv,.avi,.webm,.m4v" className="sr-only" onChange={(e) => selectFile(e.target.files?.[0])} />
            <div className="pointer-events-none absolute inset-x-12 top-0 h-px bg-gradient-to-r from-transparent via-violet-400/60 to-transparent" />
            {selectedFile ? (
              <div className="flex min-h-[170px] flex-col items-center justify-center">
                <div className="grid h-16 w-16 place-items-center rounded-2xl bg-emerald-50 text-emerald-600"><Check className="h-8 w-8" /></div>
                <p className="mt-5 max-w-full truncate text-lg font-semibold text-slate-800">{selectedFile.name}</p>
                <p className="mt-2 text-sm text-slate-500">文件已就绪 · 点击可重新选择</p>
              </div>
            ) : (
              <div className="flex min-h-[170px] flex-col items-center justify-center">
                <div className="relative grid h-20 w-20 place-items-center rounded-3xl bg-gradient-to-br from-blue-50 to-violet-100 text-violet-600 transition-transform duration-300 group-hover:scale-105">
                  <UploadCloud className="h-9 w-9" strokeWidth={1.8} />
                  <span className="absolute -right-1 -top-1 grid h-6 w-6 place-items-center rounded-full bg-violet-600 text-white shadow-lg"><span className="text-base leading-none">+</span></span>
                </div>
                <p className="mt-5 text-base font-semibold text-slate-800 sm:text-lg">拖拽文件到这里，或<span className="text-violet-600">点击选择文件</span></p>
                <p className="mt-2 text-sm text-slate-400">支持 PDF、音频与视频文件 · 最大 50MB</p>
              </div>
            )}
          </div>
          {selectedFile && converterMode === "pdf-jpg" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0 text-left">
                <p className="font-semibold text-slate-800">PDF 转 JPG</p>
                <p className={`mt-1 text-sm ${message.includes("失败") || message.includes("请选择") || message.includes("仅支持") ? "text-rose-600" : "text-slate-500"}`} aria-live="polite">
                  {message || "每一页都会转换为清晰的 JPG 图片，多页 PDF 将自动打包下载。"}
                </p>
                {(converting || progress > 0) && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-600 to-violet-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); void convertPdfToJpg(); }}
                disabled={converting}
                className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto"
              >
                {converting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                {converting ? `转换中 ${progress}%` : "开始转换"}
              </button>
            </div>
          )}
          {selectedFile && converterMode === "audio" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-slate-800">音频转换</p>
                  <label className="flex items-center gap-2 text-sm text-slate-500">
                    输出为
                    <select
                      value={audioFormat}
                      onChange={(event) => { setAudioFormat(event.target.value as AudioFormat); setProgress(0); setMessage(""); }}
                      disabled={converting}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold uppercase text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="mp3">MP3</option>
                      <option value="wav">WAV</option>
                      <option value="m4a">M4A</option>
                      <option value="ogg">OGG</option>
                    </select>
                  </label>
                </div>
                <p className={`mt-1 text-sm ${message.includes("失败") || message.includes("请选择") ? "text-rose-600" : "text-slate-500"}`} aria-live="polite">
                  {message || "在浏览器本地转换，完成后自动下载，不上传音频内容。"}
                </p>
                {(converting || progress > 0) && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 to-violet-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); void convertAudio(); }}
                disabled={converting}
                className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-cyan-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto"
              >
                {converting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileAudio className="h-4 w-4" />}
                {converting ? `转换中 ${progress}%` : "开始转换"}
              </button>
            </div>
          )}
          {selectedFile && converterMode === "video" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0 flex-1 text-left">
                <div className="flex flex-wrap items-center gap-3">
                  <p className="font-semibold text-slate-800">视频转换</p>
                  <label className="flex items-center gap-2 text-sm text-slate-500">
                    输出为
                    <select
                      value={videoFormat}
                      onChange={(event) => { setVideoFormat(event.target.value as VideoFormat); setProgress(0); setMessage(""); }}
                      disabled={converting}
                      className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 font-semibold uppercase text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
                    >
                      <option value="mp4">MP4</option>
                      <option value="webm">WEBM</option>
                      <option value="mov">MOV</option>
                    </select>
                  </label>
                </div>
                <p className={`mt-1 text-sm ${message.includes("失败") || message.includes("请选择") ? "text-rose-600" : "text-slate-500"}`} aria-live="polite">
                  {message || "在浏览器本地转换视频，完成后自动下载。"}
                </p>
                {(converting || progress > 0) && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-violet-500 to-fuchsia-500 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <button
                type="button"
                onClick={(event) => { event.stopPropagation(); void convertVideo(); }}
                disabled={converting}
                className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-fuchsia-500 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto"
              >
                {converting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileVideoCamera className="h-4 w-4" />}
                {converting ? `转换中 ${progress}%` : "开始转换"}
              </button>
            </div>
          )}
          <div className="mt-5 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs text-slate-400 sm:text-sm">
            <span className="flex items-center gap-1.5"><ShieldCheck className="h-4 w-4 text-emerald-500" /> 隐私安全</span>
            <span className="flex items-center gap-1.5"><Zap className="h-4 w-4 text-amber-500" /> 极速处理</span>
            <span className="flex items-center gap-1.5"><MousePointer2 className="h-4 w-4 text-blue-500" /> 无需安装</span>
          </div>
        </div>
      </section>

      <section id="tools" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 pb-20 pt-12 sm:px-8 sm:pt-16 lg:px-10 lg:pb-28">
        <div className="mb-9 text-center">
          <p className="text-sm font-semibold text-violet-600">分类工具</p>
          <h2 className="mt-2 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">按文件类型选择转换</h2>
          <p className="mx-auto mt-3 max-w-xl text-sm leading-6 text-slate-500">每一种文件都有独立区域，工具不再混排。</p>
        </div>
        <div className="space-y-6">
          {toolGroups.map((group) => {
            const GroupIcon = group.icon;
            const groupedTools = tools.filter((tool) => tool.category === group.id);
            return (
              <article key={group.id} id={`${group.id}-tools`} className="scroll-mt-24 overflow-hidden rounded-[26px] border border-slate-200/80 bg-white/75 shadow-[0_14px_40px_rgba(15,23,42,0.05)] backdrop-blur">
                <div className="flex items-center gap-4 border-b border-slate-100 px-5 py-5 sm:px-7">
                  <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-gradient-to-br ${group.accent} text-white shadow-lg shadow-slate-900/10`}>
                    <GroupIcon className="h-5 w-5" />
                  </span>
                  <span className="min-w-0 flex-1">
                    <h3 className="font-semibold text-slate-900 sm:text-lg">{group.title}</h3>
                    <p className="mt-0.5 text-xs text-slate-400 sm:text-sm">{group.description}</p>
                  </span>
                  <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-500">{groupedTools.length} 个工具</span>
                </div>
                <div className="grid grid-cols-1 gap-3 p-4 sm:grid-cols-2 sm:p-5 lg:grid-cols-3">
                  {groupedTools.map((tool) => {
                    const Icon = tool.icon;
                    return (
                      <button
                        key={tool.label}
                        onClick={() => {
                          if (tool.mode) setConverterMode(tool.mode);
                          if (tool.audioOutput) setAudioFormat(tool.audioOutput);
                          if (tool.videoOutput) setVideoFormat(tool.videoOutput);
                          setProgress(0);
                          setMessage("");
                          inputRef.current?.click();
                        }}
                        className="tool-card group flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 text-left transition-all duration-200 hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md"
                      >
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${tool.tint} transition-transform group-hover:scale-105`}><Icon className="h-[18px] w-[18px]" /></span>
                        <span className="min-w-0 flex-1">
                          <span className="block text-sm font-semibold text-slate-800">{tool.label}</span>
                          <span className="mt-1 block text-xs text-slate-400">{tool.from} → {tool.to}</span>
                        </span>
                        <span className={`grid h-7 w-7 shrink-0 place-items-center rounded-full bg-gradient-to-br ${tool.color} text-white transition-transform group-hover:translate-x-0.5`}><ArrowRight className="h-3 w-3" /></span>
                      </button>
                    );
                  })}
                </div>
              </article>
            );
          })}
        </div>
      </section>

      <footer className="relative z-10 border-t border-slate-200/70 bg-white/60">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-5 py-7 text-xs text-slate-400 sm:flex-row sm:px-8 lg:px-10">
          <span>© 2026 格式工坊</span>
          <span>专注于简单、可靠的文件转换体验</span>
        </div>
      </footer>
    </main>
  );
}
