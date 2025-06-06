'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';

interface Store {
  id: string;
  store_name: string;
  store_description: string;
  store_banner_url: string | null;
  store_logo_url: string | null;
  username: string | null;
}

export default function HomePage() {
  const [mounted, setMounted] = useState(false);
  const [stores, setStores] = useState<Store[]>([]);
  const [loading, setLoading] = useState(true);
  const { user } = useAuth();

  useEffect(() => {
    setMounted(true);
    fetchStores();
  }, []);

  const fetchStores = async () => {
    try {
      const { data, error } = await supabase
        .from('stores')
        .select('id, store_name, store_description, store_banner_url, store_logo_url, username')
        .eq('is_open', true)
        .limit(6);

      if (error) {
        console.error('Error fetching stores:', error);
      } else {
        setStores(data || []);
      }
    } catch (error) {
      console.error('Error fetching stores:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-white">
      {/* Hero Section - 여백 없이 전체 너비 사용 */}
      <div className="h-screen w-full relative overflow-hidden">
        {/* Background Gradient */}
        <div className="absolute inset-0 z-0 w-full h-full bg-gradient-to-br from-gray-900 via-gray-800 to-black">
          {/* Pattern overlay for texture */}
          <div className="absolute inset-0 opacity-10" style={{
            backgroundImage: 'radial-gradient(circle at 1px 1px, white 1px, transparent 0)',
            backgroundSize: '20px 20px'
          }}></div>
        </div>

        {/* Content */}
        <div className="relative z-10 h-full flex flex-col items-center justify-center">
          <div className="text-center px-4 max-w-xl">
            <h1 className={`text-4xl md:text-5xl font-light text-white mb-6 tracking-[0.2em] uppercase transition-opacity duration-1000 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              PIETA
            </h1>
            <p className={`text-lg text-white/90 mb-12 tracking-wide transition-opacity duration-1000 delay-300 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              최고의 품질과 서비스를 제공하는 프리미엄 쇼핑몰
            </p>
            <div className={`space-x-6 transition-opacity duration-1000 delay-500 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              {!user ? (
                <>
                  <Link
                    href="/signup"
                    className="inline-block px-8 py-4 bg-white text-black text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-300"
                  >
                    회원가입
                  </Link>
                  <Link
                    href="/login"
                    className="inline-block px-8 py-4 border border-white text-white text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300"
                  >
                    로그인
                  </Link>
                </>
              ) : null}
              <Link
                href="/products"
                className="inline-block px-8 py-4 bg-white/20 backdrop-blur-sm text-white text-sm tracking-widest uppercase hover:bg-white hover:text-black transition-colors duration-300"
              >
                제품보러가기
              </Link>
            </div>
          </div>

          {/* Scroll Indicator */}
          <div className="absolute bottom-8 left-1/2 -translate-x-1/2">
            <div className={`animate-bounce transition-opacity duration-1000 delay-700 ${
              mounted ? 'opacity-100' : 'opacity-0'
            }`}>
              <svg
                className="w-6 h-6 text-white"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                viewBox="0 0 24 24"
                stroke="currentColor"
              >
                <path d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </div>
          </div>
        </div>
      </div>

      {/* Stores Section */}
      <div className="w-full bg-white py-20">
        <div className="max-w-7xl mx-auto px-4">
          <div className="text-center mb-16">
            <p className="text-sm uppercase tracking-widest mb-2 text-gray-600">Featured Stores</p>
            <h2 className="text-4xl font-light uppercase tracking-[0.2em] mb-6">파트너 스토어</h2>
            <p className="text-sm text-gray-600 mb-8">다양한 분야의 전문 매장들을 만나보세요</p>
          </div>

          {loading ? (
            <div className="flex justify-center items-center py-20">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900"></div>
            </div>
          ) : stores.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
              {stores.map((store) => (
                <Link 
                  key={store.id} 
                  href={`/store/${store.id}`}
                  className="group block bg-white border border-gray-200 hover:shadow-xl transition-all duration-300"
                >
                  <div className="aspect-[4/3] relative overflow-hidden">
                    {store.store_banner_url ? (
                      <Image
                        src={store.store_banner_url}
                        alt={store.store_name}
                        fill
                        className="object-cover group-hover:scale-105 transition-transform duration-300"
                        sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                      />
                    ) : (
                      <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                        <div className="text-center">
                          <div className="w-16 h-16 mx-auto mb-4 bg-gray-300 rounded-full flex items-center justify-center">
                            <svg className="w-8 h-8 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m10 0v-2a2 2 0 00-2-2H9a2 2 0 00-2 2v2m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10.99" />
                            </svg>
                          </div>
                          <p className="text-sm text-gray-500">이미지 없음</p>
                        </div>
                      </div>
                    )}
                  </div>
                  <div className="p-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-2 group-hover:text-black transition-colors">
                      {store.store_name}
                    </h3>
                    {store.store_description && (
                      <p className="text-sm text-gray-600 mb-3 overflow-hidden" style={{
                        display: '-webkit-box',
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: 'vertical'
                      }}>
                        {store.store_description}
                      </p>
                    )}
                    {store.username && (
                      <p className="text-xs text-gray-400 uppercase tracking-wide">
                        @{store.username}
                      </p>
                    )}
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className="text-center py-20">
              <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-2m-2 0H7m10 0v-2a2 2 0 00-2-2H9a2 2 0 00-2 2v2m8 0V9a2 2 0 00-2-2H9a2 2 0 00-2 2v10.99" />
                </svg>
              </div>
              <p className="text-gray-500">등록된 스토어가 없습니다</p>
            </div>
          )}

          <div className="text-center mt-12">
            <Link 
              href="/stores" 
              className="inline-block px-10 py-3 border border-black text-black text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-300"
            >
              모든 스토어 보기
            </Link>
          </div>
        </div>
      </div>

      {/* Collection Banner Section */}
      <div className="w-full bg-gray-100 relative">
        <div className="py-24 text-center relative z-10">
          <p className="text-sm uppercase tracking-widest mb-2">프리미엄 컬렉션</p>
          <h2 className="text-4xl font-light uppercase tracking-[0.2em] mb-6">COLLECTION</h2>
          <p className="text-sm mb-8">엄선된 프리미엄 제품들을 만나보세요</p>
          <Link 
            href="/products" 
            className="inline-block px-10 py-3 border border-black text-black text-sm tracking-widest uppercase hover:bg-black hover:text-white transition-colors duration-300"
          >
            더 알아보기
          </Link>
        </div>
      </div>

      {/* Features Section */}
      <div className="py-20 w-full">
        <div className="max-w-6xl mx-auto grid grid-cols-1 md:grid-cols-3 gap-12 px-4">
          <div className={`text-center transition-opacity duration-1000 delay-300 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-lg font-light tracking-widest uppercase mb-4">Premium Quality</h3>
            <p className="text-sm text-gray-600">최고급 품질의 제품만을 엄선하여 제공합니다</p>
          </div>
          <div className={`text-center transition-opacity duration-1000 delay-500 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-lg font-light tracking-widest uppercase mb-4">Exclusive Service</h3>
            <p className="text-sm text-gray-600">차별화된 프리미엄 서비스를 경험하세요</p>
          </div>
          <div className={`text-center transition-opacity duration-1000 delay-700 ${
            mounted ? 'opacity-100' : 'opacity-0'
          }`}>
            <h3 className="text-lg font-light tracking-widest uppercase mb-4">Global Network</h3>
            <p className="text-sm text-gray-600">전세계 파트너들과 함께합니다</p>
          </div>
        </div>
      </div>
    </div>
  );
}
