// 짧은 UI 문자열 다국어 사전. 긴 본문은 HTML 의 [data-lang] 블록을 사용합니다.
export const STRINGS = {
  ko: {
    'nav.home': '홈',
    'nav.tools': '모든 도구',
    'nav.about': '소개',
    'nav.editor': '통합 편집기',
    'tool.editor': '통합 PDF 편집기',
    'lang.switch': 'English',
    'drop.title': '파일을 여기에 끌어다 놓으세요',
    'drop.or': '또는',
    'drop.select': '파일 선택',
    'drop.selectMulti': '파일 선택 (여러 개 가능)',
    'drop.hint': '파일은 브라우저 안에서만 처리되며 서버로 전송되지 않습니다.',
    'files.add': '+ 파일 추가',
    'files.remove': '삭제',
    'files.clear': '모두 지우기',
    'files.count': '{n}개 파일 · {size}',
    'files.dragHint': '드래그해서 순서를 바꿀 수 있습니다.',
    'pages.count': '{n}페이지',
    'run': '실행',
    'processing': '처리 중...',
    'progress.loading': '파일 읽는 중...',
    'progress.page': '{i} / {n} 페이지 처리 중',
    'progress.saving': '파일 저장 중...',
    'progress.zipping': 'ZIP 압축 중...',
    'result.done': '완료되었습니다!',
    'result.download': '다운로드',
    'result.size': '결과 파일 크기',
    'result.again': '다른 파일로 다시 하기',
    'result.sizeBefore': '원본',
    'result.sizeAfter': '결과',
    'result.reduced': '{p}% 줄었습니다',
    'result.notReduced': '이 파일은 더 줄일 수 없습니다 (원본을 그대로 제공합니다)',
    'error.title': '오류가 발생했습니다',
    'error.generic': '파일을 처리하는 중 문제가 발생했습니다. 파일이 손상되었거나 지원하지 않는 형식일 수 있습니다.',
    'error.encrypted': '암호가 걸린 PDF는 지원하지 않습니다. 암호를 해제한 뒤 다시 시도해 주세요.',
    'error.notPdf': 'PDF 파일만 올릴 수 있습니다: {name}',
    'error.notImage': '지원하지 않는 이미지 파일입니다: {name}',
    'error.noFiles': '파일을 먼저 선택해 주세요.',
    'error.needTwo': '합치려면 PDF 파일이 2개 이상 필요합니다.',
    'error.badRange': '페이지 범위가 올바르지 않습니다. 예: 1-3, 5, 8-10',
    'error.tooLarge': '파일이 너무 큽니다 (최대 {max}).',
    'error.imageDecode': '이미지를 읽을 수 없습니다: {name}',
    'footer.tools': '도구',
    'footer.info': '안내',
    'footer.privacy': '개인정보처리방침',
    'footer.terms': '이용약관',
    'footer.about': '소개 및 문의',
    'footer.coupang': '이 사이트는 쿠팡 파트너스 활동의 일환으로, 이에 따른 일정액의 수수료를 제공받습니다.',
    'footer.tagline': '설치 없이, 가입 없이, 100% 무료. 모든 처리는 내 브라우저에서.',
    'ad.placeholder': '광고 영역',
    'tool.merge': 'PDF 합치기',
    'tool.split': 'PDF 분할',
    'tool.compress': 'PDF 압축',
    'tool.rotate': 'PDF 회전',
    'tool.organize': '페이지 정리',
    'tool.pdf2jpg': 'PDF → JPG',
    'tool.jpg2pdf': 'JPG → PDF',
    'tool.watermark': '워터마크',
    'tool.pagenum': '페이지 번호',
    'page.rotate': '회전',
    'page.delete': '삭제',
    'page.restore': '복원',
    'page.all': '전체',
    'rotate.all': '전체 90° 회전',
    'rotate.reset': '초기화',
    'opt.quality': '품질',
    'opt.format': '형식',
    'opt.mode': '방식',
    'opt.range': '페이지 범위',
    'opt.rangeHint': '예: 1-3, 5, 8-10 (비워두면 전체)',
    'opt.every': 'N페이지마다',
    'opt.dpi': '해상도',
    'opt.pageSize': '페이지 크기',
    'opt.orientation': '방향',
    'opt.margin': '여백',
    'opt.text': '텍스트',
    'opt.fontSize': '글자 크기',
    'opt.opacity': '투명도',
    'opt.color': '색상',
    'opt.angle': '각도',
    'opt.position': '위치',
    'opt.start': '시작 번호',
    'opt.formatHint': '{n} = 현재 페이지, {total} = 전체 페이지',
  },
  en: {
    'nav.home': 'Home',
    'nav.tools': 'All tools',
    'nav.about': 'About',
    'nav.editor': 'Editor',
    'tool.editor': 'All-in-one PDF editor',
    'lang.switch': '한국어',
    'drop.title': 'Drop your files here',
    'drop.or': 'or',
    'drop.select': 'Select file',
    'drop.selectMulti': 'Select files',
    'drop.hint': 'Files are processed inside your browser and never uploaded to a server.',
    'files.add': '+ Add files',
    'files.remove': 'Remove',
    'files.clear': 'Clear all',
    'files.count': '{n} files · {size}',
    'files.dragHint': 'Drag to reorder.',
    'pages.count': '{n} pages',
    'run': 'Run',
    'processing': 'Processing...',
    'progress.loading': 'Reading file...',
    'progress.page': 'Processing page {i} of {n}',
    'progress.saving': 'Saving file...',
    'progress.zipping': 'Creating ZIP...',
    'result.done': 'Done!',
    'result.download': 'Download',
    'result.size': 'Output size',
    'result.again': 'Start over with other files',
    'result.sizeBefore': 'Original',
    'result.sizeAfter': 'Result',
    'result.reduced': '{p}% smaller',
    'result.notReduced': 'This file could not be made smaller (original returned)',
    'error.title': 'Something went wrong',
    'error.generic': 'The file could not be processed. It may be damaged or in an unsupported format.',
    'error.encrypted': 'Password-protected PDFs are not supported. Remove the password and try again.',
    'error.notPdf': 'Only PDF files are accepted: {name}',
    'error.notImage': 'Unsupported image file: {name}',
    'error.noFiles': 'Please select a file first.',
    'error.needTwo': 'You need at least 2 PDF files to merge.',
    'error.badRange': 'Invalid page range. Example: 1-3, 5, 8-10',
    'error.tooLarge': 'File is too large (max {max}).',
    'error.imageDecode': 'Could not read image: {name}',
    'footer.tools': 'Tools',
    'footer.info': 'Info',
    'footer.privacy': 'Privacy policy',
    'footer.terms': 'Terms of use',
    'footer.about': 'About & contact',
    'footer.coupang': 'As a Coupang Partners affiliate, this site may earn a commission from qualifying purchases.',
    'footer.tagline': 'No install, no sign-up, 100% free. Everything runs in your browser.',
    'ad.placeholder': 'Advertisement',
    'tool.merge': 'Merge PDF',
    'tool.split': 'Split PDF',
    'tool.compress': 'Compress PDF',
    'tool.rotate': 'Rotate PDF',
    'tool.organize': 'Organize pages',
    'tool.pdf2jpg': 'PDF to JPG',
    'tool.jpg2pdf': 'JPG to PDF',
    'tool.watermark': 'Watermark',
    'tool.pagenum': 'Page numbers',
    'page.rotate': 'Rotate',
    'page.delete': 'Delete',
    'page.restore': 'Restore',
    'page.all': 'All',
    'rotate.all': 'Rotate all 90°',
    'rotate.reset': 'Reset',
    'opt.quality': 'Quality',
    'opt.format': 'Format',
    'opt.mode': 'Mode',
    'opt.range': 'Page range',
    'opt.rangeHint': 'e.g. 1-3, 5, 8-10 (empty = all)',
    'opt.every': 'Every N pages',
    'opt.dpi': 'Resolution',
    'opt.pageSize': 'Page size',
    'opt.orientation': 'Orientation',
    'opt.margin': 'Margin',
    'opt.text': 'Text',
    'opt.fontSize': 'Font size',
    'opt.opacity': 'Opacity',
    'opt.color': 'Color',
    'opt.angle': 'Angle',
    'opt.position': 'Position',
    'opt.start': 'Start number',
    'opt.formatHint': '{n} = page number, {total} = total pages',
  },
};

