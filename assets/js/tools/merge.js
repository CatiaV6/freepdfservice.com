import { mountTool } from '../tool.js';
import { loadPdfDoc, getPdfLib } from '../lib.js';
import { isPdf, baseName } from '../util.js';
import { L } from '../i18n.js';

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
    const PDFLib = await getPdfLib();
    const out = await PDFLib.PDFDocument.create();
    const n = ctx.files.length;
    for (let i = 0; i < n; i++) {
      progress(i / n, L(`${i + 1} / ${n} 파일 합치는 중`, `Merging file ${i + 1} of ${n}`));
      const src = await loadPdfDoc(await ctx.files[i].file.arrayBuffer());
      const pages = await out.copyPages(src, src.getPageIndices());
      pages.forEach((p) => out.addPage(p));
    }
    progress(0.95, L('파일 저장 중...', 'Saving file...'));
    const bytes = await out.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: baseName(ctx.files[0].name) + '-merged.pdf' };
  },
});
