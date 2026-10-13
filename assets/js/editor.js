// 통합 PDF 편집기: 파일 한 번 올리고 여러 작업을 이어서 적용 → 미리보기 → 한 번에 다운로드
import { t, L } from './i18n.js';
import { el, formatBytes, saveBlob, baseName, isPdf, isImage } from './util.js';
import { loadPdfJsDoc, getSortable } from './lib.js';
import { renderThumbnails, renderPageToCanvas } from './thumbs.js';
import * as ops from './ops.js';
import { readOptions, toast, escapeHtml, field, select } from './tool.js';
import { watermarkOptions } from './tools/watermark.js';
import { pageNumberOptions } from './tools/page-numbers.js';
import { compressOptions } from './tools/compress.js';
import { imageOptions, packImages } from './tools/pdf-to-jpg.js';
import { imageToPdfOptions } from './tools/jpg-to-pdf.js';

const MAX_UNDO = 20;
const root = document.getElementById('editor-root');

const st = {
  name: 'document',
  bytes: null,        // Uint8Array – 현재 문서 (페이지 편집은 pages 에만 반영됨)
  size: 0,
  doc: null,          // pdf.js document (썸네일/미리보기용)
  pages: [],          // [{ src, rotation, deleted, selected }]
  thumbs: {},         // src -> canvas
  undo: [],
  busy: false,
  tab: 'pages',
  panelValues: {},    // 탭별 입력값 유지
};

// ---------------- helpers ----------------
function pagesChanged() {
  return st.pages.some((p, i) => p.src !== i || p.rotation || p.deleted);
}

function snapshot() {
  st.undo.push({ bytes: st.bytes, size: st.size, pages: st.pages.map((p) => ({ ...p })), thumbs: { ...st.thumbs } });
  if (st.undo.length > MAX_UNDO) st.undo.shift();
  updateTopbar();
}

function rotateCanvas(c, deg) {
  const r = ((deg % 360) + 360) % 360;
  if (!r || !c) return c;
  const n = document.createElement('canvas');
  if (r === 90 || r === 270) { n.width = c.height; n.height = c.width; } else { n.width = c.width; n.height = c.height; }
  const ctx = n.getContext('2d');
  ctx.translate(n.width / 2, n.height / 2);
  ctx.rotate((r * Math.PI) / 180);
  ctx.drawImage(c, -c.width / 2, -c.height / 2);
  return n;
}

async function setDocument(bytes, { keepThumbs = false } = {}) {
  if (st.doc) { try { st.doc.destroy(); } catch (_) {} st.doc = null; }
  st.bytes = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
  st.size = st.bytes.byteLength;
  st.doc = await loadPdfJsDoc(st.bytes);
  st.pages = Array.from({ length: st.doc.numPages }, (_, i) => ({ src: i, rotation: 0, deleted: false, selected: false }));
  if (!keepThumbs) st.thumbs = {};
  render();
  if (!keepThumbs) {
    const doc = st.doc;
    await renderThumbnails(doc, (i, canvas) => {
      if (st.doc !== doc) return; // 문서가 바뀌면 중단
      st.thumbs[i] = canvas;
      const slot = root.querySelector(`.page-cell[data-page="${i}"] .thumb-img`);
      if (slot) { slot.innerHTML = ''; slot.appendChild(canvas); }
    }, 170);
  }
}

// 페이지 순서/회전/삭제를 바이트에 반영 (썸네일은 회전해서 재사용)
async function commitPages() {
  if (!pagesChanged()) return st.bytes;
  const keep = st.pages.filter((p) => !p.deleted);
  if (!keep.length) throw ops.userError('error.noFiles');
  const bytes = await ops.rebuildPagesBytes(st.bytes, keep.map((p) => ({ src: p.src, rotation: p.rotation })));
  const thumbs = {};
  keep.forEach((p, i) => { thumbs[i] = rotateCanvas(st.thumbs[p.src], p.rotation); });
  st.thumbs = thumbs;
  const selected = keep.map((p) => p.selected);
  await setDocument(bytes, { keepThumbs: true });
  st.pages.forEach((p, i) => { p.selected = !!selected[i]; });
  render();
  return st.bytes;
}

