'use client';

import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ImageCropModal from '@/components/ImageCropModal';
import { X, Upload, Plus } from 'lucide-react';

// 네비게이션 바 컨트롤을 위한 사용자 정의 이벤트 추가
const emitNavbarEvent = (hide: boolean) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('navbarControl', { detail: { hide } });
    window.dispatchEvent(event);
  }
};

export default function CreateProductPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  
  const [store, setStore] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState('basic');

  // 이미지 관련 상태
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [additionalImages, setAdditionalImages] = useState<{ file: File; preview: string }[]>([]);
  
  // 크롭 모달 관련 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  
  // 폼 데이터
  const [formData, setFormData] = useState({
    product_name: '',
    product_description: '',
    price: '',
    stock: '',
    category: '',
    subcategory: '',
    material: '',
    weight: '',
    purity: '',
    dimensions: '',
    origin: '',
    warranty: '',
    shipping_info: '',
    return_policy: '',
    discount_percentage: '',
    discounted_price: '',
  });

  // 상점 소유권 확인
  useEffect(() => {
    const checkStoreOwnership = async () => {
      if (!user) {
        router.push('/login');
        return;
      }
      
      try {
        const { data: storeData, error } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .eq('vendor_id', user.id)
          .single();

        if (error || !storeData) {
          alert('접근 권한이 없습니다.');
          router.push('/');
          return;
        }

        setStore(storeData);
      } catch (error) {
        console.error('상점 정보 확인 중 오류:', error);
        router.push('/');
      } finally {
        setLoading(false);
      }
    };

    checkStoreOwnership();
  }, [user, storeId, router]);

  // 네비게이션 바 숨김 처리
  useEffect(() => {
    emitNavbarEvent(true);
    return () => emitNavbarEvent(false);
  }, []);

  // 입력값 변경 처리
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  // 이미지 변경 처리
  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
      
    // 파일 크기 체크 (10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 이미지 미리보기를 위한 URL 생성
    const imageUrl = URL.createObjectURL(file);
    setCropImageSrc(imageUrl);
          setShowCropModal(true);
  }, []);

  // 크롭 완료 처리
  const handleCropComplete = useCallback((croppedFile: File) => {
    setImageFile(croppedFile);
    const previewUrl = URL.createObjectURL(croppedFile);
    setImagePreview(previewUrl);
    setShowCropModal(false);
    setCropImageSrc('');
  }, []);

  // 크롭 모달 닫기
  const handleCropModalClose = useCallback(() => {
    setShowCropModal(false);
    setCropImageSrc('');
  }, []);

  // 추가 이미지 변경 처리
  const handleAdditionalImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 10 * 1024 * 1024) {
      alert('이미지 크기는 10MB 이하여야 합니다.');
      return;
    }

    if (additionalImages.length >= 10) {
      alert('추가 이미지는 최대 10개까지 업로드할 수 있습니다.');
      return;
    }

    const preview = URL.createObjectURL(file);
    setAdditionalImages(prev => [...prev, { file, preview }]);
  }, [additionalImages.length]);

  // 메인 이미지 제거
  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
  };

  // 추가 이미지 제거
  const handleRemoveAdditionalImage = (index: number) => {
    setAdditionalImages(prev => prev.filter((_, i) => i !== index));
  };

  // 폼 제출
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!imageFile) {
      alert('대표 이미지를 업로드해주세요.');
      return;
    }

    setSubmitting(true);

    try {
      // 메인 이미지 업로드
      const fileExt = imageFile.name.split('.').pop();
      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
      const filePath = fileName;

      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, imageFile, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
      }

      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      const imageUrl = data.publicUrl;

      // 제품 데이터 생성
      const productData = {
        store_id: storeId,
        product_name: formData.product_name,
        product_description: formData.product_description,
        product_image_url: imageUrl,
        price: parseInt(formData.price),
        stock: parseInt(formData.stock),
        is_available: true,
        material: formData.material || null,
        weight: formData.weight ? parseFloat(formData.weight) : null,
        purity: formData.purity || null,
        dimensions: formData.dimensions || null,
        origin: formData.origin || null,
        warranty: formData.warranty || null,
        shipping_info: formData.shipping_info || null,
        return_policy: formData.return_policy || null,
        discount_percentage: formData.discount_percentage ? parseInt(formData.discount_percentage) : null,
        discounted_price: formData.discounted_price ? parseFloat(formData.discounted_price) : null,
      };

      const { data: product, error: productError } = await supabase
        .from('products')
        .insert(productData)
        .select()
        .single();

      if (productError) {
        throw new Error(`제품 등록 실패: ${productError.message}`);
      }

      // 추가 이미지 업로드
      if (additionalImages.length > 0) {
        const imagePromises = additionalImages.map(async (image, index) => {
          const ext = image.file.name.split('.').pop();
          const additionalFileName = `${Date.now()}_${index}.${ext}`;
          
          const { data: additionalUploadData, error: additionalUploadError } = await supabase.storage
            .from('images')
            .upload(additionalFileName, image.file);

          if (additionalUploadError) {
            console.error('추가 이미지 업로드 오류:', additionalUploadError);
            return null;
          }

          const { data: additionalImageData } = supabase.storage
            .from('images')
            .getPublicUrl(additionalFileName);

          return {
            product_id: product.id,
            url: additionalImageData.publicUrl,
            is_primary: false
          };
        });

        const additionalImageResults = await Promise.all(imagePromises);
        const validImages = additionalImageResults.filter(img => img !== null);

        if (validImages.length > 0) {
          await supabase
            .from('product_images')
            .insert(validImages);
        }
      }

      alert('제품이 성공적으로 등록되었습니다!');
      router.push(`/store/${storeId}`);

    } catch (error: any) {
      console.error('제품 등록 오류:', error);
      alert(error.message || '제품 등록 중 오류가 발생했습니다.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!store) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              접근 권한이 없거나 상점을 찾을 수 없습니다.
            </div>
            <div className="flex justify-center mt-4">
              <Link
                href="/"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                홈으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white">
      {/* CSS 스타일 */}
      <style jsx>{`
        .hide-scrollbar {
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none;
        }
      `}</style>
      
      {/* 제품 상세 페이지와 동일한 2컬럼 레이아웃 */}
      <div className="max-w-screen-2xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row">
          {/* 왼쪽: 이미지 섹션 (50%) */}
          <div className="w-full md:w-1/2 bg-white">
            {/* 모바일 뷰 - 가로 슬라이드 */}
            <div className="block md:hidden">
              <div className="relative w-full aspect-square bg-[#f8f8f8] overflow-hidden">
              {imagePreview ? (
                  <>
                  <img
                    src={imagePreview}
                    alt="제품 이미지 미리보기"
                      className="w-full h-full object-contain p-4"
                  />
                  <button
                    onClick={handleRemoveImage}
                      className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm"
                  >
                      <X className="w-4 h-4" />
                  </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <label htmlFor="main-image-upload" className="cursor-pointer">
                      <div className="flex flex-col items-center space-y-2">
                        <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                          <Upload className="w-8 h-8 text-gray-400" />
                    </div>
                        <span className="text-sm text-gray-500">대표 이미지 업로드</span>
                  </div>
              <input
                        id="main-image-upload"
                type="file"
                        accept="image/*"
                onChange={handleImageChange}
                className="hidden"
              />
                    </label>
            </div>
                )}
              </div>
              
              {/* 인디케이터 */}
              <div className="flex justify-center py-4 space-x-2">
                {[0, 1, 2, 3].map((index) => (
                  <div
                    key={index}
                    className={`h-0.5 ${
                      index === 0 ? 'w-6 bg-black' : 'w-3 bg-gray-300'
                    } transition-all duration-300`}
                  ></div>
                ))}
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
                      className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </>
                ) : (
                  <label htmlFor="main-image-upload-desktop" className="w-full h-full flex items-center justify-center cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-16 h-16 bg-gray-200 rounded-full flex items-center justify-center">
                        <Upload className="w-8 h-8 text-gray-400" />
                      </div>
                      <span className="text-sm text-gray-500">대표 이미지 업로드</span>
                    </div>
                    <input
                      id="main-image-upload-desktop"
                      type="file"
                      accept="image/*"
                      onChange={handleImageChange}
                      className="hidden"
                    />
                  </label>
                )}
          </div>

              {/* 추가 이미지들 - 수직으로 나열 */}
              {additionalImages.map((image, index) => (
                <div 
                  key={index}
                  className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative group"
                >
                  <img
                    src={image.preview}
                    alt={`추가 이미지 ${index + 1}`}
                    className="w-full h-full object-contain p-4"
                  />
                  <button
                    onClick={() => handleRemoveAdditionalImage(index)}
                    className="absolute top-4 right-4 p-2 bg-white/80 hover:bg-white rounded-full shadow-sm opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              ))}
            
              {/* 추가 이미지 업로드 버튼 */}
              {additionalImages.length < 10 && (
                <div className="w-full aspect-square bg-[#f8f8f8] overflow-hidden">
                  <label htmlFor="additional-image-upload" className="w-full h-full flex items-center justify-center cursor-pointer">
                    <div className="flex flex-col items-center space-y-2">
                      <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center">
                        <Plus className="w-6 h-6 text-gray-400" />
                      </div>
                      <span className="text-xs text-gray-500">추가 이미지</span>
                    </div>
                <input
                      id="additional-image-upload"
                  type="file"
                      accept="image/*"
                  onChange={handleAdditionalImageChange}
                  className="hidden"
                />
                  </label>
              </div>
              )}
            </div>
          </div>

          {/* 오른쪽: 제품 정보 섹션 */}
          <div className="w-full md:w-1/2 px-4 sm:px-6 md:px-0 md:pl-8 lg:pl-12">
            <div className="h-full flex flex-col max-w-full md:max-w-lg md:ml-12 lg:ml-20">
              {/* 상단 여백 - 데스크톱에서만 적용 */}
              <div className="hidden md:block md:h-32 lg:h-40 xl:h-48"></div>
              
              {/* 모바일 상단 여백 */}
              <div className="block md:hidden h-4"></div>
              
              {/* 제품 정보 폼 */}
              <form onSubmit={handleSubmit} className="space-y-4 md:space-y-6">
                {/* 제품 기본 정보 */}
                <div className="space-y-3 md:space-y-4">
                  {/* 제품명 */}
                  <input
                    type="text"
                    name="product_name"
                    value={formData.product_name}
                    onChange={handleInputChange}
                    className="w-full text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 leading-tight bg-transparent border-b border-gray-300 focus:border-black outline-none"
                    placeholder="제품명을 입력하세요"
                    required
                  />
                  
                  {/* 브랜드명 */}
                  <Link href={`/store/${storeId}`} className="inline-block">
                    <p className="text-sm text-gray-500 font-normal tracking-wide">
                      {store?.store_name || '상점명'}
                    </p>
                  </Link>
                  
                  {/* 상품번호 */}
                  <p className="text-xs text-gray-400 tracking-wider font-normal">
                    상품번호: 신규 제품
                  </p>
                  
                  {/* 제품 설명 */}
                  <div className="prose prose-sm max-w-none">
                    <textarea
                      name="product_description"
                      value={formData.product_description}
                      onChange={handleInputChange}
                      className="w-full text-gray-600 leading-relaxed text-sm font-normal border border-gray-300 rounded p-2 focus:border-black outline-none"
                      rows={4}
                      placeholder="제품 설명을 입력하세요"
                    />
                  </div>
                </div>

                {/* 색상 선택 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">다른 색상</h3>
                  <div className="flex space-x-3">
                    <button type="button" className="w-8 h-8 rounded-full bg-black border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                  </div>
                </div>

                {/* 가격 및 재고 섹션 */}
                <div className="space-y-3 md:space-y-4">
                  {/* 가격 입력 */}
                  <div className="mb-4">
                    <input
                      type="number"
                      name="price"
                      value={formData.price}
                      onChange={handleInputChange}
                      className="text-xl font-medium text-black bg-transparent border-b border-gray-300 focus:border-black outline-none w-full"
                      placeholder="가격 (원)"
                      required
                    />
                  </div>

                  {/* 등록 버튼 */}
                  <button
                    type="submit"
                    disabled={submitting || !formData.product_name || !formData.price || !imageFile}
                    className={`w-full flex items-center justify-center py-3 md:py-4 px-4 md:px-6 text-sm font-medium transition-colors ${
                      submitting || !formData.product_name || !formData.price || !imageFile
                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                        : 'bg-black text-white hover:bg-gray-900'
                    }`}
                  >
                    <span>{submitting ? '등록 중...' : '제품 등록'}</span>
                  </button>

                  {/* 재고 입력 */}
                  <input
                    type="number"
                    name="stock"
                    value={formData.stock}
                    onChange={handleInputChange}
                    className="w-full py-3 md:py-4 text-sm font-medium border border-black text-black text-center bg-transparent focus:outline-none"
                    placeholder="재고 수량"
                    required
                  />

                  {/* 배송 안내 */}
                  <div className="text-xs text-gray-500 text-center py-1">
                    <p>발송일 기준 1-2일 내 배송 예정</p>
                  </div>

                  {/* 돌아가기 버튼 */}
                  <div className="flex justify-center pt-1 md:pt-2">
                    <Link
                      href={`/store/${storeId}`}
                      className="flex items-center text-xs md:text-sm font-medium text-gray-600 hover:text-black transition-colors py-2"
                    >
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className="h-4 md:h-5 w-4 md:w-5 mr-2 text-gray-400" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                        fill="none"
                        strokeWidth={1}
                      >
                        <path 
                          strokeLinecap="round" 
                          strokeLinejoin="round" 
                          d="M10 19l-7-7m0 0l7-7m-7 7h18" 
                        />
                      </svg>
                      상점으로 돌아가기
                    </Link>
                  </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="border-b border-gray-200 mt-6 md:mt-8">
                  <div className="flex space-x-4 md:space-x-8 overflow-x-auto hide-scrollbar">
                    <button 
                      type="button"
                      onClick={() => setActiveTab('basic')}
                      className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'basic' 
                          ? 'text-gray-900 border-b-2 border-black' 
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      기본 정보
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('details')}
                      className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'details' 
                          ? 'text-gray-900 border-b-2 border-black' 
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      상세 정보
                    </button>
                    <button 
                      type="button"
                      onClick={() => setActiveTab('policy')}
                      className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                        activeTab === 'policy' 
                          ? 'text-gray-900 border-b-2 border-black' 
                          : 'text-gray-500 hover:text-gray-900'
                      }`}
                    >
                      정책
                    </button>
                  </div>
            </div>

                {/* 탭 컨텐츠 */}
                <div className="py-2 md:py-3">
                  {activeTab === 'basic' && (
                    <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-3">
                      {/* 소재 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">소재:</span>
                        <input
                          type="text"
                          name="material"
                          value={formData.material}
                          onChange={handleInputChange}
                          className="flex-1 ml-2 text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                          placeholder="소재"
                        />
                      </div>
                      
                      {/* 무게 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">무게:</span>
                        <input
                          type="text"
                          name="weight"
                          value={formData.weight}
                          onChange={handleInputChange}
                          className="flex-1 ml-2 text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                          placeholder="무게(g)"
                        />
                      </div>
                      
                      {/* 크기 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">크기:</span>
                        <input
                          type="text"
                          name="dimensions"
                          value={formData.dimensions}
                          onChange={handleInputChange}
                          className="flex-1 ml-2 text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                          placeholder="크기"
                        />
                      </div>
                      
                      {/* 원산지 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">원산지:</span>
                        <input
                          type="text"
                          name="origin"
                          value={formData.origin}
                          onChange={handleInputChange}
                          className="flex-1 ml-2 text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                          placeholder="원산지"
            />
              </div>
                    </div>
                  )}
                  
                  {activeTab === 'details' && (
                    <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-2">
                      <p className="leading-relaxed">2025년 가을에 새롭게 선보이는 소프트 {formData.product_name || '제품'}은 모던함과 유행을 타지 않는 우아함을 결합한 유명한 구조가 특징입니다. 고급스러운 소재와 정교한 마감으로 제작된 이 제품은 구조적으로 복잡하지만 우아한 CD 시그니처 클래스프가 특징적인 훌륭한 액세서리 라인을 완성하여 일상에서 제이아 스타일링 경험을 선사합니다.</p>
                      <button type="button" className="text-xs md:text-sm font-medium text-gray-900 underline hover:no-underline transition-all mt-2 md:mt-3">
                        자세히 보기
                      </button>
                    </div>
                  )}
                  
                  {activeTab === 'policy' && (
                    <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-4">
                      {/* 배송 정책 */}
                      <div>
                        <h4 className="font-medium text-gray-900 mb-2">배송 및 반품 정책</h4>
                        <div className="space-y-2">
                          <p>• 평일 오후 2시 이전 주문 시 당일 출고</p>
                          <p>• 주문 후 평균 2-3일 이내 수령</p>
                          <p>• 전국 무료 배송</p>
                          <p>• 제주도 및 도서산간 지역 추가 배송비 발생</p>
                          <p>• 상품 수령 후 7일 이내 교환/반품 가능</p>
                          <p>• 고객 변심에 의한 교환/반품 시 왕복 배송비 고객 부담</p>
                          <p>• 상품 불량/오배송의 경우 전액 판매자 부담</p>
                          <p>• 착용, 사용 흔적이 있는 상품은 교환/반품 불가</p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </form>
            </div>
          </div>
        </div>
      </div>

      {/* 크롭 모달 */}
      <ImageCropModal
        isOpen={showCropModal}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        onClose={handleCropModalClose}
        aspectRatio={1}
      />
    </div>
  );
} 