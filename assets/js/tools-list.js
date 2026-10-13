// 홈 그리드 / 푸터 / "다른 도구" 영역에서 공통으로 쓰는 도구 목록
export const TOOLS = [
  { slug: 'editor', key: 'tool.editor', color: '#2563eb', featured: true,
    ko: '파일 한 번 올리고 순서 변경·삭제·회전·워터마크·페이지 번호·압축·파일 추가까지 한 화면에서 이어서 작업하고 한 번에 다운로드.', en: 'Upload once, then reorder, delete, rotate, watermark, number, compress and merge in one screen. Download when you are done.',
    icon: '<path d="M4 4h16v16H4z" stroke-width="2"/><path d="M4 10h16M10 10v10" stroke-width="2"/><path d="M14 14l2 2 3-3" stroke-width="2"/>' },
  { slug: 'merge-pdf', key: 'tool.merge', color: '#ef4444',
    ko: '여러 PDF 파일을 하나로 합칩니다. 드래그로 순서 변경.', en: 'Combine multiple PDFs into one, in the order you want.',
    icon: '<path d="M4 6h7v12H4zM13 6h7v12h-7z" stroke-width="2"/><path d="M11 12h2" stroke-width="2"/>' },
  { slug: 'split-pdf', key: 'tool.split', color: '#f97316',
    ko: '페이지 범위를 추출하거나 여러 파일로 나눕니다.', en: 'Extract page ranges or split into separate files.',
    icon: '<path d="M4 5h16v14H4z" stroke-width="2"/><path d="M12 3v18" stroke-width="2" stroke-dasharray="3 3"/>' },
  { slug: 'compress-pdf', key: 'tool.compress', color: '#22c55e',
    ko: '파일 용량을 줄여 이메일/업로드에 맞춥니다.', en: 'Reduce file size for email and uploads.',
    icon: '<path d="M6 4h12v16H6z" stroke-width="2"/><path d="M12 8v8M9 13l3 3 3-3" stroke-width="2"/>' },
  { slug: 'rotate-pdf', key: 'tool.rotate', color: '#0ea5e9',
    ko: '전체 또는 원하는 페이지만 회전합니다.', en: 'Rotate all pages or just the ones you choose.',
    icon: '<path d="M20 12a8 8 0 1 1-3-6.2" stroke-width="2"/><path d="M20 4v5h-5" stroke-width="2"/>' },
  { slug: 'organize-pdf', key: 'tool.organize', color: '#8b5cf6',
    ko: '페이지 순서 변경, 삭제, 회전을 한 번에.', en: 'Reorder, delete and rotate pages visually.',
    icon: '<path d="M4 4h6v6H4zM14 4h6v6h-6zM4 14h6v6H4zM14 14h6v6h-6z" stroke-width="2"/>' },
  { slug: 'pdf-to-jpg', key: 'tool.pdf2jpg', color: '#eab308',
    ko: 'PDF의 각 페이지를 JPG/PNG 이미지로 저장합니다.', en: 'Save every PDF page as a JPG or PNG image.',
    icon: '<path d="M4 5h16v14H4z" stroke-width="2"/><path d="M4 16l5-5 4 4 3-3 4 4" stroke-width="2"/><circle cx="16" cy="9" r="1.5"/>' },
  { slug: 'jpg-to-pdf', key: 'tool.jpg2pdf', color: '#14b8a6',
    ko: '사진과 이미지를 한 개의 PDF로 만듭니다.', en: 'Turn photos and images into a single PDF.',
    icon: '<path d="M6 3h8l5 5v13H6z" stroke-width="2"/><path d="M14 3v5h5" stroke-width="2"/><path d="M8 17l3-3 2 2 3-3" stroke-width="2"/>' },
  { slug: 'watermark-pdf', key: 'tool.watermark', color: '#ec4899',
    ko: '텍스트 워터마크를 모든 페이지에 넣습니다.', en: 'Stamp a text watermark on every page.',
    icon: '<path d="M6 3h8l5 5v13H6z" stroke-width="2"/><path d="M8 15l8-6" stroke-width="2"/>' },
  { slug: 'page-numbers', key: 'tool.pagenum', color: '#64748b',
    ko: '원하는 위치와 형식으로 페이지 번호를 추가합니다.', en: 'Add page numbers in the position and format you like.',
    icon: '<path d="M6 3h8l5 5v13H6z" stroke-width="2"/><path d="M11 18h2M12 14v4" stroke-width="2"/>' },
];

export function toolIcon(tool, size = 28) {
  return `<svg class="tool-icon" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="${tool.color}" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${tool.icon}</svg>`;
}
