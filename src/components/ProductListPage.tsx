'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState, ReactNode, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';
import logger from '@/lib/logger';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import { useScroll } from '@/hooks/useScroll';
import { toast } from 'react-hot-toast';

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
  discount_percentage?: number;
  discounted_price?: number;
  is_on_sale?: boolean;
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
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // useScroll 훅으로 스크롤 이벤트 처리
  const { scrollY } = useScroll({ throttleDelay: 20 });
  
  // URL 파라미터에서 카테고리 값을 읽어와 초기 상태 설정
  const initialCategory = searchParams.get('category') || 'all';
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState('newest');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(initialCategory);
  
  // 좋아요 상태 관리
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(new Set());

  // 배너 높이 계산 - useMemo로 최적화
  const bannerHeight = useMemo(() => {
    return Math.max(30, 70 - (scrollY * 0.12));
  }, [scrollY]);

  // 제품 필터링 로직 메모이제이션
  const fetchProducts = useCallback(async () => {
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
      logger.error('제품 데이터 로딩 중 오류 발생:', error);
      setError('제품 정보를 불러오는 중 오류가 발생했습니다.');
    } finally {
      setLoading(false);
    }
  }, [sortOption, showUnavailable, searchQuery, selectedCategory, productFilter]);

  // 필터 변경 시 데이터 로드
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 카테고리 변경 핸들러 업데이트
  const handleCategoryChange = useCallback((categoryId: string) => {
    setSelectedCategory(categoryId);
    
    // URL 파라미터 업데이트
    const params = new URLSearchParams(searchParams.toString());
    if (categoryId === 'all') {
      params.delete('category');
    } else {
      params.set('category', categoryId);
    }
    
    // 현재 경로 유지하면서 파라미터만 업데이트
    router.push(`${pathname}?${params.toString()}`);
  }, [searchParams, router, pathname]);

  // 검색어 변경 핸들러
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // 필터 초기화 핸들러
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
  }, []);

  // 사용자의 좋아요 상태 불러오기
  const fetchFavorites = useCallback(async () => {
    if (!user) return;
    
    try {
      const { data: favoriteData, error } = await supabase
        .from('product_favorites')
        .select('product_id')
        .eq('user_id', user.id);
        
      if (error) {
        console.error('좋아요 데이터 로딩 오류:', error);
        return;
      }
      
      if (favoriteData) {
        const favoriteIds = new Set(favoriteData.map(fav => fav.product_id));
        setFavorites(favoriteIds);
      }
    } catch (error) {
      console.error('좋아요 데이터 로딩 중 예외 발생:', error);
    }
  }, [user]);

  // 좋아요 토글 함수
  const handleToggleFavorite = useCallback(async (e: React.MouseEvent, productId: string) => {
    e.preventDefault(); // Link 클릭 방지
    e.stopPropagation();
    
    if (!user) {
      toast.error('로그인이 필요한 기능입니다.');
      return;
    }

    // 로딩 상태 설정
    setFavoriteLoading(prev => new Set([...prev, productId]));
    
    try {
      const isFavorite = favorites.has(productId);
      
      if (isFavorite) {
        // 좋아요 제거
        const { error } = await supabase
          .from('product_favorites')
          .delete()
          .eq('product_id', productId)
          .eq('user_id', user.id);
          
        if (error) throw error;
        
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(productId);
          return newFavorites;
        });
        
        toast.success('관심 상품에서 제거되었습니다.');
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('product_favorites')
          .insert([{ product_id: productId, user_id: user.id }]);
          
        if (error) throw error;
        
        setFavorites(prev => new Set([...prev, productId]));
        toast.success('관심 상품에 추가되었습니다.');
      }
    } catch (error: any) {
      console.error('좋아요 처리 중 오류:', error);
      toast.error('오류가 발생했습니다. 다시 시도해주세요.');
    } finally {
      // 로딩 상태 해제
      setFavoriteLoading(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(productId);
        return newLoading;
      });
    }
  }, [user, favorites]);

  // 사용자 변경 시 좋아요 데이터 로드
  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites(new Set());
    }
  }, [user, fetchFavorites]);

  return (
    <MainLayout centered={false}>
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
                      onClick={() => handleCategoryChange(category.id)}
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
                    onChange={handleSearchChange}
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
                onClick={fetchProducts}
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
                onClick={handleResetFilters}
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
                {products.map((product) => {
                  const isFavorite = favorites.has(product.id);
                  const isLoading = favoriteLoading.has(product.id);
                  
                  return (
                    <Link 
                      key={product.id}
                      href={`/store/${product.store_id}/product/${product.id}`}
                      className="group"
                    >
                      <div className="overflow-hidden bg-[#f8f8f8] aspect-square mb-5 relative">
                        {/* 품절 표시 */}
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
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium line-clamp-1 group-hover:text-gray-700 transition-colors flex-1 pr-2">
                            {product.product_name}
                          </h3>
                          {/* 좋아요 하트 아이콘 */}
                          <button
                            onClick={(e) => handleToggleFavorite(e, product.id)}
                            className={`p-1 transition-all duration-200 ${
                              isLoading 
                                ? 'cursor-not-allowed opacity-50' 
                                : 'hover:opacity-70'
                            }`}
                            disabled={isLoading}
                          >
                            {isLoading ? (
                              <div className="w-4 h-4 border-2 border-gray-300 border-t-gray-600 rounded-full animate-spin"></div>
                            ) : (
                              <svg 
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-4 w-4 transition-colors duration-200 ${
                                  isFavorite 
                                    ? 'text-black fill-black' 
                                    : 'text-gray-400 hover:text-black'
                                }`}
                                viewBox="0 0 24 24" 
                                stroke="currentColor"
                                fill={isFavorite ? 'currentColor' : 'none'}
                                strokeWidth={2}
                              >
                                <path 
                                  strokeLinecap="round" 
                                  strokeLinejoin="round" 
                                  d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                                />
                              </svg>
                            )}
                          </button>
                        </div>
                        {/* 가격 표시 - 할인가 있으면 할인가 UI, 없으면 기본 가격 */}
                        {product.is_on_sale && product.discounted_price && product.discount_percentage ? (
                          <div className="space-y-1">
                            {/* 원래 가격 (취소선) */}
                            <p className="text-xs text-gray-400 line-through font-light">
                              ₩{product.price.toLocaleString()}
                            </p>
                            {/* 할인율과 할인가 */}
                            <div className="flex items-center space-x-2">
                              <span className="bg-black text-white text-xs px-2 py-1 font-medium">
                                -{product.discount_percentage}%
                              </span>
                              <span className="text-sm font-medium">
                                ₩{product.discounted_price.toLocaleString()}
                              </span>
                            </div>
                          </div>
                        ) : (
                          <p className="text-sm font-medium">₩{product.price.toLocaleString()}</p>
                        )}
                      </div>
                    </Link>
                  );
                })}
              </div>
            </>
          )}
        </div>
      </div>
    </MainLayout>
  );
} 