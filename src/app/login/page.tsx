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

    try {
      const { error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      if (error) throw error;

      router.push('/');
    } catch (error: any) {
      setError('이메일 또는 비밀번호가 올바르지 않습니다.');
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
              {error}
            </div>
          )}

          <div className="pt-6">
            <button
              type="submit"
              disabled={loading}
              className="w-full py-4 px-4 border border-black bg-black text-white hover:bg-white hover:text-black transition-colors duration-200 text-sm uppercase tracking-widest font-medium disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? '로그인 중...' : '로그인'}
            </button>
          </div>
        </form>

        <div className="mt-12 space-y-4 text-center">
          <Link 
            href="/forgot-password"
            className="block text-xs text-gray-500 hover:text-black uppercase tracking-widest transition-colors"
          >
            비밀번호를 잊으셨나요?
          </Link>
          <div className="text-sm text-gray-500">
            계정이 없으신가요?{' '}
            <Link 
              href="/signup"
              className="text-black hover:opacity-70 transition-opacity"
            >
              회원가입
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 