/**
 * 범용 유틸리티 함수 모음
 */

/**
 * 함수 호출을 지정된 시간(ms) 동안 제한하는 스로틀 함수
 * @param func 스로틀링할 함수
 * @param delay 딜레이 시간(ms)
 * @returns 스로틀링된 함수
 */
export function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number = 100
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

/**
 * URL에서 경로 부분만 추출
 * @param url 전체 URL (https://example.com/path/to/file.jpg)
 * @returns 경로 부분 (path/to/file.jpg)
 */
export function extractPathFromUrl(url: string): string | null {
  try {
    // 스토리지 URL 형식: https://[project-ref].supabase.co/storage/v1/object/public/[bucket]/[file-path]
    const regex = /\/storage\/v1\/object\/public\/[^/]+\/(.+)$/;
    const match = url.match(regex);
    return match ? match[1] : null;
  } catch (error) {
    console.error('URL 경로 추출 오류:', error);
    return null;
  }
} 