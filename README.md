# FreePDF — freepdfservice.com

설치·가입 없이 쓰는 **무료 온라인 PDF 도구 사이트**입니다. iLovePDF 류 서비스와 달리 **파일을 서버로 올리지 않고 100% 브라우저 안에서 처리**하므로 서버 비용이 0원이고, 정적 호스팅(GitHub Pages / Cloudflare Pages / Vercel 등)에 그대로 올리면 됩니다. 광고(Google AdSense, 쿠팡 파트너스)는 설정 파일 한 곳만 바꾸면 켜집니다.

## 기능

| 도구 | 경로 | 설명 |
|---|---|---|
| PDF 합치기 | `/merge-pdf/` | 여러 PDF를 드래그로 순서 지정 후 하나로 병합 |
| PDF 분할 | `/split-pdf/` | 페이지 범위 추출, 범위별/N페이지/개별 분할(ZIP) |
| PDF 압축 | `/compress-pdf/` | 기본(구조 최적화, 텍스트 유지) / 강력(이미지 변환) |
| PDF 회전 | `/rotate-pdf/` | 썸네일 보며 페이지별 또는 전체 회전 |
| 페이지 정리 | `/organize-pdf/` | 드래그 순서 변경, 삭제, 회전 |
| PDF → JPG | `/pdf-to-jpg/` | JPG/PNG, 72/150/300 DPI, 다중 페이지는 ZIP |
| JPG → PDF | `/jpg-to-pdf/` | 이미지 여러 장 → PDF, 용지/방향/여백 |
| 워터마크 | `/watermark-pdf/` | 텍스트 워터마크(한글 지원), 가운데/바둑판 |
| 페이지 번호 | `/page-numbers/` | 위치/형식/시작번호/범위, 회전 페이지 대응 |

그 외: 한국어/영어 전환, 다크 모드, 모바일 대응, SEO(메타/OG/JSON-LD/sitemap), 개인정보처리방침·이용약관·소개 페이지(애드센스 승인에 필요).

## 로컬에서 실행

빌드 과정이 없는 순수 정적 사이트입니다. ES 모듈을 쓰므로 `file://` 로 열면 안 되고 로컬 서버가 필요합니다.

```bash
npm run dev      # http://localhost:8080 자동 오픈 (Node.js 필요)
# 또는
python3 -m http.server 8080
```

localhost 에서는 광고 자리에 점선 박스(placeholder)가 표시됩니다.

## 배포

### 방법 A. GitHub Pages (무료, 권장)

1. 이 저장소의 `main` 브랜치에 push 합니다.
2. GitHub 저장소 **Settings → Pages → Build and deployment → Source** 를 **GitHub Actions** 로 선택합니다. `.github/workflows/deploy.yml` 이 자동으로 배포합니다.
3. **Settings → Pages → Custom domain** 에 `www.freepdfservice.com` 을 입력하고 **Enforce HTTPS** 를 켭니다. (저장소의 `CNAME` 파일이 이 값을 유지합니다.)
4. 도메인 구입처 DNS 에 다음 레코드를 추가합니다.

| 타입 | 이름 | 값 |
|---|---|---|
| CNAME | `www` | `<GitHub아이디>.github.io` |
| A | `@` | `185.199.108.153` |
| A | `@` | `185.199.109.153` |
| A | `@` | `185.199.110.153` |
| A | `@` | `185.199.111.153` |

DNS 반영 후(최대 24시간) `https://www.freepdfservice.com` 으로 접속되며, `freepdfservice.com` 은 자동으로 `www` 로 리다이렉트됩니다.

### 방법 B. Cloudflare Pages / Netlify / Vercel

저장소를 연결하고 **빌드 명령 없음, 출력 디렉터리 `/`** 로 설정하면 됩니다. 도메인은 각 서비스의 안내대로 연결하세요.

## 광고 켜기 (수익화)

`assets/js/config.js` 만 수정하면 됩니다.

### Google AdSense

1. [AdSense](https://www.google.com/adsense) 가입 → 사이트 추가 → 승인 대기 (보통 1~2주, 개인정보처리방침·소개 페이지가 이미 포함되어 있습니다).
2. 승인 후 광고 단위를 만들고 `config.js` 에 입력:

```js
adsense: {
  enabled: true,
  client: 'ca-pub-1234567890123456',
  slots: { sidebar: '1111111111', bottom: '2222222222', home: '3333333333' },
},
```

슬롯 ID 를 비워두면 자동 광고 형식으로 표시됩니다. 애드센스 사이트 확인용 `<meta>` 태그나 `ads.txt` 가 필요하면 안내에 따라 각각 HTML `<head>` 와 저장소 루트에 추가하세요.

### 쿠팡 파트너스

1. [쿠팡 파트너스](https://partners.coupang.com) 가입 → **링크 생성 → 다이나믹 배너** 에서 배너 생성.
2. 생성된 코드의 `id` 와 `trackingCode`(AF로 시작) 를 `config.js` 에 입력:

```js
coupang: {
  enabled: true,
  trackingCode: 'AF1234567',
  banners: {
    sidebar: { id: 123456, template: 'carousel', width: 300, height: 250 },
    bottom:  { id: 123457, template: 'carousel', width: 680, height: 140 },
    home:    { id: 123458, template: 'carousel', width: 680, height: 140 },
  },
},
```

쿠팡 파트너스 규정에 따른 고지 문구("이 사이트는 쿠팡 파트너스 활동의 일환으로…")는 `enabled: true` 일 때 푸터에 자동으로 표시됩니다.

### 위치별 광고 종류

`AD_PLACEMENT` 로 위치마다 어떤 광고를 쓸지 정합니다 (`sidebar`: 도구 페이지 오른쪽, `bottom`: 작업 영역 아래, `home`: 홈 도구 목록 아래). 지정한 광고가 꺼져 있으면 켜져 있는 다른 광고로 자동 대체됩니다.

## 구조

```
index.html              홈
<tool>/index.html       도구 페이지 (SEO 용 정적 본문 + FAQ)
about/ privacy/ terms/  소개 / 개인정보처리방침 / 이용약관
assets/css/style.css    스타일 (라이트/다크)
assets/js/config.js     사이트·광고 설정 ★
assets/js/app.js        헤더/푸터/광고/언어 전환
assets/js/tool.js       도구 공통 UI (업로드→옵션→실행→다운로드)
assets/js/tools/*.js    각 도구 로직
assets/js/i18n.js       한국어/영어 문자열
assets/vendor/          pdf-lib, pdf.js, JSZip, SortableJS, 나눔고딕 (라이선스: LICENSES.md)
sitemap.xml robots.txt  검색엔진용
```

## 새 도구 추가하기

1. `assets/js/tools/<이름>.js` 에서 `mountTool({...})` 호출 (기존 도구 참고).
2. 기존 도구 페이지 HTML 을 복사해 `<이름>/index.html` 생성, 마지막 `<script>` 를 새 모듈로 변경.
3. `assets/js/tools-list.js` 와 `sitemap.xml` 에 추가.

## 라이선스

사이트 코드는 저작권자(사이트 운영자)에게 귀속됩니다. 포함된 오픈소스 라이브러리와 폰트의 라이선스는 `assets/vendor/LICENSES.md` 를 참고하세요.
