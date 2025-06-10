/**
 * 스크롤 제어 유틸리티 함수들
 */

let scrollPosition = 0;

/**
 * 페이지 스크롤을 비활성화하고 현재 위치를 고정
 */
export function disablePageScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  scrollPosition = window.scrollY;
  document.body.style.overflow = 'hidden';
  document.body.style.position = 'fixed';
  document.body.style.top = `-${scrollPosition}px`;
  document.body.style.width = '100%';
}

/**
 * 페이지 스크롤을 다시 활성화하고 이전 위치로 복원
 */
export function enablePageScroll(): void {
  if (typeof window === 'undefined' || typeof document === 'undefined') return;
  
  document.body.style.overflow = '';
  document.body.style.position = '';
  document.body.style.top = '';
  document.body.style.width = '';
  window.scrollTo(0, scrollPosition);
}

/**
 * 현재 스크롤이 비활성화되어 있는지 확인
 */
export function isScrollDisabled(): boolean {
  if (typeof document === 'undefined') return false;
  return document.body.style.overflow === 'hidden';
}

/**
 * 안전한 스크롤 제어를 위한 클래스
 */
export class ScrollController {
  private static instance: ScrollController;
  private disableCount = 0;
  private originalScrollPosition = 0;

  static getInstance(): ScrollController {
    if (!ScrollController.instance) {
      ScrollController.instance = new ScrollController();
    }
    return ScrollController.instance;
  }

  /**
   * 스크롤 비활성화 (중첩 호출 지원)
   */
  disable(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    if (this.disableCount === 0) {
      this.originalScrollPosition = window.scrollY;
      document.body.style.overflow = 'hidden';
      document.body.style.position = 'fixed';
      document.body.style.top = `-${this.originalScrollPosition}px`;
      document.body.style.width = '100%';
    }
    this.disableCount++;
  }

  /**
   * 스크롤 활성화 (중첩 호출 지원)
   */
  enable(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    if (this.disableCount > 0) {
      this.disableCount--;
      if (this.disableCount === 0) {
        document.body.style.overflow = '';
        document.body.style.position = '';
        document.body.style.top = '';
        document.body.style.width = '';
        window.scrollTo(0, this.originalScrollPosition);
      }
    }
  }

  /**
   * 강제로 스크롤을 복원 (에러 상황 대응)
   */
  forceEnable(): void {
    if (typeof window === 'undefined' || typeof document === 'undefined') return;
    
    this.disableCount = 0;
    document.body.style.overflow = '';
    document.body.style.position = '';
    document.body.style.top = '';
    document.body.style.width = '';
  }

  /**
   * 현재 비활성화 상태인지 확인
   */
  isDisabled(): boolean {
    return this.disableCount > 0;
  }
} 