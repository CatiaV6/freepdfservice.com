import { SITE, ADS, AD_PLACEMENT } from './config.js';
import { getLang, setLang, applyLang, t } from './i18n.js';
import { TOOLS, toolIcon } from './tools-list.js';
import { el } from './util.js';

const root = document.documentElement.dataset.root || './';
const currentSlug = document.body.dataset.tool || '';

function logo() {
  return `<svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true"><rect x="4" y="2" width="24" height="28" rx="4" fill="#2563eb"/><path d="M10 10h12M10 16h12M10 22h7" stroke="#fff" stroke-width="2.5" stroke-linecap="round"/></svg>`;
}

function renderHeader() {
  const header = el('header', { class: 'site-header' });
  header.innerHTML = `
    <div class="container header-inner">
      <a class="brand" href="${root}">${logo()}<span>Free<b>PDF</b></span></a>
      <nav class="nav">
        <a href="${root}" data-i18n="nav.home"></a>
        <a href="${root}#tools" data-i18n="nav.tools"></a>
        <a href="${root}about/" data-i18n="nav.about"></a>
      </nav>
      <button type="button" class="lang-btn" id="lang-toggle" data-i18n="lang.switch"></button>
    </div>`;
  document.body.prepend(header);
  header.querySelector('#lang-toggle').addEventListener('click', () => {
    setLang(document.documentElement.lang === 'en' ? 'ko' : 'en');
  });
}

function renderFooter() {
  const footer = el('footer', { class: 'site-footer' });
  const toolLinks = TOOLS.map((tl) => `<li><a href="${root}${tl.slug}/" data-i18n="${tl.key}"></a></li>`).join('');
  footer.innerHTML = `
    <div class="container footer-grid">
      <div class="footer-brand">
        <a class="brand" href="${root}">${logo()}<span>Free<b>PDF</b></span></a>
        <p data-i18n="footer.tagline"></p>
      </div>
      <div>
        <h4 data-i18n="footer.tools"></h4>
        <ul>${toolLinks}</ul>
      </div>
      <div>
        <h4 data-i18n="footer.info"></h4>
        <ul>
          <li><a href="${root}about/" data-i18n="footer.about"></a></li>
          <li><a href="${root}privacy/" data-i18n="footer.privacy"></a></li>
          <li><a href="${root}terms/" data-i18n="footer.terms"></a></li>
        </ul>
      </div>
    </div>
    <div class="container footer-bottom">
      ${ADS.coupang.enabled ? '<p class="disclosure" data-i18n="footer.coupang"></p>' : ''}
      <p>© ${new Date().getFullYear()} ${SITE.name} · freepdfservice.com</p>
    </div>`;
  document.body.appendChild(footer);
}

function renderOtherTools() {
  const host = document.getElementById('other-tools');
  if (!host) return;
  const lang = document.documentElement.lang;
  host.innerHTML = '';
  for (const tl of TOOLS) {
    if (tl.slug === currentSlug) continue;
    const a = el('a', { class: 'tool-card small', href: `${root}${tl.slug}/` });
    a.innerHTML = `${toolIcon(tl, 24)}<div><strong data-i18n="${tl.key}">${t(tl.key)}</strong><span>${lang === 'en' ? tl.en : tl.ko}</span></div>`;
    host.appendChild(a);
  }
}

function renderToolGrid() {
  const host = document.getElementById('tool-grid');
  if (!host) return;
  const lang = document.documentElement.lang;
  host.innerHTML = '';
  for (const tl of TOOLS) {
    const a = el('a', { class: 'tool-card', href: `${root}${tl.slug}/` });
    a.innerHTML = `<div class="tool-card-icon" style="--c:${tl.color}">${toolIcon(tl, 32)}</div><h3 data-i18n="${tl.key}">${t(tl.key)}</h3><p>${lang === 'en' ? tl.en : tl.ko}</p>`;
    host.appendChild(a);
  }
}

// ---------------- Ads ----------------
const isLocal = /^(localhost|127\.0\.0\.1|\[::1\])$/.test(location.hostname);
let adsenseLoaded = false;

function ensureAdsense() {
  if (adsenseLoaded) return;
  adsenseLoaded = true;
  const s = document.createElement('script');
  s.async = true;
  s.crossOrigin = 'anonymous';
  s.src = `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(ADS.adsense.client)}`;
  document.head.appendChild(s);
}

function renderAdsense(slot, pos) {
  ensureAdsense();
  const ins = document.createElement('ins');
  ins.className = 'adsbygoogle';
  ins.style.display = 'block';
  ins.dataset.adClient = ADS.adsense.client;
  const id = ADS.adsense.slots[pos];
  if (id) ins.dataset.adSlot = id;
  ins.dataset.adFormat = 'auto';
  ins.dataset.fullWidthResponsive = 'true';
  slot.appendChild(ins);
  try { (window.adsbygoogle = window.adsbygoogle || []).push({}); } catch (_) {}
}

function renderCoupang(slot, pos) {
  const b = ADS.coupang.banners[pos];
  if (!b || !b.id) return false;
  const cfg = JSON.stringify({ id: b.id, template: b.template || 'carousel', trackingCode: ADS.coupang.trackingCode, width: String(b.width), height: String(b.height), tsource: '' });
  const html = `<!doctype html><html><head><meta charset="utf-8"><style>html,body{margin:0;padding:0;overflow:hidden}</style></head><body><script src="https://ads-partners.coupang.com/g.js"><\/script><script>new PartnersCoupang.G(${cfg});<\/script></body></html>`;
  const iframe = document.createElement('iframe');
  iframe.width = String(b.width);
  iframe.height = String(b.height);
  iframe.setAttribute('scrolling', 'no');
  iframe.setAttribute('frameborder', '0');
  iframe.setAttribute('referrerpolicy', 'unsafe-url');
  iframe.setAttribute('browsingtopics', '');
  iframe.loading = 'lazy';
  iframe.title = 'Coupang';
  iframe.srcdoc = html;
  slot.appendChild(iframe);
  return true;
}

function renderAds() {
  document.querySelectorAll('.ad-slot').forEach((slot) => {
    const pos = slot.dataset.ad || 'bottom';
    const want = AD_PLACEMENT[pos] || 'adsense';
    const providers = [want, want === 'adsense' ? 'coupang' : 'adsense'];
    let done = false;
    for (const p of providers) {
      if (p === 'adsense' && ADS.adsense.enabled) { renderAdsense(slot, pos); done = true; break; }
      if (p === 'coupang' && ADS.coupang.enabled && renderCoupang(slot, pos)) { done = true; break; }
    }
    if (done) { slot.classList.add('ad-slot--live'); return; }
    if (isLocal && ADS.showPlaceholdersOnLocalhost) {
      slot.classList.add('ad-slot--placeholder');
      slot.innerHTML = `<span data-i18n="ad.placeholder">${t('ad.placeholder')}</span><small>${pos}</small>`;
    } else {
      slot.hidden = true;
      if (pos === 'sidebar') document.querySelectorAll('.tool-layout.has-sidebar').forEach((l) => l.classList.remove('has-sidebar'));
    }
  });
}

// ---------------- init ----------------
renderHeader();
renderFooter();
applyLang(getLang());
renderToolGrid();
renderOtherTools();
renderAds();
document.addEventListener('langchange', () => { renderToolGrid(); renderOtherTools(); });
