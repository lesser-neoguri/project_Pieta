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
    <div className="flex flex-col min-h-screen relative">
      {/* 중앙 로고 */}
      <div className="absolute inset-0 flex items-center justify-center z-20 pointer-events-none">
        <h1 className="text-5xl md:text-6xl font-serif tracking-widest text-white drop-shadow-lg">
          PIETA
        </h1>
      </div>

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
              backgroundImage: "url('https://images.unsplash.com/photo-1610375461369-d613b564f4c4?q=80&w=1287&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
              transform: leftHovered 
                ? `scale(1.1) translate(${leftBgPosition.x}px, ${leftBgPosition.y}px)` 
                : 'scale(1) translate(0, 0)',
              filter: leftHovered ? 'brightness(1) contrast(1.1)' : 'brightness(0.5) contrast(1.1)'
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/30 transition-opacity duration-500"
            style={{
              opacity: leftHovered ? 0.3 : 0.7
            }}
          />
          <div className="absolute inset-0 bg-yellow-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10 text-center">
            <h2 className="text-3xl font-light text-white mb-4 tracking-wider transform transition-transform duration-500 group-hover:translate-y-[-5px] font-pretendard">투자 & 골드바</h2>
            <p className="text-sm text-white/80 mb-8 max-w-md mx-auto opacity-90 transform transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-5px] font-pretendard">
              안전하고 가치 있는 투자, 골드바와 실버바로 시작하세요.
            </p>
            <div className="pb-6">
              <span className="px-6 py-2 border border-white text-white text-sm hover:bg-white hover:text-black transition-all duration-300 inline-flex items-center transform group-hover:translate-y-[-5px] tracking-widest font-pretendard">
                자세히 보기
              </span>
            </div>
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
              backgroundImage: "url('https://images.unsplash.com/photo-1611652022419-a9419f74343d?q=80&w=1288&auto=format&fit=crop&ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D')",
              transform: rightHovered 
                ? `scale(1.1) translate(${rightBgPosition.x}px, ${rightBgPosition.y}px)` 
                : 'scale(1) translate(0, 0)',
              filter: rightHovered ? 'brightness(1) contrast(1.1)' : 'brightness(0.5) contrast(1.1)'
            }}
          />
          <div 
            className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-black/30 transition-opacity duration-500"
            style={{
              opacity: rightHovered ? 0.3 : 0.7
            }}
          />
          <div className="absolute inset-0 bg-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-700"></div>
          <div className="absolute bottom-0 left-0 right-0 p-10 z-10 text-center">
            <h2 className="text-3xl font-light text-white mb-4 tracking-wider transform transition-transform duration-500 group-hover:translate-y-[-5px] font-pretendard">주얼리 & 악세서리</h2>
            <p className="text-sm text-white/80 mb-8 max-w-md mx-auto opacity-90 transform transition-all duration-500 group-hover:opacity-100 group-hover:translate-y-[-5px] font-pretendard">
              특별한 순간을 빛내줄 아름다운 주얼리를 만나보세요.
            </p>
            <div className="pb-6">
              <span className="px-6 py-2 border border-white text-white text-sm hover:bg-white hover:text-black transition-all duration-300 inline-flex items-center transform group-hover:translate-y-[-5px] tracking-widest font-pretendard">
                자세히 보기
              </span>
            </div>
          </div>
        </Link>
      </div>
      <div className="w-full bg-black text-center py-6">
        <div className="flex justify-center gap-8">
          <Link 
            href="/storelist" 
            className="text-white/70 hover:text-white transition-colors text-sm tracking-wider font-pretendard"
          >
            상점 모아보기
          </Link>
          <Link 
            href="/itemlist" 
            className="text-white/70 hover:text-white transition-colors text-sm tracking-wider font-pretendard"
          >
            제품 모아보기
          </Link>
        </div>
      </div>
    </div>
  );
}
