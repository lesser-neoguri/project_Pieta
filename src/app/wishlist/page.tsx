'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';
import logger from '@/lib/logger';

type WishlistItem = {
  id: string;
  product: {
    id: string;
    product_name: string;
    product_description: string;
    product_image_url: string | null;
    price: number;
    is_available: boolean;
    store: {
      id: string;
      store_name: string;
    }
  };
  created_at: string;
};

export default function WishlistPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [wishlistItems, setWishlistItems] = useState<WishlistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // 로그인 확인
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchWishlist = async () => {
      try {
        setLoading(true);
        setError(null);

        // 사용자의 찜목록 가져오기 (product_favorites 테이블)
        const { data: favorites, error: favoritesError } = await supabase
          .from('product_favorites')
          .select(`
            id,
            product_id,
            created_at,
            product:product_id (
              id,
              product_name,
              product_description,
              product_image_url,
              price,
              is_available,
              store_id,
              store:store_id (
                id,
                store_name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (favoritesError) {
          throw favoritesError;
        }

        // 응답 데이터 가공
        const transformedItems = favorites.map((item: any) => ({
          id: item.id,
          product: item.product,
          created_at: item.created_at
        }));

        setWishlistItems(transformedItems);
      } catch (error: any) {
        logger.error('찜목록을 불러오는 중 오류가 발생했습니다:', error);
        setError('찜목록을 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchWishlist();
  }, [user, router]);

  const handleRemoveItem = async (itemId: string) => {
    try {
      // 확인 대화상자
      if (!confirm('정말 이 상품을 찜목록에서 삭제하시겠습니까?')) {
        return;
      }
      
      // 찜목록에서 항목 삭제
      const { error } = await supabase
        .from('product_favorites')
        .delete()
        .eq('id', itemId);

      if (error) {
        throw error;
      }

      // UI 업데이트
      setWishlistItems((prev) => prev.filter((item) => item.id !== itemId));
    } catch (error: any) {
      logger.error('항목 삭제 중 오류가 발생했습니다:', error);
      alert('항목 삭제 중 오류가 발생했습니다.');
    }
  };

  return (
    <MainLayout centered={false}>
      <div className="max-w-6xl mx-auto px-4 py-16">
        <div className="text-center mb-16">
          <h1 className="text-3xl font-light uppercase tracking-[0.2em] mb-3">찜목록</h1>
          <p className="text-sm text-gray-500">{wishlistItems.length}개 제품</p>
        </div>

        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-gray-50 text-red-700 p-8 text-center">
            {error}
          </div>
        ) : wishlistItems.length === 0 ? (
          <div className="text-center py-24">
            <p className="text-gray-500 mb-8">찜한 상품이 없습니다.</p>
            <Link 
              href="/jewelry" 
              className="inline-block bg-black text-white px-8 py-3 text-sm uppercase tracking-widest hover:bg-gray-900 transition-colors"
            >
              쇼핑하러 가기
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-x-8 gap-y-16">
            {wishlistItems.map((item) => (
              <div key={item.id} className="group relative">
                <div className="relative">
                  {/* 삭제 버튼 */}
                  <button
                    onClick={() => handleRemoveItem(item.id)}
                    className="absolute top-4 right-4 z-10 bg-white/90 p-2 opacity-0 group-hover:opacity-100 transition-opacity"
                    aria-label="찜목록에서 제거"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-gray-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>

                  {/* 품절 표시 */}
                  {!item.product.is_available && (
                    <div className="absolute inset-0 bg-white/60 flex items-center justify-center z-10">
                      <span className="bg-black text-white px-6 py-2 uppercase text-xs tracking-[0.2em]">품절</span>
                    </div>
                  )}

                  {/* 제품 이미지 */}
                  <Link href={`/store/${item.product.store.id}/product/${item.product.id}`}>
                    <div className="overflow-hidden bg-gray-50 aspect-[4/5] border border-gray-100 mb-4">
                      {item.product.product_image_url ? (
                        <img
                          src={item.product.product_image_url}
                          alt={item.product.product_name}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                          이미지 없음
                        </div>
                      )}
                    </div>
                  </Link>
                </div>

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <Link href={`/store/${item.product.store.id}`} className="text-xs text-gray-500 hover:text-black transition-colors">
                      {item.product.store.store_name}
                    </Link>
                    <div className="text-sm font-medium">
                      ₩{item.product.price.toLocaleString()}
                    </div>
                  </div>
                  
                  <Link href={`/store/${item.product.store.id}/product/${item.product.id}`} className="block">
                    <h3 className="text-sm hover:text-gray-600 transition-colors line-clamp-2">{item.product.product_name}</h3>
                  </Link>

                  <div className="pt-4">
                    <Link
                      href={`/store/${item.product.store.id}/product/${item.product.id}`}
                      className="w-full inline-block text-center border border-black py-2 text-xs uppercase tracking-widest hover:bg-black hover:text-white transition-colors"
                    >
                      상세보기
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </MainLayout>
  );
} 