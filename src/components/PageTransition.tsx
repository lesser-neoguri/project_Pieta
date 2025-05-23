'use client';

import React from 'react';
import { useTransition } from '@/contexts/TransitionContext';

// 검은색 배경이 화면을 덮었다가 위로 올라가는 애니메이션을 위한 컴포넌트
const PageTransition: React.FC = () => {
  const { 
    isTransitioning, 
    transitionState, 
    transitionType, 
    transitionDuration 
  } = useTransition();

  // 트랜지션이 활성화되지 않았거나 완료되었을 때는 아무것도 렌더링하지 않음
  if (!isTransitioning) {
    return null;
  }

  // 트랜지션 시간 계산
  const baseDuration = transitionDuration / 3;
  const timing = `duration-${baseDuration}`;

  // 트랜지션 상태별 클래스 계산
  const getTransformClass = () => {
    switch (transitionType) {
      case 'slide':
        return transitionState === 'start' ? 'translate-x-0' 
          : transitionState === 'change' ? 'translate-x-full' 
          : '-translate-x-full';
      case 'fade':
        return transitionState === 'start' ? 'opacity-100' 
          : transitionState === 'change' ? 'opacity-100' 
          : 'opacity-0';
      case 'cover':
      default:
        return transitionState === 'start' ? 'translate-y-0' 
          : transitionState === 'end' ? '-translate-y-full' 
          : 'translate-y-0';
    }
  };

  // 배경색 계산
  const getBgColor = () => {
    switch (transitionType) {
      case 'fade':
        return 'bg-black/70';
      case 'slide':
      case 'cover':
      default:
        return 'bg-black';
    }
  };

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      <div
        className={`w-full h-full ${getBgColor()} transition-all ${timing} ease-in-out ${getTransformClass()}`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)', // easeOutCubic
          transitionDuration: `${baseDuration}ms`
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default PageTransition; 