'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';

export default function SignupPage() {
  const [isScrolled, setIsScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      const scrollPosition = window.scrollY;
      setIsScrolled(scrollPosition > 20);
    };

    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <div className="min-h-screen bg-white">
      <header className={`fixed top-0 left-0 right-0 bg-white z-10 transition-all duration-300 ${
        isScrolled ? 'py-4 shadow-sm' : 'py-8'
      }`}>
        <div className="max-w-md mx-auto px-4">
          <div className={`text-center transition-all duration-300 ${
            isScrolled ? 'transform scale-90' : ''
          }`}>
            <h1 className="text-xl font-light mb-2">회원가입</h1>
            <p className="text-sm text-gray-600">회원 유형을 선택해주세요</p>
          </div>
        </div>
      </header>

      <main className="pt-40 pb-20 px-4 max-w-md mx-auto">
        <div className="space-y-3">
          <Link 
            href="/signup/regular" 
            className="block p-5 text-center border-2 border-black hover:bg-black hover:text-white transition-colors duration-300"
          >
            <h2 className="text-base font-medium mb-1">일반회원</h2>
            <p className="text-xs text-gray-600">개인 고객을 위한 회원가입입니다</p>
          </Link>

          <Link 
            href="/signup/vendor" 
            className="block p-5 text-center border border-gray-200 hover:border-gray-400 transition-colors duration-300"
          >
            <h2 className="text-sm font-medium mb-1">소매회원</h2>
            <p className="text-xs text-gray-600">소매 사업자를 위한 회원가입입니다</p>
          </Link>

          <Link 
            href="/signup/wholesaler" 
            className="block p-5 text-center border border-gray-200 hover:border-gray-400 transition-colors duration-300"
          >
            <h2 className="text-sm font-medium mb-1">도매회원</h2>
            <p className="text-xs text-gray-600">도매 사업자를 위한 회원가입입니다</p>
          </Link>
        </div>

        <div className="text-center mt-12">
          <Link 
            href="/login" 
            className="text-sm text-gray-600 hover:text-black transition-colors"
          >
            이미 계정이 있으신가요? <span className="border-b border-gray-400">로그인하기</span>
          </Link>
        </div>
      </main>

      <div className={`fixed bottom-6 left-1/2 -translate-x-1/2 transition-opacity duration-500 ${
        isScrolled ? 'opacity-0' : 'opacity-100'
      }`}>
        <div className="animate-bounce bg-gray-900 bg-opacity-10 rounded-full p-2">
          <svg 
            className="w-5 h-5 text-gray-500" 
            fill="none" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth="2" 
            viewBox="0 0 24 24" 
            stroke="currentColor"
          >
            <path d="M19 14l-7 7m0 0l-7-7m7 7V3"></path>
          </svg>
        </div>
      </div>
    </div>
  );
} 