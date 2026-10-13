import { mountTool, field, select } from '../tool.js';
import { renderPagesToImages, zipFiles } from '../ops.js';
import { isPdf, baseName } from '../util.js';
import { t, L } from '../i18n.js';

export function imageOptions(c) {
  c.append(
    field('opt.format', select('format', [['jpg', 'JPG'], ['png', 'PNG']], 'jpg')),
    field('opt.dpi', select('dpi', [
      ['72', L('72 DPI (웹용, 작은 파일)', '72 DPI (web, small)')],
      ['150', L('150 DPI (권장)', '150 DPI (recommended)')],
      ['300', L('300 DPI (인쇄용, 고화질)', '300 DPI (print, high quality)')],
    ], '150')),
  );
}

// 이미지 목록을 단일 파일 또는 ZIP 으로 묶음
export async function packImages(blobs, ext, base, progress) {
  if (blobs.length === 1) return { blob: blobs[0], filename: `${base}.${ext}` };
  const pad = String(blobs.length).length;
  if (progress) progress(0.95, t('progress.zipping'));
  const blob = await zipFiles(blobs.map((b, i) => ({ name: `${base}-${String(i + 1).padStart(pad, '0')}.${ext}`, data: b })), true);
  return { blob, filename: `${base}-images.zip` };
}

if (document.getElementById('tool-root')) mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions: imageOptions,
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const { blobs, ext } = await renderPagesToImages(await file.file.arrayBuffer(), o, (frac, i, n) => progress(frac, t('progress.page', { i, n })));
    return packImages(blobs, ext, baseName(file.name), progress);
  },
});
