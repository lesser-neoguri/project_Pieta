'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState, ReactNode, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';

// 스로틀 헬퍼 함수 추가
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

export type ProductData = {
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

export type CategoryItem = {
  id: string;
  name: string;
};

type ProductListPageProps = {
  title: string;
  subtitle: string;
  backgroundImage: string;
  categories: CategoryItem[];
  filters?: ReactNode;
  productFilter: string;
  categoryType?: 'standard' | 'uppercase';
};

export default function ProductListPage({
  title,
  subtitle,
  backgroundImage,
  categories,
  filters,
  productFilter,
  categoryType = 'uppercase'
}: ProductListPageProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 스크롤 위치 감지를 위한 상태 추가
  const [scrollY, setScrollY] = useState(0);
  // 배너 높이 계산 (스크롤에 따라 더 부드럽게 줄어듦: 최대 70vh에서 최소 30vh까지)
  const bannerHeight = Math.max(30, 70 - (scrollY * 0.12));
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState('newest');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

  // 메모이제이션된 스로틀 함수 생성
  const handleScroll = useCallback(
    throttle(() => {
      requestAnimationFrame(() => {
        setScrollY(window.scrollY);
      });
    }, 20), // 약간 늘린 간격으로 스로틀링 적용
    []
  );

  // 스크롤 이벤트 리스너 추가
  useEffect(() => {
    // 스크롤 이벤트 리스너 등록
    window.addEventListener('scroll', handleScroll);
    
    // 컴포넌트 언마운트 시 이벤트 리스너 정리
    return () => {
      window.removeEventListener('scroll', handleScroll);
    };
  }, [handleScroll]);

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
          `);
        
        // 카테고리 필터링
        if (selectedCategory !== 'all') {
          query = query.eq('category', selectedCategory);
        }
        
        // 상품 유형 필터링 (주얼리, 투자 등)
        if (productFilter) {
          query = query.or(productFilter);
        }
        
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
          case 'rating':
            query = query.order('average_rating', { ascending: false });
            break;
          default:
            query = query.order('created_at', { ascending: false });
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
  }, [sortOption, showUnavailable, searchQuery, selectedCategory, productFilter]);

  return (
    <MainLayout showLogo={false} centered={false}>
      <div className="min-h-screen bg-white -mt-16 sm:-mt-20 md:-mt-24">
        {/* 메인 비주얼 - 스크롤에 따라 높이가 변하도록 수정 */}
        <div 
          className="relative overflow-hidden w-full transition-all duration-300 ease-out will-change-[height]"
          style={{ height: `${bannerHeight}vh` }}
        >
          <div className="absolute inset-0">
            <img
              src={backgroundImage}
              alt={title}
              className="w-full h-full object-cover transform scale-105 filter brightness-90"
            />
          </div>
          <div className="absolute inset-0 bg-gradient-to-b from-black/40 via-black/30 to-black/60"></div>
          <div className="relative h-full flex items-center justify-center text-center px-0">
            <div className="w-full max-w-5xl mx-auto">
              <p className="text-sm md:text-base text-white/90 uppercase tracking-[0.4em] mb-6 font-light">Exclusive Collection</p>
              <h1 className="text-5xl md:text-7xl font-extralight tracking-[0.2em] uppercase text-white mb-8">{title}</h1>
              <div className="w-40 h-[1px] bg-white/40 mx-auto mb-10"></div>
              <p className="text-lg md:text-xl text-white/90 max-w-3xl mx-auto leading-relaxed px-6 font-light tracking-wide">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 네비게이션 */}
        <div className="sticky top-0 z-10 bg-white/90 border-b border-gray-100 shadow-sm backdrop-blur-md">
          <div className="max-w-7xl mx-auto px-6">
            <div className="flex items-center justify-between py-6">
              <div className="overflow-x-auto flex-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex space-x-12 pb-1 min-w-max">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`text-sm font-light tracking-widest transition-all whitespace-nowrap ${
                        selectedCategory === category.id
                          ? 'text-black border-b-2 border-black'
                          : 'text-gray-500 hover:text-black hover:border-b-2 hover:border-gray-200'
                      }`}
                    >
                      {categoryType === 'uppercase' ? category.name.toUpperCase() : category.name}
                    </button>
                  ))}
                </div>
              </div>
              {filters}
            </div>
          </div>
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-20">
          {/* 필터링 및 검색 */}
          <div className="bg-white mb-20">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-8">
              <div className="w-full md:w-1/3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제품명 또는 상점명으로 검색"
                    className="w-full px-4 py-3 border-b border-gray-200 focus:outline-none focus:border-black transition-colors text-sm bg-transparent"
                  />
                  <svg
                    className="absolute right-3 top-3 h-5 w-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center space-x-10">
                <select 
                  className="border-none bg-transparent focus:ring-0 text-sm font-light tracking-wider uppercase cursor-pointer"
                  value={sortOption}
                  onChange={(e) => setSortOption(e.target.value)}
                >
                  <option value="newest">최신순</option>
                  <option value="price_asc">가격 낮은순</option>
                  <option value="price_desc">가격 높은순</option>
                  <option value="rating">평점 높은순</option>
                </select>
                
                <label className="inline-flex items-center text-sm">
                  <input 
                    type="checkbox" 
                    checked={showUnavailable}
                    onChange={(e) => setShowUnavailable(e.target.checked)}
                    className="form-checkbox h-4 w-4 text-black rounded-sm border-gray-300"
                  />
                  <span className="ml-2 text-sm tracking-wide font-light">품절 상품 표시</span>
                </label>
              </div>
            </div>
          </div>
          
          {/* 제품 목록 */}
          {loading ? (
            <div className="flex justify-center items-center py-32">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-black"></div>
            </div>
          ) : error ? (
            <div className="text-center py-32">
              <p className="text-red-500 mb-6">{error}</p>
              <button 
                className="px-10 py-3 border border-black bg-black text-white text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-300"
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-lg text-gray-600 mb-2 font-light">검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-500 mb-8">다른 검색어나 필터를 사용해보세요.</p>
              <button 
                className="px-10 py-3 border border-black bg-transparent text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors duration-300"
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                }}
              >
                필터 초기화
              </button>
            </div>
          ) : (
            <>
              <p className="text-sm text-gray-500 mb-12 font-light">
                총 <span className="font-medium text-black">{products.length}</span>개의 제품
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-2 lg:grid-cols-3 gap-x-1 gap-y-4">
                {products.map((product) => (
                  <Link 
                    key={product.id}
                    href={`/store/${product.store_id}/product/${product.id}`}
                    className="group"
                  >
                    <div className="overflow-hidden bg-[#f8f8f8] aspect-square mb-5 relative">
                      {!product.is_available && (
                        <div className="absolute top-3 right-3 bg-black/70 backdrop-blur-sm text-white text-xs px-3 py-1 uppercase tracking-wider z-10 font-light">
                          품절
                        </div>
                      )}
                      {product.product_image_url ? (
                        <img
                          src={product.product_image_url}
                          alt={product.product_name}
                          className="w-full h-full object-contain p-2 group-hover:scale-105 transition-all duration-700 ease-out"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400">
                          이미지 없음
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-1 uppercase tracking-wider font-light">{product.store_name}</p>
                      <h3 className="text-sm font-medium mb-2 line-clamp-1 group-hover:text-gray-700 transition-colors">
                        {product.product_name}
                      </h3>
                      <p className="text-sm font-medium">{product.price.toLocaleString()}원</p>
                    </div>
                  </Link>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 