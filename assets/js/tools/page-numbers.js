import { mountTool, field, select, userError } from '../tool.js';
import { loadPdfDoc, getPdfLib, embedTextFont } from '../lib.js';
import { isPdf, baseName, el, pageVisual, parseRanges, rangesToIndices } from '../util.js';
import { t, L } from '../i18n.js';

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions(c) {
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
      field('opt.range', el('input', { type: 'text', name: 'range', placeholder: t('opt.rangeHint') }), 'opt.rangeHint'),
    );
  },
  async run(ctx, progress) {
    const PDFLib = await getPdfLib();
    const o = ctx.getOptions();
    const fmt = String(o.format || '{n}');
    const doc = await loadPdfDoc(await ctx.files[0].file.arrayBuffer());
    const pages = doc.getPages();
    const total = pages.length;
    const ranges = parseRanges(o.range, total);
    if (!ranges) throw userError('error.badRange');
    const targets = new Set(rangesToIndices(ranges));
    const font = await embedTextFont(doc, fmt);
    const size = Number(o.fontSize) || 11;
    const margin = Number(o.margin) || 0;
    const start = Number.isFinite(o.start) ? o.start : 1;
    const [vpos, hpos] = String(o.position).split('-');
    let counter = start;

    pages.forEach((page, i) => {
      progress(i / total, t('progress.page', { i: i + 1, n: total }));
      if (!targets.has(i)) return;
      const text = fmt.replace(/\{n\}/g, String(counter)).replace(/\{total\}/g, String(targets.size + start - 1));
      counter++;
      const v = pageVisual(page);
      const tw = font.widthOfTextAtSize(text, size);
      let vx = hpos === 'left' ? margin : hpos === 'right' ? v.W - margin - tw : (v.W - tw) / 2;
      let vy = vpos === 'top' ? v.H - margin - size : margin;
      const { x, y } = v.map(vx, vy);
      page.drawText(text, { x, y, size, font, color: PDFLib.rgb(0, 0, 0), rotate: PDFLib.degrees(v.rot) });
    });
    progress(0.95, t('progress.saving'));
    const bytes = await doc.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: baseName(ctx.files[0].name) + '-numbered.pdf' };
  },
});