async function runOp(label, fn) {
  if (st.busy) return;
  snapshot();
  setBusy(true, label, 0);
  try {
    const bytes = await commitPages();
    const out = await fn(bytes, (frac, i, n) => setBusy(true, n ? t('progress.page', { i, n }) : label, frac));
    if (out) await setDocument(out);
    toast(L('적용되었습니다', 'Applied'));
  } catch (e) {
    console.error(e);
    st.undo.pop();
    toast(errorMessage(e), true);
  } finally {
    setBusy(false);
    updateTopbar();
  }
}

function errorMessage(e) {
  if (e && e.code === 'encrypted') return t('error.encrypted');
  if (e && e.code === 'user') return t(e.msgKey, e.vars);
  return t('error.generic');
}

function undo() {
  const s = st.undo.pop();
  if (!s || st.busy) return;
  const sameBytes = s.bytes === st.bytes;
  st.pages = s.pages; st.thumbs = s.thumbs;
  if (sameBytes) { render(); updateTopbar(); return; }
  setBusy(true, L('되돌리는 중...', 'Undoing...'), 0.5);
  setDocument(s.bytes, { keepThumbs: true }).then(() => { st.pages = s.pages; st.thumbs = s.thumbs; render(); }).finally(() => { setBusy(false); updateTopbar(); });
}

// ---------------- 파일 추가 ----------------
async function addFiles(files) {
  const pdfs = files.filter(isPdf);
  const imgs = files.filter((f) => !isPdf(f) && isImage(f));
  const bad = files.filter((f) => !isPdf(f) && !isImage(f));
  bad.forEach((f) => toast(t('error.notPdf', { name: f.name }), true));
  if (!pdfs.length && !imgs.length) return;
  if (!st.bytes) st.name = baseName((pdfs[0] || imgs[0]).name);
  const first = !st.bytes;
  const imgOpts = st.panelValues.add || { pageSize: 'A4', orientation: 'auto', margin: 20 };
  const doMerge = async (base, progress) => {
    const parts = [];
    if (base) parts.push(base);
    for (const f of pdfs) parts.push(await f.arrayBuffer());
    if (imgs.length) parts.push(await ops.imagesToPdfBytes(imgs, imgOpts, (frac, i, n) => progress(frac, i, n)));
    if (parts.length === 1) return parts[0] instanceof Uint8Array ? parts[0] : new Uint8Array(parts[0]);
    return ops.mergePdfBytes(parts, (frac, i, n) => progress(frac));
  };
  if (first) {
    setBusy(true, t('progress.loading'), 0);
    try { await setDocument(await doMerge(null, (frac) => setBusy(true, t('progress.loading'), frac))); }
    catch (e) { console.error(e); st.bytes = null; st.pages = []; toast(errorMessage(e), true); render(); }
    finally { setBusy(false); updateTopbar(); }
  } else {
    await runOp(L('파일 추가 중...', 'Adding files...'), (bytes, progress) => doMerge(bytes, progress));
  }
}

