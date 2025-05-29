'use client';

import { useState, useEffect } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';

type AccountInfo = {
  userId: string;
  email: string;
  withdrawnAt: string;
  deletionDate: string;
  canReactivate: boolean;
};

export default function AccountReactivatePage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [accountInfo, setAccountInfo] = useState<AccountInfo | null>(null);
  const [remainingDays, setRemainingDays] = useState(0);
  const [checkingAccount, setCheckingAccount] = useState(false);

  // URL에서 이메일 파라미터 가져오기
  useEffect(() => {
    const emailParam = searchParams?.get('email');
    if (emailParam) {
      setEmail(emailParam);
      checkWithdrawnStatus(emailParam);
    }
  }, [searchParams]);

  // 탈퇴 상태 및 복구 가능 여부 확인
  const checkWithdrawnStatus = async (userEmail: string) => {
    try {
      setCheckingAccount(true);
      setError(null);

      const { data: withdrawnUser, error: withdrawnError } = await supabase
        .from('withdrawn_users')
        .select('*')
        .eq('email', userEmail.toLowerCase())
        .single();

      if (withdrawnError && withdrawnError.code !== 'PGRST116') {
        throw withdrawnError;
      }

      if (!withdrawnUser) {
        setError('탈퇴한 계정이 아니거나 찾을 수 없는 계정입니다.');
        return;
      }

      // 복구 가능 여부 확인 (탈퇴 후 30일 이내)
      const withdrawalDate = new Date(withdrawnUser.created_at);
      const thirtyDaysAfterWithdrawal = new Date(withdrawalDate);
      thirtyDaysAfterWithdrawal.setDate(withdrawalDate.getDate() + 30);
      
      const now = new Date();
      const canReactivate = now < thirtyDaysAfterWithdrawal;
      
      if (!canReactivate) {
        setError('이 계정은 복구 기간(30일)이 만료되어 더 이상 복구할 수 없습니다.');
        setTimeout(() => {
          router.push('/signup');
        }, 5000);
        return;
      }

      // 남은 일수 계산
      const diffTime = thirtyDaysAfterWithdrawal.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      setRemainingDays(diffDays);

      setAccountInfo({
        userId: withdrawnUser.user_id,
        email: userEmail,
        withdrawnAt: withdrawnUser.created_at,
        deletionDate: thirtyDaysAfterWithdrawal.toISOString(),
        canReactivate: true
      });

    } catch (err: any) {
      console.error('탈퇴 상태 확인 오류:', err);
      setError('계정 상태를 확인하는 중 오류가 발생했습니다.');
    } finally {
      setCheckingAccount(false);
    }
  };

  // 계정 복구 처리
  const handleReactivate = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!email || !password) {
      setError('이메일과 기존 비밀번호를 모두 입력해주세요.');
      return;
    }

    if (!accountInfo) {
      setError('계정 정보를 확인할 수 없습니다.');
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 1. 먼저 기존 비밀번호로 로그인 시도하여 비밀번호 확인
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email: accountInfo.email,
        password: password,
      });

      if (signInError) {
        throw new Error('기존 비밀번호가 올바르지 않습니다. 탈퇴 전에 사용하던 비밀번호를 입력해주세요.');
      }

      // 2. 로그인 성공 시 로그아웃 (복구 과정을 위해)
      await supabase.auth.signOut();

      // 3. withdrawn_users 테이블에서 레코드 삭제
      const { error: deleteError } = await supabase
        .from('withdrawn_users')
        .delete()
        .eq('user_id', accountInfo.userId);

      if (deleteError) throw deleteError;

      // 4. users 테이블의 deleted_at 필드 null로 설정 (소프트 삭제 해제)
      const { error: updateError } = await supabase
        .from('users')
        .update({ deleted_at: null })
        .eq('id', accountInfo.userId);

      if (updateError) throw updateError;

      setSuccess(true);
      
      // 성공 메시지 표시 후 로그인 페이지로 리다이렉트
      setTimeout(() => {
        router.push('/login');
      }, 3000);

    } catch (err: any) {
      console.error('계정 복구 오류:', err);
      setError(err.message || '계정 복구 처리 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <MainLayout>
        <div className="w-full max-w-md">
          <div className="text-center">
            <div className="w-16 h-16 mx-auto rounded-full bg-green-100 flex items-center justify-center mb-4">
              <svg className="w-8 h-8 text-green-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <h1 className="text-xl font-medium mb-4 text-green-600">계정 복구 완료</h1>
            <p className="text-gray-700 text-sm leading-relaxed mb-6">
              계정이 성공적으로 복구되었습니다. 기존 비밀번호로 로그인해주세요.
            </p>
            <p className="text-sm text-gray-500">
              3초 후 로그인 페이지로 이동합니다...
            </p>
          </div>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout>
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-xl font-light tracking-[0.2em] uppercase mb-3">계정 복구</h1>
          <p className="text-sm text-gray-500">탈퇴한 계정을 복구합니다</p>
        </div>

        {checkingAccount ? (
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black mx-auto mb-4"></div>
            <p className="text-gray-500">계정 정보를 확인 중입니다...</p>
          </div>
        ) : accountInfo ? (
          <div className="space-y-6">
            {/* 계정 정보 표시 */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <h3 className="text-sm font-medium text-blue-800 mb-2">복구 가능한 계정</h3>
              <div className="text-sm text-blue-700 space-y-1">
                <p><strong>이메일:</strong> {accountInfo.email}</p>
                <p><strong>탈퇴일:</strong> {new Date(accountInfo.withdrawnAt).toLocaleDateString('ko-KR')}</p>
                <p><strong>복구 가능 기간:</strong> {remainingDays}일 남음</p>
              </div>
            </div>

            <form onSubmit={handleReactivate} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-0 border-b border-gray-200 py-3 px-0 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-0 text-sm transition-colors"
                  placeholder="이메일을 입력하세요"
                  disabled
                />
              </div>

              <div>
                <label 
                  htmlFor="password" 
                  className="block text-xs font-medium tracking-widest uppercase text-gray-500 mb-2"
                >
                  기존 비밀번호
                </label>
                <input
                  id="password"
                  name="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full border-0 border-b border-gray-200 py-3 px-0 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-0 text-sm transition-colors"
                  placeholder="기존 비밀번호를 입력하세요"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-black text-white py-3 px-4 text-sm font-medium tracking-widest uppercase hover:bg-gray-900 transition-colors disabled:bg-gray-400"
              >
                {loading ? '복구 중...' : '계정 복구하기'}
              </button>
            </form>
          </div>
        ) : (
          <div className="space-y-6">
            <form onSubmit={(e) => {
              e.preventDefault();
              if (email) {
                checkWithdrawnStatus(email);
              }
            }} className="space-y-6">
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
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full border-0 border-b border-gray-200 py-3 px-0 text-gray-900 placeholder:text-gray-400 focus:border-black focus:ring-0 text-sm transition-colors"
                  placeholder="복구할 계정의 이메일을 입력하세요"
                />
              </div>

              {error && (
                <div className="text-sm text-red-600 text-center">
                  {error}
                </div>
              )}

              <button
                type="submit"
                disabled={checkingAccount}
                className="w-full bg-black text-white py-3 px-4 text-sm font-medium tracking-widest uppercase hover:bg-gray-900 transition-colors disabled:bg-gray-400"
              >
                {checkingAccount ? '확인 중...' : '계정 확인하기'}
              </button>
            </form>
          </div>
        )}

        <div className="mt-8 text-center space-y-4">
          <div className="text-sm text-gray-500">
            <Link href="/login" className="text-black hover:underline">
              로그인으로 돌아가기
            </Link>
          </div>
          
          <div className="text-sm text-gray-500">
            계정이 없으신가요?{' '}
            <Link href="/signup" className="text-black hover:underline">
              새 계정으로 가입하기
            </Link>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 