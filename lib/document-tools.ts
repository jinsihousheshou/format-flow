export type PdfOfficeFormat = "docx" | "xlsx" | "pptx";
export type OcrOutput = "txt" | "docx";
export type PdfBatchMode = "merge" | "split" | "compress";
export type ProgressUpdate = (progress: number, message: string) => void;

type PdfTextPage = {
  lines: string[];
  width: number;
  height: number;
};

const basePath = process.env.NEXT_PUBLIC_BASE_PATH ?? "";

function cleanBaseName(name: string) {
  return name.replace(/\.[^.]+$/, "").replace(/[\\/:*?"<>|]/g, "-") || "转换结果";
}

function escapeXml(value: string) {
  return value.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&apos;");
}

export function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 1000);
}

async function openPdf(file: File) {
  const pdfjs = await import("pdfjs-dist");
  pdfjs.GlobalWorkerOptions.workerSrc = `${basePath}/pdf.worker.min.mjs`;
  return pdfjs.getDocument({ data: new Uint8Array(await file.arrayBuffer()) });
}

async function extractPdfText(file: File, update: ProgressUpdate): Promise<PdfTextPage[]> {
  const loadingTask = await openPdf(file);
  const pdf = await loadingTask.promise;
  const pages: PdfTextPage[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      update(Math.round((pageNumber / pdf.numPages) * 72), `正在读取第 ${pageNumber} / ${pdf.numPages} 页文字...`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1 });
      const content = await page.getTextContent();
      const items = content.items
        .filter((item): item is typeof item & { str: string; transform: number[] } => "str" in item && "transform" in item)
        .map((item) => ({ text: item.str.trim(), x: item.transform[4] ?? 0, y: item.transform[5] ?? 0 }))
        .filter((item) => item.text);
      const rows: { y: number; fragments: { x: number; text: string }[] }[] = [];
      for (const item of items) {
        let row = rows.find((candidate) => Math.abs(candidate.y - item.y) < 3);
        if (!row) {
          row = { y: item.y, fragments: [] };
          rows.push(row);
        }
        row.fragments.push({ x: item.x, text: item.text });
      }
      const lines = rows
        .sort((a, b) => b.y - a.y)
        .map((row) => row.fragments.sort((a, b) => a.x - b.x).map((fragment) => fragment.text).join(" ").trim())
        .filter(Boolean);
      pages.push({ lines, width: viewport.width, height: viewport.height });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return pages;
}

function looksLikeHeading(line: string) {
  return line.length <= 32 && (/^(第[一二三四五六七八九十\d]+[章节部分]|[一二三四五六七八九十]+[、.]|\d+(?:\.\d+){0,2}[、.\s])/.test(line) || /^[【\[]?.{2,16}[】\]]?$/.test(line));
}

async function buildDocx(pages: string[][], mode: "plain" | "formatted" | "resume") {
  const {
    AlignmentType,
    Document,
    Footer,
    HeadingLevel,
    Packer,
    PageBreak,
    PageNumber,
    Paragraph,
    TableOfContents,
    TextRun,
  } = await import("docx");

  const paragraphs: InstanceType<typeof Paragraph>[] = [];
  if (mode === "formatted") {
    paragraphs.push(new Paragraph({ text: "目录", heading: HeadingLevel.HEADING_1 }));
    paragraphs.push(new TableOfContents("目录", { hyperlink: true, headingStyleRange: "1-3" }) as unknown as InstanceType<typeof Paragraph>);
    paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  }

  let contentIndex = 0;
  pages.forEach((lines, pageIndex) => {
    lines.forEach((line) => {
      const isFirst = contentIndex === 0;
      const sectionHeading = looksLikeHeading(line);
      if (mode === "resume" && isFirst) {
        paragraphs.push(new Paragraph({ alignment: AlignmentType.CENTER, spacing: { after: 260 }, children: [new TextRun({ text: line, bold: true, size: 36, color: "1D4ED8", font: "Microsoft YaHei" })] }));
      } else if (mode === "resume" && sectionHeading) {
        paragraphs.push(new Paragraph({ spacing: { before: 220, after: 100 }, children: [new TextRun({ text: line, bold: true, size: 25, color: "1E3A8A", font: "Microsoft YaHei" })] }));
      } else if (mode === "formatted" && sectionHeading) {
        paragraphs.push(new Paragraph({ text: line, heading: HeadingLevel.HEADING_1, spacing: { before: 220, after: 100 } }));
      } else {
        paragraphs.push(new Paragraph({ alignment: mode === "plain" ? AlignmentType.LEFT : AlignmentType.JUSTIFIED, spacing: { line: 360, after: 100 }, indent: mode === "formatted" ? { firstLine: 480 } : undefined, children: [new TextRun({ text: line || " ", size: 22, font: "Microsoft YaHei", color: "1F2937" })] }));
      }
      contentIndex += 1;
    });
    if (pageIndex < pages.length - 1) paragraphs.push(new Paragraph({ children: [new PageBreak()] }));
  });

  const document = new Document({
    sections: [{
      properties: { page: { margin: { top: 1080, right: 1080, bottom: 1080, left: 1080 } } },
      footers: { default: new Footer({ children: [new Paragraph({ alignment: AlignmentType.CENTER, children: [new TextRun({ children: [PageNumber.CURRENT], size: 18, color: "64748B" })] })] }) },
      children: paragraphs.length ? paragraphs : [new Paragraph("未提取到可用文字")],
    }],
  });
  return Packer.toBlob(document);
}

