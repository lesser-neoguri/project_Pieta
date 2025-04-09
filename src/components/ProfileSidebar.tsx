'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useProfile } from '@/contexts/ProfileContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';
import Image from 'next/image';

type UserData = {
  id: string;
  email: string;
  phone?: string;
  user_type: 'regular' | 'vendor';
  is_active: boolean;
  created_at: string;
  name?: string;
};

type RegularUserData = {
  user_id: string;
  name: string;
  birth_date?: string;
  gender?: 'male' | 'female' | 'other';
  address?: string;
  created_at: string;
};

type VendorUserData = {
  user_id: string;
  business_name: string;
  business_number: string;
  representative_name: string;
  business_category?: string;
  address: string;
  status: 'pending' | 'approved' | 'rejected';
  approval_date?: string;
  rejection_reason?: string;
  created_at: string;
};

export default function ProfileSidebar() {
  const { user, loading, signOut } = useAuth();
  const { isProfileOpen, closeProfile } = useProfile();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [regularUserData, setRegularUserData] = useState<RegularUserData | null>(null);
  const [vendorUserData, setVendorUserData] = useState<VendorUserData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchUserData = async () => {
      if (!user) return;

      try {
        setLoadingProfile(true);
        setError(null);

        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;
        if (!userData) throw new Error('사용자 정보를 찾을 수 없습니다.');

        setUserData(userData as UserData);
        
        if (userData.user_type === 'regular') {
          const { data: regularData, error: regularError } = await supabase
            .from('regular_users')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (regularError) throw regularError;
          setRegularUserData(regularData as RegularUserData);
        } else if (userData.user_type === 'vendor') {
          const { data: vendorData, error: vendorError } = await supabase
            .from('vendor_users')
            .select('*')
            .eq('user_id', user.id)
            .single();
            
          if (vendorError) throw vendorError;
          setVendorUserData(vendorData as VendorUserData);
        }
      } catch (error: any) {
        console.error('사용자 정보 조회 오류:', error);
        setError(error.message || '사용자 정보를 불러오는데 실패했습니다.');
      } finally {
        setLoadingProfile(false);
      }
    };

    if (isProfileOpen) {
      fetchUserData();
    }
  }, [user, isProfileOpen]);

  if (!isProfileOpen) return null;

  const sidebarContent = userData ? (
    <>
      {/* 헤더 */}
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <button
          onClick={closeProfile}
          className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
        <div className="flex items-center gap-2">
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </button>
          <button className="p-2 hover:bg-gray-100 rounded-full transition-colors duration-200">
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
            </svg>
          </button>
        </div>
      </div>

      {/* 프로필 정보 */}
      <div className="overflow-y-auto h-[calc(100vh-64px)] px-6 py-8">
        <div className="space-y-8">
          {/* 사용자 기본 정보 */}
          <div className="text-center">
            <div className="w-24 h-24 mx-auto rounded-full bg-gray-100 flex items-center justify-center mb-4">
              <span className="text-3xl font-serif text-gray-400">
                {userData.name?.[0] || userData.email[0].toUpperCase()}
              </span>
            </div>
            <h1 className="text-xl font-medium mb-1">{userData.name || '사용자'}</h1>
            <p className="text-gray-500 text-sm">{userData.email}</p>
          </div>

          {/* 메뉴 섹션 */}
          <div className="space-y-6">
            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-3">중개거래</h2>
              <div className="space-y-2">
                <Link href="/wishlist" className="flex items-center text-sm py-2 hover:text-blue-600">
                  위시리스트
                </Link>
                <Link href="/history" className="flex items-center text-sm py-2 hover:text-blue-600">
                  뉴스피드
                </Link>
              </div>
            </div>

            <div>
              <h2 className="text-sm font-medium text-gray-500 mb-3">프로필</h2>
              <div className="space-y-2">
                <div className="flex items-center text-sm py-2">
                  <span className="text-gray-500">회원 유형</span>
                  <span className="ml-auto">
                    {userData.user_type === 'regular' ? '일반회원' : '입점회원'}
                    {vendorUserData && ` (${
                      vendorUserData.status === 'pending' ? '승인 대기 중' : 
                      vendorUserData.status === 'approved' ? '승인됨' : '거부됨'
                    })`}
                  </span>
                </div>
                {userData.phone && (
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500">전화번호</span>
                    <span className="ml-auto">{userData.phone}</span>
                  </div>
                )}
                <div className="flex items-center text-sm py-2">
                  <span className="text-gray-500">가입일</span>
                  <span className="ml-auto">
                    {new Date(userData.created_at).toLocaleDateString('ko-KR')}
                  </span>
                </div>
              </div>
            </div>

            {regularUserData && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3 font-pretendard">일반회원 정보</h2>
                <div className="space-y-2">
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500 font-pretendard">이름</span>
                    <span className="ml-auto">{regularUserData.name}</span>
                  </div>
                  {regularUserData.birth_date && (
                    <div className="flex items-center text-sm py-2">
                      <span className="text-gray-500 font-pretendard">생년월일</span>
                      <span className="ml-auto">
                        {new Date(regularUserData.birth_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  {regularUserData.gender && (
                    <div className="flex items-center text-sm py-2">
                      <span className="text-gray-500 font-pretendard">성별</span>
                      <span className="ml-auto font-pretendard">
                        {regularUserData.gender === 'male' ? '남성' : 
                         regularUserData.gender === 'female' ? '여성' : '기타'}
                      </span>
                    </div>
                  )}
                  {regularUserData.address && (
                    <div className="flex items-center text-sm py-2">
                      <span className="text-gray-500 font-pretendard">주소</span>
                      <span className="ml-auto">{regularUserData.address}</span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {vendorUserData && (
              <div>
                <h2 className="text-sm font-medium text-gray-500 mb-3">입점회원 정보</h2>
                <div className="space-y-2">
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500">상호명</span>
                    <span className="ml-auto">{vendorUserData.business_name}</span>
                  </div>
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500">사업자등록번호</span>
                    <span className="ml-auto">{vendorUserData.business_number}</span>
                  </div>
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500">대표자명</span>
                    <span className="ml-auto">{vendorUserData.representative_name}</span>
                  </div>
                  {vendorUserData.business_category && (
                    <div className="flex items-center text-sm py-2">
                      <span className="text-gray-500">업종</span>
                      <span className="ml-auto">{vendorUserData.business_category}</span>
                    </div>
                  )}
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500">사업장 주소</span>
                    <span className="ml-auto">{vendorUserData.address}</span>
                  </div>
                  <div className="flex items-center text-sm py-2">
                    <span className="text-gray-500">승인 상태</span>
                    <span className={`ml-auto ${
                      vendorUserData.status === 'pending' ? 'text-yellow-600' : 
                      vendorUserData.status === 'approved' ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {vendorUserData.status === 'pending' ? '승인 대기 중' : 
                       vendorUserData.status === 'approved' ? '승인됨' : '거부됨'}
                    </span>
                  </div>
                  {vendorUserData.approval_date && (
                    <div className="flex items-center text-sm py-2">
                      <span className="text-gray-500">승인일</span>
                      <span className="ml-auto">
                        {new Date(vendorUserData.approval_date).toLocaleDateString('ko-KR')}
                      </span>
                    </div>
                  )}
                  {vendorUserData.rejection_reason && (
                    <div className="flex items-center text-sm py-2">
                      <span className="text-gray-500">거부 사유</span>
                      <span className="ml-auto text-red-600">{vendorUserData.rejection_reason}</span>
                    </div>
                  )}
                </div>

                {vendorUserData.status === 'approved' && user && (
                  <button
                    onClick={async () => {
                      const { data: storeData, error: storeError } = await supabase
                        .from('stores')
                        .select('id')
                        .eq('vendor_id', user.id)
                        .single();
                        
                      if (!storeError && storeData) {
                        router.push(`/store/${storeData.id}`);
                      } else {
                        router.push('/vendor/store');
                      }
                    }}
                    className="block w-full text-center px-4 py-2 mt-4 bg-black text-white text-sm rounded hover:bg-gray-900 transition-colors"
                  >
                    내 상점 관리하기
                  </button>
                )}
              </div>
            )}

            {/* 하단 버튼 */}
            <div className="pt-4 border-t border-gray-200">
              <button
                onClick={signOut}
                className="w-full text-center px-4 py-2 text-sm text-red-600 hover:text-red-700 transition-colors"
              >
                로그아웃
              </button>
            </div>
          </div>
        </div>
      </div>
    </>
  ) : null;

  if (loading || loadingProfile) {
    return (
      <div 
        className={`fixed inset-0 z-50 ${
          isProfileOpen ? 'visible' : 'invisible'
        }`}
      >
        <div 
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-700 ease-in-out ${
            isProfileOpen ? 'opacity-100' : 'opacity-0'
          }`} 
          onClick={closeProfile}
        />
        <div 
          className={`fixed inset-y-0 right-0 w-[480px] bg-white shadow-lg transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
            isProfileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex items-center justify-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div 
        className={`fixed inset-0 z-50 ${
          isProfileOpen ? 'visible' : 'invisible'
        }`}
      >
        <div 
          className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-700 ease-in-out ${
            isProfileOpen ? 'opacity-100' : 'opacity-0'
          }`} 
          onClick={closeProfile}
        />
        <div 
          className={`fixed inset-y-0 right-0 w-[480px] bg-white shadow-lg transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
            isProfileOpen ? 'translate-x-0' : 'translate-x-full'
          }`}
        >
          <div className="h-full flex items-center justify-center">
            <div className="text-center">
              <p className="text-red-600 mb-4">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="text-black hover:underline"
              >
                다시 시도
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!user || !userData) {
    return null;
  }

  return (
    <div 
      className={`fixed inset-0 z-50 ${
        isProfileOpen ? 'visible' : 'invisible'
      }`}
    >
      <div 
        className={`fixed inset-0 bg-black/40 backdrop-blur-sm transition-all duration-700 ease-in-out ${
          isProfileOpen ? 'opacity-100' : 'opacity-0'
        }`} 
        onClick={closeProfile}
      />
      <div 
        className={`fixed inset-y-0 right-0 w-[480px] bg-white shadow-lg transition-all duration-700 ease-[cubic-bezier(0.32,0.72,0,1)] transform ${
          isProfileOpen ? 'translate-x-0' : 'translate-x-full'
        }`}
      >
        {sidebarContent}
      </div>
    </div>
  );
} 