'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';

type StoreData = {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
  vendor_id: string;
};

export default function StoreListPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [stores, setStores] = useState<StoreData[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchStores = async () => {
      setLoading(true);
      
      try {
        // 모든 상점 목록 가져오기
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('*')
          .order('created_at', { ascending: false });

        if (storesError) throw storesError;

        setStores(storesData || []);
      } catch (error: any) {
        console.error('상점 목록 로딩 중 오류 발생:', error);
        setError('상점 목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStores();
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error}
            </div>
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
          <h1 className="text-3xl font-bold text-gray-900">모든 상점 목록</h1>
          <Link
            href="/"
            className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            홈으로 돌아가기
          </Link>
        </div>

        {stores.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-600 mb-6">등록된 상점이 없습니다.</p>
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
                    {user && user.id === store.vendor_id && (
                      <Link
                        href={`/vendor/store/edit/${store.id}`}
                        className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                      >
                        수정
                      </Link>
                    )}
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