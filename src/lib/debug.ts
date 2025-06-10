/**
 * 개발 환경에서 디버깅을 위한 유틸리티 함수들
 */

/**
 * 현재 페이지의 스크롤 상태를 분석하여 콘솔에 출력
 */
export function analyzeScrollState(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    console.log('❌ Window or document is undefined');
    return;
  }

  console.group('🔍 스크롤 상태 분석');
  
  // Body 스타일 확인
  const bodyStyles = window.getComputedStyle(document.body);
  console.log('📋 Body Styles:', {
    overflow: bodyStyles.overflow,
    overflowY: bodyStyles.overflowY,
    position: bodyStyles.position,
    top: bodyStyles.top,
    height: bodyStyles.height,
    width: bodyStyles.width
  });

  // HTML 스타일 확인
  const htmlStyles = window.getComputedStyle(document.documentElement);
  console.log('📋 HTML Styles:', {
    overflow: htmlStyles.overflow,
    overflowY: htmlStyles.overflowY,
    height: htmlStyles.height
  });

  // 스크롤 정보
  console.log('📏 스크롤 정보:', {
    scrollY: window.scrollY,
    scrollX: window.scrollX,
    innerHeight: window.innerHeight,
    documentHeight: document.documentElement.scrollHeight,
    bodyHeight: document.body.scrollHeight,
    clientHeight: document.documentElement.clientHeight
  });

  // 스크롤 가능 여부 확인
  const canScroll = document.documentElement.scrollHeight > window.innerHeight;
  console.log(`📊 스크롤 가능 여부: ${canScroll ? '✅ 가능' : '❌ 불가능'}`);

  // Fixed 요소들 확인
  const fixedElements = Array.from(document.querySelectorAll('*')).filter(el => {
    const style = window.getComputedStyle(el);
    return style.position === 'fixed';
  });
  console.log('📌 Fixed 요소들:', fixedElements);

  console.groupEnd();
}

/**
 * 스크롤을 강제로 복원하는 함수 (개발자 도구에서 직접 호출 가능)
 */
export function forceRestoreScroll(): void {
  if (typeof document === 'undefined') return;
  
  console.log('🔧 스크롤 강제 복원 중...');
  
  // Body 스타일 초기화
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  document.body.style.height = '';
  
  // HTML 스타일 초기화
  document.documentElement.style.overflow = '';
  document.documentElement.style.height = '';
  
  console.log('✅ 스크롤 복원 완료');
  analyzeScrollState();
}

/**
 * 개발 환경에서만 전역 객체에 디버깅 함수들을 추가
 */
export function attachDebugUtils(): void {
  if (typeof window === 'undefined' || process.env.NODE_ENV === 'production') return;
  
  (window as any).debugScroll = {
    analyze: analyzeScrollState,
    restore: forceRestoreScroll,
    info: () => {
      console.log(`
🛠️ 스크롤 디버깅 도구 사용법:
- debugScroll.analyze() : 현재 스크롤 상태 분석
- debugScroll.restore() : 스크롤 강제 복원
- debugScroll.info() : 이 도움말 표시
      `);
    }
  };
  
  console.log('🛠️ 스크롤 디버깅 도구가 window.debugScroll에 추가되었습니다.');
} 