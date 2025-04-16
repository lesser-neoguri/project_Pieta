'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState, ReactNode } from 'react';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';

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
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState('newest');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');

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
    <MainLayout showLogo={false}>
      <div className="min-h-screen bg-white">
        {/* 메인 비주얼 */}
        <div className="relative h-[50vh] overflow-hidden w-full">
          <div className="absolute inset-0">
            <img
              src={backgroundImage}
              alt={title}
              className="w-full h-full object-cover"
            />
          </div>
          <div className="absolute inset-0 bg-black/40"></div>
          <div className="relative h-full flex items-center justify-center text-center px-0">
            <div className="w-full max-w-screen-2xl">
              <p className="text-sm text-white/80 uppercase tracking-[0.3em] mb-4">프리미엄 컬렉션</p>
              <h1 className="text-4xl md:text-5xl font-light tracking-[0.2em] uppercase text-white mb-6">{title}</h1>
              <div className="w-24 h-[1px] bg-white/60 mx-auto mb-6"></div>
              <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
                {subtitle}
              </p>
            </div>
          </div>
        </div>

        {/* 카테고리 네비게이션 */}
        <div className="sticky top-0 z-10 bg-white border-b border-gray-100 shadow-sm">
          <div className="max-w-7xl mx-auto px-4">
            <div className="flex items-center justify-between py-6">
              <div className="overflow-x-auto flex-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex space-x-10 pb-1 min-w-max">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`text-sm font-medium tracking-wider transition-colors whitespace-nowrap ${
                        selectedCategory === category.id
                          ? 'text-black border-b-2 border-black'
                          : 'text-gray-500 hover:text-black'
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
        
        <div className="max-w-7xl mx-auto px-4 py-16">
          {/* 필터링 및 검색 */}
          <div className="bg-white mb-16">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div className="w-full md:w-1/3">
                <div className="relative">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="제품명 또는 상점명으로 검색"
                    className="w-full px-4 py-3 border-b border-gray-300 focus:outline-none focus:border-black transition-colors text-sm bg-transparent"
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
                      strokeWidth={2}
                      d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
                    />
                  </svg>
                </div>
              </div>
              
              <div className="flex items-center space-x-8">
                <select 
                  className="border-none bg-transparent focus:ring-0 text-sm font-medium tracking-wider uppercase"
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
                    className="form-checkbox h-4 w-4 text-black rounded border-gray-300"
                  />
                  <span className="ml-2 text-sm tracking-wide">품절 상품 표시</span>
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
                className="px-8 py-3 border border-black bg-black text-white text-sm uppercase tracking-widest hover:bg-white hover:text-black transition-colors duration-300"
                onClick={() => window.location.reload()}
              >
                새로고침
              </button>
            </div>
          ) : products.length === 0 ? (
            <div className="text-center py-32">
              <p className="text-lg text-gray-600 mb-2">검색 결과가 없습니다.</p>
              <p className="text-sm text-gray-500 mb-8">다른 검색어나 필터를 사용해보세요.</p>
              <button 
                className="px-8 py-3 border border-black bg-transparent text-black text-sm uppercase tracking-widest hover:bg-black hover:text-white transition-colors duration-300"
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
              <p className="text-sm text-gray-500 mb-8">
                총 <span className="font-medium text-black">{products.length}</span>개의 제품
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-8 gap-y-12">
                {products.map((product) => (
                  <Link 
                    key={product.id}
                    href={`/store/${product.store_id}/product/${product.id}`}
                    className="group"
                  >
                    <div className="overflow-hidden bg-gray-100 aspect-square mb-4 relative">
                      {!product.is_available && (
                        <div className="absolute top-0 right-0 bg-black text-white text-xs px-3 py-1 uppercase tracking-wider z-10">
                          품절
                        </div>
                      )}
                      {product.product_image_url ? (
                        <img
                          src={product.product_image_url}
                          alt={product.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-700"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-200 text-gray-400">
                          이미지 없음
                        </div>
                      )}
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 mb-1 uppercase tracking-wider">{product.store_name}</p>
                      <h3 className="text-base font-medium mb-2 line-clamp-1 group-hover:underline">
                        {product.product_name}
                      </h3>
                      <p className="text-base font-medium">{product.price.toLocaleString()}원</p>
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