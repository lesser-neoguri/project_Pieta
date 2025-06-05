'use client';

import { createContext, useContext, useEffect, useState, ReactNode, useRef, useCallback } from 'react';
import { Session, User } from '@supabase/supabase-js';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';

type AuthContextType = {
  user: User | null;
  session: Session | null;
  loading: boolean;
  signOut: () => Promise<void>;
  isDeletedAccount: boolean;
  deletedAccountInfo: {
    type: 'withdrawn' | 'soft_deleted' | 'hard_deleted' | null;
    remainingDays?: number;
    message?: string;
  };
  // 디버깅을 위한 추가 메서드들
  clearAllStorage: () => Promise<void>;
  forceRefreshSession: () => Promise<void>;
};

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isDeletedAccount, setIsDeletedAccount] = useState(false);
  const [deletedAccountInfo, setDeletedAccountInfo] = useState<{
    type: 'withdrawn' | 'soft_deleted' | 'hard_deleted' | null;
    remainingDays?: number;
    message?: string;
  }>({ type: null });

  // 성능 최적화를 위한 refs
  const deletedAccountCache = useRef<Map<string, { result: any; timestamp: number }>>(new Map());
  const lastCheckTime = useRef<number>(0);
  const isCheckingAccount = useRef<boolean>(false);
  const mounted = useRef<boolean>(true);

  // 디바운싱을 위한 타이머
  const debounceTimer = useRef<NodeJS.Timeout | null>(null);

  // 브라우저 저장소 완전 정리 함수
  const clearAllStorage = useCallback(async () => {
    console.log('🧹 모든 저장소 정리 중...');
    
    try {
      // Supabase 공식 로그아웃
      await supabase.auth.signOut();
      
      // 로컬 스토리지 정리
      if (typeof window !== 'undefined') {
        // Supabase 관련 키들 정리
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (
            key.startsWith('supabase.auth.token') ||
            key.startsWith('sb-') ||
            key.includes('auth') ||
            key.includes('session')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));
        
        // 세션 스토리지 정리
        keysToRemove.length = 0;
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (
            key.startsWith('supabase.auth.token') ||
            key.startsWith('sb-') ||
            key.includes('auth') ||
            key.includes('session')
          )) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => sessionStorage.removeItem(key));
        
        // 쿠키 정리 (Chrome 호환성 개선)
        const cookies = document.cookie.split(';');
        cookies.forEach(cookie => {
          const eqPos = cookie.indexOf('=');
          const name = eqPos > -1 ? cookie.substr(0, eqPos).trim() : cookie.trim();
          if (name.startsWith('sb-') || name.includes('auth') || name.includes('session')) {
            // 모든 가능한 도메인과 경로에서 쿠키 삭제
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=.localhost;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; domain=localhost;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; secure;`;
            document.cookie = `${name}=; expires=Thu, 01 Jan 1970 00:00:00 UTC; path=/; samesite=strict;`;
          }
        });
      }
      
      console.log('✅ 모든 저장소 정리 완료');
    } catch (error) {
      console.error('❌ 저장소 정리 중 오류:', error);
    }
  }, []);

  // 삭제된 계정인지 확인하는 함수 (캐싱 및 디바운싱 적용)
  const checkDeletedAccount = useCallback(async (userId: string) => {
    console.log('🔍 checkDeletedAccount: 시작', userId);
    
    // 중복 호출 방지
    if (isCheckingAccount.current) {
      console.log('🔍 checkDeletedAccount: 이미 확인 중이므로 스킵');
      return { isDeleted: false, shouldSignOut: false };
    }

    // 캐시 확인 (5분간 유효)
    const now = Date.now();
    const cached = deletedAccountCache.current.get(userId);
    if (cached && (now - cached.timestamp) < 5 * 60 * 1000) {
      console.log('🔍 checkDeletedAccount: 캐시된 결과 사용', cached.result);
      return cached.result;
    }

    // 너무 빈번한 호출 방지 (1초 쿨타임)
    if (now - lastCheckTime.current < 1000) {
      console.log('🔍 checkDeletedAccount: 쿨타임 중이므로 스킵');
      return { isDeleted: false, shouldSignOut: false };
    }

    isCheckingAccount.current = true;
    lastCheckTime.current = now;

    try {
      // 1. withdrawn_users 테이블에서 확인
      console.log('🔍 checkDeletedAccount: withdrawn_users 테이블 확인 중...');
      const { data: withdrawnUser } = await supabase
        .from('withdrawn_users')
        .select('*')
        .eq('user_id', userId)
        .single();

      console.log('🔍 checkDeletedAccount: withdrawn_users 결과:', withdrawnUser);

      if (withdrawnUser) {
        // 탈퇴 후 30일 계산
        const withdrawalDate = new Date(withdrawnUser.created_at);
        const thirtyDaysAfterWithdrawal = new Date(withdrawalDate);
        thirtyDaysAfterWithdrawal.setDate(withdrawalDate.getDate() + 30);
        
        const now = new Date();
        const diffTime = thirtyDaysAfterWithdrawal.getTime() - now.getTime();
        const remainingDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
        
        console.log('🔍 checkDeletedAccount: 탈퇴 계정 발견, 남은 일수:', remainingDays);
        
        if (mounted.current) {
          setIsDeletedAccount(true);
          setDeletedAccountInfo({
            type: 'withdrawn',
            remainingDays: remainingDays > 0 ? remainingDays : 0,
            message: remainingDays > 0 
              ? `계정 삭제 요청된 상태입니다. ${remainingDays}일 후 완전 삭제됩니다.`
              : '계정 삭제 요청된 상태입니다. 복구 기간이 만료되어 곧 완전 삭제됩니다.'
          });
        }
        
        const result = { isDeleted: true, shouldSignOut: false };
        deletedAccountCache.current.set(userId, { result, timestamp: Date.now() });
        console.log('🔍 checkDeletedAccount: withdrawn 계정 반환값:', result);
        return result; // 세션 유지
      }

      // 2. users 테이블에서 확인
      console.log('🔍 checkDeletedAccount: users 테이블 확인 중...');
      const { data: userData, error: userError } = await supabase
        .from('users')
        .select('deleted_at')
        .eq('id', userId)
        .single();

      console.log('🔍 checkDeletedAccount: users 테이블 결과:', { userData, userError });

      // 완전히 삭제된 계정 또는 접근 불가능한 계정
      if (userError) {
        console.log('🔍 checkDeletedAccount: users 테이블 오류 발생 - 완전 삭제된 계정으로 처리:', userError);
        if (mounted.current) {
          setIsDeletedAccount(true);
          setDeletedAccountInfo({
            type: 'hard_deleted',
            message: '완전 삭제된 계정입니다. 로그인할 수 없습니다.'
          });
        }
        const result = { isDeleted: true, shouldSignOut: true };
        deletedAccountCache.current.set(userId, { result, timestamp: Date.now() });
        console.log('🔍 checkDeletedAccount: hard_deleted 계정 반환값:', result);
        return result; // 강제 로그아웃
      }

      // 소프트 삭제된 계정
      if (userData?.deleted_at) {
        console.log('🔍 checkDeletedAccount: 소프트 삭제된 계정');
        if (mounted.current) {
          setIsDeletedAccount(true);
          setDeletedAccountInfo({
            type: 'soft_deleted',
            message: '소프트 삭제된 계정입니다.'
          });
        }
        const result = { isDeleted: true, shouldSignOut: false };
        deletedAccountCache.current.set(userId, { result, timestamp: Date.now() });
        console.log('🔍 checkDeletedAccount: soft_deleted 계정 반환값:', result);
        return result; // 세션 유지
      }

      // 정상 계정
      console.log('🔍 checkDeletedAccount: 정상 계정');
      if (mounted.current) {
        setIsDeletedAccount(false);
        setDeletedAccountInfo({ type: null });
      }
      const result = { isDeleted: false, shouldSignOut: false };
      deletedAccountCache.current.set(userId, { result, timestamp: Date.now() });
      console.log('🔍 checkDeletedAccount: 정상 계정 반환값:', result);
      return result;
    } catch (error) {
      console.error('🔍 checkDeletedAccount: 삭제된 계정 확인 중 예외 발생:', error);
      if (mounted.current) {
        setDeletedAccountInfo({ type: null });
      }
      const result = { isDeleted: false, shouldSignOut: false };
      console.log('🔍 checkDeletedAccount: 예외 처리 반환값:', result);
      return result;
    } finally {
      isCheckingAccount.current = false;
    }
  }, []);

  // 세션 강제 새로고침 함수
  const forceRefreshSession = useCallback(async () => {
    console.log('🔄 세션 강제 새로고침...');
    try {
      const { data, error } = await supabase.auth.refreshSession();
      if (error) {
        console.error('❌ 세션 새로고침 실패:', error);
        await clearAllStorage();
      } else {
        console.log('✅ 세션 새로고침 성공');
      }
    } catch (error) {
      console.error('❌ 세션 새로고침 예외:', error);
      await clearAllStorage();
    }
  }, [clearAllStorage]);

  useEffect(() => {
    mounted.current = true;
    
    // 현재 세션 가져오기
    const getSession = async () => {
      console.log('🔍 AuthContext: 현재 세션 확인 중...');
      
      // 개발 환경에서 디바운싱 적용
      if (process.env.NODE_ENV === 'development') {
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        
        debounceTimer.current = setTimeout(async () => {
          await performSessionCheck();
        }, 100);
      } else {
        await performSessionCheck();
      }
    };

    const performSessionCheck = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        console.log('🔍 AuthContext: 세션 조회 결과:', { session: session?.user?.email, error });
        
        if (!mounted.current) return;
        
        if (session?.user) {
          console.log('👤 AuthContext: 사용자 세션 발견, 삭제 상태 확인 중...', session.user.email);
          const { isDeleted, shouldSignOut } = await checkDeletedAccount(session.user.id);
          console.log('🔍 AuthContext: 삭제 상태 확인 결과:', { isDeleted, shouldSignOut });
          
          if (!mounted.current) return;
          
          if (shouldSignOut) {
            console.log('🚪 AuthContext: 완전 삭제된 계정 - 강제 로그아웃');
            await clearAllStorage();
            setSession(null);
            setUser(null);
            setIsDeletedAccount(false);
            setDeletedAccountInfo({ type: null });
          } else {
            console.log('✅ AuthContext: 세션 설정 완료');
            setSession(session);
            setUser(session.user);
          }
        } else {
          console.log('❌ AuthContext: 세션 없음');
          setSession(null);
          setUser(null);
          setIsDeletedAccount(false);
          setDeletedAccountInfo({ type: null });
        }
        
        setLoading(false);
      } catch (error) {
        console.error('❌ AuthContext: 세션 확인 중 오류:', error);
        if (mounted.current) {
          setLoading(false);
          setSession(null);
          setUser(null);
        }
      }
    };

    getSession();

    // 인증 상태 변경 리스너 (디바운싱 적용)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: 인증 상태 변경 감지:', event, session?.user?.email);
        
        if (!mounted.current) return;
        
        // 개발 환경에서는 디바운싱을 더 길게 적용
        const debounceTime = process.env.NODE_ENV === 'development' ? 300 : 100;
        
        if (debounceTimer.current) {
          clearTimeout(debounceTimer.current);
        }
        
        debounceTimer.current = setTimeout(async () => {
          if (!mounted.current) return;
          
          try {
            if (session?.user) {
              console.log('👤 AuthContext: 새 세션 감지, 삭제 상태 확인 중...', session.user.email);
              const { isDeleted, shouldSignOut } = await checkDeletedAccount(session.user.id);
              console.log('🔍 AuthContext: 삭제 상태 확인 결과:', { isDeleted, shouldSignOut });
              
              if (!mounted.current) return;
              
              if (shouldSignOut) {
                console.log('🚪 AuthContext: 완전 삭제된 계정 - 강제 로그아웃');
                await clearAllStorage();
                setSession(null);
                setUser(null);
                setIsDeletedAccount(false);
                setDeletedAccountInfo({ type: null });
              } else {
                console.log('✅ AuthContext: 새 세션 설정 완료');
                setSession(session);
                setUser(session.user);
              }
            } else {
              console.log('❌ AuthContext: 세션 제거됨');
              setSession(null);
              setUser(null);
              setIsDeletedAccount(false);
              setDeletedAccountInfo({ type: null });
            }
            setLoading(false);
          } catch (error) {
            console.error('❌ AuthContext: 인증 상태 변경 처리 중 오류:', error);
            if (mounted.current) {
              setLoading(false);
            }
          }
        }, debounceTime);
      }
    );

    return () => {
      mounted.current = false;
      if (debounceTimer.current) {
        clearTimeout(debounceTimer.current);
      }
      subscription.unsubscribe();
    };
  }, [checkDeletedAccount, clearAllStorage]);

  const signOut = async () => {
    console.log('🚪 로그아웃 시작...');
    try {
      // 캐시 정리
      deletedAccountCache.current.clear();
      
      // 완전한 저장소 정리
      await clearAllStorage();
      
      // 상태 초기화
      setIsDeletedAccount(false);
      setDeletedAccountInfo({ type: null });
      setSession(null);
      setUser(null);
      
      console.log('✅ 로그아웃 완료');
    } catch (error) {
      console.error('❌ 로그아웃 중 오류:', error);
    }
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isDeletedAccount,
    deletedAccountInfo,
    clearAllStorage,
    forceRefreshSession,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
} 