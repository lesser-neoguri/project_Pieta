'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';

type StoreData = {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
};

export default function StoreManagementPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [isVendor, setIsVendor] = useState(false);
  const [isApproved, setIsApproved] = useState(false);

  useEffect(() => {
    const checkUserAndFetchStores = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      try {
        // 사용자가 입점회원인지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        if (userData.user_type !== 'vendor') {
          setIsVendor(false);
          setMessage({
            text: '입점회원만 상점을 관리할 수 있습니다.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

        setIsVendor(true);

        // 입점회원 정보 가져오기
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (vendorError) throw vendorError;

        // 입점회원 승인 상태 확인
        if (vendorData.status !== 'approved') {
          setIsApproved(false);
          setMessage({
            text: '입점 신청이 승인된 회원만 상점을 관리할 수 있습니다.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

        setIsApproved(true);

        // 상점 목록 가져오기
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .eq('vendor_id', user.id)
          .order('created_at', { ascending: false });

        if (storesError) throw storesError;

        setStores(storesData || []);
      } catch (error: any) {
        logger.error('데이터 로딩 중 오류 발생:', error);
        setMessage({
          text: '데이터를 불러오는 중 오류가 발생했습니다.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchStores();
  }, [user, router]);

  // 상점 생성 페이지로 이동하는 함수
  const handleCreateStore = () => {
    // 이미 상점이 있는 경우 생성 페이지로 이동하지 않음
    if (stores.length > 0) {
      setMessage({
        text: '하나의 입점계정은 하나의 상점만 개설할 수 있습니다.',
        type: 'error'
      });
      
      // 3초 후 메시지 제거
      setTimeout(() => setMessage(null), 3000);
      return;
    }
    
    // 상점이 없는 경우 생성 페이지로 이동
    router.push('/vendor/store/create');
  };

  const handleToggleStoreStatus = async (storeId: string, currentStatus: boolean) => {
    try {
      const { error } = await supabase
        .from('stores')
        .update({ is_open: !currentStatus })
        .eq('id', storeId);

      if (error) throw error;

      // 상태 업데이트 성공 후 목록 갱신
      setStores(stores.map(store => 
        store.id === storeId ? { ...store, is_open: !currentStatus } : store
      ));

      setMessage({
        text: `상점이 ${!currentStatus ? '영업 중' : '영업 종료'} 상태로 변경되었습니다.`,
        type: 'success'
      });

      // 3초 후 메시지 제거
      setTimeout(() => setMessage(null), 3000);
    } catch (error: any) {
      logger.error('상점 상태 변경 중 오류 발생:', error);
      setMessage({
        text: '상점 상태 변경 중 오류가 발생했습니다.',
        type: 'error'
      });
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!isVendor || !isApproved) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            {message && (
              <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message.text}
              </div>
            )}
            <div className="flex justify-center mt-4">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">내 상점 관리</h1>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}

        {stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-600 mb-6">아직 개설한 상점이 없습니다.</p>
            <button
              onClick={handleCreateStore}
              className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
            >
              상점 개설하기
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3">
            {stores.map((store) => (
              <div key={store.id} className="bg-white rounded-lg shadow-md overflow-hidden">
                <div className="h-40 bg-gray-200 relative">
                  {store.store_logo_url ? (
                    <img
                      src={store.store_logo_url}
                      alt={`${store.store_name} 로고`}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <div className="w-full h-full flex items-center justify-center bg-gray-100">
                      <span className="text-gray-400 text-lg">{store.store_name.charAt(0)}</span>
                    </div>
                  )}
                  <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium text-white rounded ${store.is_open ? 'bg-green-500' : 'bg-red-500'}`}>
                    {store.is_open ? '영업 중' : '영업 종료'}
                  </div>
                </div>
                
                <div className="p-4">
                  <h2 className="text-xl font-semibold mb-2">{store.store_name}</h2>
                  <p className="text-gray-600 text-sm mb-4 line-clamp-2">
                    {store.store_description || '상점 설명이 없습니다.'}
                  </p>
                  <p className="text-gray-500 text-xs mb-4">
                    {store.store_address}
                  </p>
                  
                  <div className="flex justify-between items-center">
                    <div className="flex space-x-2">
                      <Link
                        href={`/vendor/store/edit/${store.id}`}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                      >
                        수정
                      </Link>
                      <button
                        onClick={() => handleToggleStoreStatus(store.id, store.is_open)}
                        className={`px-3 py-1 rounded text-sm ${
                          store.is_open
                            ? 'bg-red-100 text-red-700 hover:bg-red-200'
                            : 'bg-green-100 text-green-700 hover:bg-green-200'
                        } transition-colors`}
                      >
                        {store.is_open ? '영업 종료' : '영업 시작'}
                      </button>
                    </div>
                    <Link
                      href={`/store/${store.id}`}
                      className="text-blue-600 hover:underline text-sm"
                    >
                      상점 보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 