// ---------------- 내보내기 ----------------
async function exportAs(kind, opts = {}) {
  if (st.busy || !st.bytes) return;
  setBusy(true, t('progress.saving'), 0.2);
  try {
    const bytes = await commitPages();
    const base = st.name + '-edited';
    if (kind === 'pdf') {
      saveBlob(ops.pdfBlob(bytes), `${base}.pdf`);
    } else if (kind === 'selected') {
      const idx = st.pages.filter((p) => p.selected).map((p) => p.src);
      if (!idx.length) { toast(L('먼저 페이지를 선택하세요', 'Select pages first'), true); return; }
      saveBlob(ops.pdfBlob(await ops.extractPagesBytes(bytes, idx)), `${base}-selected.pdf`);
    } else if (kind === 'each') {
      const entries = [];
      for (let i = 0; i < st.pages.length; i++) {
        setBusy(true, t('progress.page', { i: i + 1, n: st.pages.length }), i / st.pages.length);
        entries.push({ name: `${st.name}-${i + 1}.pdf`, data: await ops.extractPagesBytes(bytes, [i]) });
      }
      saveBlob(await ops.zipFiles(entries), `${base}-pages.zip`);
    } else if (kind === 'images') {
      const { blobs, ext } = await ops.renderPagesToImages(bytes, opts, (frac, i, n) => setBusy(true, t('progress.page', { i, n }), frac));
      const r = await packImages(blobs, ext, st.name);
      saveBlob(r.blob, r.filename);
    }
    toast(L('다운로드를 시작했습니다', 'Download started'));
  } catch (e) { console.error(e); toast(errorMessage(e), true); }
  finally { setBusy(false); }
}

// ---------------- UI ----------------
let fileInput;
function render() {
  if (!root) return;
  if (!fileInput) {
    fileInput = el('input', { type: 'file', hidden: true, multiple: true, accept: 'application/pdf,.pdf,image/*' });
    fileInput.addEventListener('change', () => { addFiles([...fileInput.files]); fileInput.value = ''; });
    root.appendChild(fileInput);
  }
  [...root.children].forEach((c) => { if (c !== fileInput && !c.classList.contains('ed-overlay') && !c.classList.contains('ed-modal')) c.remove(); });
  if (!st.bytes) root.prepend(renderEmpty());
  else root.prepend(renderApp());
}

function bindDrop(target) {
  ['dragenter', 'dragover'].forEach((ev) => target.addEventListener(ev, (e) => { e.preventDefault(); target.classList.add('dragover'); }));
  ['dragleave', 'drop'].forEach((ev) => target.addEventListener(ev, (e) => { e.preventDefault(); target.classList.remove('dragover'); }));
  target.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]); });
}

function renderEmpty() {
  const zone = el('div', { class: 'dropzone', role: 'button', tabindex: '0' });
  zone.innerHTML = `
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
    <h2>${t('drop.title')}</h2>
    <p class="muted">${t('drop.or')}</p>
    <button type="button" class="btn btn-primary btn-lg">${t('drop.selectMulti')}</button>
    <p class="hint">PDF, JPG, PNG · ${t('drop.hint')}</p>`;
  const open = () => fileInput.click();
  zone.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); open(); });
  zone.addEventListener('click', open);
  zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
  bindDrop(zone);
  return zone;
}

function renderApp() {
  const app = el('div', { class: 'ed-app' });
  bindDrop(app);
  app.appendChild(renderTopbar());
  const body = el('div', { class: 'ed-body' });
  body.appendChild(renderGrid());
  body.appendChild(renderSide());
  app.appendChild(body);
  return app;
}

function updateTopbar() {
  const meta = root.querySelector('.ed-meta');
  if (meta) meta.textContent = `${t('pages.count', { n: st.pages.filter((p) => !p.deleted).length })} · ${formatBytes(st.size)}${pagesChanged() ? ' · ' + L('변경됨', 'modified') : ''}`;
  const u = root.querySelector('.ed-undo');
  if (u) u.disabled = !st.undo.length;
}

function renderTopbar() {
  const bar = el('div', { class: 'ed-topbar' });
  bar.appendChild(el('div', { class: 'ed-title' }, el('strong', { title: st.name }, st.name + '.pdf'), el('span', { class: 'ed-meta muted' })));
  const actions = el('div', { class: 'ed-actions' });
  actions.appendChild(el('button', { type: 'button', class: 'btn btn-ghost ed-undo', title: 'Ctrl+Z', onClick: undo }, '↶ ' + L('되돌리기', 'Undo')));
  actions.appendChild(el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => fileInput.click() }, t('files.add')));
  actions.appendChild(el('button', { type: 'button', class: 'btn btn-primary', onClick: () => exportAs('pdf') }, '⬇ ' + L('PDF 다운로드', 'Download PDF')));
  actions.appendChild(el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { if (confirm(L('현재 작업을 버리고 새로 시작할까요?', 'Discard current work and start over?'))) resetAll(); } }, L('새 파일', 'New')));
  bar.appendChild(actions);
  setTimeout(updateTopbar, 0);
  return bar;
}

