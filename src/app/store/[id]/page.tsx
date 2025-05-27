'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { extractPathFromUrl } from '@/lib/migration';
import toast from 'react-hot-toast';
import logger from '@/lib/logger';

type StoreData = {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
  vendor_id: string;
  store_phone?: string;
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

        if (productsData) {
          setProducts(productsData);
          
          // 디버깅용 로그를 logger로 대체
          logger.debug('가져온 제품 목록:', productsData);
          
          if (productsData.length > 0) {
            logger.debug('첫 번째 제품의 total_sales:', productsData[0].total_sales);
            logger.debug('첫 번째 제품의 average_rating:', productsData[0].average_rating);
          }
          
          logger.debug(`${productsData?.length || 0}개의 제품을 불러왔습니다.`);
        }
      } catch (error: any) {
        logger.error('데이터 로딩 중 오류 발생:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (storeId) {
      fetchStoreAndProducts();
    }
  }, [storeId, user]);

  // 제품 이미지 삭제 함수
  const handleRemoveImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    
    const filePath = extractPathFromUrl(imageUrl);
    if (!filePath) {
      alert('이미지 경로를 찾을 수 없습니다.');
      return;
    }
    
    logger.debug('제품 이미지 삭제 시도:', filePath);
    
    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
      
      if (error) {
        logger.error('이미지 삭제 오류:', error);
        alert('이미지 삭제 중 오류가 발생했습니다.');
        return;
      }
      
      logger.debug('이미지 삭제 성공');
      
    } catch (error: any) {
      logger.error('이미지 삭제 중 오류 발생:', error);
      alert('이미지 삭제 중 오류가 발생했습니다.');
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
        await handleRemoveImage(productToDelete.product_image_url);
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

  // 스토어 로고 삭제 함수
  const handleDeleteLogo = async () => {
    if (!store || !store.store_logo_url) return;
    
    try {
      const filePath = extractPathFromUrl(store.store_logo_url);
      if (!filePath) {
        toast.error('이미지 경로를 추출할 수 없습니다.');
        return;
      }
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        toast.error('로고 삭제 중 오류가 발생했습니다.');
        logger.error('로고 삭제 오류:', error);
        return;
      }
      
      // DB에서 logo_url 제거
      const { error: updateError } = await supabase
        .from('stores')
        .update({ store_logo_url: null })
        .eq('id', store.id);
        
      if (updateError) {
        toast.error('스토어 업데이트 중 오류가 발생했습니다.');
        logger.error('스토어 업데이트 오류:', updateError);
        return;
      }
      
      // 성공 메시지 표시 및 페이지 새로고침
      toast.success('로고가 삭제되었습니다.');
      window.location.reload();
    } catch (error) {
      toast.error('오류가 발생했습니다.');
      logger.error('로고 삭제 처리 중 오류:', error);
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
    <div className="min-h-screen bg-white">
      {/* 상점 헤더 */}
      <div className="relative bg-gray-50 border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
          <div className="flex items-center space-x-8">
            <div className="w-32 h-32 rounded-full bg-white border border-gray-200 overflow-hidden flex-shrink-0 shadow-sm">
              {store.store_logo_url ? (
                <img
                  src={store.store_logo_url}
                  alt={store.store_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <span className="text-4xl font-light text-gray-400 tracking-wide">
                    {store.store_name.charAt(0)}
                  </span>
                </div>
              )}
            </div>
            
            <div className="flex-1">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <div className="flex items-center space-x-4">
                    <h1 className="text-3xl font-light text-gray-900 tracking-wide">{store.store_name}</h1>
                    <span className={`px-3 py-1 text-sm font-medium rounded-full ${
                      store.is_open ? 'bg-green-50 text-green-700' : 'bg-gray-50 text-gray-500'
                    }`}>
                      {store.is_open ? '영업중' : '영업종료'}
                    </span>
                  </div>
                </div>
                {isOwner && (
                  <div className="flex items-center space-x-4">
                    <Link
                      href={`/vendor/store/edit/${store.id}`}
                      className="px-6 py-2 text-sm font-medium text-gray-700 hover:text-gray-900 transition-colors border border-gray-300 rounded-md hover:bg-gray-50"
                    >
                      상점 수정
                    </Link>
                    <Link
                      href={`/store/${store.id}/product/create`}
                      className="px-6 py-2 bg-black text-white text-sm font-medium hover:bg-gray-800 transition-colors rounded-md"
                    >
                      상품 등록
                    </Link>
                  </div>
                )}
              </div>
              
              <p className="text-gray-600 mb-6 max-w-3xl leading-relaxed">
                {store.store_description}
              </p>
              
              <div className="flex items-center space-x-6 text-sm text-gray-500">
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {store.store_address}
                </div>
                {store.store_phone && (
                  <div className="flex items-center">
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                    </svg>
                    {store.store_phone}
                  </div>
                )}
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                  </svg>
                  제품 {products.length}개
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 제품 목록 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="flex items-center justify-between mb-8">
          <h2 className="text-2xl font-light text-gray-900">제품 목록</h2>
          <div className="flex items-center space-x-4">
            <select className="border-none bg-transparent text-sm text-gray-500 focus:ring-0 font-medium">
              <option value="newest">최신순</option>
              <option value="price_asc">가격 낮은순</option>
              <option value="price_desc">가격 높은순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
        </div>

        {products.length === 0 && !isOwner ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 mx-auto mb-4 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-lg font-medium text-gray-500 mb-2">등록된 제품이 없습니다</h3>
            <p className="text-gray-400">첫 번째 제품을 등록해보세요</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {isOwner && (
              <Link href={`/store/${store.id}/product/create`} className="group">
                <div className="relative aspect-square bg-gray-50 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors rounded-lg">
                  <div className="absolute inset-0 flex flex-col items-center justify-center p-4">
                    <svg className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium">
                      제품 등록하기
                    </span>
                  </div>
                </div>
              </Link>
            )}
            
            {products.map((product) => (
              <div key={product.id} className="group">
                <Link href={`/store/${store.id}/product/${product.id}`} className="block">
                  <div className="relative aspect-square bg-gray-50 overflow-hidden rounded-lg border border-gray-200 group-hover:shadow-md transition-shadow duration-300">
                    {product.product_image_url ? (
                      <img
                        src={product.product_image_url}
                        alt={product.product_name}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-3xl font-light text-gray-300">
                          {product.product_name.charAt(0)}
                        </span>
                      </div>
                    )}
                    
                    {!product.is_available && (
                      <div className="absolute top-3 right-3 px-2 py-1 text-xs font-medium text-white bg-black/70 backdrop-blur-sm rounded">
                        품절
                      </div>
                    )}
                  </div>
                  
                  <div className="mt-4 space-y-2">
                    <h3 className="text-lg font-medium text-gray-900 group-hover:text-black transition-colors">
                      {product.product_name}
                    </h3>
                    <p className="text-xl font-light text-gray-900">
                      {product.price.toLocaleString()}원
                    </p>
                    
                    <div className="flex items-center justify-between pt-1">
                      <div className="flex items-center">
                        <div className="flex items-center">
                          {[...Array(5)].map((_, i) => (
                            <svg 
                              key={i} 
                              className={`w-4 h-4 ${
                                i < Math.floor(product.average_rating || 0) 
                                  ? 'text-yellow-400' 
                                  : 'text-gray-200'
                              }`} 
                              fill="currentColor" 
                              viewBox="0 0 20 20"
                            >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                          ))}
                        </div>
                        <span className="ml-1 text-sm text-gray-500">
                          {(product.average_rating || 0).toFixed(1)}
                        </span>
                      </div>
                      <span className="text-sm text-gray-400">
                        판매 {product.total_sales || 0}개
                      </span>
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 삭제 확인 모달 */}
      {deleteProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 max-w-md w-full rounded-lg shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">제품 삭제</h3>
            <p className="text-gray-600 mb-6">
              이 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteProductId(null)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-md"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 rounded-md"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 