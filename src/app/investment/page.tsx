'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';

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
  store_name?: string;
  category?: string;
};

export default function InvestmentPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState('price_desc');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        setLoading(true);
        setError(null);

        let query = supabase
          .from('products')
          .select(`
            *,
            stores:store_id (
              store_name
            )
          `)
          // 투자 상품(골드바, 실버바) 카테고리 필터링 
          // 실제 데이터베이스 설계에 따라 이 부분 수정 필요
          .or('category.eq.gold,category.eq.silver,product_name.ilike.%골드%,product_name.ilike.%금%,product_name.ilike.%실버%,product_name.ilike.%은%');
        
        // 품절 상품 표시 여부
        if (!showUnavailable) {
          query = query.eq('is_available', true);
        }
        
        // 정렬 옵션 적용
        switch (sortOption) {
          case 'newest':
            query = query.order('created_at', { ascending: false });
            break;
          case 'price_asc':
            query = query.order('price', { ascending: true });
            break;
          case 'price_desc':
            query = query.order('price', { ascending: false });
            break;
          default:
            query = query.order('price', { ascending: false });
        }
        
        const { data: productsData, error: productsError } = await query.limit(100);

        if (productsError) {
          throw productsError;
        }

        if (productsData) {
          // 가져온 제품 데이터에 상점 이름 추가
          let filteredProducts = productsData.map((product: any) => ({
            ...product,
            store_name: product.stores?.store_name || '알 수 없는 상점'
          }));
          
          // 검색어 필터링 (클라이언트 측)
          if (searchQuery.trim()) {
            const searchLower = searchQuery.toLowerCase().trim();
            filteredProducts = filteredProducts.filter(
              product =>
                product.product_name.toLowerCase().includes(searchLower) ||
                (product.product_description && product.product_description.toLowerCase().includes(searchLower)) ||
                product.store_name.toLowerCase().includes(searchLower)
            );
          }
          
          setProducts(filteredProducts);
        }
      } catch (error: any) {
        console.error('제품 데이터 로딩 중 오류 발생:', error);
        setError('제품 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchProducts();
  }, [sortOption, showUnavailable, searchQuery]);

  return (
    <div className="min-h-screen bg-gray-100">
      {/* 헤더 영역 */}
      <div className="bg-black text-white py-20 px-4 text-center">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-5xl font-bold mb-6">투자 & 골드바</h1>
          <p className="text-xl max-w-3xl mx-auto">
            안전하고 가치 있는 투자를 위한 골드바와 실버바 컬렉션을 만나보세요. 
            시간이 지나도 변하지 않는 가치를 담은 제품들을 엄선했습니다.
          </p>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* 필터링 및 검색 */}
        <div className="bg-white rounded-lg shadow-md p-4 mb-8">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-1/3">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="제품명 또는 상점명으로 검색"
                className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500"
              />
            </div>
            
            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center">
                <span className="text-gray-700 mr-2">정렬:</span>
                <select 
                  className="border rounded-md px-2 py-2 text-sm"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="newest">최신순</option>
                  <option value="price_asc">가격 낮은순</option>
                  <option value="price_desc">가격 높은순</option>
                </select>
              </div>
              
              <div className="flex items-center">
                <label className="inline-flex items-center text-gray-700">
                  <input 
                    type="checkbox" 
                    checked={showUnavailable}
                    onChange={(e) => setShowUnavailable(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-yellow-600"
                  />
                  <span className="ml-2 text-sm">품절 상품 표시</span>
                </label>
              </div>
            </div>
          </div>
        </div>
        
        <Link href="/" className="inline-flex items-center text-gray-700 mb-8 hover:text-black">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" viewBox="0 0 20 20" fill="currentColor">
            <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
          </svg>
          홈으로 돌아가기
        </Link>
        
        {/* 제품 목록 */}
        {loading ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-600">제품 정보를 불러오는 중...</p>
          </div>
        ) : error ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-red-600">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="bg-white rounded-lg shadow-md p-8 text-center">
            <p className="text-lg text-gray-600">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 투자 상품이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="bg-white rounded-lg shadow-md overflow-hidden hover:shadow-lg transition-shadow">
                <Link href={`/store/${product.store_id}/product/${product.id}`} className="block">
                  <div className="h-64 bg-gray-200 relative">
                    {product.product_image_url ? (
                      <img
                        src={product.product_image_url}
                        alt={`${product.product_name} 이미지`}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-100">
                        <span className="text-gray-400 text-3xl font-semibold">{product.product_name.charAt(0)}</span>
                      </div>
                    )}
                    {!product.is_available && (
                      <div className="absolute top-2 right-2 px-2 py-1 text-xs font-medium text-white rounded bg-red-500">
                        품절
                      </div>
                    )}
                  </div>
                  <div className="p-4">
                    <p className="text-sm text-gray-600 mb-1">{product.store_name}</p>
                    <h3 className="text-lg font-medium text-gray-900 mb-1">{product.product_name}</h3>
                    <p className="text-xl font-bold text-gray-900 mb-2">{product.price.toLocaleString()}원</p>
                    
                    <div className="mt-2 text-sm text-gray-500">
                      {product.stock > 0 ? `재고: ${product.stock}개` : '재고 없음'}
                    </div>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
} 