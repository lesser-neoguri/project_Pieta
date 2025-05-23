# 로깅 가이드라인

## 소개

이 프로젝트는 환경에 따라 다르게 동작하는 로깅 시스템을 사용합니다. 이 가이드라인은 코드에서 로깅을 사용하는 방법을 설명합니다.

## 로거 유틸리티 사용하기

직접 `console.log()`, `console.error()` 등을 사용하는 대신 항상 `@/lib/logger` 유틸리티를 사용하세요:

```typescript
import logger from '@/lib/logger';

// 개발 환경에서만 출력됨
logger.log('일반 로그 메시지');
logger.debug('디버깅 정보');
logger.info('정보성 메시지');
logger.warn('경고 메시지');

// 모든 환경에서 출력됨
logger.error('오류 메시지', errorObject);
```

## 환경별 동작

- **개발 환경**: 모든 로그 메시지가 출력됩니다.
- **프로덕션 환경**: `logger.error()`로 기록된 오류 메시지만 출력됩니다.

## 네임스페이스 로깅

복잡한 컴포넌트나 기능별로 로그를 그룹화하려면 네임스페이스를 생성하세요:

```typescript
const productLogger = logger.createNamespace('Product');

productLogger.log('제품 정보 로드 중...');
productLogger.error('제품 저장 오류:', error);
```

이렇게 하면 로그 메시지에 `[Product]`와 같은 접두사가 추가되어 로그 출처를 쉽게 식별할 수 있습니다.

## 로깅 모범 사례

1. **민감한 정보 제외**: 사용자 인증 정보, 토큰, 비밀번호 등의 민감한 정보를 로그에 포함하지 마세요.

2. **구조화된 정보**: 객체나 배열을 로깅할 때는 전체 데이터가 아닌 필요한 속성만 선택하세요.
   ```typescript
   // 좋음
   logger.debug('사용자 정보:', { id: user.id, name: user.name });
   
   // 피해야 함
   logger.debug('전체 사용자 데이터:', user); // 민감한 정보 포함 가능성
   ```

3. **의미 있는 메시지**: 로그 메시지는 구체적이고 맥락이 명확해야 합니다.
   ```typescript
   // 피해야 함
   logger.error('오류 발생');
   
   // 좋음
   logger.error('상품 ID 123 불러오기 실패:', error);
   ```

4. **적절한 로그 레벨 사용**:
   - `debug`: 개발 과정에서만 필요한 상세 정보
   - `info`: 일반적인 정보성 메시지
   - `warn`: 잠재적 문제지만 즉각적인 조치는 필요 없음
   - `error`: 예외, 오류, 실패 등 중요 문제

## 프로덕션 준비

배포 전에 모든 `console.*` 호출이 `logger.*`로 대체되었는지 확인하세요. 다음 명령어로 남아있는 직접 콘솔 호출을 검색할 수 있습니다:

```bash
grep -r "console\." --include="*.tsx" --include="*.ts" src/
```

---

이 가이드라인에 따라 로깅을 구현하면 개발 시에는 풍부한 디버깅 정보를 제공하면서, 프로덕션 환경에서는 불필요한 로그 출력을 방지할 수 있습니다. 