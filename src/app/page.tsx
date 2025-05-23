'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useTransition } from '@/contexts/TransitionContext';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { handleNavigate } = useTransition();

  useEffect(() => {
    setMounted(true);
  }, []);

  // 제품보러가기 클릭 핸들러
  const handleProductsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    handleNavigate('/products');
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - 여백 없이 전체 너비 사용 */}
      <div className="h-screen w-full relative overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 w-full h-full">
          {/* 비디오 또는 이미지 배경 */}
          <div className="relative w-full h-full">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute w-full h-full object-cover"
            >
              <source src="/videos/mainVD.mp4" type="video/mp4" />
            </video>
            {/* 비디오가 로드되지 않을 때 표시할 대체 배경 */}
            <div className="absolute inset-0 bg-gray-900 z-[-1]"></div>
          </div>
          {/* 비디오/이미지 위에 그라데이션 오버레이 추가 */}
          <div className="absolute inset-0 bg-gradient-to-b from-black/70 via-black/50 to-black/30" />
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          <div className="text-center px-4 max-w-xl">
            <h1 className={`text-4xl md:text-5xl font-light text-white mb-6 tracking-[0.2em] uppercase transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              PIETA
            </h1>
            <p className={`text-lg text-white/90 mb-12 tracking-wide transition-opacity duration-1000 delay-300 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              최고의 품질과 서비스를 제공하는 프리미엄 쇼핑몰
            </p>
            <div className={`space-x-6 transition-opacity duration-1000 delay-500 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              {!user ? (
                <>
                  <Link
                    href="/signup"
                    className="inline-block px-8 py-4 bg-white text-black text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-300"
                  >
                    회원가입
                  </Link>
                  <Link
                    href="/login"
                    className="inline-block px-8 py-4 border border-white text-white text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300"
                  >
                    로그인
                  </Link>
                </>
              ) : null}
              <a
                href="/products"
                onClick={handleProductsClick}
                className="inline-block px-8 py-4 bg-white/20 backdrop-blur-sm text-white text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300"
              >
                제품보러가기
              </a>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className={`animate-bounce transition-opacity duration-1000 delay-700 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Collection Banner Section - 여백 없이 전체 너비 사용 */}
      <div className="w-full bg-gray-200 relative">
        <div className="py-24 text-center relative z-10">
          <p className="text-sm uppercase tracking-widest mb-2">프리미엄 컬렉션</p>
          <h2 className="text-4xl font-light uppercase tracking-[0.2em] mb-6">COLLECTION</h2>
          <p className="text-sm mb-8">엄선된 프리미엄 제품들을 만나보세요</p>
          <a 
            href="/products" 
            onClick={handleProductsClick}
            className="inline-block px-10 py-3 border border-black text-black text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-300"
          >
            더 알아보기
          </a>
        </div>
        {/* 배경 색상 설정 */}
        <div className="absolute inset-0 z-0 bg-gray-100"></div>
      </div>

      {/* Features Section */}
      <div className="py-20 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 px-4">
          <div className={`text-center transition-opacity duration-1000 delay-300 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-lg font-light tracking-widest uppercase mb-4">Premium Quality</h3>
            <p className="text-sm text-gray-600">최고급 품질의 제품만을 엄선하여 제공합니다</p>
          </div>
          <div className={`text-center transition-opacity duration-1000 delay-500 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-lg font-light tracking-widest uppercase mb-4">Exclusive Service</h3>
            <p className="text-sm text-gray-600">차별화된 프리미엄 서비스를 경험하세요</p>
          </div>
          <div className={`text-center transition-opacity duration-1000 delay-700 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-lg font-light tracking-widest uppercase mb-4">Global Network</h3>
            <p className="text-sm text-gray-600">전세계 파트너들과 함께합니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
