/**
 * Chrome 로그인 문제 디버깅을 위한 유틸리티 함수들
 */

export interface BrowserInfo {
  name: string;
  version: string;
  isChrome: boolean;
  isEdge: boolean;
  isSafari: boolean;
  cookieEnabled: boolean;
  storageAvailable: {
    localStorage: boolean;
    sessionStorage: boolean;
    indexedDB: boolean;
  };
  thirdPartyCookiesEnabled: boolean;
}

export interface AuthDebugInfo {
  browserInfo: BrowserInfo;
  supabaseKeys: string[];
  cookieCount: number;
  sessionValid: boolean;
  timestamp: string;
}

/**
 * 브라우저 정보를 수집합니다
 */
export function getBrowserInfo(): BrowserInfo {
  if (typeof window === 'undefined') {
    return {
      name: 'Unknown',
      version: '0',
      isChrome: false,
      isEdge: false,
      isSafari: false,
      cookieEnabled: false,
      storageAvailable: {
        localStorage: false,
        sessionStorage: false,
        indexedDB: false,
      },
      thirdPartyCookiesEnabled: false,
    };
  }

  const userAgent = navigator.userAgent;
  
  // 브라우저 감지
  const isChrome = /Chrome/.test(userAgent) && /Google Inc/.test(navigator.vendor);
  const isEdge = /Edg/.test(userAgent);
  const isSafari = /Safari/.test(userAgent) && !/Chrome/.test(userAgent);
  
  // 버전 추출
  let version = '0';
  if (isChrome) {
    const match = userAgent.match(/Chrome\/(\d+)/);
    version = match ? match[1] : '0';
  } else if (isEdge) {
    const match = userAgent.match(/Edg\/(\d+)/);
    version = match ? match[1] : '0';
  } else if (isSafari) {
    const match = userAgent.match(/Version\/(\d+)/);
    version = match ? match[1] : '0';
  }

  // 저장소 가용성 확인
  const storageAvailable = {
    localStorage: checkStorageAvailability('localStorage'),
    sessionStorage: checkStorageAvailability('sessionStorage'),
    indexedDB: checkIndexedDBAvailability(),
  };

  // 서드파티 쿠키 지원 확인 (간접적)
  const thirdPartyCookiesEnabled = checkThirdPartyCookies();

  return {
    name: isChrome ? 'Chrome' : isEdge ? 'Edge' : isSafari ? 'Safari' : 'Other',
    version,
    isChrome,
    isEdge,
    isSafari,
    cookieEnabled: navigator.cookieEnabled,
    storageAvailable,
    thirdPartyCookiesEnabled,
  };
}

/**
 * 저장소 가용성을 확인합니다
 */
function checkStorageAvailability(type: 'localStorage' | 'sessionStorage'): boolean {
  try {
    const storage = window[type];
    const testKey = '__storage_test__';
    storage.setItem(testKey, 'test');
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
}

/**
 * IndexedDB 가용성을 확인합니다
 */
function checkIndexedDBAvailability(): boolean {
  try {
    return !!window.indexedDB;
  } catch {
    return false;
  }
}

/**
 * 서드파티 쿠키 지원을 간접적으로 확인합니다
 */
function checkThirdPartyCookies(): boolean {
  try {
    // Chrome의 경우 SameSite 정책으로 인해 서드파티 쿠키가 제한될 수 있음
    // 이는 간접적인 방법으로, 정확한 확인은 실제 요청을 통해서만 가능
    return document.cookie !== null;
  } catch {
    return false;
  }
}

/**
 * Supabase 관련 저장소 키들을 수집합니다
 */
export function getSupabaseStorageKeys(): string[] {
  if (typeof window === 'undefined') return [];

  const keys: string[] = [];
  
  // localStorage 확인
  try {
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && (
        key.startsWith('supabase.') ||
        key.startsWith('sb-') ||
        key.includes('auth') ||
        key.includes('session')
      )) {
        keys.push(`localStorage: ${key}`);
      }
    }
  } catch (error) {
    console.warn('localStorage 접근 실패:', error);
  }

  // sessionStorage 확인
  try {
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (
        key.startsWith('supabase.') ||
        key.startsWith('sb-') ||
        key.includes('auth') ||
        key.includes('session')
      )) {
        keys.push(`sessionStorage: ${key}`);
      }
    }
  } catch (error) {
    console.warn('sessionStorage 접근 실패:', error);
  }

  return keys;
}

/**
 * 쿠키 개수를 세어봅니다
 */
export function getCookieCount(): number {
  if (typeof document === 'undefined') return 0;
  
  try {
    return document.cookie.split(';').filter(cookie => cookie.trim().length > 0).length;
  } catch {
    return 0;
  }
}

/**
 * 인증 디버그 정보를 수집합니다
 */
export function collectAuthDebugInfo(sessionValid: boolean = false): AuthDebugInfo {
  return {
    browserInfo: getBrowserInfo(),
    supabaseKeys: getSupabaseStorageKeys(),
    cookieCount: getCookieCount(),
    sessionValid,
    timestamp: new Date().toISOString(),
  };
}

