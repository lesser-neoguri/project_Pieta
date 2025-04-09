'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';

export default function CreateProductPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [store, setStore] = useState<any>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);

  useEffect(() => {
    const checkStoreOwnership = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      try {
        // 상점 정보 가져오기
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) throw storeError;
        
        if (!storeData) {
          setError('존재하지 않는 상점입니다.');
          setLoading(false);
          return;
        }

        setStore(storeData);
        
        // 현재 사용자가 상점 소유자인지 확인
        if (user.id === storeData.vendor_id) {
          setIsOwner(true);
        } else {
          setError('상점 소유자만 제품을 등록할 수 있습니다.');
        }
      } catch (error: any) {
        console.error('상점 정보 확인 중 오류 발생:', error);
        setError('상점 정보를 확인하는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    checkStoreOwnership();
  }, [user, storeId, router]);

  const handleProductCreated = () => {
    router.push(`/store/${storeId}`);
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setImageFile(file);
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (error || !store || !isOwner) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error || '제품을 등록할 수 없습니다.'}
            </div>
            <div className="flex justify-center mt-4">
              <Link
                href={`/store/${storeId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                상점으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* 상단 네비게이션 */}
      <div className="border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center">
              <Link href={`/store/${storeId}`} className="text-sm text-gray-500 hover:text-gray-900">
                ← {store.store_name}로 돌아가기
              </Link>
            </div>
          </nav>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* 제품 이미지 섹션 */}
          <div className="sticky top-8">
            <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-200 relative">
              {imagePreview ? (
                <>
                  <img
                    src={imagePreview}
                    alt="제품 이미지 미리보기"
                    className="w-full h-full object-contain"
                  />
                  <button
                    type="button"
                    onClick={handleRemoveImage}
                    className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
                    aria-label="이미지 제거"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </>
              ) : (
                <label
                  htmlFor="product_image_upload"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <p className="mt-4 text-sm text-gray-500 font-pretendard">
                    클릭하여 제품 이미지 추가
                  </p>
                  <p className="mt-2 text-xs text-gray-400 font-pretendard">
                    JPG, PNG, GIF, WEBP (최대 10MB)
                  </p>
                </label>
              )}
              <input
                type="file"
                id="product_image_upload"
                name="product_image"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
          </div>

          {/* 제품 정보 입력 폼 */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-pretendard text-gray-900 mb-4">새 제품 등록</h1>
              <p className="text-gray-600 mb-6 font-pretendard">제품 정보를 입력하고 등록하세요.</p>
            </div>

            <ProductForm 
              storeId={storeId} 
              onProductCreated={handleProductCreated}
              initialData={{
                product_name: '',
                product_description: '',
                price: 0,
                stock: 0,
                is_available: true,
                product_image_url: imagePreview,
                category: ''
              }}
              imageFile={imageFile}
            />
          </div>
        </div>
      </div>
    </div>
  );
} 