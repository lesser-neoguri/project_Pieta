'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState, useEffect, useLayoutEffect, useCallback } from 'react';
import dynamic from 'next/dynamic';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';
import { FaSearch, FaTimes, FaBars, FaUser, FaShoppingCart } from 'react-icons/fa';
import logger from '@/lib/logger';
import { useScroll } from '@/hooks/useScroll';

// 필요한 타입 정의
type SearchResult = {
  id: string;
  title: string;
  link: string;
};

type CartItem = {
  id: string;
  quantity: number;
};

type WishlistItem = {
  id: string;
};

const Banner = dynamic(() => Promise.resolve(({ showBanner, setShowBanner, pathname }: { showBanner: boolean; setShowBanner: (show: boolean) => void; pathname: string }) => {
  if (!showBanner || pathname === '/') return null;
  
  return null;
}), { ssr: false });

export default function Navbar() {
  const { user, signOut } = useAuth();
  const { openProfile } = useProfile();
  const pathname = usePathname();
  const [mounted, setMounted] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [showSideMenu, setShowSideMenu] = useState(false);
  const [showBanner, setShowBanner] = useState(false);
  const [isProfileOpen, setIsProfileOpen] = useState(false);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isWishlistOpen, setIsWishlistOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [cartItemCount, setCartItemCount] = useState(0);
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 네비게이션 바 표시 여부 상태
  const [isNavVisible, setIsNavVisible] = useState(true);
  
  // 특정 페이지에서 아이콘 색상 결정
  const isProductDetailPage = pathname?.includes('/store/') && pathname?.includes('/product/');
  const iconColor = isProductDetailPage ? 'text-black' : 'text-white';

  // useScroll 훅 사용
  const { direction, scrollY } = useScroll({
    detectDirection: true,
    throttleDelay: 50,
    onDirectionChange: (newDirection) => {
      // /products 페이지에서는 항상 네비게이션 바 표시
      if (pathname === '/products') {
        setIsNavVisible(true);
        return;
      }
      
      // 다른 페이지에서는 스크롤 방향에 따라 표시/숨김
      if (newDirection === 'down') {
        setIsNavVisible(false);
      } else if (newDirection === 'up') {
        setIsNavVisible(true);
      }
    }
  });

  useLayoutEffect(() => {
    setMounted(true);
  }, []);

  // 커스텀 이벤트 리스너 등록 - 제품 상세 페이지의 이미지 스크롤에 반응
  useEffect(() => {
    if (mounted) {
      const handleNavbarControl = (event: CustomEvent) => {
        const { hide } = event.detail;
        if (hide) {
          setIsNavVisible(false);
        } else {
          setIsNavVisible(true);
        }
      };
      
      window.addEventListener('navbarControl', handleNavbarControl as EventListener);
      
      return () => {
        window.removeEventListener('navbarControl', handleNavbarControl as EventListener);
      };
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      const storedBannerState = localStorage.getItem('bannerState');
      if (storedBannerState === null) {
        setShowBanner(true);
      } else {
        setShowBanner(storedBannerState === 'true');
      }
    }
  }, [mounted]);

  useEffect(() => {
    if (mounted) {
      localStorage.setItem('bannerState', showBanner.toString());
    }
  }, [showBanner, mounted]);
  
  // 장바구니 아이템 수 가져오기
  useEffect(() => {
    if (user && mounted) {
      const fetchCartItemCount = async () => {
        try {
          const { data, error, count } = await supabase
            .from('cart_items')
            .select('*', { count: 'exact' })
            .eq('user_id', user.id);
            
          if (error) throw error;
          
          setCartItemCount(count || 0);
        } catch (error) {
          logger.error('장바구니 아이템 수 가져오기 오류:', error);
          setCartItemCount(0);
        }
      };
      
      fetchCartItemCount();
      
      // 실시간 업데이트 구독
      const cartSubscription = supabase
        .channel('cart_changes')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'cart_items',
          filter: `user_id=eq.${user.id}`
        }, () => {
          fetchCartItemCount();
        })
        .subscribe();
        
      return () => {
        supabase.removeChannel(cartSubscription);
      };
    }
  }, [user, mounted]);
  
  // 홈 페이지 여부 확인
  const isHomePage = pathname === '/';
  
  // 상점 페이지 여부 확인 (상점 상세 페이지와 디자인 스튜디오 페이지)
  const isStorePage = pathname?.startsWith('/store/') && !pathname?.includes('/product/');
  
  // 투명 배경이 필요한 페이지 여부
  const needsTransparentBg = isHomePage || isStorePage;
  
  // 투명 배경은 필요하지만 아이콘은 검은색이 필요한 페이지
  const needsTransparentWithDarkIcons = isProductDetailPage;
  
  // 투자 페이지에서는 로고 텍스트를 변경
  const isInvestmentPage = pathname?.startsWith('/investment');
  
  if (!mounted) {
    return null;
  }
  
  return (
    <>
      <Banner showBanner={showBanner} setShowBanner={setShowBanner} pathname={pathname || ''} />
      
      <nav 
        className={`fixed top-0 left-0 right-0 z-40 transition-transform duration-300 ${
          isNavVisible ? 'translate-y-0' : '-translate-y-full'
        } ${needsTransparentBg ? 'md:bg-transparent bg-white' : needsTransparentWithDarkIcons ? 'md:bg-transparent bg-white' : 'bg-white'} md:shadow-none shadow-md`}
      >
        <div className="max-w-8xl mx-auto px-1 sm:px-6 lg:px-10">
          <div className="flex justify-between h-16 sm:h-20 md:h-24 py-2 sm:py-3 md:py-4">
            {/* 왼쪽 유틸리티 아이콘 */}
            <div className="w-1/3 flex items-center justify-start space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-5">
              {/* 햄버거 메뉴 아이콘 */}
              <button 
                onClick={() => setShowSideMenu(!showSideMenu)}
                className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'}`}
                aria-label="메뉴"
                title="메뉴"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 6h16M4 12h16m-7 6h7" />
                </svg>
              </button>
              
              {/* 검색 아이콘 */}
              <button 
                onClick={() => setShowSearchBar(!showSearchBar)}
                className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'}`}
                aria-label="검색"
                title="검색"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </button>
            </div>
            
            {/* 로고 (중앙 정렬) */}
            <div className="flex items-center justify-center w-1/3">
              <Link href="/" className={`font-bold ${needsTransparentBg ? 'text-white' : needsTransparentWithDarkIcons ? 'text-gray-800' : 'text-gray-800'} -mt`}>
                {isInvestmentPage ? (
                  <div className="text-4xl font-light tracking-[0.2em] uppercase flex items-baseline">
                    PIETA <span className="text-yellow-600 text-2xl ml-2 font-light">GOLD</span>
                  </div>
                ) : (
                  <div className="text-4xl font-light tracking-[0.2em] uppercase">PIETA</div>
                )}
              </Link>
            </div>
            
            {/* 사용자 메뉴 */}
            <div className="flex items-center justify-end w-1/3">
              {/* 장바구니 아이콘을 오른쪽으로 이동 */}
              <Link
                href="/cart"
                className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'} relative mr-2 sm:mr-3 md:mr-4`}
                aria-label="장바구니"
                title="장바구니"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                {(cartItemCount > 0) && (
                  <span className="absolute top-0 right-0 inline-flex items-center justify-center px-1.5 py-0.5 text-xs sm:text-xs md:text-sm font-bold leading-none text-white transform translate-x-1/4 -translate-y-1/4 bg-black rounded-full">
                    {cartItemCount}
                  </span>
                )}
              </Link>
              
              {user ? (
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-5">
                  <Link
                    href="/wishlist"
                    className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'}`}
                    aria-label="위시리스트"
                    title="위시리스트"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </Link>
                  <button
                    onClick={openProfile}
                    className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'}`}
                    aria-label="프로필"
                    title="프로필"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                  </button>
                </div>
              ) : (
                <div className="flex items-center space-x-2 sm:space-x-3 md:space-x-4 lg:space-x-5">
                  <Link
                    href="/login"
                    className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'}`}
                    aria-label="로그인"
                    title="로그인"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                    </svg>
                  </Link>
                  <Link
                    href="/signup"
                    className={`p-2 sm:p-2.5 md:p-3 rounded-full ${needsTransparentBg ? 'hover:bg-white/20 text-white' : needsTransparentWithDarkIcons ? 'hover:bg-gray-100 text-gray-600' : 'hover:bg-gray-100 text-gray-600'}`}
                    aria-label="회원가입"
                    title="회원가입"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 md:h-5 md:w-5 lg:h-6 lg:w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                    </svg>
                  </Link>
                </div>
              )}
            </div>
          </div>
          
          {/* 검색 바 */}
          {showSearchBar && (
            <div className="py-3 sm:py-4 px-2 border-t border-gray-100">
              <div className="relative">
                <input
                  type="text"
                  placeholder="검색어를 입력하세요"
                  className="w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-yellow-500 font-pretendard"
                />
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </div>
              </div>
            </div>
          )}
        </div>
      </nav>
      
      {/* 사이드 메뉴 (햄버거 메뉴 클릭 시 표시) - 네비게이션 바 외부로 이동 */}
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
              <div className="text-2xl font-light tracking-[0.2em] uppercase">PIETA</div>
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
                <Link href="/" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>홈</Link>
                <Link href="/products" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>전체보기</Link>
                <Link href="/investment" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>투자 & 골드바</Link>
                <Link href="/jewelry" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>주얼리 & 악세서리</Link>
                <Link href="/storelist" className="block px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>상점 목록</Link>
                
                {/* 로그인한 사용자에게만 표시되는 메뉴 */}
                {user && (
                  <>
                    <div className="border-t border-gray-200 my-3"></div>
                    <Link href="/wishlist" className="flex items-center px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                      </svg>
                      찜목록
                    </Link>
                    <Link href="/cart" className="flex items-center px-3 py-2 rounded-md hover:bg-gray-100 text-gray-700" onClick={() => setShowSideMenu(false)}>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                      장바구니
                    </Link>
                  </>
                )}
              </nav>
            </div>
          </div>
        </div>
      )}
    </>
  );
} 