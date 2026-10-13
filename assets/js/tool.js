// 도구 공통 프레임워크: 업로드 → 파일 목록/옵션 → 실행(진행률) → 결과 다운로드
import { t } from './i18n.js';
import { el, formatBytes, saveBlob, uid, isPdf } from './util.js';
import { getSortable } from './lib.js';

const MAX_FILE_BYTES = 200 * 1024 * 1024;

export function mountTool(cfg) {
  const host = document.getElementById('tool-root');
  if (!host) throw new Error('#tool-root not found');

  const ctx = {
    files: [],          // { id, file, name, size, meta: {} }
    state: {},          // 도구별 자유 상태
    optionsEl: null,
    filesEl: null,
    host,
    cfg,
    getOptions,
    refresh: () => refreshFiles(),
    setStage,
  };
  let stage = 'empty';
  let result = null;
  let errorMsg = '';
  let sortable = null;

  const input = el('input', { type: 'file', accept: cfg.accept || '', multiple: cfg.multiple ? true : null, hidden: true });
  input.addEventListener('change', () => { addFiles([...input.files]); input.value = ''; });
  host.appendChild(input);

  function setStage(s) { stage = s; render(); }

  // 파일 영역만 다시 그림 (옵션 패널의 입력값과 포커스는 유지)
  function refreshFiles() {
    if (stage !== 'ready' || !ctx.filesEl || !ctx.filesEl.isConnected) { render(); return; }
    ctx.filesEl.innerHTML = '';
    if (cfg.renderFiles) cfg.renderFiles(ctx.filesEl, ctx);
    else renderDefaultFiles(ctx.filesEl);
  }

  function filterFiles(list) {
    const ok = [];
    for (const f of list) {
      if (cfg.fileFilter && !cfg.fileFilter(f)) { toast(t(cfg.invalidMsg || 'error.notPdf', { name: f.name }), true); continue; }
      if (f.size > MAX_FILE_BYTES) { toast(t('error.tooLarge', { max: '200 MB' }), true); continue; }
      ok.push(f);
    }
    return ok;
  }

  async function addFiles(list) {
    const ok = filterFiles(list);
    if (!ok.length) return;
    if (!cfg.multiple) ctx.files = [];
    for (const f of ok) ctx.files.push({ id: uid(), file: f, name: f.name, size: f.size, meta: {} });
    if (!cfg.multiple) ctx.files = ctx.files.slice(-1);
    stage = 'ready';
    result = null;
    render();
    if (cfg.onFilesChanged) {
      try { await cfg.onFilesChanged(ctx); } catch (e) { showError(e); }
    }
  }

  function removeFile(id) {
    ctx.files = ctx.files.filter((f) => f.id !== id);
    if (!ctx.files.length) { stage = 'empty'; ctx.state = {}; }
    render();
    if (cfg.onFilesChanged && ctx.files.length) cfg.onFilesChanged(ctx);
  }

  function getOptions() {
    const out = {};
    if (!ctx.optionsEl) return out;
    ctx.optionsEl.querySelectorAll('[name]').forEach((inp) => {
      const name = inp.getAttribute('name');
      if (inp.type === 'checkbox') out[name] = inp.checked;
      else if (inp.type === 'radio') { if (inp.checked) out[name] = inp.value; }
      else if (inp.type === 'number' || inp.type === 'range') out[name] = inp.value === '' ? null : Number(inp.value);
      else out[name] = inp.value;
    });
    return out;
  }

  function showError(e) {
    console.error(e);
    if (e && e.code === 'encrypted') errorMsg = t('error.encrypted');
    else if (e && e.code === 'user') errorMsg = t(e.msgKey, e.vars);
    else errorMsg = t('error.generic');
    stage = 'error';
    render();
  }

  async function runTool() {
    if (!ctx.files.length) { toast(t('error.noFiles'), true); return; }
    if (cfg.minFiles && ctx.files.length < cfg.minFiles) { toast(t(cfg.minFilesMsg || 'error.noFiles'), true); return; }
    stage = 'working';
    ctx.progressValue = 0; ctx.progressMsg = t('progress.loading');
    render();
    const progress = (frac, msg) => {
      ctx.progressValue = Math.max(0, Math.min(1, frac));
      if (msg) ctx.progressMsg = msg;
      updateProgress();
    };
    try {
      const r = await cfg.run(ctx, progress);
      result = r;
      stage = 'done';
      render();
      if (r && r.blob) saveBlob(r.blob, r.filename);
    } catch (e) {
      showError(e);
    }
  }

  function updateProgress() {
    const bar = host.querySelector('.progress-bar > span');
    const msg = host.querySelector('.progress-msg');
    if (bar) bar.style.width = (ctx.progressValue * 100).toFixed(1) + '%';
    if (msg) msg.textContent = ctx.progressMsg || '';
  }

  // ---------- render ----------
  function render() {
    if (stage === 'ready' && ctx.optionsEl && ctx.optionsEl.isConnected) ctx.savedOptions = getOptions();
    [...host.children].forEach((c) => { if (c !== input) c.remove(); });
    if (stage === 'empty') host.appendChild(renderDrop());
    else if (stage === 'ready') host.appendChild(renderWorkspace());
    else if (stage === 'working') host.appendChild(renderWorking());
    else if (stage === 'done') host.appendChild(renderDone());
    else if (stage === 'error') host.appendChild(renderError());
  }

  function renderDrop() {
    const zone = el('div', { class: 'dropzone', role: 'button', tabindex: '0' });
    zone.innerHTML = `
      <svg width="56" height="56" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 16V4M7 9l5-5 5 5"/><path d="M4 16v3a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1v-3"/></svg>
      <h2>${t('drop.title')}</h2>
      <p class="muted">${t('drop.or')}</p>
      <button type="button" class="btn btn-primary btn-lg">${t(cfg.multiple ? 'drop.selectMulti' : 'drop.select')}</button>
      <p class="hint">${cfg.acceptHint ? cfg.acceptHint() + ' · ' : ''}${t('drop.hint')}</p>`;
    const open = () => input.click();
    zone.querySelector('button').addEventListener('click', (e) => { e.stopPropagation(); open(); });
    zone.addEventListener('click', open);
    zone.addEventListener('keydown', (e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); open(); } });
    bindDrop(zone);
    return zone;
  }

  function bindDrop(target) {
    ['dragenter', 'dragover'].forEach((ev) => target.addEventListener(ev, (e) => { e.preventDefault(); target.classList.add('dragover'); }));
    ['dragleave', 'drop'].forEach((ev) => target.addEventListener(ev, (e) => { e.preventDefault(); target.classList.remove('dragover'); }));
    target.addEventListener('drop', (e) => { if (e.dataTransfer && e.dataTransfer.files.length) addFiles([...e.dataTransfer.files]); });
  }

  function renderWorkspace() {
    const wrap = el('div', { class: 'tool-work' });
    bindDrop(wrap);
    const filesCol = el('div', { class: 'tool-files' });
    const panel = el('aside', { class: 'tool-panel' });
    ctx.filesEl = filesCol;

    if (cfg.renderFiles) cfg.renderFiles(filesCol, ctx);
    else renderDefaultFiles(filesCol);

    const opts = el('div', { class: 'tool-options' });
    ctx.optionsEl = opts;
    if (cfg.renderOptions) cfg.renderOptions(opts, ctx);
    restoreOptions(opts);
    panel.appendChild(opts);

    const runBtn = el('button', { type: 'button', class: 'btn btn-primary btn-lg btn-block', onClick: runTool }, t(cfg.runLabel || 'run'));
    panel.appendChild(runBtn);
    const addBtn = el('button', { type: 'button', class: 'btn btn-ghost btn-block', onClick: () => input.click() }, cfg.multiple ? t('files.add') : t('result.again'));
    panel.appendChild(addBtn);

    wrap.append(filesCol, panel);
    return wrap;
  }

  // 다시 그릴 때 사용자가 바꾼 옵션 값을 유지
  function restoreOptions(opts) {
    const saved = ctx.savedOptions;
    if (!saved) return;
    opts.querySelectorAll('[name]').forEach((inp) => {
      const name = inp.getAttribute('name');
      if (!(name in saved) || saved[name] == null) return;
      if (inp.type === 'checkbox') inp.checked = !!saved[name];
      else if (inp.type === 'radio') inp.checked = inp.value === saved[name];
      else inp.value = saved[name];
      inp.dispatchEvent(new Event('change', { bubbles: true }));
    });
  }

  function renderDefaultFiles(container) {
    const total = ctx.files.reduce((a, f) => a + f.size, 0);
    container.appendChild(el('div', { class: 'files-summary' },
      el('span', {}, t('files.count', { n: ctx.files.length, size: formatBytes(total) })),
      cfg.multiple && ctx.files.length > 1 ? el('span', { class: 'muted' }, ' · ' + t('files.dragHint')) : null,
      el('button', { type: 'button', class: 'link-btn', onClick: () => { ctx.files = []; stage = 'empty'; ctx.state = {}; ctx.savedOptions = null; render(); } }, t('files.clear')),
    ));
    const list = el('ul', { class: 'file-list' });
    for (const f of ctx.files) {
      const li = el('li', { class: 'file-item', dataset: { id: f.id } });
      li.innerHTML = `<span class="file-icon ${isPdf(f.file) ? 'pdf' : 'img'}">${isPdf(f.file) ? 'PDF' : 'IMG'}</span>
        <span class="file-name" title="${escapeHtml(f.name)}">${escapeHtml(f.name)}</span>
        <span class="file-meta">${formatBytes(f.size)}${f.meta.pages ? ' · ' + t('pages.count', { n: f.meta.pages }) : ''}</span>`;
      li.appendChild(el('button', { type: 'button', class: 'icon-btn', title: t('files.remove'), 'aria-label': t('files.remove'), onClick: () => removeFile(f.id) }, '✕'));
      list.appendChild(li);
    }
    container.appendChild(list);
    if (cfg.multiple && ctx.files.length > 1) {
      getSortable().then((Sortable) => {
        if (!list.isConnected) return;
        sortable = Sortable.create(list, {
          animation: 150,
          onEnd: () => {
            const order = [...list.children].map((li) => li.dataset.id);
            ctx.files.sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id));
          },
        });
      });
    }
  }

  function renderWorking() {
    const box = el('div', { class: 'status-box' });
    box.innerHTML = `<div class="spinner"></div><h2>${t('processing')}</h2>
      <div class="progress-bar"><span style="width:0%"></span></div>
      <p class="progress-msg muted"></p>`;
    setTimeout(updateProgress, 0);
    return box;
  }

  function renderDone() {
    const box = el('div', { class: 'status-box done' });
    const r = result || {};
    let sizeInfo = '';
    if (r.meta && r.meta.before != null) {
      const pct = Math.round((1 - r.blob.size / r.meta.before) * 100);
      sizeInfo = `<p class="size-compare"><span>${t('result.sizeBefore')}: ${formatBytes(r.meta.before)}</span> → <span>${t('result.sizeAfter')}: ${formatBytes(r.blob.size)}</span><br><strong>${pct > 0 ? t('result.reduced', { p: pct }) : t('result.notReduced')}</strong></p>`;
    } else if (r.blob) {
      sizeInfo = `<p class="muted">${t('result.size')}: ${formatBytes(r.blob.size)}</p>`;
    }
    box.innerHTML = `<div class="check">✓</div><h2>${t('result.done')}</h2><p class="file-name-big">${escapeHtml(r.filename || '')}</p>${sizeInfo}`;
    box.appendChild(el('button', { type: 'button', class: 'btn btn-primary btn-lg', onClick: () => saveBlob(r.blob, r.filename) }, '⬇ ' + t('result.download')));
    box.appendChild(el('button', { type: 'button', class: 'btn btn-ghost', onClick: () => { ctx.files = []; ctx.state = {}; ctx.savedOptions = null; result = null; stage = 'empty'; render(); } }, t('result.again')));
    return box;
  }

  function renderError() {
    const box = el('div', { class: 'status-box error' });
    box.innerHTML = `<div class="check">!</div><h2>${t('error.title')}</h2><p>${escapeHtml(errorMsg)}</p>`;
    box.appendChild(el('button', { type: 'button', class: 'btn btn-primary', onClick: () => { stage = ctx.files.length ? 'ready' : 'empty'; render(); if (ctx.files.length && cfg.onFilesChanged) cfg.onFilesChanged(ctx); } }, t('result.again')));
    return box;
  }

  document.addEventListener('langchange', () => render());
  render();
  return ctx;
}

export function escapeHtml(s) {
  return String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

let toastTimer = null;
export function toast(msg, isError = false) {
  let node = document.getElementById('toast');
  if (!node) { node = el('div', { id: 'toast', class: 'toast' }); document.body.appendChild(node); }
  node.textContent = msg;
  node.classList.toggle('error', isError);
  node.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => node.classList.remove('show'), 4000);
}

// 옵션 UI 헬퍼
export function field(labelKey, control, hintKey) {
  const wrap = el('label', { class: 'field' });
  wrap.appendChild(el('span', { class: 'field-label' }, t(labelKey)));
  wrap.appendChild(control);
  if (hintKey) wrap.appendChild(el('small', { class: 'field-hint' }, t(hintKey)));
  return wrap;
}

export function select(name, options, value) {
  const s = el('select', { name });
  for (const [v, label] of options) s.appendChild(el('option', { value: v, selected: v === value ? true : null }, label));
  return s;
}

export function userError(msgKey, vars) {
  const e = new Error(msgKey);
  e.code = 'user';
  e.msgKey = msgKey;
  e.vars = vars;
  return e;
}
