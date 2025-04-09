'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

export default function Navigation() {
  const { user, loading } = useAuth();
  const router = useRouter();
  const [isVendor, setIsVendor] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [storeId, setStoreId] = useState<string | null>(null);

  useEffect(() => {
    const checkUserType = async () => {
      if (user) {
        const { data, error } = await supabase
          .from('users')
          .select('user_type')
          .eq('id', user.id)
          .single();
        
        if (!error && data) {
          setIsVendor(data.user_type === 'vendor');
          
          // 입점회원인 경우 승인 상태와 상점 정보 확인
          if (data.user_type === 'vendor') {
            const { data: vendorData, error: vendorError } = await supabase
              .from('vendor_users')
              .select('status')
              .eq('user_id', user.id)
              .single();
            
            if (!vendorError && vendorData && vendorData.status === 'approved') {
              setIsApproved(true);
              
              // 상점 정보 가져오기
              const { data: storeData, error: storeError } = await supabase
                .from('stores')
                .select('id')
                .eq('vendor_id', user.id)
                .single();
                
              if (!storeError && storeData) {
                setStoreId(storeData.id);
              }
            }
          }
        }
      }
    };
    
    checkUserType();
  }, [user]);

  // 상점 관리 링크 클릭 시 처리
  const handleStoreManagement = (e: React.MouseEvent) => {
    e.preventDefault();
    if (storeId) {
      router.push(`/store/${storeId}`);
    } else {
      router.push('/vendor/store');
    }
  };

  return (
    <nav className="bg-white shadow-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16">
          <div className="flex">
            <div className="flex-shrink-0 flex items-center">
              <Link href="/" className="text-xl font-bold text-blue-600">
                피에타
              </Link>
            </div>
            <div className="hidden sm:ml-6 sm:flex sm:space-x-8">
              <Link
                href="/"
                className="border-transparent text-gray-500 hover:border-gray-300 hover:text-gray-700 inline-flex items-center px-1 pt-1 border-b-2 text-sm font-medium"
              >
                홈
              </Link>
              {/* 추가 네비게이션 링크 */}
            </div>
          </div>
          <div className="hidden sm:ml-6 sm:flex sm:items-center sm:space-x-4">
            {!loading && user ? (
              <>
                {isVendor && isApproved && (
                  <a
                    href="#"
                    onClick={handleStoreManagement}
                    className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                  >
                    상점 관리
                  </a>
                )}
                <Link
                  href="/profile"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  내 프로필
                </Link>
                <Link
                  href="/logout"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  로그아웃
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="text-gray-500 hover:text-gray-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="bg-blue-600 text-white hover:bg-blue-700 px-3 py-2 rounded-md text-sm font-medium"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
          <div className="flex items-center sm:hidden">
            {/* 모바일 메뉴 버튼 */}
            <button
              type="button"
              className="inline-flex items-center justify-center p-2 rounded-md text-gray-400 hover:text-gray-500 hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-blue-500"
              aria-controls="mobile-menu"
              aria-expanded="false"
            >
              <span className="sr-only">메뉴 열기</span>
              {/* 아이콘 */}
              <svg
                className="block h-6 w-6"
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="2"
                  d="M4 6h16M4 12h16M4 18h16"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>

      {/* 모바일 메뉴 */}
      <div className="sm:hidden hidden" id="mobile-menu">
        <div className="pt-2 pb-3 space-y-1">
          <Link
            href="/"
            className="bg-blue-50 border-blue-500 text-blue-700 block pl-3 pr-4 py-2 border-l-4 text-base font-medium"
          >
            홈
          </Link>
          {/* 추가 모바일 네비게이션 링크 */}
        </div>
        <div className="pt-4 pb-3 border-t border-gray-200">
          <div className="space-y-1">
            {!loading && user ? (
              <>
                {isVendor && isApproved && (
                  <a
                    href="#"
                    onClick={handleStoreManagement}
                    className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                  >
                    상점 관리
                  </a>
                )}
                <Link
                  href="/profile"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                >
                  내 프로필
                </Link>
                <Link
                  href="/logout"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                >
                  로그아웃
                </Link>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                >
                  로그인
                </Link>
                <Link
                  href="/signup"
                  className="block pl-3 pr-4 py-2 border-l-4 border-transparent text-base font-medium text-gray-600 hover:bg-gray-50 hover:border-gray-300 hover:text-gray-800"
                >
                  회원가입
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
} 