function resetAll() {
  if (st.doc) { try { st.doc.destroy(); } catch (_) {} }
  Object.assign(st, { bytes: null, size: 0, doc: null, pages: [], thumbs: {}, undo: [], name: 'document' });
  render();
}

function renderGrid() {
  const wrap = el('div', { class: 'ed-pages' });
  const grid = el('div', { class: 'page-grid ed-grid' });
  for (const pg of st.pages) {
    const cell = el('div', { class: 'page-cell' + (pg.deleted ? ' deleted' : '') + (pg.selected ? ' selected' : ''), dataset: { page: pg.src } });
    const img = el('div', { class: 'thumb-img' });
    if (st.thumbs[pg.src]) img.appendChild(st.thumbs[pg.src]);
    else img.appendChild(el('div', { class: 'thumb-skeleton' }));
    img.style.transform = `rotate(${pg.rotation}deg)`;
    const check = el('span', { class: 'page-check', 'aria-hidden': 'true' }, '✓');
    const num = el('span', { class: 'page-num' }, String(st.pages.indexOf(pg) + 1));
    const actions = el('div', { class: 'page-actions' });
    actions.appendChild(el('button', { type: 'button', class: 'icon-btn', title: L('미리보기', 'Preview'), onClick: (e) => { e.stopPropagation(); openPreview(st.pages.indexOf(pg)); } }, '🔍'));
    actions.appendChild(el('button', { type: 'button', class: 'icon-btn', title: t('page.rotate'), onClick: (e) => { e.stopPropagation(); snapshot(); pg.rotation = (pg.rotation + 90) % 360; img.style.transform = `rotate(${pg.rotation}deg)`; updateTopbar(); } }, '⟳'));
    actions.appendChild(el('button', { type: 'button', class: 'icon-btn danger', title: pg.deleted ? t('page.restore') : t('page.delete'), onClick: (e) => {
      e.stopPropagation(); snapshot(); pg.deleted = !pg.deleted; cell.classList.toggle('deleted', pg.deleted); e.currentTarget.textContent = pg.deleted ? '↺' : '✕'; updateTopbar();
    } }, pg.deleted ? '↺' : '✕'));
    cell.addEventListener('click', () => { pg.selected = !pg.selected; cell.classList.toggle('selected', pg.selected); updateSelectionInfo(); });
    cell.append(el('div', { class: 'thumb-wrap' }, img), check, num, actions);
    grid.appendChild(cell);
  }
  wrap.appendChild(grid);
  getSortable().then((Sortable) => {
    if (!grid.isConnected) return;
    Sortable.create(grid, {
      animation: 150, filter: '.icon-btn', preventOnFilter: false, delayOnTouchOnly: true, delay: 120,
      onStart: () => snapshot(),
      onEnd: () => {
        const order = [...grid.children].map((c) => Number(c.dataset.page));
        st.pages.sort((a, b) => order.indexOf(a.src) - order.indexOf(b.src));
        [...grid.children].forEach((c, i) => { c.querySelector('.page-num').textContent = String(i + 1); });
        updateTopbar();
      },
    });
  });
  return wrap;
}

function updateSelectionInfo() {
  const n = st.pages.filter((p) => p.selected).length;
  const info = root.querySelector('.ed-selinfo');
  if (info) info.textContent = n ? L(`${n}개 페이지 선택됨`, `${n} pages selected`) : L('페이지를 클릭해 선택하세요', 'Click pages to select');
}

