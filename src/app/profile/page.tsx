'use client';

import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import Link from 'next/link';
import { supabase } from '@/lib/supabase';

type UserData = {
  id: string;
  email: string;
  phone?: string;
  user_type: 'regular' | 'vendor';
  is_active: boolean;
  created_at: string;
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

export default function ProfilePage() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [userData, setUserData] = useState<UserData | null>(null);
  const [regularUserData, setRegularUserData] = useState<RegularUserData | null>(null);
  const [vendorUserData, setVendorUserData] = useState<VendorUserData | null>(null);
  const [loadingProfile, setLoadingProfile] = useState(true);

  useEffect(() => {
    if (!loading && !user) {
      router.push('/login');
    }
  }, [user, loading, router]);

  useEffect(() => {
    const fetchUserData = async () => {
      if (user) {
        setLoadingProfile(true);
        
        // 공통 회원 정보 가져오기
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) {
          console.error('회원 정보를 가져오는 중 오류 발생:', userError);
        } else if (userData) {
          setUserData(userData as UserData);
          
          // 회원 유형에 따라 추가 정보 가져오기
          if (userData.user_type === 'regular') {
            const { data: regularData, error: regularError } = await supabase
              .from('regular_users')
              .select('*')
              .eq('user_id', user.id)
              .single();
              
            if (regularError) {
              console.error('일반회원 정보를 가져오는 중 오류 발생:', regularError);
            } else {
              setRegularUserData(regularData as RegularUserData);
            }
          } else if (userData.user_type === 'vendor') {
            const { data: vendorData, error: vendorError } = await supabase
              .from('vendor_users')
              .select('*')
              .eq('user_id', user.id)
              .single();
              
            if (vendorError) {
              console.error('입점회원 정보를 가져오는 중 오류 발생:', vendorError);
            } else {
              setVendorUserData(vendorData as VendorUserData);
            }
          }
        }
        
        setLoadingProfile(false);
      }
    };

    fetchUserData();
  }, [user]);

  if (loading || loadingProfile) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-4">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!user || !userData) {
    return null; // useEffect에서 리다이렉트 처리
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold mb-6 text-center">내 프로필</h1>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-1">회원 유형</p>
          <p className="font-medium">
            {userData.user_type === 'regular' ? '일반회원' : '입점회원'}
            {vendorUserData && ` (${
              vendorUserData.status === 'pending' ? '승인 대기 중' : 
              vendorUserData.status === 'approved' ? '승인됨' : '거부됨'
            })`}
          </p>
        </div>
        
        <div className="mb-6">
          <p className="text-gray-600 mb-1">이메일</p>
          <p className="font-medium">{userData.email}</p>
        </div>
        
        {userData.phone && (
          <div className="mb-6">
            <p className="text-gray-600 mb-1">전화번호</p>
            <p className="font-medium">{userData.phone}</p>
          </div>
        )}
        
        <div className="mb-6">
          <p className="text-gray-600 mb-1">가입일</p>
          <p className="font-medium">
            {new Date(userData.created_at).toLocaleDateString('ko-KR')}
          </p>
        </div>
        
        {/* 일반회원 추가 정보 */}
        {regularUserData && (
          <>
            <hr className="my-6" />
            <h2 className="text-xl font-semibold mb-4">일반회원 정보</h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-1">이름</p>
              <p className="font-medium">{regularUserData.name}</p>
            </div>
            
            {regularUserData.birth_date && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">생년월일</p>
                <p className="font-medium">
                  {new Date(regularUserData.birth_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
            
            {regularUserData.gender && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">성별</p>
                <p className="font-medium">
                  {regularUserData.gender === 'male' ? '남성' : 
                   regularUserData.gender === 'female' ? '여성' : '기타'}
                </p>
              </div>
            )}
            
            {regularUserData.address && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">주소</p>
                <p className="font-medium">{regularUserData.address}</p>
              </div>
            )}
          </>
        )}
        
        {/* 입점회원 추가 정보 */}
        {vendorUserData && (
          <>
            <hr className="my-6" />
            <h2 className="text-xl font-semibold mb-4">입점회원 정보</h2>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-1">상호명</p>
              <p className="font-medium">{vendorUserData.business_name}</p>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-1">사업자등록번호</p>
              <p className="font-medium">{vendorUserData.business_number}</p>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-1">대표자명</p>
              <p className="font-medium">{vendorUserData.representative_name}</p>
            </div>
            
            {vendorUserData.business_category && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">업종</p>
                <p className="font-medium">{vendorUserData.business_category}</p>
              </div>
            )}
            
            <div className="mb-6">
              <p className="text-gray-600 mb-1">사업장 주소</p>
              <p className="font-medium">{vendorUserData.address}</p>
            </div>
            
            <div className="mb-6">
              <p className="text-gray-600 mb-1">승인 상태</p>
              <p className={`font-medium ${
                vendorUserData.status === 'pending' ? 'text-yellow-600' : 
                vendorUserData.status === 'approved' ? 'text-green-600' : 'text-red-600'
              }`}>
                {vendorUserData.status === 'pending' ? '승인 대기 중' : 
                 vendorUserData.status === 'approved' ? '승인됨' : '거부됨'}
              </p>
            </div>
            
            {vendorUserData.approval_date && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">승인일</p>
                <p className="font-medium">
                  {new Date(vendorUserData.approval_date).toLocaleDateString('ko-KR')}
                </p>
              </div>
            )}
            
            {vendorUserData.rejection_reason && (
              <div className="mb-6">
                <p className="text-gray-600 mb-1">거부 사유</p>
                <p className="font-medium text-red-600">{vendorUserData.rejection_reason}</p>
              </div>
            )}

            {/* 입점회원이 승인된 경우 상점 관리 링크 표시 */}
            {vendorUserData.status === 'approved' && (
              <div className="mt-6">
                <Link
                  href="/vendor/store"
                  className="block w-full text-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                >
                  내 상점 관리하기
                </Link>
              </div>
            )}
          </>
        )}
        
        <div className="flex flex-col gap-3 mt-8">
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white text-center rounded-md hover:bg-blue-700 transition-colors"
          >
            홈으로
          </Link>
          
          <button
            onClick={signOut}
            className="px-4 py-2 border border-red-600 text-red-600 rounded-md hover:bg-red-50 transition-colors"
          >
            로그아웃
          </button>
        </div>
      </div>
    </div>
  );
} 