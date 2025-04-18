'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type TransitionContextType = {
  isTransitioning: boolean;
  fromPath: string | null;
  toPath: string | null;
  handleNavigate: (path: string) => boolean;
};

const TransitionContext = createContext<TransitionContextType>({
  isTransitioning: false,
  fromPath: null,
  toPath: null,
  handleNavigate: () => false,
});

export const useTransition = () => useContext(TransitionContext);

export const TransitionProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isTransitioning, setIsTransitioning] = useState(false);
  const [fromPath, setFromPath] = useState<string | null>(null);
  const [toPath, setToPath] = useState<string | null>(null);
  const pathname = usePathname();
  const router = useRouter();

  // 페이지 이동을 인터셉트하는 함수
  const handleNavigate = (path: string) => {
    // 홈페이지에서 products 페이지로 이동할 때만 트랜지션 활성화
    const shouldTransition = pathname === '/' && path === '/products';
    
    if (shouldTransition) {
      setFromPath(pathname);
      setToPath(path);
      setIsTransitioning(true);
      
      // 애니메이션 시작 직후에 실제 라우팅 발생
      // 즉시 검은색 배경이 화면을 가리고, 잠시 후 페이지 전환이 발생하도록 함
      setTimeout(() => {
        router.push(path);
        
        // 트랜지션 애니메이션이 완료된 후 상태 초기화
        // 위로 올라가는 애니메이션이 완료된 후에 상태 초기화
        setTimeout(() => {
          setIsTransitioning(false);
          setFromPath(null);
          setToPath(null);
        }, 1200); // 위로 올라가는 애니메이션 완료 후 정리 (전체 애니메이션 시간에 맞춤)
      }, 200); // 검은 배경이 화면을 가린 직후에 페이지 전환
      
      return true;
    }
    
    return false;
  };

  // Next.js router를 오버라이드
  useEffect(() => {
    // a 태그 클릭 이벤트 처리
    const handleClick = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      const anchor = target.closest('a');
      
      if (anchor && anchor.href && anchor.href.startsWith(window.location.origin)) {
        const path = anchor.href.replace(window.location.origin, '');
        
        // 특정 경로만 트랜지션 적용
        if (pathname === '/' && path === '/products') {
          e.preventDefault();
          handleNavigate('/products');
        }
      }
    };
    
    window.addEventListener('click', handleClick);
    
    return () => {
      window.removeEventListener('click', handleClick);
    };
  }, [pathname, router]);

  return (
    <TransitionContext.Provider value={{ isTransitioning, fromPath, toPath, handleNavigate }}>
      {children}
    </TransitionContext.Provider>
  );
}; 