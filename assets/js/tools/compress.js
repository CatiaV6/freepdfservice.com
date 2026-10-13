import { mountTool, field, select } from '../tool.js';
import { loadPdfDoc, getPdfLib, loadPdfJsDoc } from '../lib.js';
import { renderPageToCanvas, canvasToBlob } from '../thumbs.js';
import { isPdf, baseName, el } from '../util.js';
import { t, L } from '../i18n.js';

const PRESETS = {
  low: { scale: 1.0, q: 0.5 },     // 최대 압축
  medium: { scale: 1.4, q: 0.65 }, // 권장
  high: { scale: 2.0, q: 0.8 },    // 고품질
};

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions(c) {
    const mode = select('mode', [
      ['basic', L('기본 (텍스트 유지, 구조 최적화)', 'Basic (keeps text, optimizes structure)')],
      ['strong', L('강력 (페이지를 이미지로 변환, 최대 압축)', 'Strong (rasterize pages, max compression)')],
    ], 'basic');
    const quality = select('quality', [
      ['medium', L('권장 (보통 품질)', 'Recommended')],
      ['low', L('최대 압축 (낮은 품질)', 'Smallest (low quality)')],
      ['high', L('고품질 (덜 줄어듦)', 'High quality (larger)')],
    ], 'medium');
    const qf = field('opt.quality', quality);
    const note = el('p', { class: 'muted small' }, L('강력 모드는 글자를 선택/검색할 수 없게 되지만 스캔본·이미지 위주의 PDF를 크게 줄입니다.', 'Strong mode removes selectable text but shrinks scanned/image-heavy PDFs a lot.'));
    const update = () => { qf.hidden = mode.value !== 'strong'; note.hidden = mode.value !== 'strong'; };
    mode.addEventListener('change', update);
    update();
    c.append(field('opt.mode', mode), qf, note);
  },
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    const before = file.size;
    const base = baseName(file.name);
    const orig = await file.file.arrayBuffer();
    let bytes;

    if (o.mode === 'strong') {
      const PDFLib = await getPdfLib();
      const preset = PRESETS[o.quality] || PRESETS.medium;
      const src = await loadPdfJsDoc(orig);
      const out = await PDFLib.PDFDocument.create();
      const n = src.numPages;
      for (let i = 0; i < n; i++) {
        progress(i / n, t('progress.page', { i: i + 1, n }));
        const canvas = await renderPageToCanvas(src, i, { scale: preset.scale, jpeg: true });
        const jpg = await canvasToBlob(canvas, 'image/jpeg', preset.q);
        const img = await out.embedJpg(await jpg.arrayBuffer());
        const page = await src.getPage(i + 1);
        const vp = page.getViewport({ scale: 1 });
        const pg = out.addPage([vp.width, vp.height]);
        pg.drawImage(img, { x: 0, y: 0, width: vp.width, height: vp.height });
        canvas.width = canvas.height = 0;
      }
      src.destroy();
      progress(0.95, t('progress.saving'));
      bytes = await out.save({ useObjectStreams: true });
    } else {
      progress(0.3, t('progress.loading'));
      const doc = await loadPdfDoc(orig);
      progress(0.7, t('progress.saving'));
      bytes = await doc.save({ useObjectStreams: true, addDefaultPage: false });
    }

    if (bytes.byteLength >= before) bytes = new Uint8Array(orig); // 더 커지면 원본 제공
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: `${base}-compressed.pdf`, meta: { before } };
  },
});