const KEY = 'freepdf.lang';

export function getLang() {
  try {
    const saved = localStorage.getItem(KEY);
    if (saved === 'ko' || saved === 'en') return saved;
  } catch (_) {}
  const nav = (navigator.language || 'ko').toLowerCase();
  return nav.startsWith('ko') ? 'ko' : 'en';
}

export function setLang(lang) {
  try { localStorage.setItem(KEY, lang); } catch (_) {}
  applyLang(lang);
}

export function t(key, vars) {
  const lang = document.documentElement.lang === 'en' ? 'en' : 'ko';
  let s = (STRINGS[lang] && STRINGS[lang][key]) ?? STRINGS.ko[key] ?? key;
  if (vars) for (const k of Object.keys(vars)) s = s.split('{' + k + '}').join(String(vars[k]));
  return s;
}

export function applyLang(lang) {
  document.documentElement.lang = lang;
  document.querySelectorAll('[data-i18n]').forEach((el) => {
    el.textContent = t(el.dataset.i18n);
  });
  document.querySelectorAll('[data-i18n-placeholder]').forEach((el) => {
    el.placeholder = t(el.dataset.i18nPlaceholder);
  });
  const titleEl = document.querySelector('title');
  if (titleEl) {
    if (!titleEl.dataset.ko) titleEl.dataset.ko = titleEl.textContent;
    if (lang === 'en' && titleEl.dataset.en) document.title = titleEl.dataset.en;
    else document.title = titleEl.dataset.ko;
  }
  const desc = document.querySelector('meta[name="description"]');
  if (desc) {
    if (!desc.dataset.ko) desc.dataset.ko = desc.content;
    if (lang === 'en' && desc.dataset.en) desc.content = desc.dataset.en;
    else desc.content = desc.dataset.ko;
  }
  document.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

// 짧은 인라인 다국어 선택
export const L = (ko, en) => (document.documentElement.lang === 'en' ? en : ko);
