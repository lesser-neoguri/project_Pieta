'use client';

import React, { createContext, useContext, useState, ReactNode } from 'react';

// 페이지별 네비게이션 스타일 타입 정의
export interface PageStyleState {
  backgroundColor?: string;
  iconColor?: string;
  logoColor?: string;
}

// 컨텍스트 타입 정의
interface PageStyleContextType {
  pageStyle: PageStyleState;
  setPageStyle: (style: PageStyleState) => void;
  updatePageStyle: (updates: Partial<PageStyleState>) => void;
  clearPageStyle: () => void;
}

// 기본값 정의
const defaultPageStyle: PageStyleState = {
  backgroundColor: undefined,
  iconColor: undefined,
  logoColor: undefined,
};

// 컨텍스트 생성
const PageStyleContext = createContext<PageStyleContextType | undefined>(undefined);

// Provider 컴포넌트
export function PageStyleProvider({ children }: { children: ReactNode }) {
  const [pageStyle, setPageStyleState] = useState<PageStyleState>(defaultPageStyle);

  // 전체 스타일 설정
  const setPageStyle = (style: PageStyleState) => {
    setPageStyleState(style);
  };

  // 부분 스타일 업데이트
  const updatePageStyle = (updates: Partial<PageStyleState>) => {
    setPageStyleState(prevStyle => ({
      ...prevStyle,
      ...updates,
    }));
  };

  // 스타일 초기화
  const clearPageStyle = () => {
    setPageStyleState(defaultPageStyle);
  };

  const contextValue: PageStyleContextType = {
    pageStyle,
    setPageStyle,
    updatePageStyle,
    clearPageStyle,
  };

  return (
    <PageStyleContext.Provider value={contextValue}>
      {children}
    </PageStyleContext.Provider>
  );
}

// 커스텀 훅
export function usePageStyle() {
  const context = useContext(PageStyleContext);
  if (context === undefined) {
    throw new Error('usePageStyle must be used within a PageStyleProvider');
  }
  return context;
}

// 타입 내보내기
export type { PageStyleContextType }; 