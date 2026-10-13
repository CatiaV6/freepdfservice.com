// PDF 처리 핵심 로직 (UI 없음). 개별 도구 페이지와 통합 편집기가 공용으로 사용합니다.
import { loadPdfDoc, getPdfLib, loadPdfJsDoc, getJSZip, embedTextFont } from './lib.js';
import { renderPageToCanvas, canvasToBlob } from './thumbs.js';
import { hexToRgb, pageVisual, PAGE_SIZES } from './util.js';

const COMPRESS_PRESETS = {
  low: { scale: 1.0, q: 0.5 },
  medium: { scale: 1.4, q: 0.65 },
  high: { scale: 2.0, q: 0.8 },
};

export function userError(msgKey, vars) {
  const e = new Error(msgKey);
  e.code = 'user'; e.msgKey = msgKey; e.vars = vars;
  return e;
}

// 여러 PDF(ArrayBuffer/Uint8Array) 를 순서대로 합침
export async function mergePdfBytes(list, progress) {
  const PDFLib = await getPdfLib();
  const out = await PDFLib.PDFDocument.create();
  for (let i = 0; i < list.length; i++) {
    if (progress) progress(i / list.length, i + 1, list.length);
    const src = await loadPdfDoc(list[i]);
    const pages = await out.copyPages(src, src.getPageIndices());
    pages.forEach((p) => out.addPage(p));
  }
  return out.save();
}

