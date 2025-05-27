'use client';

import { useState, useEffect, ChangeEvent, FormEvent, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';
import { extractPathFromUrl, moveImage } from '@/lib/migration';
import { useEditor, EditorContent, Editor } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Underline from '@tiptap/extension-underline';
import Heading from '@tiptap/extension-heading';
import Placeholder from '@tiptap/extension-placeholder';
import logger from '@/lib/logger';

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
  onSaveStatusChange?: (status: 'idle' | 'saving' | 'saved' | 'error') => void;
};

export default function ProductForm({ 
  storeId, 
  productId, 
  initialData, 
  isEdit = false,
  continueAdding = false,
  onProductCreated,
  imageFile,
  additionalImages = [],
  onSaveStatusChange
}: ProductFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    product_name: initialData?.product_name || '',
    product_description: initialData?.product_description || '',
    price: initialData?.price || 0,
    stock: initialData?.stock || 0,
    is_available: initialData?.is_available ?? true,
    category: initialData?.category || '',
  });
  const [stayOnPage, setStayOnPage] = useState(continueAdding);
  
  // Tiptap 에디터 설정
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Heading.configure({
        levels: [2, 3, 4],
      }),
      Placeholder.configure({
        placeholder: '제품 설명을 입력하세요...',
      }),
    ],
    content: initialData?.product_description || '',
    onUpdate: ({ editor }) => {
      setFormData({
        ...formData,
        product_description: editor.getHTML()
      });
    },
  });

  useEffect(() => {
    // 초기 데이터가 변경되면 에디터 내용 업데이트
    if (initialData?.product_description && editor) {
      editor.commands.setContent(initialData.product_description);
    }
  }, [initialData?.product_description, editor]);

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
    
    // 에디터 내용 초기화
    if (editor) {
      editor.commands.clearContent();
    }
  };

  // 이전 이미지 삭제 함수
  const deleteOldImage = async (oldImageUrl: string | null) => {
    if (!oldImageUrl) return;
    
    try {
      const filePath = extractPathFromUrl(oldImageUrl);
      if (!filePath) {
        logger.warn('이전 이미지 경로를 추출할 수 없습니다:', oldImageUrl);
        return;
      }
      
      logger.debug('이전 이미지 삭제 시도:', filePath);
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
      
      if (error) {
        logger.error('이전 이미지 삭제 오류:', error);
        return;
      }
      
      logger.debug('이전 이미지 삭제 성공:', filePath);
    } catch (error) {
      logger.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  const uploadImage = async (imageFile: File): Promise<string | null> => {
    try {
      logger.debug('이미지 업로드 시도:', imageFile.name, imageFile.size);
      
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
      const filePath = `${fileName}`;
      
      logger.debug('업로드 경로:', filePath);
      
      // 이전 이미지 URL 저장 (나중에 삭제하기 위해)
      let oldImageUrl = null;
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
        logger.error('Supabase 업로드 오류:', uploadError);
        return null;
      }
      
      logger.debug('업로드 성공:', uploadData);
      
      // 업로드된 이미지의 공개 URL 가져오기
      const { data } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);
        
      const product_image_url = data.publicUrl;
      logger.debug('이미지 URL:', product_image_url);
      return product_image_url;
    } catch (error) {
      logger.error('이미지 처리 중 오류:', error);
      return null;
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    // 상위 컴포넌트에 저장 시작 알림
    if (onSaveStatusChange) {
      onSaveStatusChange('saving');
    }
    
    try {
      let product_image_url = initialData?.product_image_url || null;
      let oldImageUrl = null;
      
      // 이미지 파일이 있으면 스토리지에 업로드
      if (imageFile) {
        try {
          product_image_url = await uploadImage(imageFile);
        } catch (imageError: any) {
          logger.error('이미지 처리 중 오류:', imageError);
          
          // 이미지 업로드 실패 시 사용자에게 알림
          const errorMessage = imageError.message || '이미지 업로드에 실패했습니다.';
          
          // 이미지 없이 계속 진행할지 확인
          const continueWithoutImage = confirm(`${errorMessage}\n\n이미지 없이 제품을 등록하시겠습니까?`);
          if (!continueWithoutImage) {
            setLoading(false);
            return;
          }
          
          // 이미지 없이 계속 진행
          product_image_url = initialData?.product_image_url || null;
          oldImageUrl = null; // 이미지 업로드 실패 시 이전 이미지 유지
        }
      } else if (initialData?.product_image_url !== undefined && initialData?.product_image_url === null) {
        // 이미지가 명시적으로 제거된 경우
        if (isEdit) {
          oldImageUrl = initialData.product_image_url; // 기존 이미지 URL 저장해서 삭제
          product_image_url = null; // 새 이미지는 null로 설정
        }
      }
      
      // 제품 데이터 준비
      const productData = {
        store_id: storeId,
        product_name: formData.product_name,
        product_description: editor ? editor.getHTML() : formData.product_description,
        price: formData.price,
        stock: formData.stock,
        is_available: formData.is_available,
        product_image_url,
        category: formData.category,
      };
      
      logger.debug('저장할 제품 데이터:', productData);
      
      if (isEdit && productId) {
        // 제품 수정
        const { error } = await supabase
          .from('products')
          .update(productData)
          .eq('id', productId);
          
        if (error) {
          logger.error('제품 수정 오류:', error);
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
                logger.warn(`이미지 ${i+1}의 크기가 10MB를 초과합니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일 확장자 확인
              const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
              if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                logger.warn(`이미지 ${i+1}의 형식이 지원되지 않습니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일명 생성
              const fileName = `products/${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${fileExt}`;
              
              // 이미지 업로드
              const image_url = await uploadImage(imageFile);
              
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
                logger.error(`추가 이미지 ${i+1} 저장 오류:`, insertError);
              }
            } catch (error) {
              logger.error(`추가 이미지 ${i+1} 처리 중 오류:`, error);
            }
          }
        }
        
        setMessage({
          text: '제품이 성공적으로 수정되었습니다.',
          type: 'success'
        });

        // 상위 컴포넌트에 저장 완료 알림
        if (onSaveStatusChange) {
          onSaveStatusChange('saved');
          // 2초 후에 idle 상태로 변경
          setTimeout(() => {
            onSaveStatusChange('idle');
          }, 2000);
        }

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
          logger.error('제품 등록 오류:', error);
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
                logger.warn(`이미지 ${i+1}의 크기가 10MB를 초과합니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일 확장자 확인
              const fileExt = imageFile.name.split('.').pop()?.toLowerCase();
              if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
                logger.warn(`이미지 ${i+1}의 형식이 지원되지 않습니다. 건너뜁니다.`);
                continue;
              }
              
              // 파일명 생성
              const fileName = `products/${Date.now()}_${Math.floor(Math.random() * 1000)}_${i}.${fileExt}`;
              
              // 이미지 업로드
              const image_url = await uploadImage(imageFile);
              
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
                logger.error(`추가 이미지 ${i+1} 저장 오류:`, insertError);
              }
            } catch (error) {
              logger.error(`추가 이미지 ${i+1} 처리 중 오류:`, error);
            }
          }
        }
        
        // 제품 생성 콜백 호출
        if (onProductCreated) {
          onProductCreated();
        }
        
        setMessage({
          text: '제품이 성공적으로 등록되었습니다.',
          type: 'success'
        });
        
        // 상위 컴포넌트에 저장 완료 알림
        if (onSaveStatusChange) {
          onSaveStatusChange('saved');
          // 2초 후에 idle 상태로 변경
          setTimeout(() => {
            onSaveStatusChange('idle');
          }, 2000);
        }
        
        if (stayOnPage) {
          // 폼 초기화하고 현재 페이지에 머무름
          resetForm();
          // 3초 후 성공 메시지 제거
          setTimeout(() => {
            setMessage(null);
          }, 3000);
        } else {
          // 상점 상세 페이지로 이동
          setTimeout(() => {
            router.push(`/store/${storeId}`);
          }, 2000);
        }
      }
    } catch (error: any) {
      logger.error('제품 저장 중 오류 발생:', error);
      setMessage({
        text: `제품 저장 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}`,
        type: 'error'
      });
      
      // 상위 컴포넌트에 에러 알림
      if (onSaveStatusChange) {
        onSaveStatusChange('error');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-8">
      {/* 에디터 스타일 정의 - contentEditable 요소 외부로 이동 */}
      <style>
        {`
        .ProseMirror {
          min-height: 200px;
          padding: 0.75rem 1rem;
          outline: none;
          line-height: 1.5;
        }
        .ProseMirror p {
          margin-bottom: 0.5rem;
        }
        .ProseMirror h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0;
          color: #111;
        }
        .ProseMirror h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.8rem 0;
          color: #333;
        }
        .ProseMirror h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.6rem 0;
          color: #444;
        }
        .ProseMirror .paragraph {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        .ProseMirror .small-text {
          font-size: 0.875rem;
          color: #666;
          line-height: 1.4;
        }
        .ProseMirror strong {
          font-weight: 700;
        }
        .ProseMirror em {
          font-style: italic;
        }
        .ProseMirror u {
          text-decoration: underline;
        }
        .ProseMirror ul, .ProseMirror ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .ProseMirror ul li {
          list-style-type: disc;
        }
        .ProseMirror ol li {
          list-style-type: decimal;
        }
        .is-active {
          background-color: #f3f4f6;
        }
        `}
      </style>
      
      {message && (
        <div className={`mb-8 text-sm ${message.type === 'success' ? 'text-green-600' : 'text-red-600'}`}>
          {message.text}
        </div>
      )}
      
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
          
          {/* Tiptap 에디터 도구 모음 */}
          <div className="flex flex-wrap items-center gap-1 mb-2 border border-gray-200 rounded-lg p-1 bg-white">
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('bold') ? 'is-active' : ''}`}
              title="볼드체 (굵게)"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M6 4h8a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
                <path d="M6 12h9a4 4 0 0 1 4 4 4 4 0 0 1-4 4H6z"></path>
              </svg>
            </button>
            
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('italic') ? 'is-active' : ''}`}
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
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('underline') ? 'is-active' : ''}`}
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
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('heading', { level: 2 }) ? 'is-active' : ''}`}
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
              onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('heading', { level: 3 }) ? 'is-active' : ''}`}
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
              onClick={() => editor?.chain().focus().toggleHeading({ level: 4 }).run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('heading', { level: 4 }) ? 'is-active' : ''}`}
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
              onClick={() => editor?.chain().focus().setParagraph().run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('paragraph') ? 'is-active' : ''}`}
              title="본문 문단"
            >
              <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="3" y1="6" x2="21" y2="6"></line>
                <line x1="3" y1="12" x2="21" y2="12"></line>
                <line x1="3" y1="18" x2="21" y2="18"></line>
              </svg>
            </button>
            
            <span className="w-px h-6 bg-gray-200 mx-1"></span>
            
            <button
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('bulletList') ? 'is-active' : ''}`}
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
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              className={`p-2 hover:bg-gray-100 rounded text-gray-700 transition-colors ${editor?.isActive('orderedList') ? 'is-active' : ''}`}
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
            {/* Tiptap 에디터 컨텐츠 영역 */}
            <div className="border border-gray-200 rounded-lg focus-within:border-black overflow-hidden">
              <EditorContent editor={editor} className="font-pretendard text-base" />
            </div>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-pretendard">
            <span>위의 도구 모음에서 원하는 서식을 선택하세요.</span>
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
    </form>
  );
} 