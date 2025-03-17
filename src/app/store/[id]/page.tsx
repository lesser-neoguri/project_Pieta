'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';

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

type ProductData = {
  id: string;
  store_id: string;
  product_name: string;
  product_description: string;
  product_image_url: string | null;
  price: number;
  stock: number;
  is_available: boolean;
  created_at: string;
  total_sales?: number;
  average_rating?: number;
};

export default function StorePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      setLoading(true);
      
      try {
        // 상점 정보 가져오기
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) throw storeError;
        
        if (!storeData) {
          setError('존재하지 않는 상점입니다.');
          setLoading(false);
          return;
        }

        setStore(storeData);
        
        // 현재 사용자가 상점 소유자인지 확인
        if (user && user.id === storeData.vendor_id) {
          setIsOwner(true);
        }

        // 상점의 제품 목록 가져오기 - 모든 제품을 가져오도록 수정
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        // 디버깅을 위한 로그 추가
        console.log('가져온 제품 목록:', productsData);
        if (productsData && productsData.length > 0) {
          console.log('첫 번째 제품의 total_sales:', productsData[0].total_sales);
          console.log('첫 번째 제품의 average_rating:', productsData[0].average_rating);
        }

        setProducts(productsData || []);
        console.log(`${productsData?.length || 0}개의 제품을 불러왔습니다.`);
      } catch (error: any) {
        console.error('데이터 로딩 중 오류 발생:', error);
        setError('상점 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchStoreAndProducts();
    }
  }, [storeId, user]);

  // 이미지 URL에서 파일 경로 추출하는 함수
  const extractFilePathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch (error) {
      console.error('URL 파싱 오류:', error);
      return null;
    }
  };

  // 제품 이미지 삭제 함수
  const deleteProductImage = async (imageUrl: string | null): Promise<void> => {
    if (!imageUrl) return;
    
    try {
      const filePath = extractFilePathFromUrl(imageUrl);
      if (!filePath) return;
      
      console.log('제품 이미지 삭제 시도:', filePath);
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        console.error('이미지 삭제 오류:', error);
      } else {
        console.log('이미지 삭제 성공');
      }
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  // 제품 삭제 함수
  const handleDeleteProduct = async () => {
    if (!deleteProductId || !isOwner) return;
    
    setDeleteLoading(true);
    
    try {
      // 삭제할 제품 찾기
      const productToDelete = products.find(p => p.id === deleteProductId);
      if (!productToDelete) {
        throw new Error('삭제할 제품을 찾을 수 없습니다.');
      }
      
      // 제품 삭제
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProductId)
        .eq('store_id', storeId);
        
      if (error) throw error;
      
      // 제품 이미지 삭제
      if (productToDelete.product_image_url) {
        await deleteProductImage(productToDelete.product_image_url);
      }
      
      // 제품 목록 업데이트
      setProducts(products.filter(p => p.id !== deleteProductId));
      
      // 성공 메시지
      alert('제품이 성공적으로 삭제되었습니다.');
    } catch (error: any) {
      console.error('제품 삭제 중 오류 발생:', error);
      alert(`제품 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setDeleteLoading(false);
      setDeleteProductId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error || '상점 정보를 불러올 수 없습니다.'}
            </div>
            <div className="flex justify-center mt-4">
              <Link
                href="/storelist"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                상점 목록으로 돌아가기
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
        {/* 상점 정보 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div className="md:flex">
            <div className="md:flex-shrink-0 h-48 md:h-full md:w-48 bg-gray-200 relative">
              {store.store_logo_url ? (
                <img
                  src={store.store_logo_url}
                  alt={`${store.store_name} 로고`}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-4xl">{store.store_name.charAt(0)}</span>
                </div>
              )}
              <div className={`absolute top-2 right-2 px-2 py-1 text-xs font-medium text-white rounded ${store.is_open ? 'bg-green-500' : 'bg-red-500'}`}>
                {store.is_open ? '영업 중' : '영업 종료'}
              </div>
            </div>
            
            <div className="p-6 md:flex-1">
              <div className="flex justify-between items-start">
                <h1 className="text-2xl font-bold text-gray-900 mb-2">{store.store_name}</h1>
                <div className="flex space-x-2">
                  {isOwner && (
                    <Link
                      href={`/vendor/store/edit/${store.id}`}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                    >
                      상점 수정
                    </Link>
                  )}
                  <Link
                    href="/storelist"
                    className="px-3 py-1 bg-gray-100 text-gray-700 rounded hover:bg-gray-200 transition-colors text-sm"
                  >
                    목록으로
                  </Link>
                </div>
              </div>
              
              <p className="text-gray-600 mt-4 mb-4">
                {store.store_description || '상점 설명이 없습니다.'}
              </p>
              
              <div className="text-gray-500 text-sm">
                <p>주소: {store.store_address}</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* 제품 목록 헤더 */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h2 className="text-xl font-bold text-gray-900">제품 목록</h2>
            {products.length > 0 && (
              <p className="text-sm text-gray-500 mt-1">총 {products.length}개의 제품</p>
            )}
          </div>
          {isOwner && (
            <Link
              href={`/store/${store.id}/product/create`}
              className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
            >
              새 제품 추가
            </Link>
          )}
        </div>
        
        {/* 제품 목록 */}
        {products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-600 mb-4">등록된 제품이 없습니다.</p>
            {isOwner && (
              <Link
                href={`/store/${store.id}/product/create`}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors inline-block"
              >
                첫 제품 등록하기
              </Link>
            )}
          </div>
        ) : (
          <div>
            {/* 제품 필터링 및 정렬 옵션 */}
            <div className="bg-white rounded-lg shadow-md p-4 mb-6">
              <div className="flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center">
                  <span className="text-gray-700 mr-2">정렬:</span>
                  <select 
                    className="border rounded-md px-2 py-1 text-sm"
                    onChange={(e) => {
                      // 정렬 기능 구현 (향후 확장)
                      console.log('정렬 옵션:', e.target.value);
                    }}
                  >
                    <option value="newest">최신순</option>
                    <option value="price_asc">가격 낮은순</option>
                    <option value="price_desc">가격 높은순</option>
                    <option value="name">이름순</option>
                  </select>
                </div>
                
                <div className="flex items-center">
                  <label className="inline-flex items-center text-gray-700">
                    <input 
                      type="checkbox" 
                      className="form-checkbox h-4 w-4 text-blue-600"
                      onChange={(e) => {
                        // 품절 상품 표시 여부 (향후 확장)
                        console.log('품절 상품 표시:', e.target.checked);
                      }}
                    />
                    <span className="ml-2 text-sm">품절 상품 표시</span>
                  </label>
                </div>
              </div>
            </div>
            
            {/* 제품 그리드 */}
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {products.map((product) => (
                <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                  <Link href={`/store/${store.id}/product/${product.id}`} className="block">
                    <div className="h-48 bg-gray-200 relative">
                      {product.product_image_url ? (
                        <img
                          src={product.product_image_url}
                          alt={`${product.product_name} 이미지`}
                          className="w-full h-full object-cover"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100">
                          <span className="text-gray-400 text-lg">{product.product_name.charAt(0)}</span>
                        </div>
                      )}
                      {!product.is_available && (
                        <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-white rounded bg-red-500">
                          품절
                        </div>
                      )}
                    </div>
                    <div className="p-4">
                      <h3 className="text-lg font-medium text-gray-900 mb-1">{product.product_name}</h3>
                      <p className="text-lg font-bold text-gray-900 mb-2">{product.price.toLocaleString()}원</p>
                      
                      <div className="flex items-center justify-between mt-2">
                        <div className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                          <span className="text-sm text-gray-600 ml-1">
                            {product.average_rating !== undefined ? product.average_rating.toFixed(1) : '0.0'}
                          </span>
                        </div>
                        <span className="text-sm text-gray-500">
                          판매 {product.total_sales !== undefined ? product.total_sales : 0}개
                        </span>
                      </div>
                    </div>
                  </Link>
                  
                  {isOwner && (
                    <div className="px-4 py-3 bg-gray-50 border-t flex justify-between">
                      <Link
                        href={`/store/${store.id}/product/edit/${product.id}`}
                        className="text-sm text-blue-600 hover:underline"
                      >
                        수정
                      </Link>
                      <button
                        onClick={(e) => {
                          e.preventDefault();
                          setDeleteProductId(product.id);
                        }}
                        className="text-sm text-red-600 hover:underline"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}
        
        {/* 삭제 확인 모달 */}
        {deleteProductId && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">제품 삭제 확인</h3>
              <p className="text-gray-700 mb-6">
                <strong>{products.find(p => p.id === deleteProductId)?.product_name}</strong> 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setDeleteProductId(null)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={deleteLoading}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 