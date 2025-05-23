# 스크롤 이벤트 처리 가이드라인

## 개요

이 문서는 PIETA 프로젝트에서 스크롤 이벤트를 처리하는 표준 방법을 설명합니다. 여러 컴포넌트에서 중복된 스크롤 이벤트 로직을 사용하는 대신, 재사용 가능한 `useScroll` 커스텀 훅을 통해 일관된 방식으로 처리하도록 합니다.

## 유틸리티 및 훅

### 1. throttle 유틸리티 함수

스크롤 이벤트는 매우 빈번하게 발생하므로, 성능 최적화를 위해 throttle 함수를 사용합니다.

```ts
// src/lib/utils.ts
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
```

### 2. useScroll 커스텀 훅

모든 스크롤 이벤트 처리에는 `useScroll` 커스텀 훅을 사용하여 표준화된 방식으로 구현합니다.

```ts
// src/hooks/useScroll.ts
import { useState, useEffect, useCallback } from 'react';
import { throttle } from '@/lib/utils';

export function useScroll({
  throttleDelay = 100,
  detectDirection = false,
  threshold,
  onThresholdPass,
  onDirectionChange
} = {}) {
  // 구현 내용
  return {
    scrollY,
    direction,
    isOverThreshold
  };
}
```

## 사용 사례

### 1. 기본 스크롤 위치 감지

```tsx
import { useScroll } from '@/hooks/useScroll';

function MyComponent() {
  const { scrollY } = useScroll();
  
  return (
    <div style={{ opacity: Math.max(0, 1 - scrollY / 500) }}>
      스크롤하면 점점 투명해지는 요소
    </div>
  );
}
```

### 2. 스크롤 방향 감지

```tsx
function NavbarComponent() {
  const [isVisible, setIsVisible] = useState(true);
  
  const { direction } = useScroll({
    detectDirection: true,
    onDirectionChange: (newDirection) => {
      if (newDirection === 'down') {
        setIsVisible(false);
      } else if (newDirection === 'up') {
        setIsVisible(true);
      }
    }
  });
  
  return (
    <nav className={`fixed top-0 transition-transform ${isVisible ? 'translate-y-0' : '-translate-y-full'}`}>
      내비게이션 바
    </nav>
  );
}
```

### 3. 특정 스크롤 위치에서 동작 실행

```tsx
function HeaderComponent() {
  const [isCompact, setIsCompact] = useState(false);
  
  useScroll({
    threshold: 50,
    onThresholdPass: (exceeds) => {
      setIsCompact(exceeds);
    }
  });
  
  return (
    <header className={`fixed top-0 transition-all ${isCompact ? 'h-16' : 'h-24'}`}>
      헤더
    </header>
  );
}
```

## 주의사항

1. 직접 `addEventListener('scroll', ...)` 사용을 지양하고 `useScroll` 훅을 사용합니다.
2. 스크롤 이벤트가 필요한 곳에서는 항상 throttle 처리된 함수를 사용합니다.
3. 컴포넌트마다 독립적으로 이벤트를 등록하는 대신 공통 훅을 사용해 메모리 사용을 최적화합니다.

## 성능 최적화 팁

1. 스크롤 이벤트 핸들러 내에서 DOM 요소에 접근하거나 스타일을 변경할 때는 `requestAnimationFrame`을 사용합니다.
2. 스크롤 위치에 따라 요소를 표시/숨김 처리할 때는 CSS 트랜지션을 활용하여 부드러운 애니메이션을 구현합니다.
3. 특정 스크롤 위치를 임계값으로 사용할 때는 적절한 `threshold` 값을 설정합니다. 