const TABS = [
  ['pages', '📄', ['페이지', 'Pages']],
  ['add', '➕', ['파일 추가', 'Add files']],
  ['watermark', '💧', ['워터마크', 'Watermark']],
  ['numbers', '#', ['페이지 번호', 'Page numbers']],
  ['compress', '🗜', ['압축', 'Compress']],
  ['export', '⬇', ['내보내기', 'Export']],
];

function renderSide() {
  const side = el('aside', { class: 'ed-side' });
  const tabs = el('div', { class: 'ed-tabs', role: 'tablist' });
  for (const [id, icon, label] of TABS) {
    tabs.appendChild(el('button', { type: 'button', role: 'tab', class: 'ed-tab' + (st.tab === id ? ' active' : ''), 'aria-selected': st.tab === id ? 'true' : 'false', onClick: () => { savePanel(); st.tab = id; const p = side.querySelector('.ed-panel'); p.replaceWith(renderPanel()); tabs.querySelectorAll('.ed-tab').forEach((b, i) => { b.classList.toggle('active', TABS[i][0] === id); b.setAttribute('aria-selected', TABS[i][0] === id ? 'true' : 'false'); }); } }, el('span', { class: 'ed-tab-icon' }, icon), el('span', {}, L(label[0], label[1]))));
  }
  side.append(tabs, renderPanel());
  return side;
}

function savePanel() {
  const p = root.querySelector('.ed-panel');
  if (p) st.panelValues[st.tab] = readOptions(p);
}

function restorePanel(panel) {
  const saved = st.panelValues[st.tab];
  if (!saved) return;
  panel.querySelectorAll('[name]').forEach((inp) => {
    const name = inp.getAttribute('name');
    if (!(name in saved) || saved[name] == null) return;
    if (inp.type === 'checkbox') inp.checked = !!saved[name];
    else inp.value = saved[name];
    inp.dispatchEvent(new Event('change', { bubbles: true }));
  });
}

function applyBtn(label, onClick) {
  return el('button', { type: 'button', class: 'btn btn-primary btn-block', onClick }, label);
}

