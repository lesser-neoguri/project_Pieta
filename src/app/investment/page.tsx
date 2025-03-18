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

// 시세 정보 타입
type PriceInfo = {
  type: string;
  buyPrice: string;
  sellPrice: string;
  unit: string;
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
  
  // 시세표 관련 상태
  const [showPriceTable, setShowPriceTable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<Date>(new Date());
  const [priceInfo, setPriceInfo] = useState<PriceInfo[]>([
    { type: '순금시세 Gold24k-3.75g', buyPrice: '610,000', sellPrice: '525,000', unit: '원/3.75g' },
    { type: '18K 금시세 Gold18k-3.75g', buyPrice: '제품시세적용', sellPrice: '385,900', unit: '원/3.75g' },
    { type: '14K 금시세 Gold14k-3.75g', buyPrice: '제품시세적용', sellPrice: '299,300', unit: '원/3.75g' },
    { type: '백금시세 Platinum-3.75g', buyPrice: '205,000', sellPrice: '166,000', unit: '원/3.75g' },
    { type: '은시세 Silver-3.75g', buyPrice: '6,950', sellPrice: '5,530', unit: '원/3.75g' }
  ]);

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
    
    // 1시간마다 시세 업데이트 (실제로는 API 연동 필요)
    const updateInterval = setInterval(() => {
      setLastUpdated(new Date());
      // 실제 구현에서는 여기서 API 호출 필요
    }, 3600000); // 1시간(3600000ms)
    
    return () => clearInterval(updateInterval);
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
      
      {/* 시세표 영역 */}
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="bg-white rounded-lg shadow-md overflow-hidden mb-8">
          <div 
            className="flex items-center justify-between p-4 bg-gradient-to-r from-yellow-600 to-yellow-800 text-white cursor-pointer"
            onClick={() => setShowPriceTable(!showPriceTable)}
          >
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <h2 className="text-xl font-semibold">금/은 실시간 시세</h2>
            </div>
            <div className="flex items-center">
              <span className="text-sm mr-4">
                마지막 업데이트: {lastUpdated.toLocaleString('ko-KR')}
              </span>
              <svg 
                xmlns="http://www.w3.org/2000/svg" 
                className={`h-6 w-6 transform transition-transform duration-300 ${showPriceTable ? 'rotate-180' : ''}`} 
                fill="none" 
                viewBox="0 0 24 24" 
                stroke="currentColor"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
              </svg>
            </div>
          </div>
          
          {showPriceTable && (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      구분
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      내가 살 때 (buy)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      내가 팔 때 (sell)
                    </th>
                    <th scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      단위
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {priceInfo.map((info, index) => (
                    <tr key={index} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                        {info.type}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {info.buyPrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {info.sellPrice}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {info.unit}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <div className="p-3 bg-gray-50 text-xs text-gray-500">
                <p>* 시세는 한국금거래소 기준으로 1시간마다 업데이트됩니다.</p>
                <p>* 제품별 가격은 실제 구매 시 약간의 차이가 있을 수 있습니다.</p>
                <p>* 출처: <a href="https://goldlee6479.koreagoldx.co.kr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">한국금거래소</a></p>
              </div>
            </div>
          )}
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-6">
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