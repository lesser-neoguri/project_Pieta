'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import ImageCropModal from '@/components/ImageCropModal';
import { X } from 'lucide-react';
import { extractPathFromUrl, moveImage } from '@/lib/migration';
import { toast } from 'react-hot-toast';
import DOMPurify from 'dompurify';
import logger from '@/lib/logger';

// 네비게이션 바 컨트롤을 위한 사용자 정의 이벤트 추가
const emitNavbarEvent = (hide: boolean) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('navbarControl', { detail: { hide } });
    window.dispatchEvent(event);
  }
};

// 스로틀 함수 추가
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

// 스크롤 처리를 위한 이전 스크롤 위치 저장 변수
let prevScrollPos = 0;

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
  material?: string;
  weight?: number;
  purity?: string;
  dimensions?: string;
  origin?: string;
  warranty?: string;
  shipping_info?: string;
  return_policy?: string;
  discount_percentage?: number;
  discounted_price?: number | null;
  is_on_sale?: boolean;
};

// 파일 상단에 추가할 타입 정의
type PolicyTemplate = {
  id: string;
  type: 'shipping' | 'return' | 'material' | 'warranty' | 'custom';
  name: string;
  content: string;
  is_default: boolean;
  created_at: string;
  updated_at: string;
  store_id: string | null;
};

