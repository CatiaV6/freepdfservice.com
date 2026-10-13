import { mountTool, userError } from '../tool.js';
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
  renderFiles: (c, ctx) => renderPageGrid(c, ctx, { sortable: true, allowDelete: true }),
  renderOptions: rotateAllControls,
  async run(ctx, progress) {
    const PDFLib = await getPdfLib();
    const keep = ctx.state.pages.filter((p) => !p.deleted);
    if (!keep.length) throw userError('error.noFiles');
    const src = await loadPdfDoc(ctx.state.bytes);
    const out = await PDFLib.PDFDocument.create();
    const copied = await out.copyPages(src, keep.map((p) => p.index));
    copied.forEach((page, i) => {
      progress(i / copied.length, t('progress.page', { i: i + 1, n: copied.length }));
      page.setRotation(PDFLib.degrees((page.getRotation().angle + keep[i].rotation) % 360));
      out.addPage(page);
    });
    progress(0.95, t('progress.saving'));
    const bytes = await out.save();
    return { blob: new Blob([bytes], { type: 'application/pdf' }), filename: baseName(ctx.files[0].name) + '-organized.pdf' };
  },
});
