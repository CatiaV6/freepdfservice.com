import { mountTool, field, select } from '../tool.js';
import { compressBytes, pdfBlob } from '../ops.js';
import { isPdf, baseName, el } from '../util.js';
import { t, L } from '../i18n.js';

export function compressOptions(c) {
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
}

if (document.getElementById('tool-root')) mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  renderOptions: compressOptions,
  async run(ctx, progress) {
    const o = ctx.getOptions();
    const file = ctx.files[0];
    progress(0.1, t('progress.loading'));
    const bytes = await compressBytes(await file.file.arrayBuffer(), o, (frac, i, n) => progress(frac, t('progress.page', { i, n })));
    return { blob: pdfBlob(bytes), filename: `${baseName(file.name)}-compressed.pdf`, meta: { before: file.size } };
  },
});
