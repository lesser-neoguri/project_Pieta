'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';

export default function CreateProductPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [storeName, setStoreName] = useState('');

  useEffect(() => {
    const checkStoreOwnershipAndProductCount = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      try {
        // 상점 정보 가져오기
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('vendor_id, store_name')
          .eq('id', storeId)
          .single();

        if (storeError) throw storeError;
        
        if (!storeData) {
          setError('존재하지 않는 상점입니다.');
          setLoading(false);
          return;
        }

        setStoreName(storeData.store_name);

        // 현재 사용자가 상점 소유자인지 확인
        if (user.id !== storeData.vendor_id) {
          setError('상점 소유자만 제품을 등록할 수 있습니다.');
          setLoading(false);
          return;
        }

        setIsOwner(true);

        // 현재 등록된 제품 수 확인
        const { count, error: countError } = await supabase
          .from('products')
          .select('*', { count: 'exact', head: true })
          .eq('store_id', storeId);

        if (countError) throw countError;
        
        setProductCount(count || 0);
      } catch (error: any) {
        console.error('상점 소유권 확인 중 오류 발생:', error);
        setError('상점 정보를 확인하는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    checkStoreOwnershipAndProductCount();
  }, [storeId, user, router]);

  const handleProductCreated = () => {
    // 제품이 성공적으로 생성되면 카운트 증가
    setProductCount(prev => prev + 1);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (error || !isOwner) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error || '접근 권한이 없습니다.'}
            </div>
            <div className="flex justify-center mt-4">
              <Link
                href={`/store/${storeId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                상점으로 돌아가기
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
        <div className="mb-8">
          <div className="flex justify-between items-center">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">새 제품 등록</h1>
              <p className="mt-2 text-lg text-gray-600">
                <span className="font-medium">{storeName}</span> 상점에 판매할 새 제품을 등록합니다.
              </p>
            </div>
            <div className="text-right">
              <p className="text-sm text-gray-500">현재 등록된 제품: <span className="font-medium">{productCount}개</span></p>
              <Link
                href={`/store/${storeId}`}
                className="mt-2 inline-block text-blue-600 hover:underline"
              >
                상점으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
        
        <div className="bg-white rounded-lg shadow-md p-6 mb-6">
          <div className="flex items-center mb-4">
            <div className="w-8 h-8 bg-blue-500 text-white rounded-full flex items-center justify-center mr-3">
              <span>i</span>
            </div>
            <p className="text-gray-700">
              하나의 상점에 <strong>여러 제품</strong>을 등록할 수 있습니다. 제품 등록 후 계속해서 다른 제품을 추가하거나 상점 페이지로 돌아갈 수 있습니다.
            </p>
          </div>
        </div>
        
        <ProductForm 
          storeId={storeId} 
          onProductCreated={handleProductCreated}
          continueAdding={true}
        />
      </div>
    </div>
  );
} 