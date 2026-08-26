"use client";

import { ArrowRight, FileAudio, FileText, Film, Play, Volume2 } from "lucide-react";
import { useEffect, useId, useMemo, useRef, useState } from "react";

export type DocumentShowcaseSlide = {
  title: string;
  author: string;
  type: string;
  description: string;
  palette: string;
  kind: "document" | "audio" | "video" | "image";
  file?: File;
  imageUrl?: string;
};

type DocumentShowcaseCarouselProps = {
  slides: DocumentShowcaseSlide[];
  initialIndex?: number;
  onCurrentChange?: (index: number) => void;
};

function ImageScrollPreview({ slides }: { slides: DocumentShowcaseSlide[] }) {
  const [imageUrls, setImageUrls] = useState<string[]>([]);

  useEffect(() => {
    const urls = slides.map((slide) => slide.file ? URL.createObjectURL(slide.file) : "");
    setImageUrls(urls);
    return () => urls.forEach((url) => { if (url) URL.revokeObjectURL(url); });
  }, [slides]);

  return (
    <div className="absolute inset-0 snap-y snap-mandatory overflow-y-auto overscroll-contain scroll-smooth bg-slate-950">
      <div className="sticky top-0 z-10 flex justify-center p-3"><span className="rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-semibold text-white backdrop-blur">图片作品集 · 向下滚动查看 {slides.length} 张</span></div>
      {slides.map((slide, index) => (
        <figure key={`${slide.title}-${index}`} className="relative flex min-h-full snap-start items-center justify-center p-3 pt-10">
          {imageUrls[index] && <img src={imageUrls[index]} alt={`图片作品：${slide.title}`} className="max-h-[88%] max-w-full rounded-xl object-contain shadow-2xl" />}
          <figcaption className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-slate-950/70 px-3 py-1.5 text-xs font-medium text-white backdrop-blur">{slide.title} · {slide.author}</figcaption>
        </figure>
      ))}
    </div>
  );
}

