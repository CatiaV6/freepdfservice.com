# freepdfservice.com — 작업 메모

브라우저에서만 동작하는 무료 PDF 도구 사이트 (서버 없음, 정적 호스팅). 자세한 구조와 배포/광고 설정은 README.md 참고.

## 핵심 규칙
- 빌드 과정 없음. HTML/CSS/JS 파일을 직접 수정한다. `npm run dev` 로 로컬 확인 (ES 모듈이라 file:// 로 열면 안 됨).
- 외부 CDN 쓰지 않는다. 라이브러리는 `assets/vendor/` 에 포함 (라이선스: `assets/vendor/LICENSES.md`).
- PDF 처리 로직은 `assets/js/ops.js` 한 곳에. 도구 페이지(`assets/js/tools/*.js`)와 통합 편집기(`assets/js/editor.js`)가 공용으로 쓴다.
- 한글 텍스트 폰트는 `subset: false` 로 임베드한다 (pdf-lib 서브셋이 나눔고딕 글리프를 누락시킴). `lib.js`의 `embedTextFont` 참고.
- 다국어: 짧은 UI 문자열은 `i18n.js`, 긴 본문은 HTML `data-lang="ko|en"` 블록.
- 광고는 `assets/js/config.js` 만 수정. 쿠팡 파트너스 켜져 있음. 애드센스는 승인 후 입력.
- 광고/고지 문구, 개인정보처리방침은 법적 문구이므로 임의로 줄이지 않는다.

## 페이지 추가/수정
- 도구 페이지들은 같은 틀을 공유한다. 새 도구는 기존 페이지 HTML 복사 → 마지막 `<script>` 를 새 모듈로, `tools-list.js` 와 `sitemap.xml` 에 추가.
- 홈/도구/정보 페이지는 원래 생성 스크립트로 만들었지만 저장소에는 결과 HTML만 있다. 직접 편집하면 된다.

## 배포
- 기본 브랜치 `main`. push 하면 `.github/workflows/deploy.yml` 이 GitHub Pages 로 배포. 도메인 www.freepdfservice.com (CNAME 파일).

## 테스트
- 자동 테스트는 저장소에 없다. 변경 후에는 로컬 서버를 띄워 Chromium(Playwright)으로 각 도구에 샘플 PDF를 올려 결과 파일을 확인하는 식으로 검증했다. 최소한 합치기·분할·워터마크(한글)·편집기 다운로드는 손으로 확인할 것.
