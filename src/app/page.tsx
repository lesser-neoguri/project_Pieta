'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

export default function Home() {
  const { user, signOut, loading } = useAuth();

  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-8">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-8">
      <h1 className="text-3xl font-bold mb-4">프로젝트 피에타</h1>
      
      {user ? (
        <div className="text-center">
          <p className="text-lg mb-4">환영합니다, {user.email}님!</p>
          <div className="flex flex-col gap-4 items-center">
            <Link
              href="/storelist"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors mb-2"
            >
              상점 모아보기
            </Link>
            <button
              onClick={signOut}
              className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
            >
              로그아웃
            </button>
          </div>
        </div>
      ) : (
        <div className="text-center">
          <p className="text-lg mb-6">강민수의 프로젝트입니다.</p>
          <div className="flex gap-4 mb-4">
            <Link
              href="/login"
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
            >
              로그인
            </Link>
            <Link
              href="/register"
              className="px-6 py-2 border border-blue-600 text-blue-600 rounded-md hover:bg-blue-50 transition-colors"
            >
              회원가입
            </Link>
          </div>
          <div>
            <Link
              href="/storelist"
              className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              상점 모아보기
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
