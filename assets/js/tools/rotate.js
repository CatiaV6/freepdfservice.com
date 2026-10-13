import { mountTool } from '../tool.js';
import { rotatePagesBytes, pdfBlob } from '../ops.js';
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
    progress(0.2, t('progress.loading'));
    const rotations = {};
    ctx.state.pages.forEach((p) => { rotations[p.index] = p.rotation; });
    const bytes = await rotatePagesBytes(ctx.state.bytes, rotations);
    return { blob: pdfBlob(bytes), filename: baseName(ctx.files[0].name) + '-rotated.pdf' };
  },
});
