'use client';

import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { fetchGoldPrices, PriceInfo } from '@/lib/goldPrices';

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
  const [sortOption, setSortOption] = useState('price_desc');
  const [showUnavailable, setShowUnavailable] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // 시세표 관련 상태
  const [showPriceTable, setShowPriceTable] = useState(true);
  const [lastUpdated, setLastUpdated] = useState<string>(''); 
  const [priceInfo, setPriceInfo] = useState<PriceInfo[]>([]);
  const [fetchingPrices, setFetchingPrices] = useState(true);

  // 슬라이더 관련 상태
  const [currentSlide, setCurrentSlide] = useState(0);
  const [animating, setAnimating] = useState(false);
  const [slideDirection, setSlideDirection] = useState('next'); // 'next' 또는 'prev'
  const slideTimerRef = useRef<NodeJS.Timeout | null>(null);
  const priceUpdateTimerRef = useRef<NodeJS.Timeout | null>(null);
  const slidesRef = useRef<HTMLDivElement>(null);
  
  const [slides, setSlides] = useState<SlideData[]>([]);

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

  // 금시세 정보 가져오기 함수
  const updateGoldPrices = async () => {
    try {
      setFetchingPrices(true);
      const { priceData, timestamp } = await fetchGoldPrices();
      setPriceInfo(priceData);
      setLastUpdated(timestamp);
    } catch (error) {
      console.error('금시세 업데이트 실패:', error);
    } finally {
      setFetchingPrices(false);
    }
  };

  // 초기 금시세 데이터 로드 및 주기적 업데이트 설정
  useEffect(() => {
    // 최초 로드
    updateGoldPrices();
    
    // 1시간마다 자동 업데이트
    priceUpdateTimerRef.current = setInterval(() => {
      updateGoldPrices();
    }, 3600000); // 1시간(3600000ms)
    
    return () => {
      if (priceUpdateTimerRef.current) {
        clearInterval(priceUpdateTimerRef.current);
      }
    };
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
      <div className="relative overflow-hidden h-[600px] bg-gray-900">
        {/* 시세표 오버레이 - 왼쪽에 배치하고 높이를 배너와 맞춤 */}
        <div className="absolute top-0 left-0 w-[350px] h-full bg-gradient-to-br from-gray-900 to-gray-800 z-30 overflow-hidden border-r border-yellow-600/30">
          {/* 헤더 */}
          <div className="bg-black/40 backdrop-blur-sm text-white px-6 py-4 flex justify-between items-center border-b border-yellow-500/20">
            <div className="flex items-center">
              <h3 className="text-lg font-serif tracking-wide text-yellow-400">시세정보</h3>
            </div>
            <div className="text-xs text-yellow-400/80">
              {lastUpdated ? lastUpdated : '업데이트 중...'}
            </div>
          </div>
          
          {/* 시세 테이블 */}
          <div className="overflow-auto h-[calc(100%-100px)] px-4 py-4">
            {fetchingPrices && priceInfo.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <svg className="animate-spin h-8 w-8 mx-auto mb-2 text-yellow-500" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <p>시세를 불러오는 중입니다...</p>
              </div>
            ) : priceInfo.length === 0 ? (
              <div className="text-center text-gray-400 py-8">
                <p>시세 정보를 불러올 수 없습니다.</p>
              </div>
            ) : (
              <div className="space-y-5">
                {/* 순금 시세 */}
                <div className="border border-yellow-500/30 rounded-md overflow-hidden">
                  <div className="bg-yellow-500/10 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-400 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-yellow-400">순금시세</span>
                    </div>
                    <span className="text-xs text-gray-400">Gold24k-3.75g</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-yellow-500/20">
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">매입가(살 때)</div>
                      <div className="text-base font-semibold text-white">618,000원</div>
                      <div className="flex items-center text-xs text-red-400 mt-1">
                        <span>+1.29%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">8,000</span>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">판매가(팔 때)</div>
                      <div className="text-base font-semibold text-white">532,000원</div>
                      <div className="flex items-center text-xs text-red-400 mt-1">
                        <span>+1.32%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">7,000</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* 18K 금시세 */}
                <div className="border border-yellow-300/30 rounded-md overflow-hidden">
                  <div className="bg-yellow-300/10 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-300 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-yellow-300">18K 금시세</span>
                    </div>
                    <span className="text-xs text-gray-400">Gold18k-3.75g</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-yellow-300/20">
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">매입가(살 때)</div>
                      <div className="text-base font-semibold text-white text-opacity-70">제품시세적용</div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">판매가(팔 때)</div>
                      <div className="text-base font-semibold text-white">391,100원</div>
                      <div className="flex items-center text-xs text-red-400 mt-1">
                        <span>+1.33%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">5,200</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 14K 금시세 */}
                <div className="border border-yellow-200/30 rounded-md overflow-hidden">
                  <div className="bg-yellow-200/10 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-yellow-200 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-yellow-200">14K 금시세</span>
                    </div>
                    <span className="text-xs text-gray-400">Gold14k-3.75g</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-yellow-200/20">
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">매입가(살 때)</div>
                      <div className="text-base font-semibold text-white text-opacity-70">제품시세적용</div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">판매가(팔 때)</div>
                      <div className="text-base font-semibold text-white">303,300원</div>
                      <div className="flex items-center text-xs text-red-400 mt-1">
                        <span>+1.32%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">4,000</span>
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 백금시세 */}
                <div className="border border-gray-400/30 rounded-md overflow-hidden">
                  <div className="bg-gray-400/10 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-300 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-300">백금시세</span>
                    </div>
                    <span className="text-xs text-gray-400">Platinum-3.75g</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-500/20">
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">매입가(살 때)</div>
                      <div className="text-base font-semibold text-white">203,000원</div>
                      <div className="flex items-center text-xs text-blue-400 mt-1">
                        <span>-0.99%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 13a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 13H12z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">2,000</span>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">판매가(팔 때)</div>
                      <div className="text-base font-semibold text-white">165,000원</div>
                      <div className="flex items-center text-xs text-blue-400 mt-1">
                        <span>-0.61%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 13a1 1 0 100-2H6.414l1.293-1.293a1 1 0 10-1.414-1.414l-3 3a1 1 0 000 1.414l3 3a1 1 0 001.414-1.414L6.414 13H12z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">1,000</span>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        (자사백금바기준)
                      </div>
                    </div>
                  </div>
                </div>
                
                {/* 은시세 */}
                <div className="border border-gray-300/30 rounded-md overflow-hidden">
                  <div className="bg-gray-300/10 px-4 py-2 flex items-center justify-between">
                    <div className="flex items-center">
                      <div className="w-3 h-3 bg-gray-200 rounded-full mr-2"></div>
                      <span className="text-sm font-medium text-gray-200">은시세</span>
                    </div>
                    <span className="text-xs text-gray-400">Silver-3.75g</span>
                  </div>
                  <div className="grid grid-cols-2 divide-x divide-gray-300/20">
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">매입가(살 때)</div>
                      <div className="text-base font-semibold text-white">7,010원</div>
                      <div className="flex items-center text-xs text-red-400 mt-1">
                        <span>+0.86%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">60</span>
                      </div>
                    </div>
                    <div className="px-4 py-3">
                      <div className="text-xs text-gray-400 mb-1">판매가(팔 때)</div>
                      <div className="text-base font-semibold text-white">5,570원</div>
                      <div className="flex items-center text-xs text-red-400 mt-1">
                        <span>+0.72%</span>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 ml-0.5" viewBox="0 0 20 20" fill="currentColor">
                          <path fillRule="evenodd" d="M12 7a1 1 0 10-2 0v5.586l-1.293-1.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l3-3a1 1 0 00-1.414-1.414L12 12.586V7z" clipRule="evenodd" />
                        </svg>
                        <span className="ml-1">40</span>
                      </div>
                      <div className="text-[9px] text-gray-500 mt-1">
                        (자사실버바기준)
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </div>
          
          {/* 푸터 */}
          <div className="absolute bottom-0 left-0 right-0 px-5 py-3 bg-black/40 backdrop-blur-sm text-[10px] text-gray-400 flex justify-between items-center border-t border-yellow-500/20">
            <button
              onClick={updateGoldPrices}
              className="flex items-center text-yellow-400 hover:text-yellow-300 transition-colors"
              title="새로고침"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              시세 새로고침
            </button>
          </div>
        </div>

        {/* 슬라이드 컨테이너 */}
        {slides.length > 0 ? (
          <>
            <div 
              ref={slidesRef}
              className="relative h-full transition-transform duration-1000 ease-in-out"
              style={{ 
                width: `${slides.length * 100}%`,
                transform: `translateX(-${currentSlide * (100 / slides.length)}%)` 
              }}
            >
              {slides.map((slide) => (
                <div 
                  key={slide.id}
                  className="absolute top-0 h-full"
                  style={{ width: `${100 / slides.length}%`, left: `${(slide.id - 1) * (100 / slides.length)}%` }}
                >
                  <div 
                    className="h-full bg-cover bg-center"
                    style={{ backgroundImage: `url('${slide.imageUrl}')` }}
                  />
                </div>
              ))}
            </div>
            
            {/* 슬라이드 인디케이터 */}
            <div className="absolute bottom-4 left-0 right-0 flex justify-center gap-3 z-30">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => changeSlide(index)}
                  className={`w-2 h-2 rounded-full transition-all duration-300 ${
                    index === currentSlide 
                      ? 'bg-yellow-400 w-6' 
                      : 'bg-white/40 hover:bg-white/60'
                  }`}
                  aria-label={`슬라이드 ${index + 1}로 이동`}
                />
              ))}
            </div>
            
            {/* 좌우 화살표 */}
            <button 
              className="absolute left-4 md:left-8 top-1/2 transform -translate-y-1/2 z-30 bg-black/30 hover:bg-black/50 text-white w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300"
              onClick={prevSlide}
              aria-label="이전 슬라이드"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
            </button>
            <button 
              className="absolute right-4 md:right-8 top-1/2 transform -translate-y-1/2 z-30 bg-black/30 hover:bg-black/50 text-white w-10 h-10 flex items-center justify-center rounded-full transition-all duration-300"
              onClick={nextSlide}
              aria-label="다음 슬라이드"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </button>
          </>
        ) : (
          <div className="h-full flex items-center justify-center">
            <p className="text-gray-400">등록된 광고가 없습니다.</p>
          </div>
        )}
      </div>
      
      {/* 시세표 영역 */}
      <div className="max-w-7xl mx-auto px-4 py-6" id="products">
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
              <div className="flex items-center">
                {fetchingPrices && (
                  <svg className="animate-spin h-4 w-4 text-white mr-2" viewBox="0 0 24 24">
                    <circle 
                      className="opacity-25" 
                      cx="12" 
                      cy="12" 
                      r="10" 
                      stroke="currentColor" 
                      strokeWidth="4"
                    ></circle>
                    <path 
                      className="opacity-75" 
                      fill="currentColor" 
                      d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                    ></path>
                  </svg>
                )}
              <span className="text-sm mr-4">
                  {lastUpdated ? `마지막 업데이트: ${lastUpdated}` : '데이터 로딩 중...'}
              </span>
                <button 
                  onClick={(e) => {
                    e.stopPropagation();
                    updateGoldPrices();
                  }}
                  className="p-1 bg-yellow-500 hover:bg-yellow-400 rounded mr-2 focus:outline-none"
                  title="시세 새로고침"
                  aria-label="시세 새로고침"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                </button>
              </div>
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
                  {fetchingPrices && priceInfo.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        시세 데이터를 불러오는 중...
                      </td>
                    </tr>
                  ) : priceInfo.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="px-6 py-4 text-center text-sm text-gray-500">
                        시세 정보를 불러올 수 없습니다.
                      </td>
                    </tr>
                  ) : (
                    priceInfo.map((info, index) => (
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
                    ))
                  )}
                </tbody>
              </table>
              <div className="p-3 bg-gray-50 text-xs text-gray-500">
                <p>* 시세는 한국금거래소 기준으로 1시간마다 업데이트됩니다.</p>
                <p>* 제품별 가격은 실제 구매 시 약간의 차이가 있을 수 있습니다.</p>
                <p>* 출처: <a href="https://goldlee6479.koreagoldx.co.kr/" target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:underline">한국금거래소 포항점</a></p>
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