'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import ImageCropModal from '@/components/ImageCropModal';
import { X } from 'lucide-react';

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
  
  // 크롭 모달 관련 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropType, setCropType] = useState<'main' | 'additional'>('main');
  
  // 저장 상태 관리
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // 추가 이미지 관련 상태
  const [additionalImages, setAdditionalImages] = useState<{ file: File | null; preview: string; id?: string }[]>([]);

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
    
    // 키보드 단축키 이벤트 리스너 추가
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        // 플로팅 액션 메뉴의 등록 버튼 클릭 시뮬레이션
        const createButton = document.querySelector('[data-create-button]') as HTMLButtonElement;
        if (createButton && !createButton.disabled) {
          createButton.click();
        }
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [user, storeId, router]);

  const handleProductCreated = () => {
    router.push(`/store/${storeId}`);
  };

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 이미지 미리보기 생성 후 크롭 모달 열기
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target && typeof event.target.result === 'string') {
          setCropImageSrc(event.target.result);
          setCropType('main');
          setShowCropModal(true);
        }
      };
      reader.readAsDataURL(file);
    }
    // 파일 input 초기화
    e.target.value = '';
  }, []);

  // 추가 이미지 업로드 함수
  const handleAdditionalImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 이미지 미리보기 생성 후 크롭 모달 열기
      const reader = new FileReader();
      reader.addEventListener('load', function() {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setCropImageSrc(result);
          setCropType('additional');
          setShowCropModal(true);
        }
      });
      reader.readAsDataURL(file);
    }
    // 파일 input 초기화
    e.target.value = '';
  }, []);

  // 크롭 완료 핸들러
  const handleCropComplete = useCallback((croppedImageFile: File) => {
    if (cropType === 'main') {
      // 메인 이미지 처리
      setImageFile(croppedImageFile);
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(croppedImageFile);
    } else if (cropType === 'additional') {
      // 추가 이미지 처리
      const reader = new FileReader();
      reader.addEventListener('load', function() {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setAdditionalImages(prev => [
            ...prev,
            { file: croppedImageFile, preview: result }
          ]);
        }
      });
      reader.readAsDataURL(croppedImageFile);
    }
  }, [cropType]);

  // 크롭 모달 닫기 핸들러
  const handleCropModalClose = useCallback(() => {
    setShowCropModal(false);
    setCropImageSrc('');
    setCropType('main');
  }, []);

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // 추가 이미지 제거 함수
  const handleRemoveAdditionalImage = useCallback((index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  }, [additionalImages]);

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
    <div className="min-h-screen bg-white mt-0 md:mt-0 pt-16 sm:pt-20 md:pt-0">
      {/* Rich Editor 스타일 */}
      <style>
        {`
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        `}
      </style>
      
      {/* 메인 컨텐츠 */}
      <div className="w-full">
        <div className="flex flex-col md:flex-row">
          {/* 왼쪽: 제품 이미지 섹션 */}
          <div 
            className="md:w-1/2 md:sticky md:top-16 md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto md:hide-scrollbar" 
            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
          >
            {/* 모바일 뷰 수평 슬라이드 */}
            <div className="md:hidden w-full overflow-x-auto hide-scrollbar py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex flex-row space-x-2 px-4">
                {/* 메인 이미지 */}
              {imagePreview ? (
                  <div className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group">
                  <img
                    src={imagePreview}
                    alt="제품 이미지 미리보기"
                      className="w-full h-full object-contain p-4"
                  />
                    <div className="absolute inset-0 flex items-center justify-center">
                  <button
                    onClick={handleRemoveImage}
                    className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
                  >
                        <X className="w-5 h-5" />
                  </button>
                    </div>
                  </div>
              ) : (
                  <div className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group">
                <label
                  htmlFor="product_image_upload"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                      <p className="mt-4 text-sm text-gray-500">
                        클릭하여 대표 이미지 추가
                  </p>
                </label>
              <input
                type="file"
                id="product_image_upload"
                name="product_image"
                accept="image/jpeg,image/png,image/gif,image/webp"
                onChange={handleImageChange}
                className="hidden"
              />
            </div>
                )}
                
                {/* 새 추가 이미지들 */}
                {additionalImages.map((image, index) => (
                  <div 
                    key={`new-${index}`}
                    className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group"
                  >
                    <img 
                      src={image.preview} 
                      alt={`새 이미지 ${index + 1}`}
                      className="w-full h-full object-contain p-4"
                    />
                    <button
                      onClick={() => handleRemoveAdditionalImage(index)}
                      className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
                {/* 추가 이미지 업로드 버튼 */}
                <div className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative">
                  <label
                    htmlFor="additional_image_upload_mobile"
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                  >
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">
                      추가 이미지 업로드
                    </p>
                  </label>
                  <input
                    type="file"
                    id="additional_image_upload_mobile"
                    name="additional_image_mobile"
                    accept="image/jpeg,image/png,image/gif,image/webp"
                    onChange={handleAdditionalImageChange}
                    className="hidden"
                  />
                </div>
              </div>
            </div>
            
            {/* 데스크톱 뷰 수직 레이아웃 */}
            <div className="hidden md:block space-y-4 pr-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              {/* 메인 제품 이미지 */}
              <div className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative group">
                {imagePreview ? (
                  <>
                    <img
                      src={imagePreview}
                      alt="제품 이미지 미리보기"
                      className="w-full h-full object-contain p-4"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </>
                ) : (
                  <label
                    htmlFor="product_image_upload_desktop"
                    className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                  >
                    <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <p className="mt-4 text-sm text-gray-500">
                      클릭하여 대표 이미지 추가
                    </p>
                    <p className="mt-2 text-xs text-gray-400">
                      JPG, PNG, GIF, WEBP (최대 10MB)
                    </p>
                  </label>
                )}
                <input
                  type="file"
                  id="product_image_upload_desktop"
                  name="product_image_desktop"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleImageChange}
                  className="hidden"
                />
          </div>

              {/* 새 추가 이미지들 - 수직으로 나열 */}
              {additionalImages.map((image, index) => (
                <div 
                  key={`new-${index}`}
                  className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative group"
                >
                  <img
                    src={image.preview}
                    alt={`새 이미지 ${index + 1}`}
                    className="w-full h-full object-contain p-4"
                  />
                  <button
                    onClick={() => handleRemoveAdditionalImage(index)}
                    className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              ))}
            
              {/* 추가 이미지 업로드 버튼 */}
              <div className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative">
                <label
                  htmlFor="additional_image_upload_desktop"
                  className="w-full h-full flex flex-col items-center justify-center cursor-pointer"
                >
                  <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                  <p className="mt-4 text-sm text-gray-500">
                    추가 이미지 업로드
                  </p>
                  <p className="mt-2 text-xs text-gray-400">
                    최대 10개의 추가 이미지
                  </p>
                </label>
                <input
                  type="file"
                  id="additional_image_upload_desktop"
                  name="additional_image_desktop"
                  accept="image/jpeg,image/png,image/gif,image/webp"
                  onChange={handleAdditionalImageChange}
                  className="hidden"
                />
              </div>
            </div>
          </div>

          {/* 오른쪽: 제품 정보 입력 폼 */}
          <div className="md:w-1/2 pl-0 md:pl-8 lg:pl-12 px-5 sm:px-6 md:px-0">
            <div className="h-full flex flex-col md:max-w-md md:ml-8 lg:ml-16">
              {/* 상단 여백 */}
              <div className="flex-grow mb-auto md:min-h-[150px] lg:min-h-[200px]"></div>
              
              {/* 제품 정보 폼 */}
              <div>
                <div className="mb-10">
                  <Link href={`/store/${storeId}`} className="inline-block mb-2">
                    <h2 className="text-sm uppercase tracking-widest text-gray-600 font-medium">
                      {store?.store_name || '상점명'}
                    </h2>
                  </Link>
                  
                  <div className="mb-6">
                    <h1 className="text-2xl font-medium text-gray-900 mb-4">새 제품 등록</h1>
                    <p className="text-gray-600 text-sm">제품 정보를 입력하고 등록하세요.</p>
                  </div>
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
                  additionalImages={additionalImages.map(img => img.file).filter(Boolean) as File[]}
                  onSaveStatusChange={setSaveStatus}
            />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 이미지 크롭 모달 */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        onClose={handleCropModalClose}
        aspectRatio={1}
      />
      
      {/* 플로팅 액션 메뉴 */}
      <div className="fixed bottom-6 right-6 z-40 group">
        {/* 호버 시 나타나는 추가 액션들 */}
        <div className="absolute bottom-16 right-0 mb-2 opacity-0 group-hover:opacity-100 transform translate-y-4 group-hover:translate-y-0 transition-all duration-300 ease-out space-y-3">
          {/* 취소 버튼 */}
          <div className="relative">
            <button
              onClick={() => router.push(`/store/${storeId}`)}
              className="flex items-center justify-center space-x-2 px-4 py-2 bg-gray-600 text-white font-medium shadow-lg hover:bg-gray-700 hover:shadow-xl transition-all duration-200 group/item"
              style={{ borderRadius: '25px' }}
            >
              <svg className="w-4 h-4 transition-transform group-hover/item:scale-110" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
              </svg>
              <span className="text-sm">취소</span>
            </button>
          </div>
        </div>
        
        {/* 메인 등록 버튼 */}
        <button
          data-create-button
          onClick={() => {
            // 상태는 ProductForm의 콜백으로 관리되므로 여기서는 폼 제출만 실행
            const event = new Event('submit', { bubbles: true, cancelable: true });
            const form = document.querySelector('form');
            if (form) form.dispatchEvent(event);
          }}
          disabled={saveStatus === 'saving'}
          className={`relative flex items-center space-x-2 px-6 py-3 font-medium shadow-xl transition-all duration-300 hover:scale-105 group-hover:shadow-2xl ${
            saveStatus === 'saving' 
              ? 'bg-gray-400 text-white cursor-not-allowed' 
              : saveStatus === 'saved'
              ? 'bg-green-600 text-white hover:bg-green-700'
              : 'bg-black text-white hover:bg-gray-900'
          }`}
          style={{ borderRadius: '50px' }}
        >
          {saveStatus === 'saving' ? (
            <>
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span>등록 중...</span>
            </>
          ) : saveStatus === 'saved' ? (
            <>
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
              </svg>
              <span>등록됨</span>
            </>
          ) : (
            <>
              <svg className="w-5 h-5 transition-transform group-hover:rotate-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              <span>등록하기</span>
            </>
          )}
          
          {/* 호버 힌트 */}
          <div className="absolute top-1/2 -left-4 transform -translate-y-1/2 -translate-x-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none z-50">
            <div className="bg-gray-800 text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap">
              호버하여 더 많은 옵션 보기
              {/* 말풍선 꼬리 */}
              <div className="absolute top-1/2 left-full transform -translate-y-1/2 w-0 h-0 border-t-4 border-b-4 border-l-4 border-t-transparent border-b-transparent border-l-gray-800"></div>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
} 