// 페이지 일부 추출 (0-based indices, 순서 유지)
export async function extractPagesBytes(bytes, indices) {
  const PDFLib = await getPdfLib();
  const src = await loadPdfDoc(bytes);
  const doc = await PDFLib.PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

// 페이지 순서/회전/삭제를 실제 바이트에 반영. pages: [{ src, rotation }]
export async function rebuildPagesBytes(bytes, pages) {
  const PDFLib = await getPdfLib();
  const src = await loadPdfDoc(bytes);
  const out = await PDFLib.PDFDocument.create();
  const copied = await out.copyPages(src, pages.map((p) => p.src));
  copied.forEach((page, i) => {
    const rot = pages[i].rotation || 0;
    if (rot) page.setRotation(PDFLib.degrees((page.getRotation().angle + rot) % 360));
    out.addPage(page);
  });
  return out.save();
}

// 회전만 적용 (원본 순서 유지). rotations: index -> delta degrees
export async function rotatePagesBytes(bytes, rotations) {
  const PDFLib = await getPdfLib();
  const doc = await loadPdfDoc(bytes);
  doc.getPages().forEach((page, i) => {
    const rot = rotations[i] || 0;
    if (rot) page.setRotation(PDFLib.degrees((page.getRotation().angle + rot) % 360));
  });
  return doc.save();
}

async function decodeToPng(file) {
  let bmp;
  try { bmp = await createImageBitmap(file); } catch (_) {
    throw userError('error.imageDecode', { name: file.name });
  }
  const canvas = document.createElement('canvas');
  canvas.width = bmp.width; canvas.height = bmp.height;
  canvas.getContext('2d').drawImage(bmp, 0, 0);
  bmp.close && bmp.close();
  const blob = await canvasToBlob(canvas, 'image/png');
  canvas.width = canvas.height = 0;
  return blob.arrayBuffer();
}

async function embedImage(doc, file) {
  const type = file.type || '';
  const bytes = await file.arrayBuffer();
  try {
    if (type === 'image/jpeg' || /\.jpe?g$/i.test(file.name)) return await doc.embedJpg(bytes);
    if (type === 'image/png' || /\.png$/i.test(file.name)) return await doc.embedPng(bytes);
  } catch (_) { /* 손상되었거나 특수 형식 → 캔버스로 재인코딩 */ }
  return doc.embedPng(await decodeToPng(file));
}

// 이미지 파일들 → PDF. opts: { pageSize: 'fit'|'A4'|..., orientation: 'auto'|'portrait'|'landscape', margin: number }
export async function imagesToPdfBytes(files, opts = {}, progress) {
  const PDFLib = await getPdfLib();
  const doc = await PDFLib.PDFDocument.create();
  const margin = Number(opts.margin) || 0;
  const pageSize = opts.pageSize || 'A4';
  for (let i = 0; i < files.length; i++) {
    if (progress) progress(i / files.length, i + 1, files.length);
    const img = await embedImage(doc, files[i]);
    const iw = img.width, ih = img.height;
    let pw, ph;
    if (pageSize === 'fit') {
      pw = iw * 0.75 + margin * 2; ph = ih * 0.75 + margin * 2; // 96dpi px → pt
    } else {
      [pw, ph] = PAGE_SIZES[pageSize] || PAGE_SIZES.A4;
      const landscape = opts.orientation === 'landscape' || ((opts.orientation || 'auto') === 'auto' && iw > ih);
      if (landscape) [pw, ph] = [ph, pw];
    }
    const page = doc.addPage([pw, ph]);
    const s = Math.min((pw - margin * 2) / iw, (ph - margin * 2) / ih);
    const w = iw * s, h = ih * s;
    page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
  }
  return doc.save();
}

// 텍스트 워터마크. opts: { text, position: 'center'|'tile', fontSize, angle, opacity, color }
export async function watermarkBytes(bytes, opts, progress) {
  const PDFLib = await getPdfLib();
  const text = String(opts.text || '').trim();
  if (!text) throw userError('error.generic');
  const doc = await loadPdfDoc(bytes);
  const font = await embedTextFont(doc, text);
  const size = Math.max(8, Number(opts.fontSize) || 60);
  const angle = Number(opts.angle) || 0;
  const { r, g, b } = hexToRgb(opts.color || '#ff0000');
  const color = PDFLib.rgb(r, g, b);
  const opacity = Number(opts.opacity) || 0.3;
  const tw = font.widthOfTextAtSize(text, size);
  const th = font.heightAtSize(size);
  const rad = (angle * Math.PI) / 180;
  const cos = Math.cos(rad), sin = Math.sin(rad);
  const originFor = (cx, cy) => ({ vx: cx - (tw / 2) * cos + (th / 2) * sin, vy: cy - (tw / 2) * sin - (th / 2) * cos });
  const pages = doc.getPages();
  pages.forEach((page, i) => {
    if (progress) progress(i / pages.length, i + 1, pages.length);
    const v = pageVisual(page);
    const draw = (cx, cy) => {
      const { vx, vy } = originFor(cx, cy);
      const { x, y } = v.map(vx, vy);
      page.drawText(text, { x, y, size, font, color, opacity, rotate: PDFLib.degrees(angle + v.rot) });
    };
    if (opts.position === 'tile') {
      const stepX = tw + size * 1.5, stepY = tw * 0.6 + size * 2;
      for (let y = -stepY; y < v.H + stepY; y += stepY)
        for (let x = -stepX / 2; x < v.W + stepX; x += stepX) draw(x, y);
    } else {
      draw(v.W / 2, v.H / 2);
    }
  });
  return doc.save();
}

// 페이지 번호. opts: { position: 'bottom-center'..., format: '{n} / {total}', start, fontSize, margin, targets?: Set<number> }
export async function pageNumbersBytes(bytes, opts, progress) {
  const PDFLib = await getPdfLib();
  const fmt = String(opts.format || '{n}');
  const doc = await loadPdfDoc(bytes);
  const pages = doc.getPages();
  const total = pages.length;
  const targets = opts.targets || new Set(pages.map((_, i) => i));
  const font = await embedTextFont(doc, fmt);
  const size = Number(opts.fontSize) || 11;
  const margin = Number(opts.margin) || 0;
  const start = Number.isFinite(Number(opts.start)) ? Number(opts.start) : 1;
  const [vpos, hpos] = String(opts.position || 'bottom-center').split('-');
  let counter = start;
  pages.forEach((page, i) => {
    if (progress) progress(i / total, i + 1, total);
    if (!targets.has(i)) return;
    const text = fmt.replace(/\{n\}/g, String(counter)).replace(/\{total\}/g, String(targets.size + start - 1));
    counter++;
    const v = pageVisual(page);
    const tw = font.widthOfTextAtSize(text, size);
    const vx = hpos === 'left' ? margin : hpos === 'right' ? v.W - margin - tw : (v.W - tw) / 2;
    const vy = vpos === 'top' ? v.H - margin - size : margin;
    const { x, y } = v.map(vx, vy);
    page.drawText(text, { x, y, size, font, color: PDFLib.rgb(0, 0, 0), rotate: PDFLib.degrees(v.rot) });
  });
  return doc.save();
}

// 압축. opts: { mode: 'basic'|'strong', quality: 'low'|'medium'|'high' }  → 결과가 더 크면 원본 반환
export async function compressBytes(bytes, opts, progress) {
  const orig = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  let out;
  if (opts.mode === 'strong') {
    const PDFLib = await getPdfLib();
    const preset = COMPRESS_PRESETS[opts.quality] || COMPRESS_PRESETS.medium;
    const src = await loadPdfJsDoc(orig);
    const doc = await PDFLib.PDFDocument.create();
    const n = src.numPages;
    for (let i = 0; i < n; i++) {
      if (progress) progress(i / n, i + 1, n);
      const canvas = await renderPageToCanvas(src, i, { scale: preset.scale, jpeg: true });
      const jpg = await canvasToBlob(canvas, 'image/jpeg', preset.q);
      const img = await doc.embedJpg(await jpg.arrayBuffer());
      const page = await src.getPage(i + 1);
      const vp = page.getViewport({ scale: 1 });
      const pg = doc.addPage([vp.width, vp.height]);
      pg.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
      canvas.width = canvas.height = 0;
    }
    src.destroy();
    out = await doc.save({ useObjectStreams: true });
  } else {
    const doc = await loadPdfDoc(orig);
    out = await doc.save({ useObjectStreams: true, addDefaultPage: false });
  }
  return out.byteLength >= orig.byteLength ? orig : out;
}

// 페이지 → 이미지 Blob 목록. opts: { format: 'jpg'|'png', dpi }
export async function renderPagesToImages(bytes, opts, progress) {
  const src = await loadPdfJsDoc(bytes);
  const scale = (Number(opts.dpi) || 150) / 72;
  const jpeg = opts.format !== 'png';
  const mime = jpeg ? 'image/jpeg' : 'image/png';
  const n = src.numPages;
  const blobs = [];
  for (let i = 0; i < n; i++) {
    if (progress) progress(i / n, i + 1, n);
    const canvas = await renderPageToCanvas(src, i, { scale, jpeg });
    blobs.push(await canvasToBlob(canvas, mime, 0.9));
    canvas.width = canvas.height = 0;
  }
  src.destroy();
  return { blobs, ext: jpeg ? 'jpg' : 'png' };
}

// ZIP 생성. entries: [{ name, data: Blob|Uint8Array }]
export async function zipFiles(entries, store = false) {
  const JSZip = await getJSZip();
  const zip = new JSZip();
  for (const e of entries) zip.file(e.name, e.data);
  return zip.generateAsync({ type: 'blob', compression: store ? 'STORE' : 'DEFLATE', compressionOptions: { level: 1 } });
}

export const pdfBlob = (bytes) => new Blob([bytes], { type: 'application/pdf' });