function renderPanel() {
  const panel = el('div', { class: 'ed-panel', role: 'tabpanel' });
  const sel = () => st.pages.filter((p) => p.selected);
  if (st.tab === 'pages') {
    panel.append(
      el('p', { class: 'muted small' }, L('썸네일을 드래그해 순서를 바꾸고, 클릭해서 선택하세요. 각 페이지의 ⟳ 회전, ✕ 삭제, 🔍 미리보기.', 'Drag thumbnails to reorder, click to select. Use ⟳ rotate, ✕ delete, 🔍 preview on each page.')),
      el('p', { class: 'ed-selinfo small' }),
      el('div', { class: 'btn-row' },
        el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { st.pages.forEach((p) => { p.selected = true; }); render(); updateSelectionInfo(); } }, L('전체 선택', 'Select all')),
        el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { st.pages.forEach((p) => { p.selected = false; }); render(); updateSelectionInfo(); } }, L('선택 해제', 'Clear')),
      ),
      el('div', { class: 'btn-row' },
        el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { const s = sel().length ? sel() : st.pages; snapshot(); s.forEach((p) => { p.rotation = (p.rotation + 90) % 360; }); render(); } }, '⟳ ' + L('선택 회전 (없으면 전체)', 'Rotate selected (or all)')),
      ),
      el('div', { class: 'btn-row' },
        el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { if (!sel().length) { toast(L('먼저 페이지를 선택하세요', 'Select pages first'), true); return; } snapshot(); sel().forEach((p) => { p.deleted = true; p.selected = false; }); render(); } }, '✕ ' + L('선택 삭제', 'Delete selected')),
        el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { if (!sel().length) { toast(L('먼저 페이지를 선택하세요', 'Select pages first'), true); return; } snapshot(); st.pages.forEach((p) => { p.deleted = !p.selected; p.selected = false; }); render(); } }, L('선택만 남기기', 'Keep only selected')),
      ),
      el('div', { class: 'btn-row' },
        el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { snapshot(); st.pages.forEach((p) => { p.deleted = false; p.rotation = 0; }); st.pages.sort((a, b) => a.src - b.src); render(); } }, t('rotate.reset')),
      ),
      el('p', { class: 'muted small' }, L('페이지 편집은 워터마크·번호·압축을 적용하거나 다운로드할 때 반영됩니다.', 'Page edits are applied when you run another operation or download.')),
    );
    setTimeout(updateSelectionInfo, 0);
  } else if (st.tab === 'add') {
    panel.append(
      el('p', { class: 'muted small' }, L('다른 PDF나 이미지(JPG/PNG)를 문서 끝에 페이지로 추가합니다. 추가한 뒤 드래그로 위치를 옮기세요.', 'Append other PDFs or images (JPG/PNG) as pages at the end. Drag them into place afterwards.')),
      el('h4', {}, L('이미지 페이지 설정', 'Image page settings')),
    );
    imageToPdfOptions(panel);
    panel.appendChild(applyBtn('+ ' + L('PDF / 이미지 추가', 'Add PDF / images'), () => { savePanel(); fileInput.click(); }));
  } else if (st.tab === 'watermark') {
    watermarkOptions(panel);
    panel.appendChild(applyBtn(L('워터마크 적용', 'Apply watermark'), () => { savePanel(); const o = readOptions(panel); runOp(L('워터마크 적용 중...', 'Applying watermark...'), (b, p) => ops.watermarkBytes(b, o, p)); }));
  } else if (st.tab === 'numbers') {
    pageNumberOptions(panel, { withRange: false });
    panel.appendChild(el('p', { class: 'muted small' }, L('페이지를 선택했으면 선택한 페이지에만, 아니면 전체에 번호를 넣습니다.', 'Numbers go on selected pages only, or on all pages if none are selected.')));
    panel.appendChild(applyBtn(L('페이지 번호 적용', 'Apply page numbers'), () => {
      savePanel(); const o = readOptions(panel);
      const s = sel();
      runOp(L('페이지 번호 적용 중...', 'Adding page numbers...'), (b, p) => {
        if (s.length) {
          // commitPages 이후 인덱스 = 삭제되지 않은 페이지의 순서
          const live = st.pages.filter((x) => !x.deleted);
          o.targets = new Set(live.map((x, i) => (x.selected ? i : -1)).filter((i) => i >= 0));
        }
        return ops.pageNumbersBytes(b, o, p);
      });
    }));
  } else if (st.tab === 'compress') {
    compressOptions(panel);
    panel.appendChild(el('p', { class: 'ed-sizeinfo small muted' }, `${L('현재 크기', 'Current size')}: ${formatBytes(st.size)}`));
    panel.appendChild(applyBtn(L('압축 적용', 'Compress'), () => {
      savePanel(); const o = readOptions(panel); const before = st.size;
      runOp(L('압축 중...', 'Compressing...'), (b, p) => ops.compressBytes(b, o, p)).then(() => {
        const pct = Math.round((1 - st.size / before) * 100);
        toast(pct > 0 ? `${formatBytes(before)} → ${formatBytes(st.size)} (${t('result.reduced', { p: pct })})` : t('result.notReduced'));
        const info = root.querySelector('.ed-sizeinfo'); if (info) info.textContent = `${L('현재 크기', 'Current size')}: ${formatBytes(st.size)}`;
      });
    }));
  } else if (st.tab === 'export') {
    panel.append(
      el('h4', {}, 'PDF'),
      el('div', { class: 'ed-export' },
        el('button', { type: 'button', class: 'btn btn-primary btn-block', onClick: () => exportAs('pdf') }, '⬇ ' + L('전체 PDF', 'Whole PDF')),
        el('button', { type: 'button', class: 'btn btn-ghost btn-block', onClick: () => exportAs('selected') }, L('선택한 페이지만 PDF', 'Selected pages as PDF')),
        el('button', { type: 'button', class: 'btn btn-ghost btn-block', onClick: () => exportAs('each') }, L('페이지별 PDF (ZIP)', 'One PDF per page (ZIP)')),
      ),
      el('h4', { style: { marginTop: '18px' } }, L('이미지', 'Images')),
    );
    imageOptions(panel);
    panel.appendChild(el('button', { type: 'button', class: 'btn btn-ghost btn-block', onClick: () => { savePanel(); exportAs('images', readOptions(panel)); } }, L('모든 페이지를 이미지로 (ZIP)', 'All pages as images (ZIP)')));
  }
  restorePanel(panel);
  return panel;
}

