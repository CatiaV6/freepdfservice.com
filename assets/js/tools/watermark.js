import { mountTool, field, select } from '../tool.js';
import { watermarkBytes, pdfBlob } from '../ops.js';
import { isPdf, baseName, el } from '../util.js';
import { t, L } from '../i18n.js';

export function watermarkOptions(c) {
  c.append(
    field('opt.text', el('input', { type: 'text', name: 'text', value: L('대외비', 'CONFIDENTIAL'), maxlength: '100' })),
    field('opt.position', select('position', [
      ['center', L('가운데 1개', 'Center (single)')],
      ['tile', L('바둑판식 반복', 'Tiled (repeat)')],
    ], 'center')),
    field('opt.fontSize', el('input', { type: 'number', name: 'fontSize', value: '60', min: '8', max: '300' })),
    field('opt.angle', select('angle', [['45', '45°'], ['0', '0°'], ['-45', '-45°'], ['90', '90°']], '45')),
    field('opt.opacity', el('input', { type: 'range', name: 'opacity', min: '0.05', max: '1', step: '0.05', value: '0.3' })),
    field('opt.color', el('input', { type: 'color', name: 'color', value: '#ff0000' })),
  );
}

if (document.getElementById('tool-root')) mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions: watermarkOptions,
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const bytes = await watermarkBytes(await file.file.arrayBuffer(), o, (frac, i, n) => progress(frac, t('progress.page', { i, n })));
    return { blob: pdfBlob(bytes), filename: baseName(file.name) + '-watermarked.pdf' };
  },
});
