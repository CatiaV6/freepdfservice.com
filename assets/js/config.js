// ===================================================================
//  사이트 / 광고 설정  (여기만 수정하면 광고가 켜집니다)
// ===================================================================

export const SITE = {
  name: 'FreePDF',
  domain: 'https://www.freepdfservice.com',
  contactEmail: 'contact@freepdfservice.com',
};

export const ADS = {
  // 개발 중(localhost)에는 광고 자리 표시용 점선 박스를 보여줍니다.
  showPlaceholdersOnLocalhost: true,

  // ---- Google AdSense ----
  // 1) https://www.google.com/adsense 에서 사이트 승인
  // 2) client 에 "ca-pub-XXXXXXXXXXXXXXXX" 입력, enabled: true
  // 3) 광고 단위(슬롯) ID를 각 위치에 입력 (비워두면 자동 광고 형식으로 표시)
  adsense: {
    enabled: false,
    client: 'ca-pub-0000000000000000',
    slots: {
      sidebar: '',   // 도구 페이지 오른쪽 (300x600 또는 반응형)
      bottom: '',    // 도구 작업 영역 아래 (가로 배너)
      home: '',      // 홈 화면 도구 목록 아래
    },
  },

  // ---- 쿠팡 파트너스 (다이나믹 배너) ----
  // 1) https://partners.coupang.com 가입 → 링크 생성 → "다이나믹 배너" 선택
  // 2) 생성된 코드의 id / trackingCode(AF로 시작) 를 아래에 입력, enabled: true
  // 3) 쿠팡 파트너스 규정상 배너가 있는 페이지에는 고지 문구가 필요합니다 (푸터에 자동 표시됨)
  coupang: {
    enabled: false,
    trackingCode: 'AF0000000',
    banners: {
      sidebar: { id: 0, template: 'carousel', width: 300, height: 250 },
      bottom:  { id: 0, template: 'carousel', width: 680, height: 140 },
      home:    { id: 0, template: 'carousel', width: 680, height: 140 },
    },
  },
};

// 광고 위치별로 어떤 광고를 보여줄지. 'adsense' | 'coupang'
// (해당 광고가 enabled: false 이면 자동으로 켜져 있는 다른 광고로 대체됩니다)
export const AD_PLACEMENT = {
  sidebar: 'adsense',
  bottom: 'coupang',
  home: 'coupang',
};
