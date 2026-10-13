import { mountTool, field, select } from '../tool.js';
import { imagesToPdfBytes, pdfBlob } from '../ops.js';
import { isImage, baseName } from '../util.js';
import { t, L } from '../i18n.js';

export function imageToPdfOptions(c) {
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
}

if (document.getElementById('tool-root')) mountTool({
  accept: 'image/*,.jpg,.jpeg,.png,.webp,.gif,.bmp,.avif',
  multiple: true,
  fileFilter: isImage,
  invalidMsg: 'error.notImage',
  acceptHint: () => 'JPG, PNG, WEBP, GIF, BMP',
  renderOptions: imageToPdfOptions,
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const n = ctx.files.length;
    const bytes = await imagesToPdfBytes(ctx.files.map((f) => f.file), o, (frac, i) => progress(frac, L(`${i} / ${n} 이미지 추가 중`, `Adding image ${i} of ${n}`)));
    progress(0.95, t('progress.saving'));
    return { blob: pdfBlob(bytes), filename: n === 1 ? baseName(ctx.files[0].name) + '.pdf' : 'images.pdf' };
  },
});
