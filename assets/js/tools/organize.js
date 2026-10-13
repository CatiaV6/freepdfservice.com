import { mountTool, userError } from '../tool.js';
import { rebuildPagesBytes, pdfBlob } from '../ops.js';
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
    const keep = ctx.state.pages.filter((p) => !p.deleted);
    if (!keep.length) throw userError('error.noFiles');
    progress(0.2, t('progress.loading'));
    const bytes = await rebuildPagesBytes(ctx.state.bytes, keep.map((p) => ({ src: p.index, rotation: p.rotation })));
    return { blob: pdfBlob(bytes), filename: baseName(ctx.files[0].name) + '-organized.pdf' };
  },
});
