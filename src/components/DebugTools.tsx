'use client';

import { useEffect } from 'react';
import { attachDebugUtils } from '@/lib/debug';

export default function DebugTools() {
  useEffect(() => {
    // 개발 환경에서만 디버깅 도구 연결
    attachDebugUtils();
  }, []);

  // 이 컴포넌트는 UI를 렌더링하지 않습니다
  return null;
} 