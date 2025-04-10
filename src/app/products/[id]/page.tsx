'use client';

import { useEffect, useState } from 'react';
import { useParams } from 'next/navigation';
import { supabase } from '@/lib/supabase';
import MainLayout from '@/components/layout/MainLayout';

type ProductDetail = {
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
  material?: string;
  specifications?: any;
};

export default function ProductDetailPage() {
  const params = useParams();
  const [product, setProduct] = useState<ProductDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  useEffect(() => {
    const fetchProduct = async () => {
      try {
        setLoading(true);
        setError(null);

        const { data: productData, error: productError } = await supabase
          .from('products')
          .select(`
            *,
            stores:store_id (
              store_name,
              store_description
            )
          `)
          .eq('id', params.id)
          .single();

        if (productError) throw productError;

        if (productData) {
          setProduct({
            ...productData,
            store_name: productData.stores?.store_name || '알 수 없는 상점'
          });
          if (productData.product_image_url) {
            setSelectedImage(productData.product_image_url);
          }
        }
      } catch (error: any) {
        console.error('제품 상세 정보 로딩 중 오류 발생:', error);
        setError('제품 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    if (params.id) {
      fetchProduct();
    }
  }, [params.id]);

  if (loading) {
    return (
      <MainLayout showNav={false} centered={false}>
        <div className="flex items-center justify-center min-h-screen">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-4 border-black border-r-transparent"></div>
        </div>
      </MainLayout>
    );
  }

  if (error || !product) {
    return (
      <MainLayout showNav={false} centered={false}>
        <div className="flex flex-col items-center justify-center min-h-screen">
          <p className="text-red-600 mb-4">{error || '제품을 찾을 수 없습니다.'}</p>
          <button
            onClick={() => window.history.back()}
            className="px-6 py-2 bg-black text-white text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors"
          >
            이전 페이지로
          </button>
        </div>
      </MainLayout>
    );
  }

  return (
    <MainLayout showNav={false} centered={false}>
      <div className="max-w-7xl mx-auto px-4 py-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
          {/* 제품 이미지 */}
          <div className="space-y-4">
            <div className="aspect-square overflow-hidden bg-gray-100 rounded-lg">
              {selectedImage ? (
                <img
                  src={selectedImage}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center text-gray-400">
                  No Image
                </div>
              )}
            </div>
          </div>

          {/* 제품 정보 */}
          <div className="space-y-8">
            <div>
              <h1 className="text-3xl font-light mb-2">{product.product_name}</h1>
              <p className="text-gray-500">{product.store_name}</p>
            </div>

            <div className="space-y-4">
              <div className="flex justify-between items-baseline">
                <span className="text-2xl font-medium">
                  {product.price.toLocaleString()}원
                </span>
                {!product.is_available && (
                  <span className="text-red-500">품절</span>
                )}
              </div>
              
              {product.stock > 0 && (
                <p className="text-sm text-gray-500">
                  재고: {product.stock}개
                </p>
              )}
            </div>

            <div className="border-t border-gray-200 pt-8">
              <h2 className="text-lg font-medium mb-4">제품 설명</h2>
              <p className="text-gray-600 whitespace-pre-line">
                {product.product_description}
              </p>
            </div>

            {product.specifications && (
              <div className="border-t border-gray-200 pt-8">
                <h2 className="text-lg font-medium mb-4">제품 상세</h2>
                <dl className="space-y-4">
                  {Object.entries(product.specifications).map(([key, value]) => (
                    <div key={key} className="grid grid-cols-3 gap-4">
                      <dt className="text-gray-500">{key}</dt>
                      <dd className="col-span-2">{String(value)}</dd>
                    </div>
                  ))}
                </dl>
              </div>
            )}

            <div className="border-t border-gray-200 pt-8">
              <button
                disabled={!product.is_available}
                className="w-full py-4 bg-black text-white text-sm uppercase tracking-wider hover:bg-gray-800 transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {product.is_available ? '장바구니에 담기' : '품절된 상품입니다'}
              </button>
            </div>
          </div>
        </div>
      </div>
    </MainLayout>
  );
} 