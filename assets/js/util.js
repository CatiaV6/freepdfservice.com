export function formatBytes(n) {
  if (!Number.isFinite(n)) return '-';
  if (n < 1024) return n + ' B';
  if (n < 1024 * 1024) return (n / 1024).toFixed(1) + ' KB';
  return (n / 1024 / 1024).toFixed(2) + ' MB';
}

export function baseName(name) {
  return name.replace(/\.[^.]+$/, '');
}

export function saveBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.rel = 'noopener';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => {
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, 60_000);
}

// "1-3, 5, 8-10" -> [[1,3],[5,5],[8,10]]  (1-based, inclusive). Returns null if invalid.
export function parseRanges(text, total) {
  const out = [];
  const parts = String(text || '').split(/[,\s]+/).filter(Boolean);
  if (parts.length === 0) return [[1, total]];
  for (const p of parts) {
    const m = p.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) return null;
    let a = parseInt(m[1], 10);
    let b = m[2] ? parseInt(m[2], 10) : a;
    if (a < 1 || b < 1 || a > total || b > total) return null;
    if (a > b) [a, b] = [b, a];
    out.push([a, b]);
  }
  return out;
}

// -> sorted unique 0-based page indices
export function rangesToIndices(ranges) {
  const set = new Set();
  for (const [a, b] of ranges) for (let i = a; i <= b; i++) set.add(i - 1);
  return [...set].sort((x, y) => x - y);
}

export function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (v == null || v === false) continue;
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2).toLowerCase(), v);
    else if (k === 'dataset') Object.assign(node.dataset, v);
    else if (k === 'style' && typeof v === 'object') Object.assign(node.style, v);
    else node.setAttribute(k, v === true ? '' : v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
  }
  return node;
}

export function readAsArrayBuffer(file) {
  return file.arrayBuffer();
}

export function isPdf(file) {
  return file.type === 'application/pdf' || /\.pdf$/i.test(file.name);
}

export function isImage(file) {
  return /^image\//.test(file.type) || /\.(jpe?g|png|gif|webp|bmp|avif|svg)$/i.test(file.name);
}

export function hexToRgb(hex) {
  const m = String(hex).replace('#', '').match(/^([0-9a-f]{2})([0-9a-f]{2})([0-9a-f]{2})$/i);
  if (!m) return { r: 0, g: 0, b: 0 };
  return { r: parseInt(m[1], 16) / 255, g: parseInt(m[2], 16) / 255, b: parseInt(m[3], 16) / 255 };
}

export function uid() {
  return Math.random().toString(36).slice(2, 10);
}

export const PAGE_SIZES = {
  A4: [595.28, 841.89],
  A3: [841.89, 1190.55],
  A5: [419.53, 595.28],
  Letter: [612, 792],
  Legal: [612, 1008],
};

// /Rotate 가 적용된 페이지에서 "화면에 보이는 기준" 좌표를 실제 페이지 좌표로 변환
// 반환: { W, H, rot, map(vx, vy) -> {x, y} }  (텍스트는 rotate: degrees(rot) 로 그리면 화면에서 수평)
export function pageVisual(page) {
  const { width: w, height: h } = page.getSize();
  const rot = ((page.getRotation().angle % 360) + 360) % 360;
  if (rot === 90) return { W: h, H: w, rot, map: (vx, vy) => ({ x: w - vy, y: vx }) };
  if (rot === 180) return { W: w, H: h, rot, map: (vx, vy) => ({ x: w - vx, y: h - vy }) };
  if (rot === 270) return { W: h, H: w, rot, map: (vx, vy) => ({ x: vy, y: h - vx }) };
  return { W: w, H: h, rot: 0, map: (vx, vy) => ({ x: vx, y: vy }) };
}
