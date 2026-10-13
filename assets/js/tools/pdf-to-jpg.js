import { mountTool, field, select } from '../tool.js';
import { loadPdfJsDoc, getJSZip } from '../lib.js';
import { renderPageToCanvas, canvasToBlob } from '../thumbs.js';
import { isPdf, baseName } from '../util.js';
import { t, L } from '../i18n.js';

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions(c) {
    c.append(
      field('opt.format', select('format', [['jpg', 'JPG'], ['png', 'PNG']], 'jpg')),
      field('opt.dpi', select('dpi', [
        ['72', L('72 DPI (웹용, 작은 파일)', '72 DPI (web, small)')],
        ['150', L('150 DPI (권장)', '150 DPI (recommended)')],
        ['300', L('300 DPI (인쇄용, 고화질)', '300 DPI (print, high quality)')],
      ], '150')),
    );
  },
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const base = baseName(file.name);
    const src = await loadPdfJsDoc(await file.file.arrayBuffer());
    const scale = Number(o.dpi) / 72;
    const jpeg = o.format !== 'png';
    const mime = jpeg ? 'image/jpeg' : 'image/png';
    const ext = jpeg ? 'jpg' : 'png';
    const n = src.numPages;
    const blobs = [];
    for (let i = 0; i < n; i++) {
      progress(i / n, t('progress.page', { i: i + 1, n }));
      const canvas = await renderPageToCanvas(src, i, { scale, jpeg });
      blobs.push(await canvasToBlob(canvas, mime, 0.9));
      canvas.width = canvas.height = 0;
    }
    src.destroy();
    if (blobs.length === 1) return { blob: blobs[0], filename: `${base}.${ext}` };
    const JSZip = await getJSZip();
    const zip = new JSZip();
    const pad = String(n).length;
    blobs.forEach((b, i) => zip.file(`${base}-${String(i + 1).padStart(pad, '0')}.${ext}`, b));
    progress(0.95, t('progress.zipping'));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'STORE' });
    return { blob, filename: `${base}-images.zip` };
  },
});
