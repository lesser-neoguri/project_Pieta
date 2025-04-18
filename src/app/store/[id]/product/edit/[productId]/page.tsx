'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import ProductForm from '@/components/ProductForm';
import { X } from 'lucide-react';

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
  
  // 추가 이미지 관련 상태
  const [additionalImages, setAdditionalImages] = useState<{ file: File | null; preview: string; id?: string }[]>([]);
  const [existingImages, setExistingImages] = useState<{ url: string; id: string; is_primary: boolean }[]>([]);
  
  // 아코디언 메뉴 상태 관리
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  
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
  const toggleAccordion = (id: string) => {
    setActiveAccordion(activeAccordion === id ? null : id);
  };
  
  // 인라인 편집 시작 함수
  const startEditing = (field: string, value: string | number, accordionId?: string) => {
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
  };
  
  // 인라인 편집 취소 함수
  const cancelEditing = () => {
    setEditingField(null);
  };
  
  // 인라인 편집 저장 함수
  const saveEditing = async (field: string) => {
    if (!product) return;
    
    let value: string | number | boolean = editValue;
    if (field === 'price' || field === 'stock') {
      value = editNumberValue;
    }
    
    try {
      // 데이터 유효성 확인
      if (typeof value === 'string' && value.length > 10000) {
        throw new Error('텍스트가 너무 깁니다. 10,000자 이내로 작성해주세요.');
      }
      
      console.log(`${field} 수정 시작`);
      
      const { data, error } = await supabase
        .from('products')
        .update({ [field]: value })
        .eq('id', productId);
      
      // 오류가 있고, 그 오류가 실제로 내용이 있는 경우만 예외 처리
      // 빈 객체 {} 는 사실상 오류가 아닌 것으로 간주
      if (error && typeof error === 'object' && Object.keys(error).length > 0 && error.message) {
        console.error('실제 오류 내용:', JSON.stringify(error));
        throw new Error(error.message || '알 수 없는 오류');
      }
      
      // 이 지점에 도달하면 성공으로 처리 (빈 오류 객체도 성공으로 간주)
      console.log(`${field} 업데이트 성공`);
      
      // 상태 업데이트
      setProduct({
        ...product,
        [field]: value
      });
      
      setEditingField(null);
      
      // 성공 메시지
      const fieldNames: Record<string, string> = {
        shipping_info: '배송 정보',
        return_policy: '반품 정책',
        material: '재질/소재 정보',
        product_name: '제품명',
        product_description: '제품 설명',
        price: '가격',
        stock: '재고'
      };
      
      alert(`${fieldNames[field] || field} 정보가 저장되었습니다.`);
      
    } catch (error: any) {
      // 오류 객체를 문자열로 직접 출력하지 않고 메시지만 추출
      const errorMessage = error.message || '알 수 없는 오류가 발생했습니다';
      console.error(`${field} 수정 중 오류 발생:`, errorMessage);
      alert(`${field} 수정 중 오류가 발생했습니다: ${errorMessage}`);
    }
  };

  // 템플릿 적용 함수
  const applyTemplate = (templateContent: string) => {
    setEditValue(templateContent);
  };

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
          setSelectedImage(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleRemoveImage = () => {
    setImageFile(null);
    setImagePreview(null);
    setSelectedImage(null);
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

  // 이미지 변경 함수
  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
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
                        className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
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
                      className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
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
                      className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity"
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
                    className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
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
                    className="absolute top-4 right-4 p-2 bg-black bg-opacity-50 rounded-full text-white hover:bg-opacity-70 transition-opacity opacity-0 group-hover:opacity-100"
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

          {/* 오른쪽: 제품 정보 수정 폼 */}
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
                  
                  {/* 제품명 인라인 편집 */}
                  <div className="relative group mb-6">
                    {product && editingField === 'product_name' ? (
                      <div>
                        <input
                          type="text"
                          className="w-full px-3 py-2 border border-gray-300 text-2xl font-medium"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            className="px-3 py-1 bg-black text-white rounded-md text-sm mr-1"
                            onClick={() => saveEditing('product_name')}
                          >
                            저장
                          </button>
                          <button
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                            onClick={cancelEditing}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <h1 className="text-2xl font-medium text-gray-900">{product?.product_name}</h1>
                        <button 
                          className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 underline"
                          onClick={() => startEditing('product_name', product?.product_name || '')}
                        >
                          수정
                        </button>
                      </>
                    )}
            </div>

                  {/* 가격 인라인 편집 */}
                  <div className="relative group mb-8">
                    {product && editingField === 'price' ? (
                      <div>
                        <div className="flex items-center">
                          <input
                            type="number"
                            className="w-full px-3 py-2 border border-gray-300 text-lg"
                            value={editNumberValue}
                            onChange={(e) => setEditNumberValue(parseInt(e.target.value) || 0)}
                            min="0"
                          />
                          <span className="ml-2">원</span>
                        </div>
                        <div className="mt-2 flex justify-end">
                          <button
                            className="px-3 py-1 bg-black text-white rounded-md text-sm mr-1"
                            onClick={() => saveEditing('price')}
                          >
                            저장
                          </button>
                          <button
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                            onClick={cancelEditing}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <p className="text-lg text-gray-900">
                          {product?.price?.toLocaleString()}원
                        </p>
                        <button 
                          className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 underline"
                          onClick={() => startEditing('price', product?.price || 0)}
                        >
                          수정
                        </button>
                      </>
                    )}
                  </div>
                  
                  {/* 제품 설명 인라인 편집 */}
                  <div className="relative group mb-12">
                    {product && editingField === 'product_description' ? (
                      <div>
                        <textarea
                          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                          value={editValue}
                          onChange={(e) => setEditValue(e.target.value)}
                          rows={10}
                          placeholder="제품 설명을 입력하세요..."
                        />
                        <div className="mt-2 flex justify-end">
                          <button
                            className="px-3 py-1 bg-black text-white rounded-md text-sm mr-1"
                            onClick={() => saveEditing('product_description')}
                          >
                            저장
                          </button>
                          <button
                            className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                            onClick={cancelEditing}
                          >
                            취소
                          </button>
                        </div>
                      </div>
                    ) : (
                      <>
                        <div className="prose prose-sm max-w-none">
                          <div 
                            className="rich-editor text-gray-600 leading-relaxed text-sm"
                            dangerouslySetInnerHTML={{ 
                              __html: product.product_description || '<p className="text-gray-400">제품 설명이 없습니다.</p>' 
                            }}
                          />
                        </div>
                        <button 
                          className="absolute -right-8 top-1 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 underline"
                          onClick={() => startEditing('product_description', product.product_description || '')}
                        >
                          수정
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* 제품 세부 정보 아코디언 */}
                <div className="mb-10 space-y-5">
                  {/* 재고 설정 */}
                  <div className="border-t border-gray-200">
                    <div 
                      className="flex justify-between items-center py-4 cursor-pointer relative group" 
                      onClick={() => toggleAccordion('stock-options')}
                    >
                      <h3 className="text-sm uppercase tracking-widest font-medium">재고 관리</h3>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform ${activeAccordion === 'stock-options' ? 'transform rotate-180' : ''}`} 
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div 
                      className={`overflow-hidden transition-all ${activeAccordion === 'stock-options' ? 'max-h-96 opacity-100 pt-2 pb-4' : 'max-h-0 opacity-0 py-0'}`}
                      style={{ transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, padding 0.2s ease-in-out' }}
                    >
                      <div className="space-y-4">
                        {product && editingField === 'stock' ? (
                          <div className="pt-2">
                            <label htmlFor="stock-edit" className="text-sm text-gray-600">재고 수량:</label>
                            <div className="mt-1 flex">
                              <input
                                type="number"
                                id="stock-edit"
                                className="w-full px-3 py-2 border border-gray-300 rounded-md"
                                value={editNumberValue}
                                onChange={(e) => setEditNumberValue(parseInt(e.target.value) || 0)}
                                min="0"
                              />
                              <div className="ml-2 flex">
                                <button
                                  className="px-3 py-1 bg-black text-white rounded-md text-sm mr-1"
                                  onClick={() => saveEditing('stock')}
                                >
                                  저장
                                </button>
                                <button
                                  className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                                  onClick={cancelEditing}
                                >
                                  취소
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="flex justify-between items-center">
                            <p className="text-sm">현재 재고: <span className="font-medium">{product.stock}개</span></p>
                            <button 
                              className="text-xs text-gray-500 underline"
                              onClick={() => startEditing('stock', product.stock)}
                            >
                              수정
                            </button>
                          </div>
                        )}
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center">
                            <input 
                              type="checkbox" 
                              id="is-available" 
                              checked={product.is_available}
                              onChange={() => {
                                // 판매 상태 토글 API 호출
                                supabase
                                  .from('products')
                                  .update({ is_available: !product.is_available })
                                  .eq('id', productId)
                                  .then(({ error }) => {
                                    if (error) {
                                      alert('판매 상태 수정 중 오류가 발생했습니다.');
                                      console.error(error);
                                    } else {
                                      // 상태 업데이트
                                      setProduct({
                ...product,
                                        is_available: !product.is_available
                                      });
                                    }
                                  });
                              }}
                              className="h-4 w-4 text-black focus:ring-black border-gray-300"
                            />
                            <label htmlFor="is-available" className="ml-2 text-sm">판매 중</label>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 배송 정보 */}
                  <div className="border-t border-gray-200">
                    <div 
                      className="flex justify-between items-center py-4 cursor-pointer relative group"
                      onClick={() => toggleAccordion('shipping-info')}
                    >
                      <h3 className="text-sm uppercase tracking-widest font-medium">배송 안내</h3>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform ${activeAccordion === 'shipping-info' ? 'transform rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div 
                      className={`overflow-hidden transition-all ${activeAccordion === 'shipping-info' ? 'max-h-96 opacity-100 pt-2 pb-4' : 'max-h-0 opacity-0 py-0'}`}
                      style={{ transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, padding 0.2s ease-in-out' }}
                    >
                      <div className="space-y-2 text-sm text-gray-600">
                        {product && product.shipping_info ? (
                          <div dangerouslySetInnerHTML={{ __html: product.shipping_info.replace(/\n/g, '<br/>') }} />
                        ) : (
                          <p className="text-gray-400">기본 배송 정책이 적용됩니다.</p>
                        )}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400 italic">* 배송 정책은 상점 관리자가 설정한 기본값으로 모든 제품에 적용됩니다.</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 반품 정책 */}
                  <div className="border-t border-gray-200">
                    <div 
                      className="flex justify-between items-center py-4 cursor-pointer relative group"
                      onClick={() => toggleAccordion('return-policy')}
                    >
                      <h3 className="text-sm uppercase tracking-widest font-medium">반품 정책</h3>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform ${activeAccordion === 'return-policy' ? 'transform rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div 
                      className={`overflow-hidden transition-all ${activeAccordion === 'return-policy' ? 'max-h-96 opacity-100 pt-2 pb-4' : 'max-h-0 opacity-0 py-0'}`}
                      style={{ transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, padding 0.2s ease-in-out' }}
                    >
                      <div className="space-y-2 text-sm text-gray-600">
                        {product && product.return_policy ? (
                          <div dangerouslySetInnerHTML={{ __html: product.return_policy.replace(/\n/g, '<br/>') }} />
                        ) : (
                          <p className="text-gray-400">기본 반품 정책이 적용됩니다.</p>
                        )}
                        <div className="mt-2 pt-2 border-t border-gray-100">
                          <p className="text-xs text-gray-400 italic">* 반품 정책은 상점 관리자가 설정한 기본값으로 모든 제품에 적용됩니다.</p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 재질/소재 정보 */}
                  <div className="border-t border-gray-200">
                    <div 
                      className="flex justify-between items-center py-4 cursor-pointer relative group"
                      onClick={() => toggleAccordion('material-info')}
                    >
                      <h3 className="text-sm uppercase tracking-widest font-medium">재질/소재</h3>
                      <button 
                        className="absolute -right-8 opacity-0 group-hover:opacity-100 transition-opacity text-xs text-gray-500 underline"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (product) {
                            startEditing('material', product.material || '', 'material-info');
                          }
                        }}
                      >
                        수정
                      </button>
                      <svg 
                        xmlns="http://www.w3.org/2000/svg" 
                        className={`h-4 w-4 transition-transform ${activeAccordion === 'material-info' ? 'transform rotate-180' : ''}`}
                        fill="none" 
                        viewBox="0 0 24 24" 
                        stroke="currentColor"
                      >
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div 
                      className={`overflow-hidden transition-all ${activeAccordion === 'material-info' ? 'max-h-96 opacity-100 pt-2 pb-4' : 'max-h-0 opacity-0 py-0'}`}
                      style={{ transition: 'max-height 0.3s ease-in-out, opacity 0.2s ease-in-out, padding 0.2s ease-in-out' }}
                    >
                      <div className="space-y-2 text-sm text-gray-600">
                        {product && editingField === 'material' ? (
                          <div>
                            <div className="mb-2 flex justify-end">
                              {loadingTemplates ? (
                                <span className="text-xs text-gray-500">템플릿 로딩 중...</span>
                              ) : (
                                <select 
                                  className="px-3 py-1 bg-gray-200 text-gray-700 rounded-md text-xs mr-1"
                                  onChange={(e) => {
                                    const selectedId = e.target.value;
                                    if (selectedId) {
                                      const template = materialTemplates.find(t => t.id === selectedId);
                                      if (template) {
                                        applyTemplate(template.content);
                                      }
                                    }
                                  }}
                                  value=""
                                >
                                  <option value="">템플릿 선택</option>
                                  {materialTemplates.map(template => (
                                    <option key={template.id} value={template.id}>
                                      {template.name}{template.is_default ? ' (기본)' : ''}
                                    </option>
                                  ))}
                                </select>
                              )}
                            </div>
                            <textarea
                              className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                              value={editValue}
                              onChange={(e) => setEditValue(e.target.value)}
                              rows={4}
                              placeholder="재질/소재 정보를 입력하세요..."
                            />
                            <div className="mt-2 flex justify-end">
                              <button
                                className="px-3 py-1 bg-black text-white rounded-md text-sm mr-1"
                                onClick={() => saveEditing('material')}
                              >
                                저장
                              </button>
                              <button
                                className="px-3 py-1 border border-gray-300 rounded-md text-sm"
                                onClick={cancelEditing}
                              >
                                취소
                              </button>
                            </div>
                          </div>
                        ) : (
                          <div className="relative">
                            {product && product.material ? (
                              <p>{product.material}</p>
                            ) : (
                              <p className="text-gray-400">재질/소재 정보가 없습니다. '수정' 버튼을 클릭하여 추가하세요.</p>
                            )}
                            <button 
                              className="absolute top-0 right-0 text-xs text-gray-500 underline"
                              onClick={() => startEditing('material', product?.material || '')}
                            >
                              수정
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>

            {/* 삭제 버튼 */}
                <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex justify-between items-center">
                    <Link
                      href={`/store/${storeId}/product/${productId}`}
                      className="text-sm text-gray-500 underline"
                    >
                      상세 페이지로 돌아가기
                    </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                      className="px-8 py-4 text-sm uppercase tracking-widest font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                >
                  제품 삭제
                </button>
                  </div>
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
    </div>
  );
} 