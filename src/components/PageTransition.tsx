'use client';

import React, { useEffect, useState } from 'react';
import { useTransition } from '@/contexts/TransitionContext';

// 검은색 배경이 화면을 덮었다가 위로 올라가는 애니메이션을 위한 컴포넌트
const PageTransition: React.FC = () => {
  const { isTransitioning, fromPath, toPath } = useTransition();
  const [animationStage, setAnimationStage] = useState<'initial' | 'covering' | 'leaving' | 'done'>('initial');

  useEffect(() => {
    if (isTransitioning) {
      // 즉시 화면 가리기 (애니메이션 없음)
      setAnimationStage('covering');
      
      // 잠시 후 위로 올라가서 사라지는 애니메이션 시작
      const leavingTimer = setTimeout(() => {
        setAnimationStage('leaving');
        
        const doneTimer = setTimeout(() => {
          setAnimationStage('done');
        }, 600); // 위로 올라가는 애니메이션 시간
        
        return () => clearTimeout(doneTimer);
      }, 600); // 페이지 전환 후 잠시 대기 시간
      
      return () => clearTimeout(leavingTimer);
    } else {
      setAnimationStage('initial');
    }
  }, [isTransitioning]);

  // 애니메이션이 활성화되지 않았거나 완료되었을 때는 아무것도 렌더링하지 않음
  if (animationStage === 'initial' || animationStage === 'done') {
    return null;
  }

  return (
    <div className="fixed inset-0 z-[9999] pointer-events-none">
      {/* 검은색 오버레이 - 즉시 화면을 가리고 위로 올라가는 애니메이션 */}
      <div
        className={`w-full h-full bg-black transition-transform duration-600 ease-in-out ${
          animationStage === 'leaving' ? '-translate-y-full' : 'translate-y-0'
        }`}
        style={{
          transitionTimingFunction: 'cubic-bezier(0.33, 1, 0.68, 1)' // easeOutCubic
        }}
        aria-hidden="true"
      />
    </div>
  );
};

export default PageTransition; 