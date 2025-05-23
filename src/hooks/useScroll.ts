import { useState, useEffect, useCallback } from 'react';
import { throttle } from '@/lib/utils';

type ScrollDirection = 'up' | 'down' | null;

interface UseScrollOptions {
  /** 스로틀 딜레이 (밀리초) */
  throttleDelay?: number;
  /** 스크롤 방향 변화 감지 여부 */
  detectDirection?: boolean;
  /** 특정 y값 넘어갈 때 콜백 실행 */
  threshold?: number;
  /** 특정 y값 넘어갈 때 실행할 콜백 */
  onThresholdPass?: (exceeds: boolean) => void;
  /** 스크롤 방향 변경 시 실행할 콜백 */
  onDirectionChange?: (direction: ScrollDirection) => void;
}

/**
 * 스크롤 이벤트를 관리하는 커스텀 훅
 */
export function useScroll({
  throttleDelay = 100,
  detectDirection = false,
  threshold,
  onThresholdPass,
  onDirectionChange
}: UseScrollOptions = {}) {
  const [scrollY, setScrollY] = useState(0);
  const [direction, setDirection] = useState<ScrollDirection>(null);
  const [prevScrollY, setPrevScrollY] = useState(0);
  const [isOverThreshold, setIsOverThreshold] = useState(false);

  // 스크롤 핸들러
  const handleScroll = useCallback(
    throttle(() => {
      const currentScrollY = window.scrollY;
      
      // 스크롤 위치 업데이트
      setScrollY(currentScrollY);
      
      // 스크롤 방향 감지
      if (detectDirection) {
        const newDirection = currentScrollY > prevScrollY ? 'down' : 'up';
        if (newDirection !== direction) {
          setDirection(newDirection);
          onDirectionChange?.(newDirection);
        }
      }
      
      // 임계값 비교
      if (threshold !== undefined) {
        const exceeds = currentScrollY > threshold;
        if (exceeds !== isOverThreshold) {
          setIsOverThreshold(exceeds);
          onThresholdPass?.(exceeds);
        }
      }
      
      setPrevScrollY(currentScrollY);
    }, throttleDelay),
    [prevScrollY, direction, threshold, isOverThreshold, detectDirection, onDirectionChange, onThresholdPass, throttleDelay]
  );

  // 스크롤 이벤트 리스너 등록
  useEffect(() => {
    window.addEventListener('scroll', handleScroll);
    
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

  return {
    scrollY,
    direction,
    isOverThreshold
  };
} 