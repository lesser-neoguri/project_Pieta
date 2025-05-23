'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';

// 애니메이션이 적용될 경로 패턴을 정의하는 인터페이스
interface RouteTransition {
  from: string | RegExp;
  to: string | RegExp;
  type: 'fade' | 'slide' | 'cover';
  duration: number;
}

// 기본 트랜지션 설정
const DEFAULT_TRANSITIONS: RouteTransition[] = [
  {
    from: '/',
    to: '/products',
    type: 'cover',
    duration: 1200,
  },
  // 추가 트랜지션을 여기에 정의할 수 있음
];

type TransitionState = 'idle' | 'start' | 'change' | 'end';

type TransitionContextType = {
  isTransitioning: boolean;
  fromPath: string | null;
  toPath: string | null;
  transitionState: TransitionState;
  transitionType: string;
  transitionDuration: number;
  handleNavigate: (path: string) => boolean;
  addRouteTransition: (transition: RouteTransition) => void;
};

const TransitionContext = createContext<TransitionContextType>({
  isTransitioning: false,
  fromPath: null,
  toPath: null,
  transitionState: 'idle',
  transitionType: 'cover',
  transitionDuration: 1200,
  handleNavigate: () => false,
  addRouteTransition: () => {},
});

export const useTransition = () => useContext(TransitionContext);

export const TransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fromPath, setFromPath] = useState<string | null>(null);
  const [toPath, setToPath] = useState<string | null>(null);
  const [transitionState, setTransitionState] = useState<TransitionState>('idle');
  const [transitionType, setTransitionType] = useState<string>('cover');
  const [transitionDuration, setTransitionDuration] = useState(1200);
  const [routeTransitions, setRouteTransitions] = useState<RouteTransition[]>(DEFAULT_TRANSITIONS);
  
  const pathname = usePathname();
  const router = useRouter();

  // 경로에 맞는 트랜지션 설정 찾기
  const findTransitionForRoute = useCallback((fromPath: string, toPath: string) => {
    return routeTransitions.find(transition => {
      const fromMatch = transition.from instanceof RegExp 
        ? transition.from.test(fromPath) 
        : transition.from === fromPath;
      
      const toMatch = transition.to instanceof RegExp
        ? transition.to.test(toPath)
        : transition.to === toPath;
        
      return fromMatch && toMatch;
    });
  }, [routeTransitions]);

  // 페이지 이동을 인터셉트하는 함수
  const handleNavigate = useCallback((path: string) => {
    const transition = findTransitionForRoute(pathname, path);
    
    // 적용할 트랜지션이 있으면 애니메이션 실행
    if (transition) {
      setFromPath(pathname);
      setToPath(path);
      setIsTransitioning(true);
      setTransitionType(transition.type);
      setTransitionDuration(transition.duration);
      setTransitionState('start');
      
      // 애니메이션 시작 단계 실행 후 페이지 변경 단계로 진행
      const changeTimeout = setTimeout(() => {
        router.push(path);
        setTransitionState('change');
      }, transition.duration / 3);
      
      return true;
    }
    
    // 트랜지션이 없으면 일반 네비게이션
    return false;
  }, [pathname, router, findTransitionForRoute]);

  // 트랜지션 상태 변경 감지 및 처리
  useEffect(() => {
    if (transitionState === 'change') {
      // 페이지 변경 후 애니메이션 종료 단계로 진행
      const endTimeout = setTimeout(() => {
        setTransitionState('end');
      }, transitionDuration / 3);
      
      return () => clearTimeout(endTimeout);
    } 
    else if (transitionState === 'end') {
      // 모든 애니메이션 완료 후 상태 초기화
      const resetTimeout = setTimeout(() => {
        setIsTransitioning(false);
        setFromPath(null);
        setToPath(null);
        setTransitionState('idle');
      }, transitionDuration / 3);
      
      return () => clearTimeout(resetTimeout);
    }
  }, [transitionState, transitionDuration]);

  // 새 트랜지션 추가 함수
  const addRouteTransition = useCallback((transition: RouteTransition) => {
    setRouteTransitions(prev => [...prev, transition]);
  }, []);

  // a 태그 클릭 이벤트 처리
  useEffect(() => {
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        const path = anchor.href.replace(window.location.origin, '');
        
        // 특정 경로에 트랜지션 적용
        const transition = findTransitionForRoute(pathname, path);
        if (transition) {
          e.preventDefault();
          handleNavigate(path);
        }
      }
    };
    
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [pathname, handleNavigate, findTransitionForRoute]);

  return (
    <TransitionContext.Provider 
      value={{ 
        isTransitioning, 
        fromPath, 
        toPath, 
        transitionState,
        transitionType,
        transitionDuration,
        handleNavigate,
        addRouteTransition
      }}
    >
      {children}
    </TransitionContext.Provider>
  );
}; 