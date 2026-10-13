import { mountTool, field, select, userError } from '../tool.js';
import { loadPdfDoc } from '../lib.js';
import { extractPagesBytes, zipFiles, pdfBlob } from '../ops.js';
import { isPdf, baseName, el, parseRanges, rangesToIndices } from '../util.js';
import { t, L } from '../i18n.js';

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  async onFilesChanged(ctx) {
    const f = ctx.files[0];
    const d = await loadPdfDoc(await f.file.arrayBuffer());
    f.meta.pages = d.getPageCount();
    ctx.refresh();
  },
  renderOptions(c) {
    const mode = select('mode', [
      ['extract', L('페이지 추출 → PDF 1개', 'Extract pages → one PDF')],
      ['ranges', L('범위마다 파일로 분할 → ZIP', 'One file per range → ZIP')],
      ['every', L('N페이지씩 분할 → ZIP', 'Split every N pages → ZIP')],
      ['all', L('모든 페이지 개별 분할 → ZIP', 'Every page separately → ZIP')],
    ], 'extract');
    const range = el('input', { type: 'text', name: 'range', placeholder: t('opt.rangeHint'), autocomplete: 'off' });
    const every = el('input', { type: 'number', name: 'every', min: '1', value: '1' });
    const rangeField = field('opt.range', range, 'opt.rangeHint');
    const everyField = field('opt.every', every);
    const update = () => {
      rangeField.hidden = !(mode.value === 'extract' || mode.value === 'ranges');
      everyField.hidden = mode.value !== 'every';
    };
    mode.addEventListener('change', update);
    update();
    c.append(field('opt.mode', mode), rangeField, everyField);
  },
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const base = baseName(file.name);
    const bytes = await file.file.arrayBuffer();
    const total = (await loadPdfDoc(bytes)).getPageCount();
    const parts = []; // {name, indices}

    if (o.mode === 'extract' || o.mode === 'ranges') {
      const ranges = parseRanges(o.range, total);
      if (!ranges) throw userError('error.badRange');
      if (o.mode === 'extract') parts.push({ name: `${base}-pages.pdf`, indices: rangesToIndices(ranges) });
      else ranges.forEach(([a, b]) => parts.push({ name: `${base}-${a}${a === b ? '' : '-' + b}.pdf`, indices: rangesToIndices([[a, b]]) }));
    } else if (o.mode === 'every') {
      const n = Math.max(1, Math.floor(o.every || 1));
      for (let s = 0; s < total; s += n) {
        const e = Math.min(total, s + n);
        parts.push({ name: `${base}-${s + 1}${e - s === 1 ? '' : '-' + e}.pdf`, indices: Array.from({ length: e - s }, (_, i) => s + i) });
      }
    } else {
      for (let i = 0; i < total; i++) parts.push({ name: `${base}-${i + 1}.pdf`, indices: [i] });
    }

    if (parts.length === 1) {
      progress(0.5, t('progress.saving'));
      return { blob: pdfBlob(await extractPagesBytes(bytes, parts[0].indices)), filename: parts[0].name };
    }
    const entries = [];
    for (let i = 0; i < parts.length; i++) {
      progress(i / parts.length, L(`${i + 1} / ${parts.length} 파일 생성 중`, `Creating file ${i + 1} of ${parts.length}`));
      entries.push({ name: parts[i].name, data: await extractPagesBytes(bytes, parts[i].indices) });
    }
    progress(0.95, t('progress.zipping'));
    return { blob: await zipFiles(entries), filename: `${base}-split.zip` };
  },
});
