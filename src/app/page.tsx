'use client';

import Link from 'next/link';
import { useState, useEffect } from 'react';
import Image from 'next/image';
import { useAuth } from '@/contexts/AuthContext';
import { useTransition } from '@/contexts/TransitionContext';
import { supabase } from '@/lib/supabase';

// 제품 타입 정의
type Product = {
  id: string;
  product_name: string;
  price: number;
  product_description?: string;
  product_image_url?: string;
  subcategory?: string;
  category?: string;
};

// 스토어 타입 정의 추가
type Store = {
  id: string;
  vendor_id: string;
  store_name: string;
  store_description?: string;
  store_logo_url?: string;
  store_banner_url?: string;
  store_phone?: string;
  store_email?: string;
  store_address: string;
  business_hours?: any;
  is_open?: boolean;
  created_at: string;
  updated_at: string;
};

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const { user } = useAuth();
  const { handleNavigate } = useTransition();
  const [currentSlide, setCurrentSlide] = useState(0);
  const [featuredProducts, setFeaturedProducts] = useState<Product[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  // 스토어 목록을 위한 상태 추가
  const [featuredStores, setFeaturedStores] = useState<Store[]>([]);
  const [isLoadingStores, setIsLoadingStores] = useState(true);

  // 헤드라인 슬라이더 데이터
  const headlines = [
    {
      title: 'TIMELESS VALUE',
      subtitle: 'INVESTMENT & LUXURY',
      description: '시간이 지날수록 빛나는 가치, PIETA 골드 컬렉션'
    },
    {
      title: 'ETERNAL BEAUTY',
      subtitle: 'JEWELRY COLLECTION',
      description: '영원한 아름다움을 담은 PIETA 주얼리 컬렉션'
    },
    {
      title: 'PREMIUM QUALITY',
      subtitle: 'CRAFTSMANSHIP',
      description: '장인정신으로 완성된 최고급 퀄리티'
    }
  ];

  // 제품 데이터를 랜덤하게 가져오는 함수
  const fetchRandomProducts = async () => {
    try {
      setIsLoading(true);
      
      // 모든 제품 가져오기
      const { data: products, error } = await supabase
        .from('products')
        .select('id, product_name, price, product_description, product_image_url, category, subcategory')
        .eq('is_available', true)
        .limit(50); // 충분한 수의 제품을 가져옴
      
      if (error) {
        console.error('Error fetching products:', error);
        setIsLoading(false);
        return;
      }
      
      if (!products || products.length === 0) {
        setIsLoading(false);
        return;
      }
      
      // 제품을 랜덤하게 섞음
      const shuffled = [...products].sort(() => 0.5 - Math.random());
      
      // 처음 3개 선택
      const randomProducts = shuffled.slice(0, 3);
      
      setFeaturedProducts(randomProducts);
      setIsLoading(false);
    } catch (error) {
      console.error('Error:', error);
      setIsLoading(false);
    }
  };

  // 스토어 데이터를 가져오는 함수 추가
  const fetchFeaturedStores = async () => {
    try {
      setIsLoadingStores(true);
      
      // stores 테이블에서 데이터 가져오기
      const { data: stores, error } = await supabase
        .from('stores')
        .select('*')
        .eq('is_open', true)
        .limit(8); // 8개의 스토어만 가져옴
      
      if (error) {
        console.error('Error fetching stores:', error);
        setIsLoadingStores(false);
        return;
      }
      
      if (!stores || stores.length === 0) {
        setIsLoadingStores(false);
        return;
      }
      
      setFeaturedStores(stores);
      setIsLoadingStores(false);
    } catch (error) {
      console.error('Error:', error);
      setIsLoadingStores(false);
    }
  };

  useEffect(() => {
    setMounted(true);

    // 제품 데이터 가져오기
    fetchRandomProducts();
    
    // 스토어 데이터 가져오기
    fetchFeaturedStores();

    // 자동 슬라이드 변경
    const interval = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % headlines.length);
    }, 5000);

    return () => clearInterval(interval);
  }, []);

  // 제품보러가기 클릭 핸들러
  const handleProductsClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    handleNavigate('/products');
  };

  // 가격 포맷팅 함수
  const formatPrice = (price: number) => {
    return price.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ',');
  };

  // 제품 카테고리에 따른 서브타이틀 생성
  const getProductSubtitle = (product: Product) => {
    if (product.category === 'investment') return '24K PURE GOLD';
    if (product.subcategory?.includes('다이아몬드')) return 'PLATINUM & DIAMOND';
    if (product.subcategory?.includes('사파이어')) return 'WHITE GOLD & SAPPHIRE';
    if (product.subcategory?.includes('골드')) return 'GOLD COLLECTION';
    if (product.subcategory?.includes('실버')) return 'SILVER COLLECTION';
    return product.category === 'jewelry' ? 'FINE JEWELRY' : 'PREMIUM COLLECTION';
  };

  // 스토어 카테고리에 따른 서브타이틀 생성 함수 추가
  const getStoreSubtitle = (store: Store) => {
    const description = store.store_description?.toLowerCase() || '';
    
    if (description.includes('골드') || description.includes('금')) return '골드 전문';
    if (description.includes('다이아몬드') || description.includes('다이아')) return '다이아몬드 전문';
    if (description.includes('실버') || description.includes('은')) return '실버 주얼리';
    if (description.includes('사파이어') || description.includes('루비')) return '컬러 젬스톤';
    if (description.includes('워치') || description.includes('시계')) return '명품 워치';
    if (description.includes('투자') || description.includes('인베스트먼트')) return '투자 상품';
    
    return '프리미엄 주얼리';
  };

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Main Hero Section - Fullscreen */}
      <section className="h-screen w-full relative overflow-hidden">
        {/* Background Video */}
        <div className="absolute inset-0 z-0 w-full h-full">
          <div className="relative w-full h-full">
            <video
              autoPlay
              loop
              muted
              playsInline
              className="absolute w-full h-full object-cover"
            >
              <source src="https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/adimages/mainVD.mp4" type="video/mp4" />
            </video>
            {/* Overlay */}
            <div className="absolute inset-0 bg-black/40" />
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center px-4">
          <div className="text-center max-w-3xl mx-auto">
            <p className={`font-light tracking-[0.3em] text-white/70 mb-4 transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              {headlines[currentSlide].subtitle}
            </p>
            <h1 className={`text-5xl md:text-7xl font-light tracking-[0.2em] text-white mb-10 transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              {headlines[currentSlide].title}
            </h1>
            <p className={`text-lg md:text-xl text-white/90 mb-16 font-light tracking-wide transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              {headlines[currentSlide].description}
            </p>
            <div className={`transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              <a
                href="/products"
                onClick={handleProductsClick}
                className="inline-block px-12 py-4 border border-white text-sm tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-colors duration-300"
              >
                컬렉션 보기
              </a>
            </div>
          </div>

          {/* Slide indicators */}
          <div className="absolute bottom-16 left-1/2 transform -translate-x-1/2 flex space-x-3">
            {headlines.map((_, index) => (
              <button
                key={index}
                onClick={() => setCurrentSlide(index)}
                className={`w-2 h-2 rounded-full transition-all duration-300 ${
                  currentSlide === index ? 'bg-white w-6' : 'bg-white/40'
                }`}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Luxury Philosophy Section */}
      <section className="py-40 bg-white text-black">
        <div className="max-w-screen-xl mx-auto px-8 md:px-16">
          <div className="grid grid-cols-1 md:grid-cols-5 gap-16 items-center">
            <div className="md:col-span-2">
              <p className="text-xs tracking-[0.4em] uppercase text-gray-400 mb-8">TIMELESS ELEGANCE</p>
              <h2 className="text-3xl md:text-5xl font-extralight tracking-wide mb-16 leading-tight">진정한 가치와<br />변함없는 아름다움</h2>
              
              <div className="h-[1px] w-16 bg-black/30 mb-16"></div>
              
              <div className="flex items-center space-x-6 mb-8">
                <div className="flex -space-x-2">
                  {isLoadingStores ? (
                    [1, 2, 3].map((i) => (
                      <div key={i} className="w-10 h-10 rounded-full border-2 border-white bg-gray-100 animate-pulse"></div>
                    ))
                  ) : featuredStores.slice(0, 3).map((store) => (
                    <div key={store.id} className="w-10 h-10 rounded-full border-2 border-white bg-gray-50 overflow-hidden">
                      <img 
                        src={store.store_logo_url || 'https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/brand_placeholder.png'} 
                        alt={store.store_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
                <p className="text-sm text-gray-500 italic">
                  {featuredStores.length}+ 프리미엄 브랜드
                </p>
              </div>
              
              <a href="/storelist" className="inline-block mt-6 px-10 py-3 bg-black text-white text-xs tracking-[0.3em] uppercase hover:bg-gray-900 transition-colors">
                브랜드 컬렉션
              </a>
            </div>
            
            <div className="md:col-span-3 relative">
              <div className="aspect-[4/5] overflow-hidden">
                <img 
                  src="https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/luxury_jewelry.jpg" 
                  alt="Luxury Jewelry"
                  className="w-full h-full object-cover hover:scale-105 transition-transform duration-700"
                />
              </div>
              
              <div className="absolute -bottom-8 -left-8 bg-white shadow-xl p-8 max-w-xs hidden md:block">
                <p className="text-xs tracking-wider uppercase text-gray-500 mb-3">Our Philosophy</p>
                <p className="text-sm leading-relaxed text-gray-700">
                  엄선된 재료와 장인정신으로 시간이 지나도 변하지 않는 가치를 창조합니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Featured Products */}
      <section className="py-40 bg-black">
        <div className="max-w-screen-xl mx-auto px-8 md:px-16">
          <div className="text-center mb-28">
            <p className="text-xs tracking-[0.4em] uppercase text-gray-400 mb-6">CURATED SELECTION</p>
            <h2 className="text-3xl md:text-5xl font-extralight tracking-wide">프리미엄 컬렉션</h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-16">
            {isLoading ? (
              // 로딩 상태 표시
              <>
                {[1, 2, 3].map((i) => (
                  <div key={i} className="animate-pulse">
                    <div className="aspect-square bg-gray-800 mb-8"></div>
                    <div className="h-3 bg-gray-700 rounded mb-3 w-1/2"></div>
                    <div className="h-5 bg-gray-700 rounded mb-3 w-3/4"></div>
                    <div className="h-3 bg-gray-700 rounded w-1/4"></div>
                  </div>
                ))}
              </>
            ) : featuredProducts.length > 0 ? (
              // 제품 데이터 표시
              featuredProducts.map((product) => (
                <div key={product.id} className="group cursor-pointer">
                  <div className="relative aspect-square bg-black mb-8 overflow-hidden">
                    <img 
                      src={product.product_image_url || 'https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/product_placeholder.jpg'}
                      alt={product.product_name}
                      className="h-full w-full object-contain p-8 transition-transform duration-700 group-hover:scale-105"
                    />
                    <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <span className="text-xs tracking-[0.3em] uppercase text-white border border-white/50 px-6 py-2">자세히 보기</span>
                    </div>
                  </div>
                  <p className="text-xs text-gray-400 tracking-[0.2em] uppercase mb-2">{getProductSubtitle(product)}</p>
                  <h3 className="text-lg font-light mb-3">{product.product_name.toUpperCase()}</h3>
                  <p className="text-white text-sm">{formatPrice(product.price)}원</p>
                </div>
              ))
            ) : (
              // 데이터가 없을 때 표시
              <div className="col-span-3 text-center py-16">
                <p className="text-gray-400">제품 정보를 불러올 수 없습니다</p>
              </div>
            )}
          </div>

          <div className="text-center mt-28">
            <a 
              href="/products"
              onClick={handleProductsClick}
              className="inline-block px-14 py-4 border border-white text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors duration-300"
            >
              전체 컬렉션
            </a>
          </div>
        </div>
      </section>

      {/* Custom Collection Section */}
      <section className="py-40 bg-black text-white">
        <div className="max-w-screen-xl mx-auto px-8 md:px-16">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-24 items-center">
            <div className="order-2 md:order-1">
              <p className="text-xs tracking-[0.4em] uppercase text-gray-400 mb-8">PERSONALIZATION</p>
              <h2 className="text-3xl md:text-5xl font-extralight tracking-wide mb-16 leading-tight">맞춤형<br />커스텀 컬렉션</h2>
              
              <div className="h-[1px] w-16 bg-white/30 mb-16"></div>
              
              <p className="text-white/70 text-sm leading-relaxed mb-12 max-w-md">
                고객의 취향과 요구에 맞춘 특별한 작품을 제작해 드립니다. 세계적인 장인들과 함께 오직 당신만을 위한 독창적인 디자인을 경험하세요.
              </p>
              
              <a href="/custom" className="inline-block px-10 py-3 border border-white text-xs tracking-[0.3em] uppercase hover:bg-white hover:text-black transition-colors duration-300">
                맞춤 제작 문의
              </a>
            </div>
            
            <div className="order-1 md:order-2 relative">
              <div className="aspect-square overflow-hidden">
                <div className="grid grid-cols-2 gap-2 h-full">
                  <div className="space-y-2">
                    <div className="bg-gray-800 h-[calc(50%-4px)] overflow-hidden">
                      <img 
                        src="https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/custom_jewelry1.jpg" 
                        alt="Custom Jewelry" 
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                    <div className="bg-gray-800 h-[calc(50%-4px)] overflow-hidden">
                      <img 
                        src="https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/custom_jewelry2.jpg" 
                        alt="Custom Jewelry" 
                        className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                      />
                    </div>
                  </div>
                  <div className="bg-gray-800 overflow-hidden">
                    <img 
                      src="https://gbqguwfaqhmbdypbghqo.supabase.co/storage/v1/object/public/images/custom_jewelry3.jpg" 
                      alt="Custom Jewelry" 
                      className="w-full h-full object-cover hover:scale-110 transition-transform duration-700"
                    />
                  </div>
                </div>
              </div>
              
              <div className="absolute -bottom-8 -right-8 bg-white text-black shadow-xl p-8 max-w-xs hidden md:block">
                <p className="text-xs tracking-wider uppercase text-gray-500 mb-3">Exclusive Service</p>
                <p className="text-sm leading-relaxed">
                  최고급 다이아몬드와 젬스톤을 활용한 세상에 하나뿐인 작품을 위한 프라이빗 컨설팅
                </p>
              </div>
            </div>
          </div>
          
          <div className="mt-32 border-t border-white/10 pt-32 grid grid-cols-1 md:grid-cols-3 gap-16 text-center">
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
              </div>
              <h3 className="text-xl font-extralight mb-4">디자인 컨설팅</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                전문 디자이너와 1:1 상담을 통해 고객의 개성을 담은 디자인을 구상합니다.
              </p>
            </div>
            
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M14.121 14.121L19 19m-7-7l7-7m-7 7l-2.879 2.879M12 12L9.121 9.121m0 5.758a3 3 0 10-4.243 4.243 3 3 0 004.243-4.243zm0-5.758a3 3 0 10-4.243-4.243 3 3 0 004.243 4.243z" />
                </svg>
              </div>
              <h3 className="text-xl font-extralight mb-4">소재 선택</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                세계 최고 품질의 다이아몬드, 젬스톤, 귀금속 중에서 선택할 수 있습니다.
              </p>
            </div>
            
            <div>
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-full bg-white/5 mb-8">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                </svg>
              </div>
              <h3 className="text-xl font-extralight mb-4">품질 보증</h3>
              <p className="text-white/60 text-sm leading-relaxed">
                모든 커스텀 제품은 국제 인증서와 함께 영구적인 품질 보증을 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Why Choose Us Section */}
      <section className="py-32 bg-black">
        <div className="max-w-screen-xl mx-auto px-8 md:px-16">
          <div className="text-center mb-24">
            <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-6">PIETA ADVANTAGE</p>
            <h2 className="text-3xl md:text-4xl font-light tracking-wide mb-10">WHY CHOOSE PIETA</h2>
            <p className="text-white/70 max-w-2xl mx-auto">
              PIETA는 엄격한 기준으로 선별된 파트너사와 함께 고객에게 최고의 가치를 제공합니다
            </p>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-12">
            {/* Feature 1 */}
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light mb-4">엄격한 품질 보증</h3>
              <p className="text-white/60 leading-relaxed">
                모든 제품은 국제 표준을 충족하는 인증서와 함께 제공됩니다. 100% 정품 보증과 투명한 거래를 약속합니다.
              </p>
            </div>
            
            {/* Feature 2 */}
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M3 6l3 1m0 0l-3 9a5.002 5.002 0 006.001 0M6 7l3 9M6 7l6-2m6 2l3-1m-3 1l-3 9a5.002 5.002 0 006.001 0M18 7l3 9m-3-9l-6-2m0-2v2m0 16V5m0 16H9m3 0h3" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light mb-4">공정 거래 정책</h3>
              <p className="text-white/60 leading-relaxed">
                공정하고 투명한 가격 정책으로 소비자와 브랜드 모두에게 최상의 가치를 제공합니다. 숨겨진 비용이 없습니다.
              </p>
            </div>
            
            {/* Feature 3 */}
            <div className="text-center">
              <div className="mb-8 flex justify-center">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white/70" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
                  </svg>
                </div>
              </div>
              <h3 className="text-xl font-light mb-4">글로벌 네트워크</h3>
              <p className="text-white/60 leading-relaxed">
                국내외 50개 이상의 프리미엄 브랜드와 협력하여 다양한 선택지와 독점 컬렉션을 제공합니다.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Newsletter & Footer - Elegant Black */}
      <section className="py-32 bg-black">
        <div className="max-w-screen-xl mx-auto px-8 md:px-16 text-center">
          <p className="text-xs tracking-[0.3em] uppercase text-gray-400 mb-6">PIETA NEWSLETTER</p>
          <h2 className="text-3xl md:text-4xl font-light tracking-wide mb-10">소식 구독하기</h2>
          <p className="text-white/70 mb-16 max-w-xl mx-auto">
            PIETA의 새로운 컬렉션 소식과 투자 인사이트를 가장 먼저 받아보세요
          </p>
          
          <div className="max-w-md mx-auto">
            <form className="flex flex-col sm:flex-row gap-5">
              <input
                type="email"
                placeholder="이메일"
                className="flex-1 bg-transparent border-b border-white/30 pb-3 px-2 text-white placeholder:text-white/50 focus:outline-none focus:border-white transition-colors"
                required
              />
              <button
                type="submit"
                className="sm:w-auto px-8 py-3 border border-white text-xs tracking-[0.2em] uppercase hover:bg-white hover:text-black transition-colors duration-300"
              >
                구독
              </button>
            </form>
          </div>
          
          <div className="mt-32 pt-16 border-t border-white/10">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-8 text-left mb-16">
              <div>
                <h3 className="text-sm font-light uppercase tracking-wider mb-6">COLLECTIONS</h3>
                <ul className="space-y-4 text-sm text-white/60">
                  <li><a href="/jewelry" className="hover:text-white transition-colors">주얼리</a></li>
                  <li><a href="/investment" className="hover:text-white transition-colors">투자 제품</a></li>
                  <li><a href="/limited" className="hover:text-white transition-colors">한정판</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-light uppercase tracking-wider mb-6">ABOUT</h3>
                <ul className="space-y-4 text-sm text-white/60">
                  <li><a href="/about" className="hover:text-white transition-colors">브랜드 소개</a></li>
                  <li><a href="/craftsmanship" className="hover:text-white transition-colors">장인정신</a></li>
                  <li><a href="/responsibility" className="hover:text-white transition-colors">책임과 윤리</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-light uppercase tracking-wider mb-6">SERVICES</h3>
                <ul className="space-y-4 text-sm text-white/60">
                  <li><a href="/contact" className="hover:text-white transition-colors">상담 예약</a></li>
                  <li><a href="/care" className="hover:text-white transition-colors">제품 관리</a></li>
                  <li><a href="/faq" className="hover:text-white transition-colors">자주 묻는 질문</a></li>
                </ul>
              </div>
              <div>
                <h3 className="text-sm font-light uppercase tracking-wider mb-6">LEGAL</h3>
                <ul className="space-y-4 text-sm text-white/60">
                  <li><a href="/terms" className="hover:text-white transition-colors">이용약관</a></li>
                  <li><a href="/privacy" className="hover:text-white transition-colors">개인정보처리방침</a></li>
                  <li><a href="/cookies" className="hover:text-white transition-colors">쿠키 정책</a></li>
                </ul>
              </div>
            </div>
            
            <div className="flex flex-col md:flex-row justify-between items-center gap-8 pt-8 border-t border-white/10">
              <p className="text-white/40 text-sm">© 2024 PIETA. All rights reserved.</p>
              <div className="flex space-x-8">
                <a href="#" className="text-white/40 hover:text-white transition-colors">Instagram</a>
                <a href="#" className="text-white/40 hover:text-white transition-colors">Facebook</a>
                <a href="#" className="text-white/40 hover:text-white transition-colors">Twitter</a>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