// ---------------- busy overlay ----------------
function setBusy(on, msg = '', frac = 0) {
  st.busy = on;
  let ov = root.querySelector('.ed-overlay');
  if (!on) { if (ov) ov.remove(); return; }
  if (!ov) {
    ov = el('div', { class: 'ed-overlay' }, el('div', { class: 'status-box' }, el('div', { class: 'spinner' }), el('p', { class: 'progress-msg' }), el('div', { class: 'progress-bar' }, el('span'))));
    root.appendChild(ov);
  }
  ov.querySelector('.progress-msg').textContent = msg;
  ov.querySelector('.progress-bar > span').style.width = (Math.max(0, Math.min(1, frac)) * 100).toFixed(1) + '%';
}

// ---------------- preview modal ----------------
let previewIndex = 0;
async function openPreview(i) {
  previewIndex = i;
  let modal = root.querySelector('.ed-modal');
  if (!modal) {
    modal = el('div', { class: 'ed-modal', role: 'dialog', 'aria-modal': 'true' });
    modal.innerHTML = `<div class="ed-modal-bar"><button type="button" class="btn btn-ghost ed-prev">‹</button><span class="ed-modal-title"></span><button type="button" class="btn btn-ghost ed-next">›</button><button type="button" class="btn btn-ghost ed-close" aria-label="close">✕</button></div><div class="ed-modal-body"></div>`;
    modal.addEventListener('click', (e) => { if (e.target === modal) closePreview(); });
    modal.querySelector('.ed-close').addEventListener('click', closePreview);
    modal.querySelector('.ed-prev').addEventListener('click', () => openPreview((previewIndex - 1 + st.pages.length) % st.pages.length));
    modal.querySelector('.ed-next').addEventListener('click', () => openPreview((previewIndex + 1) % st.pages.length));
    root.appendChild(modal);
  }
  const pg = st.pages[i];
  modal.querySelector('.ed-modal-title').textContent = `${i + 1} / ${st.pages.length}${pg.deleted ? ' · ' + t('page.delete') : ''}`;
  const body = modal.querySelector('.ed-modal-body');
  body.innerHTML = '';
  body.appendChild(el('div', { class: 'spinner' }));
  modal.classList.add('open');
  try {
    const maxW = Math.min(window.innerWidth - 48, 900);
    const canvas = await renderPageToCanvas(st.doc, pg.src, { width: maxW * (window.devicePixelRatio > 1 ? 1.5 : 1) });
    canvas.style.transform = `rotate(${pg.rotation}deg)`;
    canvas.style.maxWidth = (pg.rotation % 180 ? Math.min(window.innerHeight - 140, maxW) : maxW) + 'px';
    body.innerHTML = '';
    body.appendChild(canvas);
  } catch (e) { body.textContent = t('error.generic'); }
}
function closePreview() { const m = root.querySelector('.ed-modal'); if (m) m.classList.remove('open'); }

document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape') closePreview();
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'z' && !e.shiftKey && !/input|textarea|select/i.test(document.activeElement.tagName)) { e.preventDefault(); undo(); }
});
document.addEventListener('langchange', () => render());
window.addEventListener('beforeunload', (e) => { if (st.bytes && (st.undo.length || pagesChanged())) { e.preventDefault(); e.returnValue = ''; } });

render();
