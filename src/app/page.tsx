'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useState, useEffect } from 'react';

export default function Home() {
  const { user, signOut, loading: authLoading } = useAuth();
  const [leftHovered, setLeftHovered] = useState(false);
  const [rightHovered, setRightHovered] = useState(false);
  const [leftBgPosition, setLeftBgPosition] = useState({ x: 0, y: 0 });
  const [rightBgPosition, setRightBgPosition] = useState({ x: 0, y: 0 });

  // 배경 이미지 초기 위치 랜덤 설정
  useEffect(() => {
    setLeftBgPosition({ x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 });
    setRightBgPosition({ x: Math.random() * 10 - 5, y: Math.random() * 10 - 5 });
  }, []);

  // 마우스 움직임에 따른 배경 이미지 위치 조정
  const handleMouseMove = (e: React.MouseEvent, isLeft: boolean) => {
    const container = e.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    
    // 컨테이너 내 마우스 위치를 0~1 사이 값으로 정규화
    const x = (e.clientX - rect.left) / rect.width;
    const y = (e.clientY - rect.top) / rect.height;
    
    // 마우스 위치에 따라 배경 이미지 이동 (반대 방향으로 살짝 이동)
    if (isLeft) {
      setLeftBgPosition({ x: (0.5 - x) * 10, y: (0.5 - y) * 10 });
    } else {
      setRightBgPosition({ x: (0.5 - x) * 10, y: (0.5 - y) * 10 });
    }
  };

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen">
      {/* 메인 반분할 섹션 */}
      <div className="flex flex-col md:flex-row flex-grow">
        {/* 왼쪽 섹션 - 투자 상품 */}
        <Link 
          href="/investment" 
          className="relative flex-1 overflow-hidden group"
          onMouseEnter={() => setLeftHovered(true)}
          onMouseLeave={() => setLeftHovered(false)}
          onMouseMove={(e) => handleMouseMove(e, true)}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1624365169198-38205d8aef3b?q=80&w=1000&auto=format&fit=crop')",
              transform: leftHovered 
                ? `scale(1.1) translate(${leftBgPosition.x}px, ${leftBgPosition.y}px)` 
                : 'scale(1) translate(0, 0)',
              filter: leftHovered ? 'brightness(1.1) contrast(1.1)' : 'brightness(1) contrast(1)'
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 transition-opacity duration-500"
            style={{
              opacity: leftHovered ? 0.4 : 0.6
            }}
          />
          <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative h-96 md:h-full flex flex-col items-center justify-center text-center p-10 z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 transform transition-transform duration-500 group-hover:translate-y-[-5px]">투자 & 골드바</h2>
            <p className="text-xl text-white mb-8 max-w-md opacity-90 transform transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-5px]">
              안전하고 가치 있는 투자, 골드바와 실버바로 시작하세요.
            </p>
            <span className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-black transition-all duration-300 inline-flex items-center transform group-hover:translate-y-[-5px]">
              자세히 보기
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
        </Link>

        {/* 오른쪽 섹션 - 주얼리 */}
        <Link 
          href="/jewelry" 
          className="relative flex-1 overflow-hidden group"
          onMouseEnter={() => setRightHovered(true)}
          onMouseLeave={() => setRightHovered(false)}
          onMouseMove={(e) => handleMouseMove(e, false)}
        >
          <div 
            className="absolute inset-0 bg-cover bg-center transition-all duration-700 ease-out"
            style={{ 
              backgroundImage: "url('https://images.unsplash.com/photo-1599643478518-a784e5dc4c8f?q=80&w=1000&auto=format&fit=crop')",
              transform: rightHovered 
                ? `scale(1.1) translate(${rightBgPosition.x}px, ${rightBgPosition.y}px)` 
                : 'scale(1) translate(0, 0)',
              filter: rightHovered ? 'brightness(1.1) contrast(1.1)' : 'brightness(1) contrast(1)'
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-b from-black/30 via-black/20 to-black/40 transition-opacity duration-500"
            style={{
              opacity: rightHovered ? 0.4 : 0.6
            }}
          />
          <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="relative h-96 md:h-full flex flex-col items-center justify-center text-center p-10 z-10">
            <h2 className="text-4xl md:text-5xl font-bold text-white mb-6 transform transition-transform duration-500 group-hover:translate-y-[-5px]">주얼리 & 악세서리</h2>
            <p className="text-xl text-white mb-8 max-w-md opacity-90 transform transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-5px]">
              특별한 순간을 빛내줄 아름다운 주얼리를 만나보세요.
            </p>
            <span className="px-6 py-3 border-2 border-white text-white hover:bg-white hover:text-black transition-all duration-300 inline-flex items-center transform group-hover:translate-y-[-5px]">
              자세히 보기
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2 transform transition-transform duration-300 group-hover:translate-x-1" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </span>
          </div>
        </Link>
      </div>
      <div className="w-full bg-white text-center py-10">
        <div className="flex justify-center gap-4">
          <Link 
            href="/storelist" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            상점 모아보기
          </Link>
          <Link 
            href="/itemlist" 
            className="text-gray-600 hover:text-gray-900 transition-colors"
          >
            제품 모아보기
          </Link>
        </div>
      </div>
    </div>
  );
}
