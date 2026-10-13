import { mountTool } from '../tool.js';
import { loadPdfDoc } from '../lib.js';
import { mergePdfBytes, pdfBlob } from '../ops.js';
import { isPdf, baseName } from '../util.js';
import { t, L } from '../i18n.js';

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: true,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  minFiles: 2,
  minFilesMsg: 'error.needTwo',
  acceptHint: () => 'PDF',
  async onFilesChanged(ctx) {
    let changed = false;
    for (const f of ctx.files) {
      if (f.meta.pages || f.meta.checked) continue;
      f.meta.checked = true;
      try {
        const d = await loadPdfDoc(await f.file.arrayBuffer());
        f.meta.pages = d.getPageCount();
        changed = true;
      } catch (_) { /* 실행 시 안내 */ }
    }
    if (changed) ctx.refresh();
  },
  async run(ctx, progress) {
    const list = [];
    for (const f of ctx.files) list.push(await f.file.arrayBuffer());
    const bytes = await mergePdfBytes(list, (frac, i, n) => progress(frac, L(`${i} / ${n} 파일 합치는 중`, `Merging file ${i} of ${n}`)));
    progress(0.95, t('progress.saving'));
    return { blob: pdfBlob(bytes), filename: baseName(ctx.files[0].name) + '-merged.pdf' };
  },
});
