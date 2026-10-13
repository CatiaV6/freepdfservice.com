import { mountTool, field, select, userError } from '../tool.js';
import { pageNumbersBytes, pdfBlob } from '../ops.js';
import { loadPdfDoc } from '../lib.js';
import { isPdf, baseName, el, parseRanges, rangesToIndices } from '../util.js';
import { t, L } from '../i18n.js';

export function pageNumberOptions(c, { withRange = true } = {}) {
  c.append(
    field('opt.position', select('position', [
      ['bottom-center', L('아래 가운데', 'Bottom center')],
      ['bottom-right', L('아래 오른쪽', 'Bottom right')],
      ['bottom-left', L('아래 왼쪽', 'Bottom left')],
      ['top-center', L('위 가운데', 'Top center')],
      ['top-right', L('위 오른쪽', 'Top right')],
      ['top-left', L('위 왼쪽', 'Top left')],
    ], 'bottom-center')),
    field('opt.format', el('input', { type: 'text', name: 'format', value: '{n}', list: 'fmt-list' }), 'opt.formatHint'),
    el('datalist', { id: 'fmt-list' }, ['{n}', '{n} / {total}', '- {n} -', 'Page {n}', '{n} 페이지', '{n}/{total} 페이지'].map((v) => el('option', { value: v }))),
    field('opt.start', el('input', { type: 'number', name: 'start', value: '1', min: '0' })),
    field('opt.fontSize', el('input', { type: 'number', name: 'fontSize', value: '11', min: '6', max: '72' })),
    field('opt.margin', el('input', { type: 'number', name: 'margin', value: '28', min: '0', max: '200' })),
  );
  if (withRange) c.append(field('opt.range', el('input', { type: 'text', name: 'range', placeholder: t('opt.rangeHint') }), 'opt.rangeHint'));
}

if (document.getElementById('tool-root')) mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions: pageNumberOptions,
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const bytes = await file.file.arrayBuffer();
    const total = (await loadPdfDoc(bytes)).getPageCount();
    const ranges = parseRanges(o.range, total);
    if (!ranges) throw userError('error.badRange');
    o.targets = new Set(rangesToIndices(ranges));
    const out = await pageNumbersBytes(bytes, o, (frac, i, n) => progress(frac, t('progress.page', { i, n })));
    return { blob: pdfBlob(out), filename: baseName(file.name) + '-numbered.pdf' };
  },
});
