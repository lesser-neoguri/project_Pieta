'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';

export default function HomePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <div className="h-screen flex flex-col">
        {/* Hero Section */}
        <div className="relative flex-1 flex items-center justify-center overflow-hidden">
          {/* Background Image */}
          <div className="absolute inset-0 z-0">
            <div className="relative w-full h-full">
              <Image
                src="/images/hero-bg.jpg"
                alt="Background"
                fill
                className="object-cover"
                priority
              />
              <div className="absolute inset-0 bg-black bg-opacity-30" />
            </div>
          </div>

          {/* Content */}
          <div className="relative z-10 text-center px-4 max-w-xl mx-auto">
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
              <Link
                href="/products"
                className="inline-block px-8 py-4 bg-white/20 backdrop-blur-sm text-white text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300"
              >
                제품보러가기
              </Link>
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

      {/* Features Section */}
      <div className="py-20 px-4">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12">
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
