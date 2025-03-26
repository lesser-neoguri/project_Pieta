'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect } from 'react';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showBanner, setShowBanner] = useState(true);
  
  // 메인 페이지에서는 네비게이션 바를 숨김
  if (pathname === '/') {
    return null;
  }
  
  // 투자 페이지에서는 로고 텍스트를 변경
  const isInvestmentPage = pathname.startsWith('/investment');
  
  return (
    <>
      {/* 상단 배너 - 루트 페이지가 아닐 때만 표시 */}
      {showBanner && pathname !== '/' && (
        <div className="bg-yellow-500 text-white px-4 py-2 relative transition-all duration-300 ease-in-out">
          <div className="max-w-8xl mx-auto flex justify-between items-center">
            <div className="flex-1 text-center font-medium text-sm sm:text-base">
              신규 회원 가입 시 첫 구매 5% 할인 혜택을 드립니다!
            </div>
            <button 
              onClick={() => setShowBanner(false)} 
              className="text-white hover:text-gray-100"
              aria-label="배너 닫기"
            >
              <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>
      )}
      
      <nav className="bg-white shadow-sm">
        <div className="max-w-8xl mx-auto px-1 sm:px-6 lg:px-10">
          <div className="flex justify-between h-15">
            {/* 왼쪽 유틸리티 아이콘 */}
            <div className="w-1/3 flex items-center justify-start space-x">
              {/* 햄버거 메뉴 아이콘 */}
              <button 
                onClick={() => setShowSideMenu(!showSideMenu)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                aria-label="메뉴"
                title="메뉴"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
              
              {/* 검색 아이콘 */}
              <button 
                onClick={() => setShowSearchBar(!showSearchBar)}
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                aria-label="검색"
                title="검색"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            
            {/* 로고 (중앙 정렬) */}
            <div className="flex items-center justify-center w-1/3">
              <Link href="/" className="font-bold text-gray-800 -mt">
                {isInvestmentPage ? (
                  <div className="font-serif font-['Roboto'] flex items-baseline text-4xl font-thin">
                    PIETA <span className="text-yellow-600 text-2xl ml-2 font-thin">GOLD</span>
                  </div>
                ) : (
                  <div className="font-serif font-['Roboto'] text-4xl font-thin">PIETA</div>
                )}
              </Link>
            </div>
            
            {/* 사용자 메뉴 */}
            <div className="flex items-center justify-end w-1/3">
              {/* 장바구니 아이콘을 오른쪽으로 이동 */}
              <Link
                href="/cart"
                className="p-2 rounded-full hover:bg-gray-100 text-gray-600 relative mr-2"
                aria-label="장바구니"
                title="장바구니"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {(0 > 0) && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs font-bold leading-none text-white transform translate-x-1/2 -translate-y-1/2 bg-yellow-500 rounded-full">
                    0
                  </span>
                )}
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/wishlist"
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="위시리스트"
                    title="위시리스트"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </Link>
                  <Link
                    href="/profile"
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="프로필"
                    title="프로필"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </Link>
                  <button
                    onClick={signOut}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="로그아웃"
                    title="로그아웃"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2">
                  <Link
                    href="/login"
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="로그인"
                    title="로그인"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </Link>
                  <Link
                    href="/register"
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="회원가입"
                    title="회원가입"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* 검색 바 */}
          {showSearchBar && (
            <div className="py-3 px-2 border-t border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="검색어를 입력하세요"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
          
          {/* 사이드 메뉴 (햄버거 메뉴 클릭 시 표시) */}
          {showSideMenu && (
            <div className="fixed inset-0 z-50 flex">
              {/* 배경 오버레이 (클릭 시 메뉴 닫힘) */}
              <div 
                className="fixed inset-0 bg-black bg-opacity-50 transition-opacity" 
                onClick={() => setShowSideMenu(false)}
              ></div>
              
              {/* 사이드 메뉴 패널 */}
              <div className="relative flex-1 flex flex-col max-w-xs w-full bg-white shadow-xl">
                <div className="flex items-center justify-between px-4 pt-5 pb-4">
                  <div className="font-serif text-2xl">PIETA</div>
                  <button 
                    onClick={() => setShowSideMenu(false)}
                    className="p-2 rounded-full hover:bg-gray-100 text-gray-600"
                    aria-label="닫기"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="flex-1 py-4 overflow-y-auto">
                  <nav className="px-2 space-y-1">
                    <Link href="/" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">홈</Link>
                    <Link href="/investment" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">투자 & 골드바</Link>
                    <Link href="/jewelry" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">주얼리 & 악세서리</Link>
                    <Link href="/storelist" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">상점 목록</Link>
                    <Link href="/itemlist" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700">제품 목록</Link>
                  </nav>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
    </>
  );
} 