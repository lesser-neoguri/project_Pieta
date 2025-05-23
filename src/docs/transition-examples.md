# 페이지 트랜지션 가이드

PIETA에서는 페이지 간 자연스러운 전환을 위한 커스텀 트랜지션 시스템을 제공합니다. 이 문서는 트랜지션 시스템을 활용하는 방법에 대한 가이드입니다.

## 기본 사용법

### 1. 기본 트랜지션 사용하기

기본적으로 설정된 트랜지션은 메인 페이지(`/`)에서 제품 목록 페이지(`/products`)로 이동할 때 적용됩니다. 이 트랜지션을 사용하려면 다음과 같이 `useTransition` 훅을 사용하세요:

```jsx
import { useTransition } from '@/contexts/TransitionContext';

export default function MyComponent() {
  const { handleNavigate } = useTransition();
  
  const handleClick = (e) => {
    e.preventDefault();
    handleNavigate('/products');
  };
  
  return (
    <a href="/products" onClick={handleClick}>
      제품 보기
    </a>
  );
}
```

### 2. 커스텀 트랜지션 추가하기

특정 페이지 간 이동에 다른 트랜지션을 추가하려면 `addRouteTransition` 함수를 사용하세요:

```jsx
import { useEffect } from 'react';
import { useTransition } from '@/contexts/TransitionContext';

export default function MyApp() {
  const { addRouteTransition } = useTransition();
  
  useEffect(() => {
    // 제품 상세 페이지 진입/이탈 트랜지션 추가
    addRouteTransition({
      from: /^\/products$/,  // 제품 목록 페이지
      to: /^\/store\/.*\/product\/.*$/,  // 제품 상세 페이지
      type: 'slide',  // 슬라이드 애니메이션
      duration: 800,  // 총 애니메이션 시간 (밀리초)
    });
    
    // 장바구니 페이지 페이드 트랜지션
    addRouteTransition({
      from: /^.*$/,  // 모든 페이지에서
      to: '/cart',  // 장바구니 페이지로
      type: 'fade',  // 페이드 애니메이션
      duration: 600,
    });
  }, [addRouteTransition]);
  
  return <>{/* ... */}</>;
}
```

이 코드는 일반적으로 `_app.js` 또는 레이아웃 컴포넌트에서 사용하는 것이 좋습니다.

## 트랜지션 타입

현재 시스템에서 지원하는 트랜지션 타입:

1. `cover` - 화면을 덮었다가 위로 올라가는 애니메이션 (기본값)
2. `slide` - 오른쪽에서 왼쪽으로 슬라이드하는 애니메이션
3. `fade` - 페이드 인/아웃 애니메이션

## 정규표현식 패턴 활용

트랜지션 경로는 문자열 또는 정규표현식으로 지정할 수 있습니다:

```js
// 특정 경로에만 적용
addRouteTransition({
  from: '/login',
  to: '/',
  type: 'fade',
  duration: 600
});

// 카테고리 페이지에서 제품 페이지로 이동 시 적용
addRouteTransition({
  from: /^\/category\/.*$/,
  to: /^\/products\/.*$/,
  type: 'slide',
  duration: 800
});
```

## 트랜지션 커스터마이징

추가적인 트랜지션 효과가 필요한 경우, `PageTransition` 컴포넌트를 수정하여 새로운 효과를 추가할 수 있습니다. 이 경우:

1. `src/contexts/TransitionContext.tsx`에 새 트랜지션 타입 추가
2. `src/components/PageTransition.tsx`에 해당 효과 구현
3. 필요한 곳에서 새 트랜지션 타입 사용

## 주의사항

- 트랜지션 지속 시간이 너무 길면 사용자 경험에 부정적인 영향을 줄 수 있습니다. 일반적으로 1200ms 이하를 권장합니다.
- 모바일 환경에서는 더 빠른 트랜지션(600-800ms)이 권장됩니다.
- 페이지에 큰 이미지나 무거운 컨텐츠가 있는 경우, 트랜지션 효과가 부드럽지 않을 수 있습니다. 