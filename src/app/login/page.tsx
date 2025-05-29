'use client';

import { useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

export default function LoginPage() {
  const router = useRouter();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    console.log('🔐 로그인 시도:', formData.email);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      console.log('🔐 로그인 응답:', { data, error });

      if (error) {
        console.log('❌ 로그인 실패:', error.message);
        // 로그인 실패 시 일반적인 오류 메시지만 표시
        if (error.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else {
          setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
        return;
      }

      console.log('✅ 로그인 성공! 메인 페이지로 이동합니다.');
      // 로그인 성공 시 메인 페이지로 이동
      router.push('/');
    } catch (error: any) {
      console.log('💥 로그인 예외 발생:', error);
      setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData(prev => ({
      ...prev,
      [e.target.name]: e.target.value
    }));
  };

  return (
    <MainLayout>
      <div className="w-full max-w-sm">
        <div className="text-center mb-12">
          <h1 className="text-xl font-light tracking-[0.2em] uppercase mb-3">로그인</h1>
          <p className="text-sm text-gray-500">계정에 로그인하세요</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-8">
          <div>
            <label 
              htmlFor="email" 
              className="block text-xs font-medium tracking-widest uppercase text-gray-500 mb-2"
            >
              이메일
            </label>
            <input
              id="email"
              name="email"
              type="email"
              required
              value={formData.email}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 py-3 px-0 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-0 text-sm transition-colors"
              placeholder="이메일을 입력하세요"
            />
          </div>

          <div>
            <label 
              htmlFor="password" 
              className="block text-xs font-medium tracking-widest uppercase text-gray-500 mb-2"
            >
              비밀번호
            </label>
            <input
              id="password"
              name="password"
              type="password"
              required
              value={formData.password}
              onChange={handleChange}
              className="w-full border-0 border-b border-gray-200 py-3 px-0 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-0 text-sm transition-colors"
              placeholder="비밀번호를 입력하세요"
            />
          </div>

          {error && (
            <div className="text-sm text-red-600 text-center">
              <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                <div className="flex items-start space-x-2">
                  <svg className="w-5 h-5 text-red-500 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-red-800 font-medium text-left">{error}</p>
                  </div>
                </div>
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-black text-white py-3 px-4 text-sm font-medium tracking-widest uppercase hover:bg-gray-900 transition-colors disabled:bg-gray-400"
          >
            {loading ? '로그인 중...' : '로그인'}
          </button>
        </form>

        <div className="mt-8 text-center space-y-4">
          <div className="text-sm text-gray-500">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-black hover:underline">
              회원가입
            </Link>
          </div>
          
          <div className="text-sm text-gray-500">
            <Link href="/account/reactivate" className="text-gray-600 hover:text-black">
              삭제된 계정 복구하기
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 