/**
 * 디버그 정보를 콘솔에 예쁘게 출력합니다
 */
export function logAuthDebugInfo(debugInfo: AuthDebugInfo): void {
  console.group('🔍 인증 디버그 정보');
  
  console.log('🌐 브라우저:', `${debugInfo.browserInfo.name} ${debugInfo.browserInfo.version}`);
  console.log('🍪 쿠키 지원:', debugInfo.browserInfo.cookieEnabled);
  console.log('🍪 쿠키 개수:', debugInfo.cookieCount);
  console.log('💾 저장소 지원:', debugInfo.browserInfo.storageAvailable);
  console.log('🔒 서드파티 쿠키:', debugInfo.browserInfo.thirdPartyCookiesEnabled);
  console.log('✅ 세션 유효:', debugInfo.sessionValid);
  console.log('📁 Supabase 키들:', debugInfo.supabaseKeys);
  console.log('⏰ 수집 시간:', debugInfo.timestamp);
  
  // Chrome 특화 경고
  if (debugInfo.browserInfo.isChrome) {
    console.warn('⚠️ Chrome 브라우저 감지됨. 다음 사항들을 확인해주세요:');
    console.warn('   - 쿠키 차단 설정 (chrome://settings/content/cookies)');
    console.warn('   - 시크릿 모드가 아닌지 확인');
    console.warn('   - 확장 프로그램으로 인한 간섭 확인');
    console.warn('   - SameSite 쿠키 정책 관련 이슈');
  }
  
  console.groupEnd();
}

/**
 * Chrome 특화 문제 해결 가이드를 출력합니다
 */
export function logChromeTroubleshootingGuide(): void {
  console.group('🛠 Chrome 로그인 문제 해결 가이드');
  
  console.log('1. 브라우저 캐시 및 쿠키 정리:');
  console.log('   - F12 → Application → Storage → Clear storage');
  console.log('   - 또는 chrome://settings/clearBrowserData');
  
  console.log('2. 쿠키 설정 확인:');
  console.log('   - chrome://settings/content/cookies');
  console.log('   - "모든 쿠키 허용" 또는 "서드파티 쿠키 차단 해제"');
  
  console.log('3. 확장 프로그램 비활성화:');
  console.log('   - chrome://extensions/');
  console.log('   - 모든 확장 프로그램 일시 비활성화 후 테스트');
  
  console.log('4. 시크릿 모드에서 테스트:');
  console.log('   - Ctrl+Shift+N으로 시크릿 창 열기');
  console.log('   - 확장 프로그램 없는 깨끗한 환경에서 테스트');
  
  console.log('5. 개발자 도구 확인:');
  console.log('   - Network 탭에서 요청 실패 여부 확인');
  console.log('   - Console 탭에서 에러 메시지 확인');
  
  console.groupEnd();
}

/**
 * 인증 문제 자동 진단을 실행합니다
 */
export function runAuthDiagnostics(): { issues: string[]; recommendations: string[] } {
  const debugInfo = collectAuthDebugInfo();
  const issues: string[] = [];
  const recommendations: string[] = [];

  // 쿠키 관련 이슈 확인
  if (!debugInfo.browserInfo.cookieEnabled) {
    issues.push('쿠키가 비활성화되어 있습니다');
    recommendations.push('브라우저에서 쿠키를 활성화해주세요');
  }

  // 저장소 관련 이슈 확인
  if (!debugInfo.browserInfo.storageAvailable.localStorage) {
    issues.push('로컬 스토리지에 접근할 수 없습니다');
    recommendations.push('브라우저 설정에서 로컬 스토리지를 허용해주세요');
  }

  if (!debugInfo.browserInfo.storageAvailable.sessionStorage) {
    issues.push('세션 스토리지에 접근할 수 없습니다');
    recommendations.push('브라우저 설정에서 세션 스토리지를 허용해주세요');
  }

  // Chrome 특화 이슈 확인
  if (debugInfo.browserInfo.isChrome) {
    if (!debugInfo.browserInfo.thirdPartyCookiesEnabled) {
      issues.push('서드파티 쿠키가 차단되어 있을 수 있습니다');
      recommendations.push('Chrome 설정에서 서드파티 쿠키를 허용하거나 localhost를 예외로 추가해주세요');
    }

    if (debugInfo.supabaseKeys.length === 0 && debugInfo.cookieCount === 0) {
      issues.push('인증 정보가 전혀 저장되지 않고 있습니다');
      recommendations.push('브라우저 캐시를 정리하고 시크릿 모드에서 테스트해보세요');
    }
  }

  // Supabase 키 과다 확인
  if (debugInfo.supabaseKeys.length > 10) {
    issues.push('Supabase 관련 저장소 키가 너무 많습니다');
    recommendations.push('저장소를 정리하고 다시 로그인해보세요');
  }

  return { issues, recommendations };
} 