async function buildSimpleXlsx(rows: string[][]) {
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const sheetRows = rows.map((row, rowIndex) => {
    const cells = row.map((value, columnIndex) => {
      let number = columnIndex + 1;
      let letters = "";
      while (number > 0) {
        const remainder = (number - 1) % 26;
        letters = String.fromCharCode(65 + remainder) + letters;
        number = Math.floor((number - 1) / 26);
      }
      return `<c r="${letters}${rowIndex + 1}" t="inlineStr"><is><t xml:space="preserve">${escapeXml(value)}</t></is></c>`;
    }).join("");
    return `<row r="${rowIndex + 1}">${cells}</row>`;
  }).join("");
  zip.file("[Content_Types].xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/><Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/></Types>`);
  zip.file("_rels/.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>`);
  zip.file("xl/workbook.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets><sheet name="PDF文字" sheetId="1" r:id="rId1"/></sheets></workbook>`);
  zip.file("xl/_rels/workbook.xml.rels", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/></Relationships>`);
  zip.file("xl/worksheets/sheet1.xml", `<?xml version="1.0" encoding="UTF-8" standalone="yes"?><worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><cols><col min="1" max="1" width="10" customWidth="1"/><col min="2" max="2" width="10" customWidth="1"/><col min="3" max="3" width="80" customWidth="1"/></cols><sheetData>${sheetRows}</sheetData></worksheet>`);
  return zip.generateAsync({ type: "blob", mimeType: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet", compression: "DEFLATE" });
}

async function renderPdfPageDataUrls(file: File, update: ProgressUpdate) {
  const loadingTask = await openPdf(file);
  const pdf = await loadingTask.promise;
  const images: { data: string; width: number; height: number }[] = [];
  try {
    for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
      update(Math.round((pageNumber / pdf.numPages) * 76), `正在渲染第 ${pageNumber} / ${pdf.numPages} 页...`);
      const page = await pdf.getPage(pageNumber);
      const viewport = page.getViewport({ scale: 1.6 });
      const canvas = document.createElement("canvas");
      const context = canvas.getContext("2d", { alpha: false });
      if (!context) throw new Error("浏览器无法创建页面画布");
      canvas.width = Math.ceil(viewport.width);
      canvas.height = Math.ceil(viewport.height);
      context.fillStyle = "#ffffff";
      context.fillRect(0, 0, canvas.width, canvas.height);
      await page.render({ canvas, canvasContext: context, viewport }).promise;
      images.push({ data: canvas.toDataURL("image/jpeg", 0.9), width: viewport.width, height: viewport.height });
      page.cleanup();
    }
  } finally {
    await loadingTask.destroy();
  }
  return images;
}

export async function convertPdfToOffice(file: File, format: PdfOfficeFormat, update: ProgressUpdate) {
  const name = cleanBaseName(file.name);
  if (format === "docx") {
    const pages = await extractPdfText(file, update);
    update(86, "正在生成 Word 文档...");
    downloadBlob(await buildDocx(pages.map((page) => page.lines), "plain"), `${name}.docx`);
    return;
  }
  if (format === "xlsx") {
    const pages = await extractPdfText(file, update);
    update(86, "正在生成 Excel 工作簿...");
    const rows = [["页码", "行号", "提取内容"], ...pages.flatMap((page, pageIndex) => page.lines.map((line, lineIndex) => [String(pageIndex + 1), String(lineIndex + 1), line]))];
    downloadBlob(await buildSimpleXlsx(rows), `${name}.xlsx`);
    return;
  }
  const images = await renderPdfPageDataUrls(file, update);
  update(84, "正在生成 PowerPoint...");
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "格式工坊";
  pptx.subject = "PDF 页面转换";
  for (const image of images) {
    const slide = pptx.addSlide();
    slide.background = { color: "FFFFFF" };
    const slideWidth = 13.333;
    const slideHeight = 7.5;
    const scale = Math.min(slideWidth / image.width, slideHeight / image.height);
    const width = image.width * scale;
    const height = image.height * scale;
    slide.addImage({ data: image.data, x: (slideWidth - width) / 2, y: (slideHeight - height) / 2, w: width, h: height });
  }
  const output = await pptx.write({ outputType: "blob", compression: true });
  downloadBlob(output instanceof Blob ? output : new Blob([output as BlobPart], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), `${name}.pptx`);
}

async function fileToOcrImages(file: File, update: ProgressUpdate) {
  if (file.type === "application/pdf" || file.name.toLowerCase().endsWith(".pdf")) return renderPdfPageDataUrls(file, update);
  return [{ data: URL.createObjectURL(file), width: 1, height: 1 }];
}

export async function recognizeFile(file: File, output: OcrOutput, update: ProgressUpdate) {
  const images = await fileToOcrImages(file, update);
  update(6, "正在加载中英文识别引擎，首次使用需要下载语言包...");
  const { createWorker } = await import("tesseract.js");
  const worker = await createWorker(["chi_sim", "eng"], undefined, {
    logger: (event) => {
      if (event.status === "recognizing text") update(Math.max(8, Math.min(92, Math.round(event.progress * 84) + 8)), `正在识别文字 ${Math.round(event.progress * 100)}%...`);
    },
  });
  const pages: string[][] = [];
  try {
    for (let index = 0; index < images.length; index += 1) {
      update(Math.round((index / Math.max(images.length, 1)) * 82) + 8, `正在识别第 ${index + 1} / ${images.length} 页...`);
      const result = await worker.recognize(images[index].data);
      pages.push(result.data.text.split(/\r?\n/).map((line) => line.trimEnd()).filter(Boolean));
      if (images[index].data.startsWith("blob:")) URL.revokeObjectURL(images[index].data);
    }
  } finally {
    await worker.terminate();
  }
  const name = cleanBaseName(file.name);
  if (output === "docx") downloadBlob(await buildDocx(pages, "plain"), `${name}-识别结果.docx`);
  else downloadBlob(new Blob([pages.map((lines) => lines.join("\n")).join("\n\n--- 第下一页 ---\n\n")], { type: "text/plain;charset=utf-8" }), `${name}-识别结果.txt`);
}

async function extractEditableText(file: File) {
  if (/\.txt$/i.test(file.name)) return new TextDecoder("utf-8").decode(await file.arrayBuffer());
  const mammoth = (await import("mammoth")).default;
  const result = await mammoth.extractRawText({ arrayBuffer: await file.arrayBuffer() });
  return result.value;
}

export async function formatWord(file: File, resume: boolean, update: ProgressUpdate) {
  update(20, "正在读取文档文字与段落...");
  const text = await extractEditableText(file);
  const lines = text.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  update(75, resume ? "正在套用简历版式..." : "正在统一标题、正文、页码和目录...");
  const blob = await buildDocx([lines], resume ? "resume" : "formatted");
  downloadBlob(blob, `${cleanBaseName(file.name)}-${resume ? "简历美化" : "规范排版"}.docx`);
}

export async function rebuildPpt(file: File, update: ProgressUpdate) {
  update(18, "正在读取 PPT 每页文字...");
  const JSZip = (await import("jszip")).default;
  const zip = await JSZip.loadAsync(await file.arrayBuffer());
  const slideEntries = Object.values(zip.files)
    .filter((entry) => /^ppt\/slides\/slide\d+\.xml$/i.test(entry.name))
    .sort((a, b) => Number(a.name.match(/slide(\d+)/i)?.[1] ?? 0) - Number(b.name.match(/slide(\d+)/i)?.[1] ?? 0));
  if (!slideEntries.length) throw new Error("没有在文件中找到可读取的幻灯片");
  const slideTexts: string[][] = [];
  for (let index = 0; index < slideEntries.length; index += 1) {
    update(18 + Math.round(((index + 1) / slideEntries.length) * 42), `正在读取第 ${index + 1} / ${slideEntries.length} 页...`);
    const xml = await slideEntries[index].async("string");
    const documentXml = new DOMParser().parseFromString(xml, "application/xml");
    const nodes = Array.from(documentXml.getElementsByTagName("a:t"));
    slideTexts.push(nodes.map((node) => node.textContent?.trim() ?? "").filter(Boolean));
  }
  update(68, "正在按统一风格重建 PPT...");
  const PptxGenJS = (await import("pptxgenjs")).default;
  const pptx = new PptxGenJS();
  pptx.layout = "LAYOUT_WIDE";
  pptx.author = "格式工坊";
  slideTexts.forEach((texts, index) => {
    const slide = pptx.addSlide();
    slide.background = { color: index % 2 === 0 ? "F8FAFC" : "FFFFFF" };
    slide.addShape(pptx.ShapeType.rect, { x: 0, y: 0, w: 0.18, h: 7.5, fill: { color: "4F46E5" }, line: { color: "4F46E5" } });
    const title = texts[0] || `第 ${index + 1} 页`;
    slide.addText(title, { x: 0.75, y: 0.55, w: 11.8, h: 0.75, fontFace: "Microsoft YaHei", fontSize: 26, bold: true, color: "0F172A", margin: 0.05, breakLine: false });
    const body = texts.slice(1).map((text) => `• ${text}`).join("\n");
    slide.addText(body || "本页没有提取到其他文字", { x: 0.9, y: 1.65, w: 11.4, h: 4.8, fontFace: "Microsoft YaHei", fontSize: 17, color: "334155", breakLine: false, margin: 0.08, valign: "top", paraSpaceAfter: 10, fit: "shrink" });
    slide.addText(String(index + 1).padStart(2, "0"), { x: 11.8, y: 6.9, w: 0.8, h: 0.3, fontFace: "Aptos", fontSize: 10, color: "94A3B8", align: "right", margin: 0 });
  });
  const output = await pptx.write({ outputType: "blob", compression: true });
  downloadBlob(output instanceof Blob ? output : new Blob([output as BlobPart], { type: "application/vnd.openxmlformats-officedocument.presentationml.presentation" }), `${cleanBaseName(file.name)}-统一排版.pptx`);
}

export async function processPdfFiles(files: File[], mode: PdfBatchMode, update: ProgressUpdate) {
  const { PDFDocument } = await import("pdf-lib");
  if (mode === "merge") {
    const output = await PDFDocument.create();
    for (let index = 0; index < files.length; index += 1) {
      update(10 + Math.round(((index + 1) / files.length) * 70), `正在合并第 ${index + 1} / ${files.length} 个 PDF...`);
      const source = await PDFDocument.load(await files[index].arrayBuffer());
      const pages = await output.copyPages(source, source.getPageIndices());
      pages.forEach((page) => output.addPage(page));
    }
    downloadBlob(new Blob([new Uint8Array(await output.save({ useObjectStreams: true })).buffer], { type: "application/pdf" }), "合并结果.pdf");
    return;
  }
  const source = await PDFDocument.load(await files[0].arrayBuffer());
  if (mode === "compress") {
    update(65, "正在重建并压缩 PDF 对象...");
    downloadBlob(new Blob([new Uint8Array(await source.save({ useObjectStreams: true, addDefaultPage: false })).buffer], { type: "application/pdf" }), `${cleanBaseName(files[0].name)}-压缩.pdf`);
    return;
  }
  const JSZip = (await import("jszip")).default;
  const zip = new JSZip();
  const pageIndices = source.getPageIndices();
  for (let index = 0; index < pageIndices.length; index += 1) {
    update(10 + Math.round(((index + 1) / pageIndices.length) * 76), `正在拆分第 ${index + 1} / ${pageIndices.length} 页...`);
    const part = await PDFDocument.create();
    const [page] = await part.copyPages(source, [index]);
    part.addPage(page);
    zip.file(`${cleanBaseName(files[0].name)}-${String(index + 1).padStart(3, "0")}.pdf`, await part.save({ useObjectStreams: true }));
  }
  downloadBlob(await zip.generateAsync({ type: "blob", compression: "DEFLATE" }), `${cleanBaseName(files[0].name)}-拆分.zip`);
}
