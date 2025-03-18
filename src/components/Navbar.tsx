'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
  const { user, signOut } = useAuth();
  const pathname = usePathname();
  
  // 메인 페이지에서는 네비게이션 바를 숨김
  if (pathname === '/') {
    return null;
  }
  
  // 투자 페이지에서는 로고 텍스트를 변경
  const isInvestmentPage = pathname.startsWith('/investment');
  
  return (
    <nav className="bg-white shadow-sm">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          {/* 왼쪽 빈 공간 (로고를 중앙에 배치하기 위함) */}
          <div className="w-1/3"></div>
          
          {/* 로고 (중앙 정렬) */}
          <div className="flex items-center justify-center w-1/3">
            <Link href="/" className="text-xl font-bold text-gray-800">
              {isInvestmentPage ? (
                <div className="font-serif font-['Georgia'] flex items-baseline">
                  PIETA <span className="text-yellow-600 text-sm ml-1 font-bold">GOLD</span>
                </div>
              ) : (
                <div className="font-serif font-['Georgia']">PIETA</div>
              )}
            </Link>
          </div>
          
          {/* 사용자 메뉴 */}
          <div className="flex items-center justify-end w-1/3">
            {user ? (
              <div className="flex items-center space-x-4">
                <Link
                  href="/profile"
                  className="text-gray-700 hover:text-gray-900"
                >
                  프로필
                </Link>
                <button
                  onClick={signOut}
                  className="px-3 py-1.5 border border-red-600 text-red-600 rounded-md hover:bg-red-50 text-sm"
                >
                  로그아웃
                </button>
              </div>
            ) : (
              <div className="flex items-center space-x-4">
                <Link
                  href="/login"
                  className="text-gray-700 hover:text-gray-900"
                >
                  로그인
                </Link>
                <Link
                  href="/register"
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-md hover:bg-blue-700 text-sm"
                >
                  회원가입
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 