function WorkPreview({ slide, active, imageSlides }: { slide: DocumentShowcaseSlide; active: boolean; imageSlides: DocumentShowcaseSlide[] }) {
  const [fileUrl, setFileUrl] = useState<string | null>(null);

  useEffect(() => {
    if (!slide.file) {
      setFileUrl(null);
      return;
    }
    const url = URL.createObjectURL(slide.file);
    setFileUrl(url);
    return () => URL.revokeObjectURL(url);
  }, [slide.file]);

  const isPdf = slide.file && (slide.file.type === "application/pdf" || slide.file.name.toLowerCase().endsWith(".pdf"));
  if (slide.file && fileUrl && isPdf) {
    return <iframe src={fileUrl} title={`预览：${slide.title}`} className="absolute inset-0 h-full w-full border-0 bg-white" />;
  }

  if (slide.file && fileUrl && slide.kind === "image") {
    return <ImageScrollPreview slides={imageSlides} />;
  }

  if (slide.file && fileUrl && slide.kind === "audio") {
    return <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950 p-8 text-center text-white"><FileAudio className="h-12 w-12 text-violet-300" /><p className="mt-5 text-xl font-semibold">{slide.title}</p><p className="mt-2 text-sm text-white/60">{slide.author}</p><audio controls src={fileUrl} className="mt-8 w-full max-w-md" /></div>;
  }

  if (slide.file && fileUrl && slide.kind === "video") {
    return <video controls src={fileUrl} className="absolute inset-0 h-full w-full bg-black object-contain" />;
  }

  if (slide.file) {
    return <div className="absolute inset-0 flex items-center justify-center bg-gradient-to-br from-slate-200 via-violet-100 to-sky-100 p-7"><div className="relative h-full w-full max-w-md -rotate-1 rounded-md bg-white p-6 text-slate-700 shadow-[0_20px_48px_rgba(15,23,42,0.22)] sm:p-9"><div className="flex items-center justify-between border-b border-slate-100 pb-4 text-[10px] font-semibold tracking-[0.16em] text-slate-400"><span>MY CREATIVE WORK</span><span>{slide.type.split("·")[0]}</span></div><FileText className="mt-7 h-9 w-9 text-violet-500" /><h4 className="mt-4 break-words text-xl font-bold leading-tight text-slate-800 sm:text-3xl">{slide.title}</h4><p className="mt-3 text-sm text-slate-400">{slide.author} · 文档封面预览</p><div className="mt-8 space-y-3"><span className="block h-2 w-full rounded-full bg-slate-200" /><span className="block h-2 w-10/12 rounded-full bg-slate-100" /><span className="block h-2 w-8/12 rounded-full bg-slate-100" /></div><span className="absolute bottom-7 right-7 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700">图片式展示</span></div></div>;
  }

  if (slide.imageUrl) {
    return <><img src={slide.imageUrl} alt={`${slide.title} 摄影作品预览`} className="absolute inset-0 h-full w-full object-cover" /><div className="absolute inset-0 bg-gradient-to-t from-slate-950/65 via-slate-950/10 to-slate-950/5" /></>;
  }

  if (slide.kind === "document") {
    return (
      <div className="absolute inset-0 flex items-center justify-center bg-slate-200/70 p-6 sm:p-10">
        <div className="h-full w-full max-w-md rotate-[-1.5deg] rounded-sm bg-white p-5 text-slate-700 shadow-[0_18px_45px_rgba(15,23,42,0.22)] sm:p-8">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4 text-[10px] font-semibold tracking-[0.16em] text-slate-400"><span>PERSONAL WORKS</span><span>01 / 18</span></div>
          <h4 className="mt-6 text-xl font-bold tracking-tight text-slate-800 sm:text-3xl">{slide.title}</h4>
          <p className="mt-3 text-xs leading-5 text-slate-400">{slide.author} · 创意文档作品</p>
          <div className="mt-7 space-y-3"><span className="block h-2 w-full rounded-full bg-slate-200" /><span className="block h-2 w-11/12 rounded-full bg-slate-100" /><span className="block h-2 w-9/12 rounded-full bg-slate-100" /></div>
          <div className={`mt-7 h-20 rounded-xl bg-gradient-to-br ${slide.palette} opacity-75 sm:h-28`} />
        </div>
      </div>
    );
  }

  if (slide.kind === "audio") {
    const waveform = [32, 54, 76, 46, 90, 64, 38, 70, 96, 52, 82, 42, 68, 88, 58, 34, 72, 48, 84, 60, 40, 74, 52, 92, 62, 36, 78, 50];
    return (
      <div className="absolute inset-0 flex flex-col justify-between bg-slate-950 p-6 text-white sm:p-10">
        <div className="flex items-center justify-between text-xs text-white/60"><span className="inline-flex items-center gap-2"><FileAudio className="h-4 w-4" /> 原创音频</span><span>03:42</span></div>
        <div className="text-center"><span className="mx-auto grid h-16 w-16 place-items-center rounded-full bg-violet-500 text-white shadow-[0_0_45px_rgba(139,92,246,0.55)]"><Play className="ml-1 h-7 w-7 fill-current" /></span><p className="mt-5 text-lg font-semibold sm:text-2xl">{slide.title}</p><p className="mt-2 text-sm text-white/60">{slide.author}</p></div>
        <div><div className="flex h-16 items-center justify-center gap-1">{waveform.map((height, index) => <span key={index} className={`w-1 rounded-full bg-gradient-to-t ${slide.palette} transition-opacity ${active ? "opacity-100" : "opacity-50"}`} style={{ height: `${height}%` }} />)}</div><div className="mt-4 flex items-center justify-between text-xs text-white/55"><Volume2 className="h-4 w-4" /><span>00:00</span><span>03:42</span></div></div>
      </div>
    );
  }

  return (
    <div className="absolute inset-0 flex flex-col bg-slate-950 text-white">
      <div className={`relative flex flex-1 items-center justify-center overflow-hidden bg-gradient-to-br ${slide.palette} opacity-90`}><div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_35%,rgba(255,255,255,0.32),transparent_36%),linear-gradient(135deg,rgba(15,23,42,0.15),rgba(15,23,42,0.7))]" /><span className="relative grid h-16 w-16 place-items-center rounded-full border border-white/50 bg-white/20 backdrop-blur"><Play className="ml-1 h-7 w-7 fill-current" /></span><span className="absolute left-5 top-5 inline-flex items-center gap-2 rounded-full bg-slate-950/35 px-3 py-1.5 text-xs font-semibold backdrop-blur"><Film className="h-3.5 w-3.5" /> 视频作品</span></div>
      <div className="p-5 sm:p-7"><p className="text-sm font-semibold">{slide.title}</p><p className="mt-1 text-xs text-white/60">{slide.author} · {slide.type}</p><div className="mt-5 h-1.5 overflow-hidden rounded-full bg-white/20"><span className="block h-full w-[36%] rounded-full bg-white" /></div><div className="mt-3 flex justify-between text-xs text-white/55"><span>00:42</span><span>02:18</span></div></div>
    </div>
  );
}

