// 페이지 썸네일 그리드 (회전 / 삭제 / 순서 변경) - rotate-pdf, organize-pdf 공용
import { el } from './util.js';
import { t } from './i18n.js';
import { loadPdfJsDoc, getSortable } from './lib.js';
import { renderThumbnails } from './thumbs.js';

export async function loadPagesForGrid(ctx) {
  if (ctx.state.doc) { try { ctx.state.doc.destroy(); } catch (_) {} }
  ctx.state = { pages: [], thumbs: {}, doc: null, bytes: null, loading: true };
  ctx.refresh();
  const bytes = await ctx.files[0].file.arrayBuffer();
  const doc = await loadPdfJsDoc(bytes);
  ctx.state.bytes = bytes;
  ctx.state.doc = doc;
  ctx.state.pages = Array.from({ length: doc.numPages }, (_, i) => ({ index: i, rotation: 0, deleted: false }));
  ctx.state.loading = false;
  ctx.files[0].meta.pages = doc.numPages;
  ctx.refresh();
  await renderThumbnails(doc, (i, canvas) => {
    ctx.state.thumbs[i] = canvas;
    const slot = ctx.filesEl && ctx.filesEl.querySelector(`[data-page="${i}"] .thumb-img`);
    if (slot) { slot.innerHTML = ''; slot.appendChild(canvas); }
  }, 180);
}

export function renderPageGrid(container, ctx, { sortable = false, allowDelete = false } = {}) {
  const st = ctx.state;
  if (!st.pages || !st.pages.length) {
    container.appendChild(el('div', { class: 'grid-loading' }, el('div', { class: 'spinner' }), el('p', { class: 'muted' }, t('progress.loading'))));
    return;
  }
  const head = el('div', { class: 'files-summary' },
    el('span', {}, `${ctx.files[0].name} · ${t('pages.count', { n: st.pages.length })}`),
    sortable ? el('span', { class: 'muted' }, ' · ' + t('files.dragHint')) : null);
  container.appendChild(head);
  const grid = el('div', { class: 'page-grid' });
  for (const pg of st.pages) {
    const cell = el('div', { class: 'page-cell' + (pg.deleted ? ' deleted' : ''), dataset: { page: pg.index } });
    const img = el('div', { class: 'thumb-img' });
    if (st.thumbs[pg.index]) img.appendChild(st.thumbs[pg.index]);
    else img.appendChild(el('div', { class: 'thumb-skeleton' }));
    img.style.transform = `rotate(${pg.rotation}deg)`;
    const num = el('span', { class: 'page-num' }, String(pg.index + 1));
    const actions = el('div', { class: 'page-actions' });
    actions.appendChild(el('button', { type: 'button', class: 'icon-btn', title: t('page.rotate'), 'aria-label': t('page.rotate'), onClick: () => { pg.rotation = (pg.rotation + 90) % 360; img.style.transform = `rotate(${pg.rotation}deg)`; } }, '⟳'));
    if (allowDelete) {
      actions.appendChild(el('button', { type: 'button', class: 'icon-btn danger', title: pg.deleted ? t('page.restore') : t('page.delete'), 'aria-label': t('page.delete'), onClick: (e) => {
        pg.deleted = !pg.deleted;
        cell.classList.toggle('deleted', pg.deleted);
        e.currentTarget.textContent = pg.deleted ? '↺' : '✕';
      } }, pg.deleted ? '↺' : '✕'));
    }
    cell.append(el('div', { class: 'thumb-wrap' }, img), num, actions);
    grid.appendChild(cell);
  }
  container.appendChild(grid);
  if (sortable) {
    getSortable().then((Sortable) => {
      if (!grid.isConnected) return;
      Sortable.create(grid, {
        animation: 150,
        onEnd: () => {
          const order = [...grid.children].map((c) => Number(c.dataset.page));
          st.pages.sort((a, b) => order.indexOf(a.index) - order.indexOf(b.index));
        },
      });
    });
  }
}

export function rotateAllControls(container, ctx) {
  const row = el('div', { class: 'btn-row' });
  row.appendChild(el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { for (const p of ctx.state.pages || []) p.rotation = (p.rotation + 90) % 360; ctx.refresh(); } }, t('rotate.all')));
  row.appendChild(el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { for (const p of ctx.state.pages || []) { p.rotation = 0; p.deleted = false; } ctx.refresh(); } }, t('rotate.reset')));
  container.appendChild(row);
}
