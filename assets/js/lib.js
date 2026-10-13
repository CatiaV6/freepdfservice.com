// 무거운 라이브러리는 필요할 때만 불러옵니다.
const base = new URL('../vendor/', import.meta.url);
const loaded = new Map();

function loadScript(file) {
  if (loaded.has(file)) return loaded.get(file);
  const p = new Promise((resolve, reject) => {
    const s = document.createElement('script');
    s.src = new URL(file, base).href;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error('Failed to load ' + file));
    document.head.appendChild(s);
  });
  loaded.set(file, p);
  return p;
}

export async function getPdfLib() {
  if (!window.PDFLib) await loadScript('pdf-lib.min.js');
  return window.PDFLib;
}

export async function getFontkit() {
  if (!window.fontkit) await loadScript('fontkit.umd.min.js');
  return window.fontkit;
}

export async function getJSZip() {
  if (!window.JSZip) await loadScript('jszip.min.js');
  return window.JSZip;
}

export async function getSortable() {
  if (!window.Sortable) await loadScript('Sortable.min.js');
  return window.Sortable;
}

let pdfjsPromise = null;
export function getPdfJs() {
  if (!pdfjsPromise) {
    pdfjsPromise = import(new URL('pdf.min.mjs', base).href).then((mod) => {
      mod.GlobalWorkerOptions.workerSrc = new URL('pdf.worker.min.mjs', base).href;
      return mod;
    });
  }
  return pdfjsPromise;
}

const fontCache = new Map();
function fetchFont(file) {
  if (!fontCache.has(file)) {
    fontCache.set(file, fetch(new URL('fonts/' + file, base).href).then((r) => {
      if (!r.ok) throw new Error('font load failed: ' + file);
      return r.arrayBuffer();
    }));
  }
  return fontCache.get(file);
}

// WinAnsi 로 표현 가능한 문자만 있으면 표준 Helvetica 를 쓰고, 아니면 나눔고딕을 임베드합니다.
export function needsUnicodeFont(text) {
  return /[^\x20-\x7E\u00A0-\u00FF]/.test(text);
}

// 한글 폰트: 기본은 KS X 1001 2,350자 폰트(작음), 드문 글자가 있으면 11,172자 전체 폰트로 자동 전환.
// pdf-lib 의 subset 기능(fontkit)은 이 폰트에서 글리프를 누락시키므로 subset: false 로 전체 임베드합니다.
export async function embedTextFont(pdfDoc, text) {
  const PDFLib = await getPdfLib();
  if (!needsUnicodeFont(text)) {
    return pdfDoc.embedFont(PDFLib.StandardFonts.Helvetica);
  }
  const [fontkit, common] = await Promise.all([getFontkit(), fetchFont('NanumGothic-Common.ttf')]);
  pdfDoc.registerFontkit(fontkit);
  let bytes = common;
  const probe = fontkit.create(new Uint8Array(common));
  const missing = [...text].some((ch) => {
    const cp = ch.codePointAt(0);
    return cp > 0x7e && !probe.hasGlyphForCodePoint(cp);
  });
  if (missing) bytes = await fetchFont('NanumGothic-Full.ttf');
  return pdfDoc.embedFont(bytes, { subset: false });
}

// 암호 PDF 등 pdf-lib 로딩 오류를 사용자 메시지로 변환
export async function loadPdfDoc(bytes, opts = {}) {
  const PDFLib = await getPdfLib();
  try {
    return await PDFLib.PDFDocument.load(bytes, { ignoreEncryption: false, updateMetadata: false, ...opts });
  } catch (e) {
    if (/encrypt/i.test(String(e && e.message))) {
      const err = new Error('encrypted');
      err.code = 'encrypted';
      throw err;
    }
    throw e;
  }
}

export async function loadPdfJsDoc(bytes) {
  const pdfjs = await getPdfJs();
  try {
    // pdf.js 는 전달된 버퍼를 워커로 이전(detach)하므로 복사본을 넘깁니다.
    const copy = bytes instanceof ArrayBuffer ? bytes.slice(0) : new Uint8Array(bytes).slice();
    return await pdfjs.getDocument({ data: copy, isEvalSupported: false }).promise;
  } catch (e) {
    if (e && (e.name === 'PasswordException' || /password/i.test(String(e.message)))) {
      const err = new Error('encrypted');
      err.code = 'encrypted';
      throw err;
    }
    throw e;
  }
}
