'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
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

// 슬라이드 데이터 타입
type SlideData = {
  id: number;
  imageUrl: string;
  title: string;
  subtitle: string;
  buttonText: string;
  buttonLink: string;
};

export default function InvestmentPage() {
  const { user } = useAuth();
  const [products, setProducts] = useState<ProductData[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  
  // 필터링 및 정렬 상태
  const [sortOption, setSortOption] = useState('newest');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');

  // 슬라이더 관련 상태
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState('next'); // 'next' 또는 'prev'
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  
  const [slides, setSlides] = useState<SlideData[]>([]);

  // 카테고리 옵션
  const categories = [
    { id: 'all', name: '전체' },
    { id: 'gold', name: '골드' },
    { id: 'platinum', name: '플래티넘' },
    { id: 'silver', name: '실버' },
    { id: 'diamond', name: '다이아몬드' },
    { id: 'other', name: '기타' }
  ];

  // 소재 옵션
  const materials = [
    { id: 'all', name: '전체' },
    { id: 'gold', name: '골드' },
    { id: 'platinum', name: '플래티넘' },
    { id: 'silver', name: '실버' },
    { id: 'diamond', name: '다이아몬드' },
    { id: 'other', name: '기타' }
  ];

  // 광고 데이터 가져오기
  useEffect(() => {
    const fetchAds = async () => {
      try {
        const { data: adsData, error: adsError } = await supabase
          .from('advertisements')
          .select('*')
          .eq('tag', 'mainAD')
          .eq('is_active', true)
          .order('created_at', { ascending: true });

        if (adsError) throw adsError;

        if (adsData) {
          const formattedSlides = adsData.map((ad, index) => ({
            id: index + 1,
            imageUrl: ad.image_url,
            title: ad.title,
            subtitle: ad.description,
            buttonText: ad.button_text || '자세히 보기',
            buttonLink: ad.button_link || '#'
          }));
          setSlides(formattedSlides);
        }
      } catch (error) {
        console.error('광고 데이터 로딩 중 오류 발생:', error);
      }
    };

    fetchAds();
  }, []);

  // 슬라이드 변경 함수
  const changeSlide = (newIndex: number) => {
    if (animating) return;
    
    setAnimating(true);
    setSlideDirection(newIndex > currentSlide ? 'next' : 'prev');
    setCurrentSlide(newIndex);
    
    // 애니메이션 종료 후 상태 재설정
    setTimeout(() => {
      setAnimating(false);
    }, 1000); // 애니메이션 시간을 1초로 증가
    
    // 자동 슬라이드 재설정
    resetSlideTimer();
  };

  // 다음 슬라이드로 이동
  const nextSlide = () => {
    const newIndex = (currentSlide + 1) % slides.length;
    changeSlide(newIndex);
  };

  // 이전 슬라이드로 이동
  const prevSlide = () => {
    const newIndex = currentSlide === 0 ? slides.length - 1 : currentSlide - 1;
    changeSlide(newIndex);
  };

  // 슬라이드 타이머 재설정
  const resetSlideTimer = () => {
    if (slideTimerRef.current) {
      clearInterval(slideTimerRef.current);
    }
    
    slideTimerRef.current = setInterval(() => {
      nextSlide();
    }, 8000); // 슬라이드 간격을 8초로 증가
  };

  // 슬라이드 자동 변경
  useEffect(() => {
    resetSlideTimer();
    
    return () => {
      if (slideTimerRef.current) {
        clearInterval(slideTimerRef.current);
      }
    };
  }, []);

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
          .or('category.eq.investment,product_name.ilike.%투자%,product_name.ilike.%골드%,product_name.ilike.%플래티넘%,product_name.ilike.%실버%,product_name.ilike.%다이아몬드%');
        
        if (!showUnavailable) {
          query = query.eq('is_available', true);
        }
        
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
          let filteredProducts = productsData.map((product: any) => ({
            ...product,
            store_name: product.stores?.store_name || '알 수 없는 상점'
          }));
          
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
    <div className="min-h-screen bg-white">
      {/* 메인 비주얼 */}
      <div className="relative h-[50vh] overflow-hidden">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=2070&auto=format&fit=crop"
            alt="Luxury Investment"
            className="w-full h-full object-cover"
          />
        </div>
        <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/30 to-transparent"></div>
        <div className="relative h-full flex items-center justify-center text-center px-4">
          <div className="max-w-4xl">
            <h1 className="text-4xl md:text-5xl font-serif text-white mb-4 tracking-wider">INVESTMENT</h1>
            <p className="text-base md:text-lg text-white/90 max-w-2xl mx-auto leading-relaxed">
              안전하고 신뢰할 수 있는 투자 상품을 만나보세요.
              <br className="hidden md:block" />
              전문가가 엄선한 다양한 투자 상품들이 당신을 기다립니다.
            </p>
          </div>
        </div>
      </div>

      {/* 카테고리 네비게이션 */}
      <div className="sticky top-0 z-10 bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4">
          <div className="flex items-center justify-between py-4">
            <div className="overflow-x-auto flex-1 scrollbar-hide" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex space-x-8 pb-1 min-w-max">
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
                    {category.name}
                  </button>
                ))}
              </div>
            </div>
            <div className="flex items-center space-x-4 ml-4">
              <select
                value={selectedMaterial}
                onChange={(e) => setSelectedMaterial(e.target.value)}
                className="text-sm border-none bg-transparent focus:ring-0"
              >
                {materials.map((material) => (
                  <option key={material.id} value={material.id}>
                    {material.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>
      
      <div className="max-w-7xl mx-auto px-4 py-12">
        {/* 필터링 및 검색 */}
        <div className="bg-white mb-12">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="w-full md:w-1/3">
              <div className="relative">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="제품명 또는 상점명으로 검색"
                  className="w-full px-4 py-2 border-b border-gray-300 focus:outline-none focus:border-black transition-colors"
                />
                <svg
                  className="absolute right-3 top-2.5 h-5 w-5 text-gray-400"
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
            
            <div className="flex items-center space-x-6">
              <select 
                className="border-none bg-transparent focus:ring-0 text-sm"
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
                <span className="ml-2">품절 상품 표시</span>
              </label>
            </div>
          </div>
        </div>
        
        {/* 제품 목록 */}
        {loading ? (
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-black"></div>
          </div>
        ) : error ? (
          <div className="text-center py-12">
            <p className="text-red-600">{error}</p>
          </div>
        ) : products.length === 0 ? (
          <div className="text-center py-12">
            <p className="text-gray-500">
              {searchQuery ? '검색 결과가 없습니다.' : '등록된 투자 상품이 없습니다.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-8 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {products.map((product) => (
              <div key={product.id} className="group">
                <Link href={`/store/${product.store_id}/product/${product.id}`} className="block">
                  <div className="relative aspect-square bg-gray-100 overflow-hidden">
                    {product.product_image_url ? (
                      <img
                        src={product.product_image_url}
                        alt={`${product.product_name} 이미지`}
                        className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-3xl font-serif">{product.product_name.charAt(0)}</span>
                      </div>
                    )}
                    {!product.is_available && (
                      <div className="absolute top-4 right-4 px-3 py-1 text-xs font-medium text-white bg-black/80">
                        품절
                      </div>
                    )}
                  </div>
                  <div className="mt-4">
                    <p className="text-sm text-gray-500 mb-1">{product.store_name}</p>
                    <h3 className="text-lg font-medium text-gray-900 mb-2">{product.product_name}</h3>
                    <p className="text-xl font-serif text-gray-900">{product.price.toLocaleString()}원</p>
                    
                    <div className="flex items-center justify-between mt-3">
                      <div className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                        <span className="text-sm text-gray-600 ml-1">
                          {product.average_rating !== undefined ? product.average_rating.toFixed(1) : '0.0'}
                        </span>
                      </div>
                      <span className="text-sm text-gray-500">
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
    </div>
  );
} 