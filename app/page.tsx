"use client";

import {
  ArrowRight,
  BookOpen,
  Check,
  Eye,
  FileAudio,
  FileImage,
  FileText,
  FileVideoCamera,
  Images,
  LoaderCircle,
  Menu,
  Merge,
  MousePointer2,
  Plus,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  Zap,
  Trash2,
} from "lucide-react";
import DocumentShowcaseCarousel from "../components/ui/document-showcase-carousel";
import { useRef, useState } from "react";

const navItems = [
  { label: "首页", href: "#" },
  { label: "作品展示", href: "#showcase" },
  { label: "图片转换", href: "#image-tools" },
  { label: "文档转换", href: "#document-tools" },
  { label: "音频转换", href: "#audio-tools" },
  { label: "视频转换", href: "#video-tools" },
];

type ConverterMode = "image" | "pdf-jpg" | "audio" | "video";
type ImageFormat = "jpg" | "png" | "webp";
type AudioFormat = "mp3" | "wav" | "m4a" | "ogg" | "aac" | "flac";
type VideoFormat = "mp4" | "webm" | "mov" | "mkv" | "avi";
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

type ShowcaseWork = {
  title: string;
  author: string;
  type: string;
  description: string;
  palette: string;
  kind: "document" | "audio" | "video" | "image";
  file?: File;
  imageUrl?: string;
};

const showcaseWorks: ShowcaseWork[] = [
  { title: "城市记忆 · 摄影作品集", author: "林亦安", type: "摄影文档 · 18 页", description: "用镜头记录城市清晨与黄昏的细微变化，整理成一份有温度的摄影文档。", palette: "from-amber-300 via-rose-200 to-violet-200", kind: "document", imageUrl: "https://images.unsplash.com/photo-1494806812796-244fe51b774d?q=85&w=1600&auto=format&fit=crop" },
  { title: "旧书店改造提案", author: "许清", type: "PDF · 26 页", description: "围绕社区旧书店更新完成的空间研究与视觉提案，兼顾阅读、交流与展览。", palette: "from-orange-300 via-amber-200 to-rose-200", kind: "document" },
  { title: "给春天的一封信", author: "沈岚", type: "DOCX · 12 页", description: "图文并置的散文作品，用细腻的文字和留白记录一段缓慢生长的春日。", palette: "from-lime-300 via-emerald-200 to-teal-200", kind: "document" },
];

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

type ToBlobURL = (url: string, mimeType: string) => Promise<string>;
type FFmpegCoreAssets = { coreURL: string; wasmURL: string };

const ffmpegCoreCdnBaseUrls = [
  "https://cdn.jsdelivr.net/npm/@ffmpeg/core@0.12.10/dist/esm",
  "https://unpkg.com/@ffmpeg/core@0.12.10/dist/esm",
];

let ffmpegCoreAssetsPromise: Promise<FFmpegCoreAssets> | null = null;

const loadFFmpegCoreAssets = (toBlobURL: ToBlobURL) => {
  if (!ffmpegCoreAssetsPromise) {
    ffmpegCoreAssetsPromise = (async () => {
      let lastError: unknown;

      for (const baseUrl of ffmpegCoreCdnBaseUrls) {
        try {
          const [coreURL, wasmURL] = await Promise.all([
            toBlobURL(`${baseUrl}/ffmpeg-core.js`, "text/javascript"),
            toBlobURL(`${baseUrl}/ffmpeg-core.wasm`, "application/wasm"),
          ]);
          return { coreURL, wasmURL };
        } catch (error) {
          lastError = error;
        }
      }

      throw lastError instanceof Error ? lastError : new Error("无法加载 FFmpeg CDN 核心文件");
    })().catch((error) => {
      ffmpegCoreAssetsPromise = null;
      throw error;
    });
  }

  return ffmpegCoreAssetsPromise;
};

