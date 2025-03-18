'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, signOut, loading: authLoading } = useAuth();

  if (authLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold">프로젝트 피에타</h1>
          
          <div className="flex gap-4">
            {user ? (
              <>
                <Link
                  href="/storelist"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  상점 모아보기
                </Link>
                <button
                  onClick={signOut}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                >
                  로그아웃
                </button>
              </>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                >
                  로그인
                </Link>
                <Link
                  href="/register"
                  className="px-4 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
                >
                  회원가입
                </Link>
                <Link
                  href="/storelist"
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  상점 모아보기
                </Link>
              </>
            )}
          </div>
        </div>
        
        {/* 환영 메시지 */}
        <div className="bg-white rounded-lg shadow-md p-6 mb-8">
          <h2 className="text-2xl font-bold mb-4">
            {user ? `환영합니다, ${user.email}님!` : '강민수의 프로젝트입니다.'}
          </h2>
          <p className="text-gray-600">
            다양한 제품들을 둘러보고 마음에 드는 상품을 찾아보세요!
          </p>
        </div>
        
        {/* 메인 컨텐츠 섹션 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
          <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-4">제품 모아보기</h2>
            <p className="text-gray-600 text-center mb-6">
              모든 상점의 제품들을 한 눈에 확인하고 비교해보세요.
              각종 제품들을 카테고리별로 탐색할 수 있습니다.
            </p>
            <Link 
              href="/itemlist" 
              className="px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-flex items-center"
            >
              <span>제품 모아보기</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-8 flex flex-col items-center justify-center">
            <h2 className="text-2xl font-bold mb-4">상점 둘러보기</h2>
            <p className="text-gray-600 text-center mb-6">
              다양한 상점들을 둘러보고 원하는 제품을 찾아보세요.
              각 상점별로 특색있는 제품들을 만나볼 수 있습니다.
            </p>
            <Link 
              href="/storelist" 
              className="px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-flex items-center"
            >
              <span>상점 모아보기</span>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 ml-2" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M12.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
