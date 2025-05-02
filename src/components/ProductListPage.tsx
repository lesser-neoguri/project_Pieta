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
  main_category?: string;
  subcategory?: string;
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
  categoryType?: 'standard' | 'investment';
  initialCategory?: string | null;
  onCategoryChange?: (category: string) => void;
};

export default function ProductListPage({
  title,
  subtitle,
  backgroundImage,
  categories,
  filters,
  productFilter,
  categoryType = 'investment',
  initialCategory = 'all',
  onCategoryChange
}: ProductListPageProps) {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 스크롤 위치 감지를 위한 상태 추가
  const [scrollY, setScrollY] = useState(0);
  // 배너 높이 계산 (스크롤에 따라 더 부드럽게 줄어듦: 최대 40vh에서 최소 20vh까지)
  const bannerHeight = Math.max(20, 40 - (scrollY * 0.08));
  
  // Navbar 감지를 위한 상태 추가
  const [navbarHeight, setNavbarHeight] = useState(0);
  // 카테고리 스티키 상태
  const [isCategorySticky, setIsCategorySticky] = useState(false);
  const [categoryMargin, setCategoryMargin] = useState(0);
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState('newest');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string | null>(initialCategory);

  // initialCategory가 변경되면 선택된 카테고리 업데이트
  useEffect(() => {
    setSelectedCategory(initialCategory);
  }, [initialCategory]);

  // 메모이제이션된 스로틀 함수 생성
  const handleScroll = useCallback(
    throttle(() => {
      requestAnimationFrame(() => {
        const currentScrollY = window.scrollY;
        setScrollY(currentScrollY);
        
        // Navbar 요소의 높이 측정
        const navbar = document.querySelector('nav');
        if (navbar) {
          const navHeight = navbar.getBoundingClientRect().height;
          setNavbarHeight(navHeight);
          
          // 배너의 끝 위치 계산
          const bannerElement = document.querySelector('.relative.overflow-hidden.w-full');
          if (bannerElement) {
            const bannerBottom = bannerElement.getBoundingClientRect().bottom;
            const isSticky = bannerBottom <= navHeight;
            setIsCategorySticky(isSticky);
            
            // 스티키 상태일 때 마진 조정 (최대 24px)
            if (isSticky) {
              const marginValue = Math.min(24, Math.max(0, 24 * (1 - (bannerBottom / navHeight))));
              setCategoryMargin(marginValue);
            } else {
              setCategoryMargin(0);
            }
          }
        }
      });
    }, 20),
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

        console.log("===== 제품 로딩 시작 =====");
        console.log("적용할 필터:", productFilter);

        let query = supabase
          .from('products')
          .select(`
            *,
            stores:store_id (
              store_name
            )
          `);
        
        // 필터 문자열 파싱 및 적용
        if (productFilter) {
          const filters = productFilter.split(',');
          
          // 각 필터 개별 적용 (AND 조건으로 적용)
          filters.forEach(filter => {
            if (!filter.trim()) return; // 빈 필터 무시
            
            const [column, operation] = filter.split('.');
            
            if (!column || !operation) return; // 잘못된 형식 무시
            
            // eq. 타입 필터 처리 (컬럼=값)
            if (operation.startsWith('eq.')) {
              const value = operation.substring(3);
              console.log(`필터 적용: ${column} = ${value}`);
              
              // 명시적으로 각 컬럼 타입에 맞는 필터 적용
              query = query.eq(column, value);
              
              // 필터 적용 후 현재 쿼리 로깅 (디버깅용)
              console.log(`${column}=${value} 필터 적용 후 쿼리 상태:`, query);
            }
            // ilike 타입 필터 처리 (부분 일치)
            else if (operation.startsWith('ilike.')) {
              const value = operation.substring(6);
              query = query.ilike(column, `%${value}%`);
            }
          });
          
          // 필터 적용 검증을 위한 로깅
          console.log('최종 필터 적용 완료');
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
          console.error('쿼리 실행 오류:', productsError);
          throw productsError;
        }

        if (productsData) {
          // 가져온 제품 데이터에 상점 이름 추가
          let filteredProducts = productsData.map((product: any) => ({
            ...product,
            store_name: product.stores?.store_name || '알 수 없는 상점'
          }));
          
          // 결과 데이터 로깅
          console.log('서버에서 로드된 제품 목록:');
          filteredProducts.forEach(product => {
            console.log(`ID: ${product.id.substring(0, 8)}... | ${product.product_name} | ${product.main_category}/${product.category}/${product.subcategory}`);
          });
          
          // 클라이언트 측 필터링 제거 (이미 서버에서 정확히 필터링됨)
          
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
  }, [sortOption, showUnavailable, searchQuery, productFilter, selectedCategory]);

  // 카테고리 변경 핸들러 추가
  const handleCategoryChange = (category: string) => {
    setSelectedCategory(category);
    // 상위 컴포넌트에 변경 알림
    if (onCategoryChange) {
      onCategoryChange(category);
    }
  };

  // 디버깅을 위한 로그 추가
  useEffect(() => {
    console.log('현재 선택된 카테고리:', selectedCategory);
    console.log('현재 적용된 필터:', productFilter);
    console.log('현재 표시된 제품 수:', products.length);
  }, [selectedCategory, productFilter, products]);

  return (
    <MainLayout showLogo={false} centered={false}>
      <div className="min-h-screen bg-white -mt-16 sm:-mt-20 md:-mt-24">
        {/* 메인 비주얼 - 스크롤에 따라 높이가 변하도록 수정 */}
        <div 
          className="relative overflow-hidden w-full transition-all duration-300 ease-out will-change-[height] px-4 sm:px-8 md:px-16 lg:px-24"
          style={{ height: `${bannerHeight}vh` }}
        >
          <div className="absolute inset-0 mx-4 sm:mx-8 md:mx-16 lg:mx-24">
            <img
              src={backgroundImage}
              alt={title}
              className="w-full h-full object-cover transform scale-100 filter brightness-95"
            />
          </div>
          <div className="absolute inset-0 mx-4 sm:mx-8 md:mx-16 lg:mx-24 bg-gradient-to-b from-black/30 via-black/20 to-black/40"></div>
          <div className="relative h-full flex items-center justify-center text-center px-0">
            <div className="w-full max-w-5xl mx-auto">
              <p className="text-xs md:text-sm text-white/90 uppercase tracking-[0.3em] mb-3 font-light">Exclusive Collection</p>
              <h1 className="text-3xl md:text-5xl font-extralight tracking-[0.15em] uppercase text-white mb-4">{title}</h1>
              <div className="w-28 h-[1px] bg-white/40 mx-auto mb-5"></div>
              <p className="text-sm md:text-base text-white/90 max-w-3xl mx-auto leading-relaxed px-6 font-light tracking-wide">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 네비게이션 */}
        <div 
          className={`sticky z-10 bg-white/90 border-b border-gray-100 shadow-sm backdrop-blur-md transition-all duration-300 px-4 sm:px-8 md:px-16 lg:px-24 ${
            isCategorySticky ? 'mx-0' : 'mx-4 sm:mx-8 md:mx-16 lg:mx-24'
          }`}
          style={{ 
            top: isCategorySticky ? `${navbarHeight}px` : '0',
            paddingLeft: isCategorySticky ? `${4 + categoryMargin}px` : '',
            paddingRight: isCategorySticky ? `${4 + categoryMargin}px` : '',
          }}
        >
          <div className="max-w-7xl mx-auto">
            <div className="flex items-center justify-between py-6">
              <div className="overflow-x-auto flex-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex space-x-12 pb-1 min-w-max">
                  {/* 실제 DB에 있는 카테고리(주얼리)와 기타 카테고리만 표시 */}
                  {categories
                    // 실제 DB에 있는 카테고리(주얼리)만 필터링
                    .filter(category => 
                      category.name.toLowerCase().includes('주얼리') ||
                      category.name.toLowerCase().includes('jewelry') ||
                      category.name.toLowerCase() === '기타' ||
                      category.name.toLowerCase() === 'etc' || 
                      category.name.toLowerCase() === 'other' ||
                      category.id === 'all' // 전체 카테고리 포함
                    )
                    .map((category) => (
                      <button
                        key={category.id}
                        onClick={() => handleCategoryChange(category.id)}
                        className={`text-sm font-light tracking-widest transition-all whitespace-nowrap ${
                          selectedCategory === category.id
                            ? 'text-black border-b-2 border-black'
                            : 'text-gray-500 hover:text-black hover:border-b-2 hover:border-gray-200'
                        }`}
                      >
                        {categoryType === 'investment' ? category.name.toUpperCase() : category.name}
                      </button>
                    ))}
                </div>
              </div>
              {filters}
            </div>
          </div>
        </div>
        
        {/* 필터링 및 검색 */}
        <div 
          className={`sticky z-10 bg-white/90 border-b border-gray-100 shadow-sm backdrop-blur-md transition-all duration-300 px-4 sm:px-8 md:px-16 lg:px-24 ${
            isCategorySticky ? 'mx-0' : 'mx-4 sm:mx-8 md:mx-16 lg:mx-24'
          }`}
          style={{ 
            top: isCategorySticky ? `${navbarHeight + 54}px` : '54px',
            paddingLeft: isCategorySticky ? `${4 + categoryMargin}px` : '',
            paddingRight: isCategorySticky ? `${4 + categoryMargin}px` : '',
          }}
        >
          <div className="max-w-7xl mx-auto py-4">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
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
        </div>
        
        <div className="max-w-7xl mx-auto px-6 py-20">
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
              <div className="bg-gray-50 p-4 mb-8 rounded text-left text-sm">
                <p className="font-medium mb-1">현재 필터 정보:</p>
                <p>필터: {productFilter}</p>
                <p>카테고리: {selectedCategory}</p>
              </div>
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
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-1 font-light">
                  총 <span className="font-medium text-black">{products.length}</span>개의 제품
                  {selectedCategory !== 'all' && (
                    <> - 카테고리: <span className="font-medium text-black">{selectedCategory}</span></>
                  )}
                </p>
                <div className="bg-gray-50 p-2 rounded text-xs text-gray-500">
                  <p>적용 필터: {productFilter}</p>
                  <p>현재 표시된 상품: 
                  {products.map(product => 
                    `${product.product_name}(${product.category || 'unknown'})`
                  ).join(', ')}
                  </p>
                </div>
              </div>
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
                      <p className="text-xs text-gray-400 mt-1">
                        {product.main_category || '-'}/{product.category || '-'}/{product.subcategory || '-'}
                      </p>
                      <div className="mt-1 px-2 py-1 text-xs bg-gray-100 inline-block">
                        <span className="font-medium">ID: </span>
                        <span className="font-mono">{product.id.substring(0, 8)}...</span>
                      </div>
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