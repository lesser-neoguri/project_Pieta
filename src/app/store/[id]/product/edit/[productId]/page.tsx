'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';

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
};

export default function EditProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: storeId, productId } = useParams() as { id: string; productId: string };
  
  const [store, setStore] = useState<any>(null);
  const [product, setProduct] = useState<any>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  
  // 추가 이미지 관련 상태
  const [additionalImages, setAdditionalImages] = useState<{ file: File | null; preview: string; id?: string }[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; id: string; is_primary: boolean }[]>([]);

  useEffect(() => {
    const checkStoreOwnershipAndFetchProduct = async () => {
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
        if (user.id !== storeData.vendor_id) {
          setError('상점 소유자만 제품을 수정할 수 있습니다.');
          setLoading(false);
          return;
        }

        setIsOwner(true);

        // 제품 정보 가져오기
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('store_id', storeId)
          .single();

        if (productError) throw productError;
        
        if (!productData) {
          setError('존재하지 않는 제품입니다.');
          setLoading(false);
          return;
        }

        setProduct(productData);
        // 기존 이미지 미리보기 설정
        if (productData.product_image_url) {
          setImagePreview(productData.product_image_url);
        }
        
        // 추가 이미지 가져오기
        const { data: productImages, error: productImagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });
          
        if (productImagesError) throw productImagesError;
        
        if (productImages && productImages.length > 0) {
          setExistingImages(productImages.map((img: any) => ({
            url: img.image_url,
            id: img.id,
            is_primary: img.is_primary
          })));
        }
      } catch (error: any) {
        console.error('데이터 로딩 중 오류 발생:', error);
        setError('제품 정보를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    checkStoreOwnershipAndFetchProduct();
  }, [storeId, productId, user, router]);

  // 이미지 URL에서 파일 경로 추출하는 함수
  const extractFilePathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch (error) {
      console.error('URL 파싱 오류:', error);
      return null;
    }
  };

  // 제품 이미지 삭제 함수
  const deleteProductImage = async (imageUrl: string | null): Promise<void> => {
    if (!imageUrl) return;
    
    try {
      const filePath = extractFilePathFromUrl(imageUrl);
      if (!filePath) return;
      
      console.log('제품 이미지 삭제 시도:', filePath);
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        console.error('이미지 삭제 오류:', error);
      } else {
        console.log('이미지 삭제 성공');
      }
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  // 제품 삭제 함수
  const handleDeleteProduct = async () => {
    if (!product || !isOwner) return;
    
    setDeleteLoading(true);
    
    try {
      // 제품 삭제
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', storeId);
        
      if (error) throw error;
      
      // 제품 이미지 삭제
      if (product.product_image_url) {
        await deleteProductImage(product.product_image_url);
      }
      
      // 삭제 성공 후 상점 페이지로 이동
      alert('제품이 성공적으로 삭제되었습니다.');
      router.push(`/store/${storeId}`);
    } catch (error: any) {
      console.error('제품 삭제 중 오류 발생:', error);
      alert(`제품 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
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

  // 추가 이미지 업로드 함수
  const handleAdditionalImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setAdditionalImages([
            ...additionalImages,
            { file, preview: event.target.result as string }
          ]);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 추가 이미지 제거 함수
  const handleRemoveAdditionalImage = (index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  };
  
  // 기존 이미지 제거 함수
  const handleRemoveExistingImage = async (id: string) => {
    try {
      const imageToRemove = existingImages.find(img => img.id === id);
      if (!imageToRemove) return;
      
      // 이미지 URL에서 파일 경로 추출
      const filePath = extractFilePathFromUrl(imageToRemove.url);
      
      // DB에서 이미지 정보 삭제
      const { error } = await supabase
        .from('product_images')
        .delete()
        .eq('id', id);
        
      if (error) throw error;
      
      // 스토리지에서 파일 삭제 (필요한 경우)
      if (filePath) {
        await supabase.storage
          .from('images')
          .remove([filePath]);
      }
      
      // 상태 업데이트
      setExistingImages(existingImages.filter(img => img.id !== id));
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      alert('이미지를 삭제하는 중 오류가 발생했습니다.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (error || !isOwner || !product) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error || '접근 권한이 없거나 제품을 찾을 수 없습니다.'}
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
      {/* 헤더 섹션 */}
      <div className="border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <nav className="flex items-center space-x-1 text-xs tracking-widest uppercase">
              <Link href="/" className="text-gray-500 hover:text-black transition-colors duration-200">
                Home
              </Link>
              <span className="text-gray-300 px-1">/</span>
              <Link href="/stores" className="text-gray-500 hover:text-black transition-colors duration-200">
                Stores
              </Link>
              <span className="text-gray-300 px-1">/</span>
              <Link 
                href={`/store/${storeId}`} 
                className="text-gray-500 hover:text-black transition-colors duration-200"
              >
                {store?.store_name}
              </Link>
              <span className="text-gray-300 px-1">/</span>
              <Link 
                href={`/store/${storeId}/product/${productId}`}
                className="text-gray-500 hover:text-black transition-colors duration-200"
              >
                {product?.product_name}
              </Link>
              <span className="text-gray-300 px-1">/</span>
              <span className="text-black font-medium">Edit</span>
            </nav>
          </div>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
          {/* 제품 이미지 섹션 */}
          <div>
            <h2 className="text-xl font-medium mb-6">제품 이미지</h2>
            
            {/* 메인 이미지 */}
            <div className="mb-8">
              <p className="text-sm text-gray-500 mb-4">대표 이미지</p>
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border-2 border-dashed border-gray-200 relative">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt={product?.product_name || "제품 이미지"}
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
            
            {/* 기존 이미지 목록 */}
            {existingImages.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-4">추가 이미지 ({existingImages.length}개)</p>
                <div className="grid grid-cols-2 gap-4">
                  {existingImages.map((image) => (
                    <div key={image.id} className="relative group">
                      <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={image.url}
                          alt={product?.product_name || "제품 추가 이미지"}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveExistingImage(image.id)}
                        className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
                        aria-label="이미지 제거"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 추가 이미지 업로드 미리보기 */}
            {additionalImages.length > 0 && (
              <div className="mb-8">
                <p className="text-sm text-gray-500 mb-4">새로 추가할 이미지 ({additionalImages.length}개)</p>
                <div className="grid grid-cols-2 gap-4">
                  {additionalImages.map((image, index) => (
                    <div key={index} className="relative group">
                      <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden border border-gray-200">
                        <img
                          src={image.preview}
                          alt={`업로드 이미지 ${index + 1}`}
                          className="w-full h-full object-contain"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAdditionalImage(index)}
                        className="absolute top-2 right-2 p-1.5 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
                        aria-label="이미지 제거"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            {/* 추가 이미지 업로드 버튼 */}
            <div className="mt-6">
              <label
                htmlFor="additional_image_upload"
                className="flex items-center justify-center px-4 py-3 border-2 border-dashed border-gray-300 text-sm text-gray-600 rounded-lg cursor-pointer hover:bg-gray-50 transition-colors"
              >
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
                추가 이미지 업로드
              </label>
              <input
                type="file"
                id="additional_image_upload"
                name="additional_image"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleAdditionalImageChange}
                className="hidden"
              />
              <p className="mt-2 text-xs text-gray-400 text-center">
                최대 10개의 추가 이미지를 업로드할 수 있습니다
              </p>
            </div>
          </div>

          {/* 제품 정보 수정 폼 */}
          <div>
            <div className="mb-8">
              <h1 className="text-3xl font-pretendard text-gray-900 mb-4">제품 수정</h1>
              <p className="text-gray-600 mb-6 font-pretendard">제품 정보를 수정하고 저장하세요.</p>
            </div>

            <ProductForm 
              storeId={storeId} 
              initialData={product ? {
                ...product,
                product_image_url: imagePreview
              } : undefined} 
              isEdit={true} 
              productId={productId}
              imageFile={imageFile}
              additionalImages={additionalImages.map(img => img.file).filter(Boolean) as File[]}
            />

            {/* 삭제 버튼 */}
            <div className="mt-12 pt-8 border-t border-gray-100">
              <div className="flex justify-between items-center">
                <p className="text-sm text-gray-500 font-pretendard">제품을 삭제하면 복구할 수 없습니다.</p>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="px-8 py-4 text-sm uppercase tracking-widest font-medium bg-red-600 text-white hover:bg-red-700 transition-colors font-pretendard"
                >
                  제품 삭제
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 max-w-md w-full">
            <h3 className="text-lg font-medium text-black mb-4 font-pretendard">제품 삭제</h3>
            <p className="text-gray-600 mb-6 font-pretendard">
              <strong className="font-pretendard">{product.product_name}</strong> 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 border border-gray-300 text-xs uppercase tracking-widest font-medium text-gray-700 hover:bg-gray-50 transition-colors font-pretendard"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-6 py-2.5 text-xs uppercase tracking-widest font-medium bg-red-600 text-white hover:bg-red-700 transition-colors font-pretendard disabled:bg-red-300"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 