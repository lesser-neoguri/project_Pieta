'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

type WholesalerData = {
  user_id: string;
  business_name: string;
  business_number: string;
  representative_name: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
};

export default function WholesalerDashboardPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [wholesalerData, setWholesalerData] = useState<WholesalerData | null>(null);
  const [isWholesaler, setIsWholesaler] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [productCount, setProductCount] = useState(0);
  const [orderCount, setOrderCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  useEffect(() => {
    const checkUserAndFetchData = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      try {
        // 사용자가 도매자인지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        if (userData.user_type !== 'wholesaler') {
          setIsWholesaler(false);
          setMessage({
            text: '도매자 회원만 이 페이지에 접근할 수 있습니다.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

        setIsWholesaler(true);

        // 도매자 정보 가져오기
        const { data: wholesalerInfo, error: wholesalerError } = await supabase
          .from('wholesaler_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (wholesalerError) throw wholesalerError;
        
        setWholesalerData(wholesalerInfo);

        // 승인 상태 확인
        if (wholesalerInfo.status !== 'approved') {
          setIsApproved(false);
          setLoading(false);
          return;
        }

        setIsApproved(true);

        // 도매자의 상품 수 가져오기
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('id')
          .eq('vendor_id', user.id)
          .eq('store_type', 'wholesale')
          .single();

        if (!storeError && storeData) {
          const { count: productCountData, error: productError } = await supabase
            .from('products')
            .select('*', { count: 'exact', head: true })
            .eq('store_id', storeData.id)
            .eq('is_wholesale', true);

          if (!productError) {
            setProductCount(productCountData || 0);
          }

          // 주문 수 가져오기 (여기서는 제품 판매 데이터를 사용)
          // 서브쿼리 대신 두 단계로 쿼리 실행
          const { data: productIds, error: productIdsError } = await supabase
            .from('products')
            .select('id')
            .eq('store_id', storeData.id);
            
          if (!productIdsError && productIds && productIds.length > 0) {
            const productIdValues = productIds.map(p => p.id);
            
            const { count: orderCountData, error: orderError } = await supabase
              .from('product_sales')
              .select('*', { count: 'exact', head: true })
              .in('product_id', productIdValues);

            if (!orderError) {
              setOrderCount(orderCountData || 0);
            }
          }
        }

        // 소매자 연결 요청 수 가져오기
        const { count: requestCountData, error: requestError } = await supabase
          .from('vendor_wholesaler_relationships')
          .select('*', { count: 'exact', head: true })
          .eq('wholesaler_id', user.id)
          .eq('status', 'pending');

        if (!requestError) {
          setPendingRequestsCount(requestCountData || 0);
        }

      } catch (error: any) {
        console.error('데이터 로딩 중 오류 발생:', error);
        setMessage({
          text: '데이터를 불러오는 중 오류가 발생했습니다.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    checkUserAndFetchData();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!isWholesaler) {
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

  if (!isApproved) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6">도매자 승인 대기 중</h1>
            <div className="p-4 mb-6 rounded bg-yellow-100 text-yellow-700">
              <p>도매자 계정이 아직 승인되지 않았습니다. 관리자의 승인을 기다려주세요.</p>
              <p className="mt-2">신청일: {new Date(wholesalerData?.created_at || '').toLocaleDateString('ko-KR')}</p>
              <p className="mt-2">상태: {
                wholesalerData?.status === 'pending' ? '승인 대기중' : 
                wholesalerData?.status === 'rejected' ? '승인 거부됨' : '처리중'
              }</p>
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
          <h1 className="text-3xl font-bold text-gray-900">도매자 대시보드</h1>
        </div>

        {message && (
          <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
            {message.text}
          </div>
        )}
        
        <div className="mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-xl font-semibold mb-4">환영합니다, {wholesalerData?.business_name}님</h2>
            <p className="text-gray-600">도매자 대시보드에서 상품 관리, 주문 관리, 소매업체와의 관계를 관리할 수 있습니다.</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">등록된 상품</h3>
            <p className="text-3xl font-bold text-blue-600">{productCount}</p>
            <Link href="/wholesaler/products" className="mt-4 inline-block text-blue-600 hover:underline">
              상품 관리하기 →
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">주문 현황</h3>
            <p className="text-3xl font-bold text-green-600">{orderCount}</p>
            <Link href="/wholesaler/orders" className="mt-4 inline-block text-blue-600 hover:underline">
              주문 관리하기 →
            </Link>
          </div>
          
          <div className="bg-white rounded-lg shadow-md p-6">
            <h3 className="text-lg font-semibold mb-2">소매업체 요청</h3>
            <p className="text-3xl font-bold text-yellow-600">{pendingRequestsCount}</p>
            <Link href="/wholesaler/partners" className="mt-4 inline-block text-blue-600 hover:underline">
              요청 관리하기 →
            </Link>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Link href="/wholesaler/products/new" className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition-colors">
            <h3 className="text-lg font-semibold mb-2">새 상품 등록</h3>
            <p className="text-gray-600">도매 제품을 등록하고 소매업체에 제공하세요.</p>
          </Link>
          
          <Link href="/wholesaler/dashboard" className="bg-white rounded-lg shadow-md p-6 hover:bg-gray-50 transition-colors">
            <h3 className="text-lg font-semibold mb-2">상세 대시보드</h3>
            <p className="text-gray-600">판매 통계, 인기 상품, 추세 등을 확인하세요.</p>
          </Link>
        </div>
      </div>
    </div>
  );
} 