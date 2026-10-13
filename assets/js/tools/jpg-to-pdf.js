import { mountTool, field, select, userError } from '../tool.js';
import { getPdfLib } from '../lib.js';
import { canvasToBlob } from '../thumbs.js';
import { isImage, baseName, PAGE_SIZES } from '../util.js';
import { t, L } from '../i18n.js';

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

mountTool({
  accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif',
  multiple: true,
  fileFilter: isImage,
  invalidMsg: 'error.notImage',
  acceptHint: () => 'JPG, PNG, WEBP, GIF, BMP',
  renderOptions(c) {
    c.append(
      field('opt.pageSize', select('pageSize', [
        ['fit', L('이미지 크기에 맞춤', 'Fit to image')],
        ['A4', 'A4'], ['Letter', 'Letter'], ['A3', 'A3'], ['A5', 'A5'],
      ], 'A4')),
      field('opt.orientation', select('orientation', [
        ['auto', L('자동', 'Auto')], ['portrait', L('세로', 'Portrait')], ['landscape', L('가로', 'Landscape')],
      ], 'auto')),
      field('opt.margin', select('margin', [
        ['0', L('없음', 'None')], ['20', L('작게', 'Small')], ['40', L('크게', 'Large')],
      ], '20')),
    );
  },
  async run(ctx, progress) {
    const PDFLib = await getPdfLib();
    const o = ctx.getOptions();
    const doc = await PDFLib.PDFDocument.create();
    const n = ctx.files.length;
    const margin = Number(o.margin) || 0;
    for (let i = 0; i < n; i++) {
      progress(i / n, L(`${i + 1} / ${n} 이미지 추가 중`, `Adding image ${i + 1} of ${n}`));
      const img = await embedImage(doc, ctx.files[i].file);
      const iw = img.width, ih = img.height;
      let pw, ph;
      if (o.pageSize === 'fit') {
        pw = iw * 0.75 + margin * 2; ph = ih * 0.75 + margin * 2; // 96dpi 기준 px → pt
      } else {
        [pw, ph] = PAGE_SIZES[o.pageSize] || PAGE_SIZES.A4;
        const landscape = o.orientation === 'landscape' || (o.orientation === 'auto' && iw > ih);
        if (landscape) [pw, ph] = [ph, pw];
      }
      const page = doc.addPage([pw, ph]);
      const maxW = pw - margin * 2, maxH = ph - margin * 2;
      const s = Math.min(maxW / iw, maxH / ih);
      const w = iw * s, h = ih * s;
      page.drawImage(img, { x: (pw - w) / 2, y: (ph - h) / 2, width: w, height: h });
    }
    progress(0.95, t('progress.saving'));
    const bytes = await doc.save();
    const name = n === 1 ? baseName(ctx.files[0].name) + '.pdf' : 'images.pdf';
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: name };
  },
});
