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
import ProductCard, { ProductCardData } from './ProductCard';

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
  const currentCategory = searchParams?.get('category') || 'all';
  const currentSort = searchParams?.get('sort') || 'newest';
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState(currentSort);
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>(currentCategory);
  
  // 좋아요 상태 관리
  const [favorites, setFavorites] = useState<Set<string>>(new Set());
  const [favoriteLoading, setFavoriteLoading] = useState<Set<string>>(new Set());

  // 배너 높이 계산 - useMemo로 최적화
  const bannerHeight = useMemo(() => {
    return Math.max(30, 70 - (scrollY * 0.12));
  }, [scrollY]);

  // 사용자의 좋아요 상태 불러오기 - useEffect보다 먼저 정의
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

  // URL 업데이트 함수 - pathname null 체크 추가
  const updateURL = useCallback((newCategory: string, newSort: string) => {
    if (!searchParams || !pathname) return;
    
    const params = new URLSearchParams(searchParams.toString());
    
    if (newCategory !== 'all') {
      params.set('category', newCategory);
    } else {
      params.delete('category');
    }
    
    if (newSort !== 'newest') {
      params.set('sort', newSort);
    } else {
      params.delete('sort');
    }
    
    const newURL = params.toString() ? `${pathname}?${params.toString()}` : pathname;
    router.push(newURL);
    
    // 상태 업데이트
    setSelectedCategory(newCategory);
    setSortOption(newSort);
  }, [searchParams, pathname, router]);

  // 필터 변경 시 데이터 로드
  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  // 사용자 변경 시 좋아요 데이터 로드
  useEffect(() => {
    if (user) {
      fetchFavorites();
    } else {
      setFavorites(new Set());
    }
  }, [user, fetchFavorites]);

  // URL 파라미터 변경 감지
  useEffect(() => {
    if (searchParams) {
      const newCategory = searchParams.get('category') || 'all';
      const newSort = searchParams.get('sort') || 'newest';
      setSelectedCategory(newCategory);
      setSortOption(newSort);
    }
  }, [searchParams]);

  // 카테고리 변경 핸들러
  const handleCategoryChange = (categoryId: string) => {
    updateURL(categoryId, sortOption);
  };

  // 검색어 변경 핸들러
  const handleSearchChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    setSearchQuery(e.target.value);
  }, []);

  // 필터 초기화 핸들러
  const handleResetFilters = useCallback(() => {
    setSearchQuery('');
    setSelectedCategory('all');
  }, []);

  // 좋아요 토글 함수
  const handleToggleFavorite = async (productId: string) => {
    if (!user) {
      toast.error('로그인이 필요합니다.');
      return;
    }

    // 이미 로딩 중인 경우 중복 요청 방지
    if (favoriteLoading.has(productId)) {
      return;
    }

    setFavoriteLoading(prev => new Set(prev).add(productId));
    
    try {
      const isFavorite = favorites.has(productId);
      
      if (isFavorite) {
        // 좋아요 제거
        const { error } = await supabase
          .from('product_favorites')
          .delete()
          .eq('user_id', user.id)
          .eq('product_id', productId);
          
        if (error) throw error;
        
        setFavorites(prev => {
          const newFavorites = new Set(prev);
          newFavorites.delete(productId);
          return newFavorites;
        });
        
        toast.success('좋아요를 취소했습니다.');
      } else {
        // 좋아요 추가
        const { error } = await supabase
          .from('product_favorites')
          .insert({
            user_id: user.id,
            product_id: productId
          });
          
        if (error) throw error;
        
        setFavorites(prev => new Set(prev).add(productId));
        toast.success('좋아요에 추가했습니다.');
      }
    } catch (error: any) {
      console.error('좋아요 토글 오류:', error);
      toast.error('오류가 발생했습니다.');
    } finally {
      setFavoriteLoading(prev => {
        const newLoading = new Set(prev);
        newLoading.delete(productId);
        return newLoading;
      });
    }
  };

  return (
    <MainLayout centered={false}>
      <div className="min-h-screen bg-white -mt-16 sm:-mt-20 md:-mt-24 custom-scrollbar-vertical">
        {/* 메인 비주얼 - 스크롤에 따라 높이가 변하도록 수정, 양옆 마진 제거 */}
        <div 
          className="relative overflow-hidden w-screen ml-[calc(-50vw+50%)] transition-all duration-300 ease-out will-change-[height]"
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
          <div className="relative h-full flex items-center justify-center text-center">
            <div className="w-full max-w-5xl mx-auto px-6">
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
              <div className="overflow-x-auto flex-1 custom-scrollbar-horizontal">
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
                  onChange={(e) => updateURL(selectedCategory, e.target.value)}
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
                    <ProductCard
                      key={product.id}
                      product={product as ProductCardData}
                      variant="detailed"
                      showStore={true}
                      showFavorite={true}
                      isFavorite={isFavorite}
                      favoriteLoading={isLoading}
                      onFavoriteToggle={handleToggleFavorite}
                    />
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