export default function DocumentShowcaseCarousel({ slides, initialIndex = 0, onCurrentChange }: DocumentShowcaseCarouselProps) {
  const [current, setCurrent] = useState(Math.min(Math.max(initialIndex, 0), slides.length - 1));
  const [pointer, setPointer] = useState({ x: 0, y: 0 });
  const carouselId = useId();
  const activeSlide = slides[current];
  const imageSlides = useMemo(() => slides.filter((slide) => slide.kind === "image" && slide.file), [slides]);
  const slideRef = useRef<HTMLDivElement>(null);

  const moveTo = (index: number) => {
    const nextIndex = (index + slides.length) % slides.length;
    setCurrent(nextIndex);
    onCurrentChange?.(nextIndex);
  };

  const handlePointerMove = (event: React.MouseEvent<HTMLDivElement>) => {
    const element = slideRef.current;
    if (!element) return;
    const bounds = element.getBoundingClientRect();
    setPointer({
      x: (event.clientX - bounds.left - bounds.width / 2) / 18,
      y: (event.clientY - bounds.top - bounds.height / 2) / 18,
    });
  };

  if (!slides.length) return null;

  return (
    <div className="overflow-hidden" aria-labelledby={`showcase-carousel-${carouselId}`}>
      <div ref={slideRef} className="relative mx-auto h-[min(62vw,430px)] min-h-[310px] max-w-[680px] [perspective:1200px]" onMouseMove={handlePointerMove} onMouseLeave={() => setPointer({ x: 0, y: 0 })}>
        <div className="absolute inset-y-0 left-1/2 flex w-full -translate-x-1/2 items-center transition-transform duration-700 ease-out" style={{ transform: `translateX(calc(-50% - ${current * 100}%))` }}>
          {slides.map((slide, index) => {
            const isActive = current === index;
            return (
              <div key={`${slide.title}-${index}`} role="button" tabIndex={0} onClick={() => moveTo(index)} onKeyDown={(event) => { if (event.key === "Enter" || event.key === " ") { event.preventDefault(); moveTo(index); } }} className="relative h-full w-full shrink-0 px-4 text-left sm:px-8" aria-label={`查看作品：${slide.title}`}>
                <div className="relative h-full overflow-hidden rounded-[26px] bg-slate-900 shadow-[0_28px_60px_rgba(30,41,59,0.25)] transition-transform duration-500" style={{ transform: isActive ? "scale(1) rotateX(0deg)" : "scale(0.93) rotateX(8deg)", transformOrigin: "bottom" }}>
                  <div className="absolute inset-0 transition-transform duration-150 ease-out" style={{ transform: isActive ? `translate(${pointer.x}px, ${pointer.y}px) scale(1.03)` : "none" }}><WorkPreview slide={slide} active={isActive} imageSlides={imageSlides} /></div>
                  {!slide.file && <><div className="absolute inset-0 bg-gradient-to-t from-slate-950/55 via-transparent to-slate-950/15" />
                  <div className={`relative flex h-full flex-col justify-end p-6 text-white transition-opacity duration-500 sm:p-9 ${isActive ? "opacity-100" : "opacity-0"}`}>
                    <span className="mb-auto inline-flex w-fit items-center gap-1.5 rounded-full border border-white/30 bg-white/15 px-3 py-1.5 text-xs font-semibold backdrop-blur">{slide.kind === "document" ? <FileText className="h-3.5 w-3.5" /> : slide.kind === "audio" ? <FileAudio className="h-3.5 w-3.5" /> : slide.kind === "video" ? <Film className="h-3.5 w-3.5" /> : <FileText className="h-3.5 w-3.5" />} {slide.type}</span>
                    <p className="text-xs font-medium tracking-[0.14em] text-white/75">{slide.author}</p>
                    <h3 className="mt-2 max-w-lg text-2xl font-semibold tracking-tight sm:text-4xl">{slide.title}</h3>
                    <span className="mt-5 inline-flex w-fit items-center gap-2 rounded-xl bg-white px-4 py-2.5 text-xs font-semibold text-slate-900 shadow-lg sm:text-sm">查看作品介绍 <ArrowRight className="h-4 w-4" /></span>
                  </div></>}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      <div className="mt-5 flex items-center justify-between gap-4 px-4 sm:px-8">
        <p id={`showcase-carousel-${carouselId}`} className="max-w-md text-sm leading-6 text-slate-500">{activeSlide.description}</p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => moveTo(current - 1)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700" aria-label="查看上一个作品"><ArrowRight className="h-4 w-4 rotate-180" /></button>
          <button type="button" onClick={() => moveTo(current + 1)} className="grid h-10 w-10 place-items-center rounded-full border border-slate-200 bg-white text-slate-600 transition hover:-translate-y-0.5 hover:border-violet-300 hover:text-violet-700" aria-label="查看下一个作品"><ArrowRight className="h-4 w-4" /></button>
        </div>
      </div>
      <div className="mt-4 flex justify-center gap-2" aria-label="作品轮播页码">
        {slides.map((slide, index) => <button key={`${slide.title}-${index}`} type="button" onClick={() => moveTo(index)} className={`h-1.5 rounded-full transition-all ${index === current ? "w-7 bg-violet-600" : "w-1.5 bg-slate-200 hover:bg-violet-300"}`} aria-label={`切换到：${slide.title}`} />)}
      </div>
    </div>
  );
}
