'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { useError } from '@/contexts/ErrorContext';
import { deleteImageFromStorage } from '@/lib/supabase';

type ProductFormProps = {
  storeId: string;
  productId?: string;
  initialData?: {
    product_name: string;
    product_description: string;
    price: number;
    stock: number;
    is_available: boolean;
    product_image_url?: string | null;
    category?: string;
  };
  isEdit?: boolean;
  continueAdding?: boolean;
  onProductCreated?: () => void;
  imageFile?: File | null;
  additionalImages?: File[];
};

export default function ProductForm({ 
  storeId, 
  productId, 
  initialData, 
  isEdit = false,
  continueAdding = false,
  onProductCreated,
  imageFile,
  additionalImages = []
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const { addError } = useError();
  const [formData, setFormData] = useState({
    product_name: initialData?.product_name || '',
    product_description: initialData?.product_description || '',
    price: initialData?.price || 0,
    stock: initialData?.stock || 0,
    is_available: initialData?.is_available ?? true,
    category: initialData?.category || '',
  });
  const [stayOnPage, setStayOnPage] = useState(continueAdding);
  const [textSelection, setTextSelection] = useState<{
    start: number;
    end: number;
    text: string;
    x: number;
    y: number;
  } | null>(null);
  const textareaRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (textareaRef.current) {
      // 초기 내용 설정
      if (initialData?.product_description) {
        textareaRef.current.innerHTML = initialData.product_description;
      }
      
      // 포커스 설정 함수
      const setInitialFocus = () => {
        if (textareaRef.current) {
          textareaRef.current.focus();
        }
      };
      
      // 컴포넌트 마운트 후 약간의 지연 시간을 두고 포커스 설정
      setTimeout(setInitialFocus, 100);
    }
  }, [initialData?.product_description]);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    
    if (type === 'number') {
      setFormData({
        ...formData,
        [name]: parseFloat(value) || 0,
      });
    } else if (type === 'checkbox') {
      setFormData({
        ...formData,
        // @ts-ignore
        [name]: e.target.checked,
      });
    } else {
      setFormData({
        ...formData,
        [name]: value,
      });
    }
  };

  const resetForm = () => {
    setFormData({
      product_name: '',
      product_description: '',
      price: 0,
      stock: 0,
      is_available: true,
      category: '',
    });
  };

  // 이전 이미지 URL에서 파일 경로 추출하는 함수
  const extractFilePathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      // URL에서 파일 경로 추출
      // 예: https://xxx.supabase.co/storage/v1/object/public/images/filename.jpg
      // -> filename.jpg
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      // 마지막 부분이 파일명
      return pathParts[pathParts.length - 1];
    } catch (error) {
      console.error('URL 파싱 오류:', error);
      return null;
    }
  };

  // 이전 이미지 삭제 함수
  const deleteOldImage = async (oldImageUrl: string | null): Promise<void> => {
    if (!oldImageUrl) return;
    
    try {
      console.log('이전 이미지 삭제 시도:', oldImageUrl);
      
      // 스토리지에서 이미지 파일 삭제
      const success = await deleteImageFromStorage(oldImageUrl);
      
      if (success) {
        console.log('이전 이미지 삭제 성공:', oldImageUrl);
      } else {
        console.error('이전 이미지 삭제 실패:', oldImageUrl);
      }
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      let product_image_url = initialData?.product_image_url || null;
      let oldImageUrl = null;
      
      // 제품 수정 시 productId 사용, 신규 등록 시 임시 UUID 생성
      const imageProductId = productId || uuidv4();
      
      // 이미지 파일이 있으면 스토리지에 업로드
      if (imageFile) {
        try {
          console.log('이미지 업로드 시도:', imageFile.name, imageFile.size);
          
          // 이미지 파일 크기 확인 (10MB 제한)
          if (imageFile.size > 10 * 1024 * 1024) {
            throw new Error('이미지 크기는 10MB 이하여야 합니다.');
          }
          
          // 파일 확장자 확인
          const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
          if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            throw new Error('지원되는 이미지 형식은 JPG, PNG, GIF, WEBP입니다.');
          }
          
          // 파일명 생성 (경로에 특수문자 제거)
          const fileName = `${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          const filePath = `products/${imageProductId}/${fileName}`;
          
          console.log('업로드 경로:', filePath);
          
          // 이전 이미지 URL 저장 (나중에 삭제하기 위해)
          if (isEdit && initialData?.product_image_url) {
            oldImageUrl = initialData.product_image_url;
          }
          
          // 이미지 업로드 시도
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images')
            .upload(filePath, imageFile, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) {
            console.error('Supabase 업로드 오류:', uploadError);
            throw uploadError;
          }
          
          console.log('업로드 성공:', uploadData);
          
          // 업로드된 이미지의 공개 URL 가져오기
          const { data } = supabase.storage
            .from('images')
            .getPublicUrl(filePath);
            
          product_image_url = data.publicUrl;
          console.log('이미지 URL:', product_image_url);
        } catch (imageError: any) {
          console.error('이미지 처리 중 오류:', imageError);
          
          // 이미지 업로드 실패 시 사용자에게 알림
          const errorMessage = imageError.message || '이미지 업로드에 실패했습니다.';
          
          // 에러 컨텍스트를 통한 메시지 표시
          addError({
            message: errorMessage,
            type: 'warning',
            actionText: '이미지 없이 계속',
            onAction: () => {
          // 이미지 없이 계속 진행
          product_image_url = initialData?.product_image_url || null;
          oldImageUrl = null; // 이미지 업로드 실패 시 이전 이미지 유지
              
              // 다시 제품 저장 시도
              saveProduct(product_image_url, oldImageUrl);
            }
          });
          
          setLoading(false);
          return;
        }
      } else if (initialData?.product_image_url !== undefined && initialData?.product_image_url === null) {
        // 이미지가 명시적으로 제거된 경우
        if (isEdit) {
          oldImageUrl = initialData.product_image_url; // 기존 이미지 URL 저장해서 삭제
          product_image_url = null; // 새 이미지는 null로 설정
        }
      }
      
      // 제품 저장 로직 호출
      await saveProduct(product_image_url, oldImageUrl);
      
    } catch (error: any) {
      console.error('제품 등록 중 오류 발생:', error);
      
      // 에러 컨텍스트를 통한 오류 표시
      addError({
        message: error.message || '제품 등록에 실패했습니다.',
        type: 'error'
      });
      
      setLoading(false);
    }
  };
  
  // 제품 저장 로직을 별도 함수로 분리
  const saveProduct = async (product_image_url: string | null, oldImageUrl: string | null) => {
      // 제품 데이터 준비
      const productData = {
        store_id: storeId,
        product_name: formData.product_name,
        product_description: formData.product_description,
        price: formData.price,
        stock: formData.stock,
        is_available: formData.is_available,
        product_image_url,
        category: formData.category,
      };
      
      console.log('저장할 제품 데이터:', productData);
      
      if (isEdit && productId) {
        // 제품 수정
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);
          
        if (error) {
          console.error('제품 수정 오류:', error);
          throw error;
        }
        
        // 이미지가 변경되었고 이전 이미지가 있으면 삭제
        if (oldImageUrl && product_image_url !== oldImageUrl) {
          await deleteOldImage(oldImageUrl);
        }
        
        // 추가 이미지 처리
        if (additionalImages && additionalImages.length > 0) {
          // 각 추가 이미지 업로드
          for (let i = 0; i < additionalImages.length; i++) {
            const imageFile = additionalImages[i];
            try {
              // 파일 크기 확인
              if (imageFile.size > 10 * 1024 * 1024) {
                console.warn(`이미지 ${i+1}의 크기가 10MB를 초과합니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일 확장자 확인
              const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
              if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                console.warn(`이미지 ${i+1}의 형식이 지원되지 않습니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일명 생성
              const fileName = `products/${productId}/${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${fileExt}`;
              
              // 이미지 업로드
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, imageFile, {
                  cacheControl: '3600',
                  upsert: false
                });
                
              if (uploadError) {
                console.error(`추가 이미지 ${i+1} 업로드 오류:`, uploadError);
                continue;
              }
              
              // 업로드된 이미지의 공개 URL 가져오기
              const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
                
              const image_url = data.publicUrl;
              
              // product_images 테이블에 저장
              const { error: insertError } = await supabase
                .from('product_images')
                .insert({
                  product_id: productId,
                  image_url,
                  is_primary: false,
                  display_order: i
                });
                
              if (insertError) {
                console.error(`추가 이미지 ${i+1} 저장 오류:`, insertError);
              }
            } catch (error) {
              console.error(`추가 이미지 ${i+1} 처리 중 오류:`, error);
            }
          }
        }
        
      // 성공 메시지 표시
      addError({
        message: '제품이 성공적으로 수정되었습니다.',
          type: 'success'
        });

        // 수정 후에는 항상 상점 페이지로 이동
        setTimeout(() => {
          router.push(`/store/${storeId}`);
        }, 2000);
      } else {
        // 새 제품 등록 - 이미지 업로드 문제와 관계없이 제품 정보 저장
        const { data: newProduct, error } = await supabase
          .from('products')
          .insert([productData])
          .select()
          .single();
          
        if (error) {
          console.error('제품 등록 오류:', error);
          throw error;
        }
        
        // 추가 이미지 처리 (제품이 먼저 생성된 후)
        if (newProduct && additionalImages && additionalImages.length > 0) {
          // 각 추가 이미지 업로드
          for (let i = 0; i < additionalImages.length; i++) {
            const imageFile = additionalImages[i];
            try {
              // 파일 크기 확인
              if (imageFile.size > 10 * 1024 * 1024) {
                console.warn(`이미지 ${i+1}의 크기가 10MB를 초과합니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일 확장자 확인
              const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
              if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                console.warn(`이미지 ${i+1}의 형식이 지원되지 않습니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일명 생성
              const fileName = `products/${newProduct.id}/${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${fileExt}`;
              
              // 이미지 업로드
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('images')
                .upload(fileName, imageFile, {
                  cacheControl: '3600',
                  upsert: false
                });
                
              if (uploadError) {
                console.error(`추가 이미지 ${i+1} 업로드 오류:`, uploadError);
                continue;
              }
              
              // 업로드된 이미지의 공개 URL 가져오기
              const { data } = supabase.storage
                .from('images')
                .getPublicUrl(fileName);
                
              const image_url = data.publicUrl;
              
              // product_images 테이블에 저장
              const { error: insertError } = await supabase
                .from('product_images')
                .insert({
                  product_id: newProduct.id,
                  image_url,
                  is_primary: false,
                  display_order: i
                });
                
              if (insertError) {
                console.error(`추가 이미지 ${i+1} 저장 오류:`, insertError);
              }
            } catch (error) {
              console.error(`추가 이미지 ${i+1} 처리 중 오류:`, error);
            }
          }
        }
        
        // 제품 생성 콜백 호출
        if (onProductCreated) {
          onProductCreated();
        }
        
      // 성공 메시지 표시
      addError({
        message: '제품이 성공적으로 등록되었습니다.',
          type: 'success'
        });
        
        if (stayOnPage) {
          // 폼 초기화하고 현재 페이지에 머무름
          resetForm();
        setLoading(false);
        } else {
          // 상점 상세 페이지로 이동
          setTimeout(() => {
            router.push(`/store/${storeId}`);
          }, 2000);
        }
    }
  };

  const handleTextSelection = () => {
    const selection = window.getSelection();
    if (!selection || selection.rangeCount === 0 || selection.toString().trim() === '') {
      setTextSelection(null);
      return;
    }

    const range = selection.getRangeAt(0);
    const rect = range.getBoundingClientRect();

    setTextSelection({
      start: 0,
      end: 0,
      text: selection.toString(),
      x: rect.left + rect.width / 2,
      y: rect.top - 40
    });
  };

  // 텍스트 스타일 적용 함수
  const applyTextStyle = (command: string, value?: string) => {
    if (textareaRef.current) {
      // 먼저 에디터에 포커스 주기
      textareaRef.current.focus();
      
      // 특별한 명령 처리
      if (command === 'heading') {
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '제목';
        
        if (value === 'h2') {
          document.execCommand('insertHTML', false, `<h2>${selectedText}</h2>`);
        } else if (value === 'h3') {
          document.execCommand('insertHTML', false, `<h3>${selectedText}</h3>`);
        } else if (value === 'h4') {
          document.execCommand('insertHTML', false, `<h4>${selectedText}</h4>`);
        }
        return;
      }
      
      // 본문 문단 처리
      if (command === 'paragraph') {
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '본문 텍스트';
        document.execCommand('insertHTML', false, `<p class="paragraph">${selectedText}</p>`);
        return;
      }
      
      // 참고문(작은글씨) 처리
      if (command === 'smallText') {
        const selection = window.getSelection();
        const selectedText = selection?.toString() || '참고 텍스트';
        document.execCommand('insertHTML', false, `<p class="small-text">${selectedText}</p>`);
        return;
      }
      
      // 선택 영역이 없으면 현재 커서 위치에 적용
      if (!window.getSelection()?.toString()) {
        // 빈 텍스트가 선택된 경우 새로운 볼드 텍스트 추가
        if (command === 'bold') {
          document.execCommand('insertHTML', false, '<strong>텍스트</strong>');
        } else if (command === 'italic') {
          document.execCommand('insertHTML', false, '<em>텍스트</em>');
        } else if (command === 'underline') {
          document.execCommand('insertHTML', false, '<u>텍스트</u>');
        } else {
          document.execCommand(command, false, value);
        }
      } else {
        // 선택 영역이 있으면 해당 영역에 적용
        document.execCommand(command, false, value);
      }
      
      // 현재 내용을 formData에 저장
      setFormData({
        ...formData,
        product_description: textareaRef.current.innerHTML
      });
    }
  };

  // 선택 영역에 볼드체 적용 (팝업 메뉴에서 사용)
  const applyBold = () => {
    if (!textSelection && !textareaRef.current) return;
    
    // 먼저 에디터에 포커스 주기
    if (textareaRef.current) {
      textareaRef.current.focus();
    }
    
    // 볼드체 적용
    document.execCommand('bold', false);
    
    // 팝업 메뉴 닫기
    setTextSelection(null);
    
    // 현재 내용을 formData에 저장
    if (textareaRef.current) {
      setFormData({
        ...formData,
        product_description: textareaRef.current.innerHTML
      });
    }
  };

  const handleContentChange = () => {
    if (textareaRef.current) {
      setFormData({
        ...formData,
        product_description: textareaRef.current.innerHTML
      });
      
      // 콘텐츠가 변경될 때 포커스 유지
      textareaRef.current.focus();
    }
  };

  // 클릭 이벤트 핸들러 - 선택 영역 외부 클릭 시 도구 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (textSelection && textareaRef.current && !textareaRef.current.contains(e.target as Node)) {
        setTextSelection(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [textSelection]);

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 에디터 스타일 정의 - contentEditable 요소 외부로 이동 */}
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
        `}
      </style>
      
      <div className="space-y-6">
        <div>
          <label htmlFor="product_name" className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-pretendard">
            제품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="product_name"
            name="product_name"
            value={formData.product_name}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border-0 border-b border-gray-200 focus:border-black focus:ring-0 text-lg font-pretendard"
            placeholder="제품명을 입력하세요"
          />
        </div>
        
        <div className="relative">
          <label htmlFor="product_description" className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-pretendard">
            제품 설명
          </label>
          
          {/* 에디터 도구 모음 */}
          <div className="flex flex-wrap items-center gap-1 mb-2 border border-gray-200 rounded-lg p-1 bg-white">
            <button
              type="button"
              onClick={applyBold}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="볼드체 (굵게)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => applyTextStyle('italic')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="이탤릭체 (기울임)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="19" y1="4" x2="10" y2="4"></line>
                <line x1="14" y1="20" x2="5" y2="20"></line>
                <line x1="15" y1="4" x2="9" y2="20"></line>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => applyTextStyle('underline')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="밑줄"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                <line x1="4" y1="21" x2="20" y2="21"></line>
              </svg>
            </button>
            
            <span className="w-px h-6 bg-gray-200 mx-1"></span>
            
            <button
              type="button"
              onClick={() => applyTextStyle('heading', 'h2')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="큰 제목"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V5a1 1 0 0 1 1-1h1"></path>
                <path d="M9 5v12"></path>
                <path d="M9 11h6"></path>
                <path d="M15 5v12"></path>
                <path d="M19 12V9"></path>
                <path d="M21 10a2 2 0 0 1-2 2h-1"></path>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => applyTextStyle('heading', 'h3')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="중간 제목"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V5a1 1 0 0 1 1-1h1"></path>
                <path d="M9 5v12"></path>
                <path d="M9 11h6"></path>
                <path d="M15 5v12"></path>
                <path d="M19 12V9"></path>
                <path d="M21 10a2 2 0 0 1-2 2h-1"></path>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => applyTextStyle('heading', 'h4')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="작은 제목"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M4 7V5a1 1 0 0 1 1-1h1"></path>
                <path d="M9 5v12"></path>
                <path d="M9 11h6"></path>
                <path d="M15 5v12"></path>
                <path d="M19 12V9"></path>
                <path d="M21 10a2 2 0 0 1-2 2h-1"></path>
              </svg>
            </button>
            
            <span className="w-px h-6 bg-gray-200 mx-1"></span>
            
            <button
              type="button"
              onClick={() => applyTextStyle('paragraph')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="본문 문단"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => applyTextStyle('smallText')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="참고문구 (작은글씨)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="4 7 4 4 20 4 20 7"></polyline>
                <line x1="9" y1="20" x2="15" y2="20"></line>
                <line x1="12" y1="4" x2="12" y2="20"></line>
              </svg>
            </button>
            
            <span className="w-px h-6 bg-gray-200 mx-1"></span>
            
            <button
              type="button"
              onClick={() => applyTextStyle('insertUnorderedList')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="글머리 기호 목록"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="8" y1="6" x2="21" y2="6"></line>
                <line x1="8" y1="12" x2="21" y2="12"></line>
                <line x1="8" y1="18" x2="21" y2="18"></line>
                <line x1="3" y1="6" x2="3.01" y2="6"></line>
                <line x1="3" y1="12" x2="3.01" y2="12"></line>
                <line x1="3" y1="18" x2="3.01" y2="18"></line>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => applyTextStyle('insertOrderedList')}
              className="p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors"
              title="번호 매기기"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="10" y1="6" x2="21" y2="6"></line>
                <line x1="10" y1="12" x2="21" y2="12"></line>
                <line x1="10" y1="18" x2="21" y2="18"></line>
                <path d="M4 6h1v4"></path>
                <path d="M4 10h2"></path>
                <path d="M6 18H4c0-1 2-2 2-3s-1-1.5-2-1"></path>
              </svg>
            </button>
          </div>
          
          <div className="relative">
            <div
              ref={textareaRef}
              contentEditable="true"
              onMouseUp={handleTextSelection}
              onKeyUp={handleTextSelection}
              onInput={handleContentChange}
              className="rich-editor w-full px-4 py-3 border border-gray-200 rounded-lg focus:border-black focus:outline-none min-h-[200px] text-base font-pretendard"
              style={{ lineHeight: '1.5' }}
            ></div>
            {textSelection && (
              <div 
                className="absolute z-10 bg-white border border-gray-200 rounded-md shadow-lg flex items-center"
                style={{
                  left: `${textSelection.x}px`,
                  top: `${textSelection.y}px`,
                  transform: 'translateX(-50%)'
                }}
              >
                <button
                  type="button"
                  onClick={applyBold}
                  className="p-2 hover:bg-gray-100 rounded-l-md text-gray-700 transition-colors border-r border-gray-200"
                  title="볼드체 (굵게)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                    <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => applyTextStyle('italic')}
                  className="p-2 hover:bg-gray-100 text-gray-700 transition-colors border-r border-gray-200"
                  title="이탤릭체 (기울임)"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="19" y1="4" x2="10" y2="4"></line>
                    <line x1="14" y1="20" x2="5" y2="20"></line>
                    <line x1="15" y1="4" x2="9" y2="20"></line>
                  </svg>
                </button>
                <button
                  type="button"
                  onClick={() => applyTextStyle('underline')}
                  className="p-2 hover:bg-gray-100 rounded-r-md text-gray-700 transition-colors"
                  title="밑줄"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M6 3v7a6 6 0 0 0 6 6 6 6 0 0 0 6-6V3"></path>
                    <line x1="4" y1="21" x2="20" y2="21"></line>
                  </svg>
                </button>
              </div>
            )}
          </div>
          <div className="mt-2 text-xs text-gray-500 font-pretendard">
            <span>텍스트를 드래그하여 서식을 적용하거나, 위의 도구 모음에서 원하는 서식을 선택하세요.</span>
          </div>
        </div>
        
        <div className="grid grid-cols-2 gap-8">
          <div>
            <label htmlFor="price" className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-pretendard">
              가격 (원) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="price"
              name="price"
              value={formData.price}
              onChange={handleInputChange}
              required
              min="0"
              className="w-full px-4 py-3 border-0 border-b border-gray-200 focus:border-black focus:ring-0 text-lg font-pretendard"
              placeholder="가격을 입력하세요"
            />
          </div>
          
          <div>
            <label htmlFor="stock" className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-pretendard">
              재고 수량 <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              id="stock"
              name="stock"
              value={formData.stock}
              onChange={handleInputChange}
              required
              min="0"
              className="w-full px-4 py-3 border-0 border-b border-gray-200 focus:border-black focus:ring-0 text-lg font-pretendard"
              placeholder="재고 수량을 입력하세요"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="category" className="block text-xs uppercase tracking-widest text-gray-500 mb-2 font-pretendard">
            카테고리 <span className="text-red-500">*</span>
          </label>
          <select
            id="category"
            name="category"
            value={formData.category}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-3 border-0 border-b border-gray-200 focus:border-black focus:ring-0 text-lg font-pretendard"
          >
            <option value="" className="font-pretendard">카테고리 선택</option>
            <option value="gold" className="font-pretendard">골드바 (투자상품)</option>
            <option value="silver" className="font-pretendard">실버바 (투자상품)</option>
            <option value="jewelry" className="font-pretendard">주얼리/악세서리</option>
            <option value="other" className="font-pretendard">기타</option>
          </select>
        </div>
        
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="is_available"
              name="is_available"
              checked={formData.is_available}
              onChange={handleInputChange}
              className="h-5 w-5 border-gray-300 text-black focus:ring-black rounded-sm"
            />
            <span className="text-sm text-gray-600 font-pretendard">판매 가능 상태</span>
          </label>
        </div>
      </div>

      {!isEdit && continueAdding && (
        <div className="mt-8">
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              id="stay_on_page"
              checked={stayOnPage}
              onChange={(e) => setStayOnPage(e.target.checked)}
              className="h-5 w-5 border-gray-300 text-black focus:ring-black rounded-sm"
            />
            <span className="text-sm text-gray-600 font-pretendard">제품 등록 후 계속해서 다른 제품 추가하기</span>
          </label>
        </div>
      )}
      
      <div className="flex justify-end space-x-4 mt-12">
        <button
          type="button"
          onClick={() => router.push(`/store/${storeId}`)}
          className="px-8 py-4 text-sm uppercase tracking-widest font-medium border border-gray-300 text-gray-700 hover:bg-gray-50 transition-colors font-pretendard"
        >
          취소
        </button>
        <button
          type="submit"
          disabled={loading}
          className="px-8 py-4 text-sm uppercase tracking-widest font-medium bg-black text-white hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed font-pretendard"
        >
          {loading ? '저장 중...' : (isEdit ? '수정하기' : '등록하기')}
        </button>
      </div>
    </form>
  );
} 