export default function EditProductPage() {
  const { user } = useAuth();
  const router = useRouter();
  const { id: storeId, productId } = useParams() as { id: string; productId: string };
  
  const [store, setStore] = useState<any>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  
  // 크롭 모달 관련 상태
  const [showCropModal, setShowCropModal] = useState(false);
  const [cropImageSrc, setCropImageSrc] = useState<string>('');
  const [cropType, setCropType] = useState<'main' | 'additional'>('main');
  
  // 저장 상태 관리
  const [saveStatus, setSaveStatus] = useState<'idle' | 'saving' | 'saved' | 'error'>('idle');
  
  // 추가 이미지 관련 상태
  const [additionalImages, setAdditionalImages] = useState<{ file: File | null; preview: string; id?: string }[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; id: string; is_primary: boolean }[]>([]);
  
  // 아코디언 메뉴 상태 관리
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  
  // 탭 상태 관리
  const [activeTab, setActiveTab] = useState<string>('basic');
  
  // 인라인 편집 상태 관리
  const [editingField, setEditingField] = useState<string | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [editNumberValue, setEditNumberValue] = useState<number>(0);

  // 레퍼런스 템플릿 추가
  const shippingTemplate = `■ 배송 안내
• 배송 방법: OO택배
• 배송 지역: 전국
• 배송 비용: 3,000원 (30,000원 이상 구매 시 무료배송)
• 평균 배송 기간: 결제 확인 후 1-3일 이내 발송 (영업일 기준)

■ 배송 관련 유의사항
• 주문량 증가 및 택배사 사정에 따라 배송이 지연될 수 있습니다.
• 도서/산간 지역은 추가 배송비가 발생할 수 있습니다.
• 배송 현황은 마이페이지에서 조회 가능합니다.
• 제품 출고 후 배송 과정은 택배사 시스템을 통해 확인 가능합니다.`;

  const returnTemplate = `■ 교환/반품 안내
• 교환/반품 기간: 상품 수령 후 7일 이내 (단, 제품 하자의 경우 30일 이내)
• 교환/반품 방법: 고객센터(010-0000-0000) 또는 1:1 문의 접수

■ 교환/반품 비용
• 단순 변심: 왕복 배송비 고객 부담 (6,000원)
• 제품 하자: 판매자 부담

■ 교환/반품 불가 사유
• 고객의 책임 있는 사유로 상품이 훼손된 경우
• 사용/착용/세탁 후 상품 가치가 현저히 감소한 경우
• 시간 경과에 따른 재판매가 어려운 경우
• 포장 박스 및 구성품 훼손/분실
• 맞춤형 제작 상품 또는 주문제작 상품인 경우

■ 환불 안내
• 환불 시점: 제품 회수 및 검수 완료 후 3일 이내
• 환불 방법: 결제 수단에 따라 원금액 환불`;

  // 아코디언 열기/닫기 함수
  const toggleAccordion = useCallback((id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  }, [activeAccordion]);
  
  // 인라인 편집 시작 함수
  const startEditing = useCallback((field: string, value: string | number, accordionId?: string) => {
    // 배송 정보와 반품 정책은 편집 불가능하도록 처리
    if (field === 'shipping_info' || field === 'return_policy') {
      alert('배송 및 반품 정책은 고정 정책으로 개별 편집이 불가능합니다.');
      return;
    }
    
    // 관련 아코디언 영역이 있으면 해당 아코디언 열기
    if (accordionId) {
      setActiveAccordion(accordionId);
    }
    
    setEditingField(field);
    if (typeof value === 'number') {
      setEditNumberValue(value);
    } else {
      setEditValue(value || '');
    }
  }, [setActiveAccordion]);
  
  // 인라인 편집 취소 함수
  const cancelEditing = useCallback(() => {
    setEditingField(null);
  }, []);
  
  // 인라인 편집 저장 함수
  const saveEditing = useCallback(async (field: string) => {
    if (!product) return;
    
    let value: string | number | boolean = editValue;
    if (field === 'price' || field === 'stock' || field === 'discount_percentage' || field === 'discounted_price') {
      value = editNumberValue;
    }
    
    try {
      // 데이터 유효성 확인
      if (typeof value === 'string' && value.length > 10000) {
        throw new Error('텍스트가 너무 깁니다. 10,000자 이내로 작성해주세요.');
      }
      
      logger.debug(`${field} 수정 시작`);
      
      const { data, error } = await supabase
        .from('products')
        .update({ [field]: value })
        .eq('id', productId);
      
      // 오류가 있고, 그 오류가 실제로 내용이 있는 경우만 예외 처리
      // 빈 객체 {} 는 사실상 오류가 아닌 것으로 간주
      if (error && typeof error === 'object' && Object.keys(error).length > 0 && error.message) {
        logger.error('실제 오류 내용:', JSON.stringify(error));
        throw new Error(error.message || '알 수 없는 오류');
      }
      
      // 이 지점에 도달하면 성공으로 처리 (빈 오류 객체도 성공으로 간주)
      logger.debug(`${field} 업데이트 성공`);
      
      // ... existing code ...
    } catch (error: any) {
      // 오류 객체를 문자열로 직접 출력하지 않고 메시지만 추출
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다';
      logger.error(`${field} 수정 중 오류 발생:`, errorMessage);
      alert(`${field} 수정 중 오류가 발생했습니다: ${errorMessage}`);
    }
  }, [product, editValue, editNumberValue, productId]);

  // 템플릿 적용 함수
  const applyTemplate = useCallback((templateContent: string) => {
    setEditValue(templateContent);
  }, []);

  // useEffect 이전에 추가할 상태 관리 코드
  const [shippingTemplates, setShippingTemplates] = useState<PolicyTemplate[]>([]);
  const [returnTemplates, setReturnTemplates] = useState<PolicyTemplate[]>([]);
  const [materialTemplates, setMaterialTemplates] = useState<PolicyTemplate[]>([]);
  const [loadingTemplates, setLoadingTemplates] = useState<boolean>(false);

  // fetchPolicyTemplates 함수 추가
  const fetchPolicyTemplates = async () => {
    setLoadingTemplates(true);
    try {
      // 배송 정책 템플릿 가져오기
      const { data: shippingData, error: shippingError } = await supabase
        .from('policy_templates')
        .select('*')
        .eq('type', 'shipping')
        .order('is_default', { ascending: false });
      
      if (shippingError) throw shippingError;
      setShippingTemplates(shippingData || []);
      
      // 반품 정책 템플릿 가져오기
      const { data: returnData, error: returnError } = await supabase
        .from('policy_templates')
        .select('*')
        .eq('type', 'return')
        .order('is_default', { ascending: false });
      
      if (returnError) throw returnError;
      setReturnTemplates(returnData || []);
      
      // 재질 정보 템플릿 가져오기
      const { data: materialData, error: materialError } = await supabase
        .from('policy_templates')
        .select('*')
        .eq('type', 'material')
        .order('is_default', { ascending: false });
      
      if (materialError) throw materialError;
      setMaterialTemplates(materialData || []);
      
    } catch (error) {
      console.error('정책 템플릿을 불러오는 중 오류 발생:', error);
    } finally {
      setLoadingTemplates(false);
    }
  };

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
          setSelectedImage(productData.product_image_url);
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
    
    // 정책 템플릿 불러오기
    fetchPolicyTemplates();
    
    // 키보드 단축키 이벤트 리스너 추가
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 's') {
        e.preventDefault();
        setSaveStatus('saving');
        const event = new Event('submit', { bubbles: true, cancelable: true });
        const form = document.querySelector('form');
        if (form) form.dispatchEvent(event);
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [storeId, productId, user, router]);

  // 제품 이미지 삭제 함수
  const deleteImage = async (imageUrl: string | null): Promise<void> => {
    if (!imageUrl) return;
    
    try {
      const filePath = extractPathFromUrl(imageUrl);
      if (!filePath) {
        logger.warn('이미지 경로를 추출할 수 없습니다:', imageUrl);
        return;
      }
      
      logger.debug('이미지 삭제 시도:', filePath);
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
      
      if (error) {
        logger.error('이미지 삭제 오류:', error);
      } else {
        logger.debug('이미지 삭제 성공:', filePath);
      }
    } catch (error) {
      logger.error('이미지 삭제 중 오류 발생:', error);
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
        await deleteImage(product.product_image_url);
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

  const handleImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      
      // 이미지 미리보기 생성 후 크롭 모달 열기
      const reader = new FileReader();
      reader.addEventListener('load', function() {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setCropImageSrc(result);
          setCropType('main');
          setShowCropModal(true);
        }
      });
      reader.readAsDataURL(file);
    }
    // 파일 input 초기화
    e.target.value = '';
  }, []);

  const handleRemoveImage = useCallback(() => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedImage(null);
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
      reader.addEventListener('load', function() {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setImagePreview(result);
          setSelectedImage(result);
        }
      });
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

  // 추가 이미지 제거 함수
  const handleRemoveAdditionalImage = useCallback((index: number) => {
    setAdditionalImages(additionalImages.filter((_, i) => i !== index));
  }, [additionalImages]);
  
  // 기존 이미지 제거 함수
  const handleRemoveExistingImage = useCallback(async (id: string) => {
    const imageToRemove = existingImages.find(img => img.id === id);
    if (!imageToRemove) return;
    
    try {
      // 스토리지에서 이미지 파일 삭제
      const filePath = extractPathFromUrl(imageToRemove.url);
      if (filePath) {
        await deleteImage(imageToRemove.url);
      }
      
      // DB에서 이미지 레코드 삭제
      await supabase
        .from('product_images')
        .delete()
        .eq('id', id);
        
      // UI 업데이트
      setExistingImages(prev => prev.filter(img => img.id !== id));
      toast.success('이미지가 삭제되었습니다.');
    } catch (error) {
      console.error('이미지 삭제 오류:', error);
      toast.error('이미지 삭제 중 오류가 발생했습니다.');
    }
  }, [existingImages]);

  // 이미지 변경 함수
  const handleImageSelect = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);

  // 이미지 모달 토글 함수
  const toggleImageModal = useCallback((show: boolean) => {
    setShowImageModal(show);
  }, []);
  
  // 제품 가용성 토글 함수
  const toggleProductAvailability = useCallback(async () => {
    if (!product) return;
    
    try {
      const newAvailability = !product.is_available;
      
      const { error } = await supabase
        .from('products')
        .update({ is_available: newAvailability })
        .eq('id', productId);
      
      if (error) throw error;
      
      // 상태 업데이트
      setProduct({
        ...product,
        is_available: newAvailability
      });
      
      toast.success(`제품 상태가 ${newAvailability ? '판매 중' : '판매 중지'}으로 변경되었습니다.`);
    } catch (error) {
      console.error('판매 상태 수정 중 오류:', error);
      toast.error('판매 상태 수정 중 오류가 발생했습니다.');
    }
  }, [product, productId]);
  
  // 삭제 확인 모달 토글 함수
  const toggleDeleteConfirm = useCallback((show: boolean) => {
    setShowDeleteConfirm(show);
  }, []);

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
    <div className="min-h-screen bg-white mt-0 md:mt-0 pt-16 sm:pt-20 md:pt-0">
      {/* Rich Editor 스타일 */}
      <style>
        {`
        .rich-editor h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0;
          color: #111;
        }
        .rich-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.8rem 0;
          color: #333;
        }
        .rich-editor h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.6rem 0;
          color: #444;
        }
        .rich-editor .paragraph {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        .rich-editor .small-text {
          font-size: 0.875rem;
          color: #666;
          line-height: 1.4;
        }
        .rich-editor strong {
          font-weight: 700;
        }
        .rich-editor em {
          font-style: italic;
        }
        .rich-editor u {
          text-decoration: underline;
        }
        .rich-editor ul, .rich-editor ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .rich-editor ul li {
          list-style-type: disc;
        }
        .rich-editor ol li {
          list-style-type: decimal;
        }
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
            onScroll={throttle((e) => {
              // 스크롤 이벤트 발생 시 방향 감지
              const target = e.currentTarget;
              const currentScrollPos = target.scrollTop;
              
              // 스크롤 방향에 따라 네비게이션 바를 표시하거나 숨김
              if (currentScrollPos > prevScrollPos) {
                // 아래로 스크롤 - 네비게이션 바 숨김
                emitNavbarEvent(true);
              } else {
                // 위로 스크롤 - 네비게이션 바 표시
                emitNavbarEvent(false);
              }
              
              // 현재 스크롤 위치 저장
              prevScrollPos = currentScrollPos;
            }, 50)}
          >
            {/* 모바일 뷰 수평 슬라이드 */}
            <div className="md:hidden w-full overflow-x-auto hide-scrollbar py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
              <div className="flex flex-row space-x-2 px-4">
                {/* 메인 이미지 */}
                {imagePreview && (
                  <div className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group">
                    <img
                      src={imagePreview}
                      alt={product.product_name}
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
                )}
                
                {/* 이미지가 없는 경우 업로드 버튼 */}
                {!imagePreview && (
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
                
                {/* 기존 추가 이미지들 */}
                {existingImages.map(image => (
                  <div 
                    key={image.id}
                    className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group"
                  >
                    <img 
                      src={image.url} 
                      alt={`${product.product_name} 추가 이미지`}
                      className="w-full h-full object-contain p-4"
                    />
                    <button
                      onClick={() => handleRemoveExistingImage(image.id)}
                      className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
                    >
                      <X className="w-5 h-5" />
                    </button>
                  </div>
                ))}
                
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
                      alt={product.product_name}
                      className="w-full h-full object-contain p-4"
                    />
                    <button
                      onClick={handleRemoveImage}
                      className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
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
            
              {/* 기존 추가 이미지들 - 수직으로 나열 */}
              {existingImages.map(image => (
                <div 
                  key={image.id}
                  className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative group"
                >
                        <img
                          src={image.url}
                    alt={`${product.product_name} 추가 이미지`}
                    className="w-full h-full object-contain p-4"
                        />
                      <button
                        onClick={() => handleRemoveExistingImage(image.id)}
                    className="absolute bottom-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
                      >
                    <X className="w-5 h-5" />
                      </button>
                    </div>
                  ))}
              
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

          {/* 오른쪽: 제품 정보 섹션 */}
          <div className="w-full md:w-1/2 px-4 sm:px-6 md:px-0 md:pl-8 lg:pl-12">
            <div className="h-full flex flex-col max-w-full md:max-w-lg md:ml-12 lg:ml-20">
              {/* 상단 여백 - 데스크톱에서만 적용 */}
              <div className="hidden md:block md:h-32 lg:h-40 xl:h-48"></div>
              
              {/* 모바일 상단 여백 */}
              <div className="block md:hidden h-4"></div>
              
              {/* 제품 정보 콘텐츠 */}
              <div className="space-y-4 md:space-y-6">
                {/* 제품 기본 정보 */}
                <div className="space-y-3 md:space-y-4">
                  {/* 제품명 - 편집 가능 */}
                  {editingField === 'product_name' ? (
                    <div className="space-y-2">
                      <input
                        type="text"
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && saveEditing('product_name')}
                        className="w-full text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 leading-tight bg-transparent border-b border-gray-300 focus:border-black outline-none"
                        placeholder="제품명을 입력하세요"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button onClick={() => saveEditing('product_name')} className="text-sm text-green-600 hover:text-green-800">저장</button>
                        <button onClick={cancelEditing} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
                      </div>
                    </div>
                  ) : (
                    <h1 
                      className="text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 leading-tight cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded"
                      onClick={() => startEditing('product_name', product?.product_name || '')}
                    >
                      {product?.product_name || '제품명'}
                    </h1>
                  )}
                  
                  {/* 브랜드명 */}
                  <Link href={`/store/${storeId}`} className="inline-block">
                    <p className="text-sm text-gray-500 font-normal tracking-wide">
                      {store?.store_name || '상점명'}
                    </p>
                  </Link>

                  {/* 상품번호 */}
                  <p className="text-xs text-gray-400 tracking-wider font-normal">
                    상품번호: {productId.slice(-8).toUpperCase()}
                  </p>
                  
                  {/* 제품 설명 - 편집 가능 */}
                  {editingField === 'product_description' ? (
                    <div className="space-y-2">
                      <textarea
                        value={editValue}
                        onChange={(e) => setEditValue(e.target.value)}
                        className="w-full text-gray-600 leading-relaxed text-sm font-normal border border-gray-300 rounded p-2 focus:border-black outline-none"
                        rows={4}
                        placeholder="제품 설명을 입력하세요"
                        autoFocus
                      />
                      <div className="flex space-x-2">
                        <button onClick={() => saveEditing('product_description')} className="text-sm text-green-600 hover:text-green-800">저장</button>
                        <button onClick={cancelEditing} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
                      </div>
                    </div>
                  ) : (
                    <div 
                      className="prose prose-sm max-w-none cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded"
                      onClick={() => startEditing('product_description', product?.product_description || '')}
                    >
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: product?.product_description ? DOMPurify.sanitize(product.product_description) : '제품 설명을 추가하세요...' 
                        }}
                        className="text-gray-600 leading-relaxed text-sm font-normal line-clamp-3 md:line-clamp-none"
                      />
                    </div>
                  )}
                </div>

                {/* 색상 선택 */}
                <div className="space-y-3">
                  <h3 className="text-sm font-medium text-gray-900">다른 색상</h3>
                  <div className="flex space-x-3">
                    <button className="w-8 h-8 rounded-full bg-black border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                  </div>
                </div>

                {/* 가격 및 재고 관리 섹션 */}
                <div className="space-y-3 md:space-y-4">
                  {/* 가격 표시 - 편집 가능 */}
                  <div className="mb-4">
                    {editingField === 'price' ? (
                      <div className="space-y-2">
                        <input
                          type="number"
                          value={editNumberValue}
                          onChange={(e) => setEditNumberValue(Number(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditing('price')}
                          className="text-xl font-medium text-black bg-transparent border-b border-gray-300 focus:border-black outline-none"
                          placeholder="가격"
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button onClick={() => saveEditing('price')} className="text-sm text-green-600 hover:text-green-800">저장</button>
                          <button onClick={cancelEditing} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
                        </div>
                      </div>
                    ) : (
                      <p 
                        className="text-xl font-medium text-black cursor-pointer hover:bg-gray-50 p-2 -m-2 rounded"
                        onClick={() => startEditing('price', product?.price || 0)}
                      >
                        ₩{product?.price?.toLocaleString() || '0'}
                      </p>
                    )}
                  </div>

                  {/* 판매 상태 토글 버튼 */}
                  <button
                    onClick={toggleProductAvailability}
                    className={`w-full flex items-center justify-center py-3 md:py-4 px-4 md:px-6 text-sm font-medium transition-colors ${
                      product?.is_available
                        ? 'bg-black text-white hover:bg-gray-900'
                        : 'bg-gray-300 text-gray-500 hover:bg-gray-400'
                    }`}
                  >
                    <span>{product?.is_available ? '판매 중' : '판매 중지'}</span>
                  </button>

                  {/* 재고 관리 버튼 */}
                  <div className="flex space-x-2">
                    {editingField === 'stock' ? (
                      <div className="flex-1 space-y-2">
                        <input
                          type="number"
                          value={editNumberValue}
                          onChange={(e) => setEditNumberValue(Number(e.target.value))}
                          onKeyDown={(e) => e.key === 'Enter' && saveEditing('stock')}
                          className="w-full py-3 md:py-4 text-sm font-medium border border-black text-black text-center bg-transparent focus:outline-none"
                          placeholder="재고"
                          autoFocus
                        />
                        <div className="flex space-x-2">
                          <button onClick={() => saveEditing('stock')} className="text-sm text-green-600 hover:text-green-800">저장</button>
                          <button onClick={cancelEditing} className="text-sm text-gray-500 hover:text-gray-700">취소</button>
                        </div>
                      </div>
                    ) : (
                      <button
                        onClick={() => startEditing('stock', product?.stock || 0)}
                        className="flex-1 py-3 md:py-4 text-sm font-medium border border-black text-black hover:bg-gray-50 transition-colors flex items-center justify-center"
                      >
                        재고: {product?.stock || 0}개
                      </button>
                    )}
                  </div>

                  {/* 배송 안내 */}
                  <div className="text-xs text-gray-500 text-center py-1">
                    <p>발송일 기준 1-2일 내 배송 예정</p>
                  </div>

                  {/* 관리 버튼 */}
                  <div className="flex justify-center pt-1 md:pt-2">
                    <button
                      onClick={() => toggleDeleteConfirm(true)}
                      className="flex items-center text-xs md:text-sm font-medium text-gray-600 hover:text-red-600 transition-colors py-2"
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
                          d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" 
                        />
                      </svg>
                      제품 삭제
                    </button>
                  </div>
                </div>

                {/* 탭 메뉴 */}
                <div className="border-b border-gray-200 mt-6 md:mt-8">
                  <div className="flex space-x-4 md:space-x-8 overflow-x-auto hide-scrollbar">
                    <button 
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
                        {editingField === 'material' ? (
                          <div className="flex-1 ml-2 space-y-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing('material')}
                              className="w-full text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                              placeholder="소재"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => saveEditing('material')} className="text-xs text-green-600">저장</button>
                              <button onClick={cancelEditing} className="text-xs text-gray-500">취소</button>
                            </div>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => startEditing('material', product?.material || '')}
                          >
                            {product?.material || '추가하세요'}
                          </span>
                        )}
                      </div>
                      
                      {/* 무게 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">무게:</span>
                        {editingField === 'weight' ? (
                          <div className="flex-1 ml-2 space-y-1">
                            <input
                              type="number"
                              value={editNumberValue}
                              onChange={(e) => setEditNumberValue(Number(e.target.value))}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing('weight')}
                              className="w-full text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                              placeholder="무게(g)"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => saveEditing('weight')} className="text-xs text-green-600">저장</button>
                              <button onClick={cancelEditing} className="text-xs text-gray-500">취소</button>
                            </div>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => startEditing('weight', product?.weight || 0)}
                          >
                            {product?.weight ? `${product.weight}g` : '추가하세요'}
                          </span>
                        )}
                      </div>
                      
                      {/* 크기 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">크기:</span>
                        {editingField === 'dimensions' ? (
                          <div className="flex-1 ml-2 space-y-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing('dimensions')}
                              className="w-full text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                              placeholder="크기"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => saveEditing('dimensions')} className="text-xs text-green-600">저장</button>
                              <button onClick={cancelEditing} className="text-xs text-gray-500">취소</button>
                            </div>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => startEditing('dimensions', product?.dimensions || '')}
                          >
                            {product?.dimensions || '추가하세요'}
                          </span>
                        )}
                      </div>
                      
                      {/* 원산지 */}
                      <div className="flex justify-between items-center">
                        <span className="font-medium">원산지:</span>
                        {editingField === 'origin' ? (
                          <div className="flex-1 ml-2 space-y-1">
                            <input
                              type="text"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              onKeyDown={(e) => e.key === 'Enter' && saveEditing('origin')}
                              className="w-full text-right bg-transparent border-b border-gray-300 focus:border-black outline-none"
                              placeholder="원산지"
                              autoFocus
                            />
                            <div className="flex justify-end space-x-2">
                              <button onClick={() => saveEditing('origin')} className="text-xs text-green-600">저장</button>
                              <button onClick={cancelEditing} className="text-xs text-gray-500">취소</button>
                            </div>
                          </div>
                        ) : (
                          <span 
                            className="cursor-pointer hover:bg-gray-50 p-1 rounded"
                            onClick={() => startEditing('origin', product?.origin || '')}
                          >
                            {product?.origin || '추가하세요'}
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {activeTab === 'details' && (
                    <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-2">
                      <p className="leading-relaxed">2025년 가을에 새롭게 선보이는 소프트 {product?.product_name || '제품'}은 모던함과 유행을 타지 않는 우아함을 결합한 유명한 구조가 특징입니다. 고급스러운 소재와 정교한 마감으로 제작된 이 제품은 구조적으로 복잡하지만 우아한 CD 시그니처 클래스프가 특징적인 훌륭한 액세서리 라인을 완성하여 일상에서 제이아 스타일링 경험을 선사합니다.</p>
                      <button className="text-xs md:text-sm font-medium text-gray-900 underline hover:no-underline transition-all mt-2 md:mt-3">
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
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 max-w-md w-full">
            <h3 className="text-lg font-medium text-black mb-4">제품 삭제</h3>
            <p className="text-gray-600 mb-6">
              <strong>{product.product_name}</strong> 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 border border-gray-300 text-xs uppercase tracking-widest font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-6 py-2.5 text-xs uppercase tracking-widest font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:bg-red-300"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 이미지 크롭 모달 */}
      <ImageCropModal
        isOpen={showCropModal}
        onClose={handleCropModalClose}
        imageSrc={cropImageSrc}
        onCropComplete={handleCropComplete}
        aspectRatio={1} // 정사각형 비율, 필요에 따라 변경 가능
      />
      
      {/* DIOR 스타일 제품 편집 메뉴 */}
      <div className="fixed bottom-8 right-8 z-50">
        {/* 메인 관리 버튼 */}
        <div className="group">
          {/* 호버 시 나타나는 메뉴들 */}
          <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out space-y-1">
            
            {/* 취소 버튼 */}
            <div className="relative">
              <button
                onClick={() => router.push(`/store/${storeId}`)}
                className="flex items-center justify-center px-6 py-4 bg-white text-black border border-gray-100 hover:border-black font-light transition-all duration-300 group/item w-[140px]"
              >
                <span className="text-xs font-light tracking-[0.15em] uppercase text-center w-full">CANCEL</span>
              </button>
            </div>
            
            {/* 삭제 버튼 */}
            <div className="relative">
              <button
                onClick={() => setShowDeleteConfirm(true)}
                className="flex items-center justify-center px-6 py-4 bg-white text-red-600 border border-gray-100 hover:border-red-600 hover:bg-red-600 hover:text-white font-light transition-all duration-300 group/item w-[140px]"
              >
                <span className="text-xs font-light tracking-[0.15em] uppercase text-center w-full">DELETE</span>
              </button>
            </div>

                        {/* 저장 버튼 */}
            <div className="relative">
              <button
                data-save-button
                onClick={async () => {
                  setSaveStatus('saving');
                  try {
                    let hasChanges = false;
                    
                    // 1. 메인 이미지 업로드 처리
                    if (imageFile) {
                      hasChanges = true;
                      
                      // 이미지 파일 크기 확인 (10MB 제한)
                      if (imageFile.size > 10 * 1024 * 1024) {
                        throw new Error('이미지 크기는 10MB 이하여야 합니다.');
                      }
                      
                      // 파일 확장자 확인
                      const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
                      if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                        throw new Error('지원되는 이미지 형식은 JPG, PNG, GIF, WEBP입니다.');
                      }
                      
                      // 파일명 생성
                      const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
                      const filePath = fileName;
                      
                      // 이전 이미지 URL 저장
                      const oldImageUrl = product?.product_image_url;
                      
                      // 이미지 업로드
                      const { data: uploadData, error: uploadError } = await supabase.storage
                        .from('images')
                        .upload(filePath, imageFile, {
                          cacheControl: '3600',
                          upsert: false
                        });
                        
                      if (uploadError) {
                        throw new Error(`이미지 업로드 실패: ${uploadError.message}`);
                      }
                      
                      // 공개 URL 가져오기
                      const { data } = supabase.storage
                        .from('images')
                        .getPublicUrl(filePath);
                        
                      const newImageUrl = data.publicUrl;
                      
                      // 제품 테이블 업데이트
                      const { error: updateError } = await supabase
                        .from('products')
                        .update({ product_image_url: newImageUrl })
                        .eq('id', productId);
                        
                      if (updateError) {
                        throw new Error(`제품 이미지 업데이트 실패: ${updateError.message}`);
                      }
                      
                      // 이전 이미지 삭제
                      if (oldImageUrl) {
                        await deleteImage(oldImageUrl);
                      }
                      
                      // 상태 업데이트
                      setProduct(prev => prev ? { ...prev, product_image_url: newImageUrl } : null);
                      setImageFile(null);
                    }
                    
                    // 2. 추가 이미지 업로드 처리
                    if (additionalImages.length > 0) {
                      hasChanges = true;
                      
                      for (let i = 0; i < additionalImages.length; i++) {
                        const imageData = additionalImages[i];
                        if (!imageData.file) continue;
                        
                        try {
                          // 파일 크기 확인
                          if (imageData.file.size > 10 * 1024 * 1024) {
                            logger.warn(`추가 이미지 ${i+1}의 크기가 10MB를 초과합니다. 건너뜁니다.`);
                            continue;
                          }
                          
                          // 파일 확장자 확인
                          const fileExt = imageData.file.name.split('.').pop()?.toLowerCase();
                          if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                            logger.warn(`추가 이미지 ${i+1}의 형식이 지원되지 않습니다. 건너뜁니다.`);
                            continue;
                          }
                          
                          // 파일명 생성
                          const fileName = `products/${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${fileExt}`;
                          
                          // 이미지 업로드
                          const { data: uploadData, error: uploadError } = await supabase.storage
                            .from('images')
                            .upload(fileName, imageData.file, {
                              cacheControl: '3600',
                              upsert: false
                            });
                            
                          if (uploadError) {
                            logger.error(`추가 이미지 ${i+1} 업로드 실패:`, uploadError);
                            continue;
                          }
                          
                          // 공개 URL 가져오기
                          const { data } = supabase.storage
                            .from('images')
                            .getPublicUrl(fileName);
                            
                          const imageUrl = data.publicUrl;
                          
                          // product_images 테이블에 저장
                          const { error: insertError } = await supabase
                            .from('product_images')
                            .insert({
                              product_id: productId,
                              image_url: imageUrl,
                              is_primary: false,
                              display_order: i
                            });
                            
                          if (insertError) {
                            logger.error(`추가 이미지 ${i+1} DB 저장 실패:`, insertError);
                          } else {
                            // 성공적으로 저장된 이미지를 기존 이미지 목록에 추가
                            setExistingImages(prev => [...prev, {
                              url: imageUrl,
                              id: `new-${Date.now()}-${i}`,
                              is_primary: false
                            }]);
                          }
                        } catch (error) {
                          logger.error(`추가 이미지 ${i+1} 처리 중 오류:`, error);
                        }
                      }
                      
                      // 추가 이미지 상태 초기화
                      setAdditionalImages([]);
                    }
                    
                    // 변경사항이 있었다면 성공 메시지, 없다면 정보 메시지
                    if (hasChanges) {
                      toast.success('변경사항이 저장되었습니다.');
                      setSaveStatus('saved');
                    } else {
                      toast.success('저장할 변경사항이 없습니다.');
                      setSaveStatus('saved');
                    }
                    
                    setTimeout(() => setSaveStatus('idle'), 2000);
                  } catch (error: any) {
                    console.error('저장 중 오류:', error);
                    toast.error(error.message || '저장 중 오류가 발생했습니다.');
                    setSaveStatus('error');
                    setTimeout(() => setSaveStatus('idle'), 2000);
                  }
                }}
                disabled={saveStatus === 'saving'}
                className={`flex items-center justify-center px-6 py-4 font-light transition-all duration-300 group/item w-[140px] ${
                  saveStatus === 'saving' 
                    ? 'bg-gray-100 text-gray-400 border border-gray-200 cursor-not-allowed' 
                    : saveStatus === 'saved'
                    ? 'bg-green-600 text-white border border-green-600 hover:bg-green-700'
                    : 'bg-black text-white border border-black hover:bg-white hover:text-black'
                }`}
              >
                <span className="text-xs font-light tracking-[0.15em] uppercase text-center w-full">
                  {saveStatus === 'saving' ? 'SAVING...' : saveStatus === 'saved' ? 'SAVED' : 'SAVE'}
                </span>
              </button>
            </div>
          </div>

          {/* 메인 토글 버튼 */}
          <button className="flex items-center justify-center w-10 h-10 bg-white text-black border border-gray-200 hover:border-black transition-all duration-300 shadow-sm hover:shadow-md">
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>

          {/* 하단 라벨 */}
          <div className="absolute bottom-12 left-1/2 transform -translate-x-1/2 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none">
            <div className="bg-white text-black text-xs px-3 py-2 border border-gray-100 font-light tracking-[0.1em] uppercase whitespace-nowrap text-center">
              Product Edit
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 