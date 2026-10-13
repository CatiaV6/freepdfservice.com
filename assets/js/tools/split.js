import { mountTool, field, select, userError } from '../tool.js';
import { loadPdfDoc, getPdfLib, getJSZip } from '../lib.js';
import { isPdf, baseName, el, parseRanges, rangesToIndices } from '../util.js';
import { t, L } from '../i18n.js';

async function extract(PDFLib, src, indices) {
  const doc = await PDFLib.PDFDocument.create();
  const pages = await doc.copyPages(src, indices);
  pages.forEach((p) => doc.addPage(p));
  return doc.save();
}

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
    ctx.state.pageCount = f.meta.pages;
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
    const PDFLib = await getPdfLib();
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const base = baseName(file.name);
    const src = await loadPdfDoc(await file.file.arrayBuffer());
    const total = src.getPageCount();
    const parts = []; // {name, indices}

    if (o.mode === 'extract' || o.mode === 'ranges') {
      const ranges = parseRanges(o.range, total);
      if (!ranges) throw userError('error.badRange');
      if (o.mode === 'extract') parts.push({ name: `${base}-pages.pdf`, indices: rangesToIndices(ranges) });
      else ranges.forEach(([a, b], i) => parts.push({ name: `${base}-${a}${a === b ? '' : '-' + b}.pdf`, indices: rangesToIndices([[a, b]]) }));
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
      const bytes = await extract(PDFLib, src, parts[0].indices);
      return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: parts[0].name };
    }
    const JSZip = await getJSZip();
    const zip = new JSZip();
    for (let i = 0; i < parts.length; i++) {
      progress(i / parts.length, L(`${i + 1} / ${parts.length} 파일 생성 중`, `Creating file ${i + 1} of ${parts.length}`));
      zip.file(parts[i].name, await extract(PDFLib, src, parts[i].indices));
    }
    progress(0.95, t('progress.zipping'));
    const blob = await zip.generateAsync({ type: 'blob', compression: 'DEFLATE', compressionOptions: { level: 1 } });
    return { blob, filename: `${base}-split.zip` };
  },
});
