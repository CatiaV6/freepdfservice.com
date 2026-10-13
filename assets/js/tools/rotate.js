import { mountTool } from '../tool.js';
import { loadPdfDoc, getPdfLib } from '../lib.js';
import { isPdf, baseName } from '../util.js';
import { t } from '../i18n.js';
import { loadPagesForGrid, renderPageGrid, rotateAllControls } from '../page-grid.js';

mountTool({
  accept: 'application/pdf,.pdf',
  multiple: false,
  fileFilter: isPdf,
  invalidMsg: 'error.notPdf',
  acceptHint: () => 'PDF',
  onFilesChanged: loadPagesForGrid,
  renderFiles: (c, ctx) => renderPageGrid(c, ctx, { sortable: false, allowDelete: false }),
  renderOptions: rotateAllControls,
  async run(ctx, progress) {
    const PDFLib = await getPdfLib();
    const doc = await loadPdfDoc(ctx.state.bytes);
    const pages = doc.getPages();
    ctx.state.pages.forEach((p, i) => {
      progress(i / pages.length, t('progress.page', { i: i + 1, n: pages.length }));
      const page = pages[p.index];
      page.setRotation(PDFLib.degrees((page.getRotation().angle + p.rotation) % 360));
    });
    progress(0.95, t('progress.saving'));
    const bytes = await doc.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: baseName(ctx.files[0].name) + '-rotated.pdf' };
  },
});