export default function Home() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [showcaseOpen, setShowcaseOpen] = useState(false);
  const [activeShowcaseIndex, setActiveShowcaseIndex] = useState(0);
  const [personalShowcaseWorks, setPersonalShowcaseWorks] = useState<ShowcaseWork[]>([]);
  const [showcaseAuthor, setShowcaseAuthor] = useState("");
  const [dragging, setDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [converting, setConverting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState("");
  const [converterMode, setConverterMode] = useState<ConverterMode>("pdf-jpg");
  const [detectedFormat, setDetectedFormat] = useState("");
  const [imageFormat, setImageFormat] = useState<ImageFormat>("png");
  const [audioFormat, setAudioFormat] = useState<AudioFormat>("mp3");
  const [videoFormat, setVideoFormat] = useState<VideoFormat>("mp4");
  const inputRef = useRef<HTMLInputElement>(null);
  const showcaseInputRef = useRef<HTMLInputElement>(null);
  const showcaseSlides = [...personalShowcaseWorks, ...showcaseWorks];

  const selectShowcaseFile = (file?: File) => {
    if (!file) return;
    const extension = file.name.split(".").pop()?.toUpperCase() || "文件";
    const kind: ShowcaseWork["kind"] = file.type.startsWith("image/") ? "image" : file.type.startsWith("audio/") ? "audio" : file.type.startsWith("video/") ? "video" : "document";
    const palettes: Record<ShowcaseWork["kind"], string> = {
      document: "from-amber-300 via-rose-200 to-violet-200",
      audio: "from-sky-300 via-cyan-300 to-violet-400",
      video: "from-lime-300 via-emerald-300 to-teal-500",
      image: "from-fuchsia-300 via-pink-300 to-orange-300",
    };
    const author = showcaseAuthor.trim() || "匿名创作者";
    const newWork: ShowcaseWork = { title: file.name.replace(/\.[^.]+$/, ""), author, type: `${extension} · 我的作品`, description: "这是你刚刚添加的本地作品预览。它只在当前浏览器会话中显示，关闭或刷新页面后不会保留。", palette: palettes[kind], kind, file };
    setPersonalShowcaseWorks((works) => [...works, newWork]);
    setShowcaseAuthor("");
    setActiveShowcaseIndex(personalShowcaseWorks.length);
    setShowcaseOpen(true);
  };

  const removeActiveShowcaseWork = () => {
    if (activeShowcaseIndex >= personalShowcaseWorks.length) return;
    const remainingPersonalWorks = personalShowcaseWorks.length - 1;
    const nextIndex = Math.min(activeShowcaseIndex, remainingPersonalWorks + showcaseWorks.length - 1);
    setPersonalShowcaseWorks((works) => works.filter((_, index) => index !== activeShowcaseIndex));
    setActiveShowcaseIndex(Math.max(0, nextIndex));
  };

  const selectFile = (file?: File) => {
    if (!file) return;
    setProgress(0);
    const extension = file.name.split(".").pop()?.toLowerCase() || "";
    const normalizedExtension = extension === "jpeg" ? "jpg" : extension;
    const isImage = file.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(file.name);
    const isPdf = file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf");
    const isAudio = file.type.startsWith("audio/") || /\.(mp3|wav|m4a|aac|ogg|flac)$/i.test(file.name);
    const isVideo = file.type.startsWith("video/") || /\.(mp4|mov|mkv|avi|webm|m4v)$/i.test(file.name);
    setDetectedFormat((normalizedExtension || file.type.split("/").pop() || "未知").toUpperCase());
    setSelectedFile(file);

    if (isImage) {
      setConverterMode("image");
      setImageFormat(normalizedExtension === "png" ? "jpg" : "png");
      setMessage("");
    } else if (isPdf) {
      setConverterMode("pdf-jpg");
      setImageFormat("jpg");
      setMessage("");
    } else if (isAudio) {
      setConverterMode("audio");
      setAudioFormat(normalizedExtension === "mp3" ? "wav" : "mp3");
      setMessage("");
    } else if (isVideo) {
      setConverterMode("video");
      setVideoFormat(normalizedExtension === "mp4" ? "webm" : "mp4");
      setMessage("");
    } else {
      setSelectedFile(null);
      setMessage("暂不支持这个文件格式，请选择图片、PDF、音频或视频文件。");
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

  const convertImage = async () => {
    if (!selectedFile || converting) return;
    const isImage = selectedFile.type.startsWith("image/") || /\.(jpe?g|png|webp)$/i.test(selectedFile.name);
    if (!isImage) {
      setMessage("请选择 JPG、PNG 或 WEBP 图片后再转换。");
      return;
    }

    setConverting(true);
    setProgress(20);
    setMessage(`正在转换为 ${imageFormat.toUpperCase()}...`);

    try {
      const imageUrl = URL.createObjectURL(selectedFile);
      const image = new Image();
      image.decoding = "async";
      image.src = imageUrl;
      await image.decode();

      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: imageFormat !== "jpg" });
      if (!context) throw new Error("浏览器无法创建图片画布");
      canvas.width = image.naturalWidth;
      canvas.height = image.naturalHeight;
      if (imageFormat === "jpg") {
        context.fillStyle = "#ffffff";
        context.fillRect(0, 0, canvas.width, canvas.height);
      }
      context.drawImage(image, 0, 0);
      URL.revokeObjectURL(imageUrl);
      setProgress(80);

      const mimeTypes: Record<ImageFormat, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
      const blob = await new Promise<Blob>((resolve, reject) => {
        canvas.toBlob((result) => result ? resolve(result) : reject(new Error("图片生成失败")), mimeTypes[imageFormat], 0.92);
      });
      const baseName = selectedFile.name.replace(/\.[^.]+$/, "");
      downloadBlob(blob, `${baseName}.${imageFormat}`);
      setProgress(100);
      setMessage(`转换完成，${imageFormat.toUpperCase()} 图片已开始下载。`);
    } catch (error) {
      console.error(error);
      setMessage("图片转换失败，请确认图片文件完整后重试。");
    } finally {
      setConverting(false);
    }
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

        const pdfImageMimeTypes: Record<ImageFormat, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp" };
        const blob = await new Promise<Blob>((resolve, reject) => {
          canvas.toBlob((result) => result ? resolve(result) : reject(new Error("图片生成失败")), pdfImageMimeTypes[imageFormat], 0.92);
        });

        if (pdf.numPages === 1) {
          singlePageBlob = blob;
        } else {
          zip.file(`${baseName}-${String(pageNumber).padStart(3, "0")}.${imageFormat}`, blob);
        }
        setProgress(Math.round((pageNumber / pdf.numPages) * 100));
        page.cleanup();
      }

      if (singlePageBlob) {
        downloadBlob(singlePageBlob, `${baseName}.${imageFormat}`);
      } else {
        setMessage("正在打包图片...");
        const zipBlob = await zip.generateAsync({ type: "blob", compression: "DEFLATE" });
        downloadBlob(zipBlob, `${baseName}-${imageFormat.toUpperCase()}图片.zip`);
      }

      await loadingTask.destroy();
      setProgress(100);
      setMessage(`转换完成，${pdf.numPages === 1 ? `${imageFormat.toUpperCase()} 图片` : "ZIP 压缩包"}已开始下载。`);
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
    setMessage("正在从 CDN 加载音频转换引擎（首次约 32MB）...");

    try {
      const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: currentProgress }) => {
        if (Number.isFinite(currentProgress)) {
          setProgress(Math.max(10, Math.min(96, Math.round(currentProgress * 100))));
        }
      });
      const { coreURL, wasmURL } = await loadFFmpegCoreAssets(toBlobURL);
      await ffmpeg.load({
        classWorkerURL: `${window.location.origin}/ffmpeg/worker.js`,
        coreURL,
        wasmURL,
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
        aac: ["-vn", "-c:a", "aac", "-b:a", "192k"],
        flac: ["-vn", "-c:a", "flac"],
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
        aac: "audio/aac",
        flac: "audio/flac",
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
    setMessage("正在从 CDN 加载视频转换引擎（首次约 32MB）...");

    try {
      const [{ FFmpeg }, { fetchFile, toBlobURL }] = await Promise.all([import("@ffmpeg/ffmpeg"), import("@ffmpeg/util")]);
      const ffmpeg = new FFmpeg();
      ffmpeg.on("progress", ({ progress: currentProgress }) => {
        if (Number.isFinite(currentProgress)) {
          setProgress(Math.max(10, Math.min(96, Math.round(currentProgress * 100))));
        }
      });
      const { coreURL, wasmURL } = await loadFFmpegCoreAssets(toBlobURL);
      await ffmpeg.load({
        classWorkerURL: `${window.location.origin}/ffmpeg/worker.js`,
        coreURL,
        wasmURL,
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
        mkv: ["-c:v", "libx264", "-preset", "ultrafast", "-crf", "23", "-pix_fmt", "yuv420p", "-c:a", "aac", "-b:a", "128k"],
        avi: ["-c:v", "mpeg4", "-q:v", "4", "-c:a", "libmp3lame", "-b:a", "128k"],
      };
      const exitCode = await ffmpeg.exec(["-i", inputName, ...formatArguments[videoFormat], outputName]);
      if (exitCode !== 0) throw new Error(`FFmpeg exited with code ${exitCode}`);

      const outputData = await ffmpeg.readFile(outputName);
      const bytes = typeof outputData === "string" ? new TextEncoder().encode(outputData) : new Uint8Array(outputData);
      const mimeTypes: Record<VideoFormat, string> = { mp4: "video/mp4", webm: "video/webm", mov: "video/quicktime", mkv: "video/x-matroska", avi: "video/x-msvideo" };
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
            onDragEnter={(event) => { event.preventDefault(); setDragging(true); }}
            onDragOver={(event) => event.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => { event.preventDefault(); setDragging(false); selectFile(event.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`mb-4 cursor-pointer rounded-2xl border bg-white/90 p-4 text-left shadow-sm backdrop-blur transition sm:p-5 ${dragging ? "border-violet-500 bg-violet-50/90 ring-2 ring-violet-100" : "border-violet-200/80 hover:border-violet-400"}`}
          >
            <div className="mb-4 flex items-center justify-between gap-4">
              <div>
                <p className="text-sm font-semibold text-slate-800">选择转换格式</p>
                <p className="mt-1 text-xs text-slate-400">放入文件后自动识别原格式，再由你选择要转换的格式</p>
              </div>
              <span className={`inline-flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold ${selectedFile ? "bg-emerald-50 text-emerald-700" : "bg-violet-50 text-violet-600"}`}>
                {selectedFile && <Check className="h-3.5 w-3.5" />}
                {selectedFile ? `已识别 · ${detectedFormat}` : "点击或拖入文件"}
              </span>
            </div>
            <div className="grid items-end gap-3 sm:grid-cols-[1fr_auto_1fr]">
              <div>
                <label className="mb-2 block text-xs font-medium text-slate-500">原始格式</label>
                <div className={`flex h-12 items-center rounded-xl border px-4 text-sm font-semibold ${selectedFile ? "border-emerald-200 bg-emerald-50 text-emerald-700" : "border-slate-200 bg-slate-50 text-slate-400"}`}>
                  {selectedFile ? `${detectedFormat} · 已识别` : "等待放入文件"}
                </div>
              </div>
              <ArrowRight className="mx-auto mb-4 hidden h-5 w-5 text-violet-400 sm:block" aria-hidden="true" />
              <div>
                <label htmlFor="target-format" className="mb-2 block text-xs font-medium text-slate-500">转换为</label>
                <select
                  id="target-format"
                  value={!selectedFile ? "" : converterMode === "image" || converterMode === "pdf-jpg" ? imageFormat : converterMode === "audio" ? audioFormat : videoFormat}
                  onClick={(event) => event.stopPropagation()}
                  onChange={(event) => {
                    const value = event.target.value;
                    if (converterMode === "image" || converterMode === "pdf-jpg") setImageFormat(value as ImageFormat);
                    if (converterMode === "audio") setAudioFormat(value as AudioFormat);
                    if (converterMode === "video") setVideoFormat(value as VideoFormat);
                    setProgress(0);
                    setMessage("");
                  }}
                  disabled={!selectedFile || converting}
                  className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold uppercase text-slate-700 outline-none transition focus:border-violet-400 focus:ring-2 focus:ring-violet-100 disabled:cursor-not-allowed disabled:bg-slate-50 disabled:text-slate-400"
                >
                  {!selectedFile && <option value="">请先放入文件</option>}
                  {selectedFile && converterMode === "image" && <>
                    <option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WEBP</option>
                  </>}
                  {selectedFile && converterMode === "pdf-jpg" && <>
                    <option value="jpg">JPG</option><option value="png">PNG</option><option value="webp">WEBP</option>
                  </>}
                  {selectedFile && converterMode === "audio" && <>
                    <option value="mp3">MP3</option><option value="wav">WAV</option><option value="m4a">M4A</option><option value="ogg">OGG</option><option value="aac">AAC</option><option value="flac">FLAC</option>
                  </>}
                  {selectedFile && converterMode === "video" && <>
                    <option value="mp4">MP4</option><option value="webm">WEBM</option><option value="mov">MOV</option><option value="mkv">MKV</option><option value="avi">AVI</option>
                  </>}
                </select>
              </div>
            </div>
            {!selectedFile && message && <p className="mt-3 text-sm text-rose-600" role="alert">{message}</p>}
          </div>
          <div
            onDragEnter={(e) => { e.preventDefault(); setDragging(true); }}
            onDragOver={(e) => e.preventDefault()}
            onDragLeave={() => setDragging(false)}
            onDrop={(e) => { e.preventDefault(); setDragging(false); selectFile(e.dataTransfer.files[0]); }}
            onClick={() => inputRef.current?.click()}
            className={`upload-zone group relative cursor-pointer overflow-hidden rounded-[28px] border-2 border-dashed bg-white/90 p-7 shadow-glow backdrop-blur-sm transition-all duration-300 sm:p-10 ${dragging ? "scale-[1.01] border-violet-500 bg-violet-50/80" : "border-indigo-200 hover:-translate-y-1 hover:border-violet-400 hover:shadow-[0_28px_80px_-30px_rgba(91,67,255,0.55)]"}`}
          >
            <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,.jpg,.jpeg,.png,.webp,application/pdf,.pdf,audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.mov,.mkv,.avi,.webm,.m4v" className="sr-only" onChange={(e) => selectFile(e.target.files?.[0])} />
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
                <p className="mt-2 text-sm text-slate-400">支持图片、PDF、音频与视频文件 · 最大 50MB</p>
              </div>
            )}
          </div>
          {selectedFile && converterMode === "image" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0 flex-1 text-left">
                <p className="font-semibold text-slate-800">图片转换 · 输出 {imageFormat.toUpperCase()}</p>
                <p className={`mt-1 text-sm ${message.includes("失败") || message.includes("请选择") ? "text-rose-600" : "text-slate-500"}`} aria-live="polite">
                  {message || "图片将在浏览器本地转换，完成后自动下载。"}
                </p>
                {(converting || progress > 0) && (
                  <div className="mt-3 h-2 overflow-hidden rounded-full bg-slate-100">
                    <div className="h-full rounded-full bg-gradient-to-r from-blue-500 to-violet-600 transition-all duration-300" style={{ width: `${progress}%` }} />
                  </div>
                )}
              </div>
              <button type="button" onClick={(event) => { event.stopPropagation(); void convertImage(); }} disabled={converting} className="mt-4 inline-flex w-full shrink-0 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-blue-500 to-violet-600 px-6 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5 disabled:cursor-wait disabled:opacity-70 sm:mt-0 sm:w-auto">
                {converting ? <LoaderCircle className="h-4 w-4 animate-spin" /> : <FileImage className="h-4 w-4" />}
                {converting ? `转换中 ${progress}%` : "开始转换"}
              </button>
            </div>
          )}
          {selectedFile && converterMode === "pdf-jpg" && (
            <div className="mt-5 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-5">
              <div className="min-w-0 text-left">
                <p className="font-semibold text-slate-800">PDF 转 {imageFormat.toUpperCase()}</p>
                <p className={`mt-1 text-sm ${message.includes("失败") || message.includes("请选择") || message.includes("仅支持") ? "text-rose-600" : "text-slate-500"}`} aria-live="polite">
                  {message || `每一页都会转换为清晰的 ${imageFormat.toUpperCase()} 图片，多页 PDF 将自动打包下载。`}
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
                <p className="font-semibold text-slate-800">音频转换 · 输出 {audioFormat.toUpperCase()}</p>
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
                <p className="font-semibold text-slate-800">视频转换 · 输出 {videoFormat.toUpperCase()}</p>
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

      <section id="showcase" className="relative z-10 mx-auto max-w-7xl scroll-mt-24 px-5 pb-8 pt-4 sm:px-8 sm:pt-8 lg:px-10">
        <div className="overflow-hidden rounded-[28px] border border-violet-100 bg-white shadow-[0_18px_55px_rgba(76,58,154,0.09)]">
          <div className="grid gap-6 p-6 sm:p-8 lg:grid-cols-[1.05fr_1fr] lg:items-center lg:gap-12 lg:p-10">
            <div>
              <span className="inline-flex items-center gap-2 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">
                <BookOpen className="h-3.5 w-3.5" /> 优秀文档展示窗
              </span>
              <h2 className="mt-4 text-2xl font-bold tracking-tight text-slate-900 sm:text-3xl">让每一份好作品，<br className="hidden sm:block" />都有被看见的机会</h2>
              <p className="mt-4 max-w-xl text-sm leading-6 text-slate-500 sm:text-base">浏览网友分享的摄影作品集、创意文档与研究报告，也可以把自己的文档加入本次展示窗预览。</p>
              <button type="button" onClick={() => setShowcaseOpen(true)} className="mt-6 inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-5 py-3 text-sm font-semibold text-white shadow-lg shadow-violet-500/20 transition hover:-translate-y-0.5">
                <Eye className="h-4 w-4" /> 浏览精选作品
              </button>
            </div>
            <div>
              <input ref={showcaseInputRef} type="file" accept="image/*,.jpg,.jpeg,.png,.webp,.pdf,.doc,.docx,.ppt,.pptx,.xls,.xlsx,.txt" className="sr-only" onChange={(event) => { selectShowcaseFile(event.target.files?.[0]); event.currentTarget.value = ""; }} />
              <label className="mb-3 block text-left"><span className="mb-1.5 block text-xs font-semibold text-slate-500">创作者昵称（可选）</span><input value={showcaseAuthor} onChange={(event) => setShowcaseAuthor(event.target.value)} maxLength={24} placeholder="例如：小雨、陈同学" className="h-10 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-700 outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100" /></label>
              <button type="button" onClick={() => showcaseInputRef.current?.click()} className="group flex min-h-60 w-full flex-col items-center justify-center rounded-[24px] border-2 border-dashed border-violet-200 bg-violet-50/40 p-6 text-center transition hover:-translate-y-1 hover:border-violet-400 hover:bg-violet-50 hover:shadow-lg hover:shadow-violet-500/10">
              <span className="grid h-16 w-16 place-items-center rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-lg shadow-violet-500/25 transition group-hover:scale-105"><UploadCloud className="h-7 w-7" /></span>
              <span className="mt-5 text-base font-semibold text-slate-800">添加我的作品</span>
              <span className="mt-2 max-w-sm text-sm leading-6 text-slate-500">选择你的摄影作品或创意文档，立即加入网友文档展示窗预览。</span>
              <span className="mt-4 flex flex-wrap justify-center gap-2 text-xs font-medium text-violet-700"><span className="rounded-full bg-white px-2.5 py-1">摄影作品</span><span className="rounded-full bg-white px-2.5 py-1">PDF</span><span className="rounded-full bg-white px-2.5 py-1">Word / Office</span></span>
              <span className="mt-4 text-xs text-slate-400">仅本地预览，不会上传</span>
              </button>
              {personalShowcaseWorks.length > 0 && <button type="button" onClick={() => setShowcaseOpen(true)} className="mt-3 w-full rounded-xl bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-700 transition hover:bg-emerald-100">已添加 {personalShowcaseWorks.length} 个我的作品 · 查看作品队列</button>}
            </div>
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

      {showcaseOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/45 p-4 backdrop-blur-sm" role="presentation" onMouseDown={() => setShowcaseOpen(false)}>
          <div role="dialog" aria-modal="true" aria-labelledby="showcase-title" className="max-h-[min(720px,calc(100vh-32px))] w-full max-w-4xl overflow-auto rounded-[28px] bg-white shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-5 sm:px-7">
              <div>
                <p className="text-xs font-semibold text-violet-600">网友文档精选</p>
                <h2 id="showcase-title" className="mt-1 text-xl font-bold text-slate-900">个人文档展示窗</h2>
              </div>
              <div className="flex items-center gap-2">
                <button type="button" onClick={() => showcaseInputRef.current?.click()} className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-violet-200 bg-violet-50 px-3 text-xs font-semibold text-violet-700 transition hover:bg-violet-100" aria-label="添加作品"><Plus className="h-4 w-4" /> 添加</button>
                <button type="button" onClick={removeActiveShowcaseWork} disabled={activeShowcaseIndex >= personalShowcaseWorks.length} className="grid h-9 w-9 place-items-center rounded-xl border border-rose-100 text-rose-500 transition hover:bg-rose-50 disabled:cursor-not-allowed disabled:border-slate-100 disabled:text-slate-300" aria-label="删除当前作品" title={activeShowcaseIndex < personalShowcaseWorks.length ? "删除当前作品" : "精选作品不可删除"}><Trash2 className="h-4 w-4" /></button>
                <button type="button" onClick={() => setShowcaseOpen(false)} className="grid h-9 w-9 place-items-center rounded-xl border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800" aria-label="关闭作品展示窗"><X className="h-4 w-4" /></button>
              </div>
            </div>
            <div className="p-5 sm:p-7">
              <DocumentShowcaseCarousel key={personalShowcaseWorks.length} slides={showcaseSlides} initialIndex={activeShowcaseIndex} onCurrentChange={setActiveShowcaseIndex} />
              <p className="mx-auto mt-6 max-w-2xl text-center text-xs leading-5 text-slate-400">你已添加 {personalShowcaseWorks.length} 个本地作品；它们会一起出现在本次展示窗的轮播中，但不会上传或公开。接入账号与存储后，才可由创作者提交公开作品。</p>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
