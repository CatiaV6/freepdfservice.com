import { mountTool, field, select, userError } from '../tool.js';
import { loadPdfDoc, getPdfLib, embedTextFont } from '../lib.js';
import { isPdf, baseName, el, hexToRgb, pageVisual } from '../util.js';
import { t, L } from '../i18n.js';

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions(c) {
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
  },
  async run(ctx, progress) {
    const PDFLib = await getPdfLib();
    const o = ctx.getOptions();
    const text = String(o.text || '').trim();
    if (!text) throw userError('error.generic');
    const doc = await loadPdfDoc(await ctx.files[0].file.arrayBuffer());
    const font = await embedTextFont(doc, text);
    const size = Math.max(8, Number(o.fontSize) || 60);
    const angle = Number(o.angle) || 0;
    const { r, g, b } = hexToRgb(o.color);
    const color = PDFLib.rgb(r, g, b);
    const opacity = Number(o.opacity) || 0.3;
    const tw = font.widthOfTextAtSize(text, size);
    const th = font.heightAtSize(size);
    const rad = (angle * Math.PI) / 180;
    const cos = Math.cos(rad), sin = Math.sin(rad);
    const pages = doc.getPages();

    // 텍스트 중심이 (cx, cy) 에 오도록 하는 원점 (시각 좌표계)
    const originFor = (cx, cy) => ({ vx: cx - (tw / 2) * cos + (th / 2) * sin, vy: cy - (tw / 2) * sin - (th / 2) * cos });

    pages.forEach((page, i) => {
      progress(i / pages.length, t('progress.page', { i: i + 1, n: pages.length }));
      const v = pageVisual(page);
      const draw = (cx, cy) => {
        const { vx, vy } = originFor(cx, cy);
        const { x, y } = v.map(vx, vy);
        page.drawText(text, { x, y, size, font, color, opacity, rotate: PDFLib.degrees(angle + v.rot) });
      };
      if (o.position === 'tile') {
        const stepX = tw + size * 1.5, stepY = tw * 0.6 + size * 2;
        for (let y = -stepY; y < v.H + stepY; y += stepY)
          for (let x = -stepX / 2; x < v.W + stepX; x += stepX) draw(x, y);
      } else {
        draw(v.W / 2, v.H / 2);
      }
    });
    progress(0.95, t('progress.saving'));
    const bytes = await doc.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: baseName(ctx.files[0].name) + '-watermarked.pdf' };
  },
});
