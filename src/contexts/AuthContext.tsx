'use client';

import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
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

  // 삭제된 계정인지 확인하는 함수
  const checkDeletedAccount = async (userId: string) => {
    console.log('🔍 checkDeletedAccount: 시작', userId);
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
        
        setIsDeletedAccount(true);
        setDeletedAccountInfo({
          type: 'withdrawn',
          remainingDays: remainingDays > 0 ? remainingDays : 0,
          message: remainingDays > 0 
            ? `계정 삭제 요청된 상태입니다. ${remainingDays}일 후 완전 삭제됩니다.`
            : '계정 삭제 요청된 상태입니다. 복구 기간이 만료되어 곧 완전 삭제됩니다.'
        });
        const result = { isDeleted: true, shouldSignOut: false };
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
      // 모든 오류를 완전 삭제된 계정으로 처리 (404, 406, 권한 오류 등)
      if (userError) {
        console.log('🔍 checkDeletedAccount: users 테이블 오류 발생 - 완전 삭제된 계정으로 처리:', userError);
        setIsDeletedAccount(true);
        setDeletedAccountInfo({
          type: 'hard_deleted',
          message: '완전 삭제된 계정입니다. 로그인할 수 없습니다.'
        });
        const result = { isDeleted: true, shouldSignOut: true };
        console.log('🔍 checkDeletedAccount: hard_deleted 계정 반환값:', result);
        return result; // 강제 로그아웃
      }

      // 소프트 삭제된 계정
      if (userData?.deleted_at) {
        console.log('🔍 checkDeletedAccount: 소프트 삭제된 계정');
        setIsDeletedAccount(true);
        setDeletedAccountInfo({
          type: 'soft_deleted',
          message: '소프트 삭제된 계정입니다.'
        });
        const result = { isDeleted: true, shouldSignOut: false };
        console.log('🔍 checkDeletedAccount: soft_deleted 계정 반환값:', result);
        return result; // 세션 유지
      }

      // 정상 계정
      console.log('🔍 checkDeletedAccount: 정상 계정');
      setIsDeletedAccount(false);
      setDeletedAccountInfo({ type: null });
      const result = { isDeleted: false, shouldSignOut: false };
      console.log('🔍 checkDeletedAccount: 정상 계정 반환값:', result);
      return result;
    } catch (error) {
      console.error('🔍 checkDeletedAccount: 삭제된 계정 확인 중 예외 발생:', error);
      setDeletedAccountInfo({ type: null });
      const result = { isDeleted: false, shouldSignOut: false };
      console.log('🔍 checkDeletedAccount: 예외 처리 반환값:', result);
      return result;
    }
  };

  useEffect(() => {
    // 현재 세션 가져오기
    const getSession = async () => {
      console.log('🔍 AuthContext: 현재 세션 확인 중...');
      const { data: { session }, error } = await supabase.auth.getSession();
      console.log('🔍 AuthContext: 세션 조회 결과:', { session: session?.user?.email, error });
      
      if (session?.user) {
        console.log('👤 AuthContext: 사용자 세션 발견, 삭제 상태 확인 중...', session.user.email);
        const { isDeleted, shouldSignOut } = await checkDeletedAccount(session.user.id);
        console.log('🔍 AuthContext: 삭제 상태 확인 결과:', { isDeleted, shouldSignOut });
        
        if (shouldSignOut) {
          console.log('🚪 AuthContext: 완전 삭제된 계정 - 강제 로그아웃');
          // 완전히 삭제된 계정은 강제 로그아웃
          await supabase.auth.signOut();
          setSession(null);
          setUser(null);
          setIsDeletedAccount(false);
          setDeletedAccountInfo({ type: null });
        } else {
          console.log('✅ AuthContext: 세션 설정 완료');
          // 정상 계정이거나 복구 가능한 삭제 계정
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
    };

    getSession();

    // 인증 상태 변경 리스너
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        console.log('🔄 AuthContext: 인증 상태 변경 감지:', event, session?.user?.email);
        
        if (session?.user) {
          console.log('👤 AuthContext: 새 세션 감지, 삭제 상태 확인 중...', session.user.email);
          const { isDeleted, shouldSignOut } = await checkDeletedAccount(session.user.id);
          console.log('🔍 AuthContext: 삭제 상태 확인 결과:', { isDeleted, shouldSignOut });
          
          if (shouldSignOut) {
            console.log('🚪 AuthContext: 완전 삭제된 계정 - 강제 로그아웃');
            // 완전히 삭제된 계정은 강제 로그아웃
            await supabase.auth.signOut();
            setSession(null);
            setUser(null);
            setIsDeletedAccount(false);
            setDeletedAccountInfo({ type: null });
          } else {
            console.log('✅ AuthContext: 새 세션 설정 완료');
            // 정상 계정이거나 복구 가능한 삭제 계정
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
      }
    );

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const signOut = async () => {
    await supabase.auth.signOut();
    setIsDeletedAccount(false);
    setDeletedAccountInfo({ type: null });
  };

  const value = {
    user,
    session,
    loading,
    signOut,
    isDeletedAccount,
    deletedAccountInfo,
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