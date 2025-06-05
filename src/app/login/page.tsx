'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/contexts/AuthContext';
import MainLayout from '@/components/layout/MainLayout';

export default function LoginPage() {
  const router = useRouter();
  const { clearAllStorage, forceRefreshSession } = useAuth();
  const [formData, setFormData] = useState({
    email: '',
    password: '',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [debugInfo, setDebugInfo] = useState<string>('');
  const [showDebug, setShowDebug] = useState(false);
  
  // 토스터 알림 상태
  const [toast, setToast] = useState<{
    show: boolean;
    message: string;
    type: 'success' | 'error' | 'info';
  }>({
    show: false,
    message: '',
    type: 'info'
  });

  // 토스터 표시 함수
  const showToast = (message: string, type: 'success' | 'error' | 'info' = 'info') => {
    setToast({ show: true, message, type });
    setTimeout(() => {
      setToast(prev => ({ ...prev, show: false }));
    }, 3000);
  };

  // 브라우저 및 환경 정보 수집
  useEffect(() => {
    if (typeof window !== 'undefined') {
      const browserInfo = {
        userAgent: navigator.userAgent,
        isChrome: /Chrome/.test(navigator.userAgent) && /Google Inc/.test(navigator.vendor),
        isEdge: /Edg/.test(navigator.userAgent),
        cookieEnabled: navigator.cookieEnabled,
        storageAvailable: {
          localStorage: (() => {
            try {
              localStorage.setItem('test', 'test');
              localStorage.removeItem('test');
              return true;
            } catch {
              return false;
            }
          })(),
          sessionStorage: (() => {
            try {
              sessionStorage.setItem('test', 'test');
              sessionStorage.removeItem('test');
              return true;
            } catch {
              return false;
            }
          })(),
        }
      };

      const debugText = `브라우저: ${browserInfo.isChrome ? 'Chrome' : browserInfo.isEdge ? 'Edge' : 'Other'}
쿠키 지원: ${browserInfo.cookieEnabled}
로컬 스토리지: ${browserInfo.storageAvailable.localStorage}
세션 스토리지: ${browserInfo.storageAvailable.sessionStorage}
환경: ${process.env.NODE_ENV}`;

      setDebugInfo(debugText);
      console.log('🔍 로그인 페이지 - 브라우저 정보:', browserInfo);
    }
  }, []);

  // 저장소 정리 함수
  const handleClearStorage = async () => {
    console.log('🧹 수동 저장소 정리 시작...');
    try {
      await clearAllStorage();
      setError(null);
      showToast('저장소가 정리되었습니다. 다시 로그인을 시도해보세요.', 'success');
    } catch (error) {
      console.error('❌ 저장소 정리 실패:', error);
      showToast('저장소 정리 중 오류가 발생했습니다.', 'error');
    }
  };

  // 세션 강제 새로고침 함수
  const handleRefreshSession = async () => {
    console.log('🔄 수동 세션 새로고침 시작...');
    try {
      await forceRefreshSession();
      showToast('세션이 새로고침되었습니다.', 'success');
    } catch (error) {
      console.error('❌ 세션 새로고침 실패:', error);
      showToast('세션 새로고침 중 오류가 발생했습니다.', 'error');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const startTime = Date.now();
    console.log('🔐 로그인 시도 시작:', {
      email: formData.email,
      timestamp: new Date().toISOString(),
      userAgent: navigator.userAgent,
    });

    try {
      // 로그인 전 현재 상태 확인
      const { data: currentSession } = await supabase.auth.getSession();
      console.log('🔍 로그인 전 현재 세션:', currentSession.session?.user?.email || '없음');

      const { data, error } = await supabase.auth.signInWithPassword({
        email: formData.email,
        password: formData.password,
      });

      const duration = Date.now() - startTime;
      console.log('🔐 로그인 응답 수신:', {
        duration: `${duration}ms`,
        success: !error,
        error: error?.message,
        sessionExists: !!data.session,
        userEmail: data.session?.user?.email,
      });

      if (error) {
        console.log('❌ 로그인 실패 상세:', {
          errorCode: error.message,
          errorName: error.name,
          cause: error.cause,
        });
        
        // Chrome에서 자주 발생하는 특정 오류들에 대한 대응
        if (error.message.includes('Invalid login credentials')) {
          setError('이메일 또는 비밀번호가 올바르지 않습니다.');
        } else if (error.message.includes('too_many_requests')) {
          setError('너무 많은 로그인 시도가 있었습니다. 잠시 후 다시 시도해주세요.');
        } else if (error.message.includes('network') || error.message.includes('fetch')) {
          setError('네트워크 오류가 발생했습니다. 브라우저 캐시를 정리하고 다시 시도해주세요.');
        } else {
          setError('로그인 중 오류가 발생했습니다. 다시 시도해주세요.');
        }
        return;
      }

      if (!data.session) {
        console.log('⚠️ 로그인 성공했지만 세션이 없음');
        setError('로그인은 성공했지만 세션 생성에 실패했습니다. 브라우저 설정을 확인해주세요.');
        return;
      }

      console.log('✅ 로그인 성공! 상세 정보:', {
        userId: data.session.user.id,
        email: data.session.user.email,
        accessToken: data.session.access_token ? '존재함' : '없음',
        refreshToken: data.session.refresh_token ? '존재함' : '없음',
        expiresAt: data.session.expires_at,
      });

      // 로그인 성공 후 잠시 대기 (Chrome에서 상태 동기화 시간 확보)
      await new Promise(resolve => setTimeout(resolve, 100));

      console.log('🏠 메인 페이지로 이동 시작...');
      router.push('/');
    } catch (error: any) {
      const duration = Date.now() - startTime;
      console.log('💥 로그인 예외 발생:', {
        duration: `${duration}ms`,
        error: error.message,
        stack: error.stack,
        name: error.name,
      });
      
      if (error.name === 'AbortError') {
        setError('요청이 중단되었습니다. 다시 시도해주세요.');
      } else if (error.message.includes('fetch')) {
        setError('네트워크 연결을 확인하고 다시 시도해주세요.');
      } else {
        setError('로그인 중 예상치 못한 오류가 발생했습니다. 페이지를 새로고침하고 다시 시도해주세요.');
      }
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
    <MainLayout centered={false}>
      <div className="flex items-center justify-center px-4" style={{ minHeight: 'calc(100vh - 6rem)' }}>
        <div className="w-full max-w-sm py-12">
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

          {/* 개발 환경에서만 표시되는 디버깅 도구 */}
          {process.env.NODE_ENV === 'development' && (
            <div className="mt-16 mb-32 relative">
              {/* 디버깅 도구 토글 버튼 */}
              <button
                onClick={() => setShowDebug(!showDebug)}
                className={`
                  w-full text-left transition-all duration-200 ease-out
                  ${showDebug ? 'text-black' : 'text-gray-400 hover:text-gray-600'}
                `}
              >
                <div className="flex items-center justify-between pb-3 border-b border-gray-200">
                  <div className="flex items-center space-x-3">
                    <div className={`
                      w-2 h-2 transition-transform duration-200
                      ${showDebug ? 'rotate-45 bg-black' : 'bg-gray-400'}
                    `} />
                    <div>
                      <div className="text-xs font-medium tracking-widest uppercase">
                        Developer Tools
                      </div>
                    </div>
                  </div>
                  <div className="text-xs tracking-wider opacity-60">
                    {showDebug ? '숨기기' : '표시'}
                  </div>
                </div>
              </button>
              
              {/* 디버깅 도구 콘텐츠 */}
              <div className={`
                overflow-hidden transition-all duration-300 ease-out
                ${showDebug 
                  ? 'max-h-[32rem] opacity-100 mt-6' 
                  : 'max-h-0 opacity-0'
                }
              `}>
                <div className="space-y-6">
                  {/* 시스템 정보 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-3 tracking-widest uppercase">
                      시스템 정보
                    </h3>
                    <div className="bg-gray-50 p-4 border border-gray-200">
                      <pre className="text-xs text-gray-600 font-mono leading-relaxed whitespace-pre-line">
                        {debugInfo}
                      </pre>
                    </div>
                  </div>
                  
                  {/* 액션 버튼들 */}
                  <div>
                    <h3 className="text-xs font-medium text-gray-500 mb-4 tracking-widest uppercase">
                      복구 도구
                    </h3>
                    
                    <div className="space-y-3">
                      <button
                        onClick={handleClearStorage}
                        className="w-full text-left p-3 border border-gray-300 hover:border-black hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-gray-900">저장소 정리</div>
                            <div className="text-xs text-gray-500 mt-0.5">모든 캐시와 세션 데이터 삭제</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={handleRefreshSession}
                        className="w-full text-left p-3 border border-gray-200 hover:border-gray-400 hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-gray-900">세션 새로고침</div>
                            <div className="text-xs text-gray-500 mt-0.5">인증 토큰 갱신</div>
                          </div>
                        </div>
                      </button>
                      
                      <button
                        onClick={() => window.location.reload()}
                        className="w-full text-left p-3 border border-gray-200 hover:border-gray-300 hover:bg-gray-50 transition-all duration-200"
                      >
                        <div className="flex items-center space-x-3">
                          <svg className="w-4 h-4 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
                          </svg>
                          <div>
                            <div className="text-sm font-medium text-gray-900">페이지 재로드</div>
                            <div className="text-xs text-gray-500 mt-0.5">전체 페이지 재로드</div>
                          </div>
                        </div>
                      </button>
                    </div>
                  </div>
                  
                  {/* 도움말 */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="text-xs text-gray-500 leading-relaxed">
                      <strong>문제 해결 순서:</strong><br/>
                      1. 저장소 정리 → 2. 세션 새로고침 → 3. 페이지 재로드<br/>
                      문제가 지속되면 Chrome 쿠키 설정을 확인하거나 시크릿 모드를 사용하세요.
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 토스터 알림 */}
      <div className={`
        fixed top-6 left-1/2 transform -translate-x-1/2 z-50
        transition-all duration-200 ease-out
        ${toast.show 
          ? 'translate-y-0 opacity-100' 
          : '-translate-y-full opacity-0 pointer-events-none'
        }
      `}>
        <div className={`
          px-4 py-3 border min-w-80 bg-white
          flex items-center space-x-3
          ${toast.type === 'success' 
            ? 'border-black text-gray-900' 
            : toast.type === 'error'
            ? 'border-red-500 text-red-900'
            : 'border-gray-400 text-gray-900'
          }
        `}>
          <div className="text-sm">{toast.message}</div>
        </div>
      </div>
    </MainLayout>
  );
} 