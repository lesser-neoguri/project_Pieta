/**
 * 환경에 따라 로깅을 처리하는 유틸리티
 * 
 * - 개발 환경: 모든 로그 출력
 * - 프로덕션 환경: 에러 로그만 출력 (필요에 따라 조정 가능)
 */

const isDevelopment = process.env.NODE_ENV === 'development';

// 코드에서 사용할 로거 객체
const logger = {
  /**
   * 개발 환경에서만 정보 로그 출력
   */
  log: (...args: any[]): void => {
    if (isDevelopment) {
      console.log(...args);
    }
  },

  /**
   * 개발 환경에서만 경고 로그 출력
   */
  warn: (...args: any[]): void => {
    if (isDevelopment) {
      console.warn(...args);
    }
  },

  /**
   * 모든 환경에서 에러 로그 출력
   * 프로덕션에서는 민감한 정보가 포함되지 않도록 주의
   */
  error: (...args: any[]): void => {
    console.error(...args);
  },

  /**
   * 개발 환경에서만 정보 로그 출력 (log의 별칭)
   */
  info: (...args: any[]): void => {
    if (isDevelopment) {
      console.info(...args);
    }
  },

  /**
   * 개발 환경에서만 디버그 로그 출력
   */
  debug: (...args: any[]): void => {
    if (isDevelopment) {
      console.debug(...args);
    }
  },

  /**
   * 개발 환경에서만 객체를 테이블 형태로 출력
   */
  table: (tabularData: any, properties?: ReadonlyArray<string>): void => {
    if (isDevelopment) {
      console.table(tabularData, properties);
    }
  },

  /**
   * 로거를 확장해 컴포넌트/기능별 네임스페이스 생성
   */
  createNamespace: (namespace: string) => ({
    log: (...args: any[]): void => {
      if (isDevelopment) {
        console.log(`[${namespace}]`, ...args);
      }
    },
    warn: (...args: any[]): void => {
      if (isDevelopment) {
        console.warn(`[${namespace}]`, ...args);
      }
    },
    error: (...args: any[]): void => {
      console.error(`[${namespace}]`, ...args);
    },
    info: (...args: any[]): void => {
      if (isDevelopment) {
        console.info(`[${namespace}]`, ...args);
      }
    },
    debug: (...args: any[]): void => {
      if (isDevelopment) {
        console.debug(`[${namespace}]`, ...args);
      }
    },
  }),
};

export default logger; 