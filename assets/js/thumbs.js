import { getPdfJs } from './lib.js';

// pdf.js 문서의 특정 페이지를 썸네일 canvas 로 렌더링
export async function renderPageToCanvas(pdfjsDoc, pageIndex, { width = 160, scale, jpeg = false } = {}) {
  const page = await pdfjsDoc.getPage(pageIndex + 1);
  const base = page.getViewport({ scale: 1 });
  const s = scale || width / base.width;
  const viewport = page.getViewport({ scale: s });
  const canvas = document.createElement('canvas');
  canvas.width = Math.ceil(viewport.width);
  canvas.height = Math.ceil(viewport.height);
  const ctx = canvas.getContext('2d', { alpha: !jpeg });
  if (jpeg) { ctx.fillStyle = '#fff'; ctx.fillRect(0, 0, canvas.width, canvas.height); }
  await page.render({ canvasContext: ctx, viewport, background: jpeg ? '#ffffff' : undefined }).promise;
  page.cleanup();
  return canvas;
}

export function canvasToBlob(canvas, type = 'image/jpeg', quality = 0.85) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error('toBlob failed'))), type, quality);
  });
}

// 페이지별 썸네일을 순차 렌더링하면서 콜백 호출 (메모리 절약)
export async function renderThumbnails(pdfjsDoc, onThumb, width = 150) {
  await getPdfJs();
  const n = pdfjsDoc.numPages;
  for (let i = 0; i < n; i++) {
    const canvas = await renderPageToCanvas(pdfjsDoc, i, { width });
    onThumb(i, canvas);
  }
}
