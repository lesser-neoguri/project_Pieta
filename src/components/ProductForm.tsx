'use client';

import { useState, useEffect, ChangeEvent, FormEvent } from 'react';
import { supabase } from '@/lib/supabase';
import { useRouter } from 'next/navigation';
import { v4 as uuidv4 } from 'uuid';

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
  };
  isEdit?: boolean;
  continueAdding?: boolean;
  onProductCreated?: () => void;
};

export default function ProductForm({ 
  storeId, 
  productId, 
  initialData, 
  isEdit = false,
  continueAdding = false,
  onProductCreated
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
  });
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(initialData?.product_image_url || null);
  const [stayOnPage, setStayOnPage] = useState(continueAdding);

  const handleInputChange = (e: ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
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

  const handleImageChange = (e: ChangeEvent<HTMLInputElement>) => {
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

  const resetForm = () => {
    setFormData({
      product_name: '',
      product_description: '',
      price: 0,
      stock: 0,
      is_available: true,
    });
    setImageFile(null);
    setImagePreview(null);
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
      const filePath = extractFilePathFromUrl(oldImageUrl);
      if (!filePath) {
        console.warn('이전 이미지 경로를 추출할 수 없습니다:', oldImageUrl);
        return;
      }
      
      console.log('이전 이미지 삭제 시도:', filePath);
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        console.error('이전 이미지 삭제 오류:', error);
      } else {
        console.log('이전 이미지 삭제 성공:', filePath);
      }
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    
    try {
      let product_image_url = initialData?.product_image_url || null;
      let oldImageUrl = null;
      
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
          const filePath = `${fileName}`;
          
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
      }
      
      // 제품 데이터 준비
      const productData = {
        store_id: storeId,
        product_name: formData.product_name,
        product_description: formData.product_description,
        price: formData.price,
        stock: formData.stock,
        is_available: formData.is_available,
        product_image_url,
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
        
        setMessage({
          text: '제품이 성공적으로 수정되었습니다.',
          type: 'success'
        });

        // 수정 후에는 항상 상점 페이지로 이동
        setTimeout(() => {
          router.push(`/store/${storeId}`);
        }, 2000);
      } else {
        // 새 제품 등록 - 이미지 업로드 문제와 관계없이 제품 정보 저장
        const { error } = await supabase
          .from('products')
          .insert([productData]);
          
        if (error) {
          console.error('제품 등록 오류:', error);
          throw error;
        }
        
        // 제품 생성 콜백 호출
        if (onProductCreated) {
          onProductCreated();
        }
        
        setMessage({
          text: '제품이 성공적으로 등록되었습니다.',
          type: 'success'
        });
        
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
      console.error('제품 저장 중 오류 발생:', error);
      setMessage({
        text: `제품 저장 중 오류가 발생했습니다: ${error.message || JSON.stringify(error)}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-lg shadow-md p-6">
      {message && (
        <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label htmlFor="product_name" className="block text-gray-700 font-medium mb-2">
            제품명 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            id="product_name"
            name="product_name"
            value={formData.product_name}
            onChange={handleInputChange}
            required
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="제품명을 입력하세요"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="product_description" className="block text-gray-700 font-medium mb-2">
            제품 설명
          </label>
          <textarea
            id="product_description"
            name="product_description"
            value={formData.product_description}
            onChange={handleInputChange}
            rows={4}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="제품에 대한 설명을 입력하세요"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label htmlFor="price" className="block text-gray-700 font-medium mb-2">
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
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="가격을 입력하세요"
            />
          </div>
          
          <div>
            <label htmlFor="stock" className="block text-gray-700 font-medium mb-2">
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
              className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="재고 수량을 입력하세요"
            />
          </div>
        </div>
        
        <div className="mb-6">
          <div className="flex items-center">
            <input
              type="checkbox"
              id="is_available"
              name="is_available"
              checked={formData.is_available}
              onChange={handleInputChange}
              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
            />
            <label htmlFor="is_available" className="ml-2 block text-gray-700">
              판매 가능 상태
            </label>
          </div>
        </div>
        
        <div className="mb-6">
          <label htmlFor="product_image" className="block text-gray-700 font-medium mb-2">
            제품 이미지 (선택사항)
          </label>
          <div className="text-xs text-gray-500 mb-2">
            지원 형식: JPG, PNG, GIF, WEBP (최대 10MB)
          </div>
          <input
            type="file"
            id="product_image"
            name="product_image"
            accept="image/jpeg,image/png,image/gif,image/webp"
            onChange={handleImageChange}
            className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          {imagePreview && (
            <div className="mt-2">
              <p className="text-sm text-gray-500 mb-1">이미지 미리보기:</p>
              <img
                src={imagePreview}
                alt="제품 이미지 미리보기"
                className="h-40 object-cover rounded-md"
              />
            </div>
          )}
        </div>
        
        {!isEdit && continueAdding && (
          <div className="mb-6">
            <div className="flex items-center">
              <input
                type="checkbox"
                id="stay_on_page"
                checked={stayOnPage}
                onChange={(e) => setStayOnPage(e.target.checked)}
                className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
              />
              <label htmlFor="stay_on_page" className="ml-2 block text-gray-700">
                제품 등록 후 계속해서 다른 제품 추가하기
              </label>
            </div>
          </div>
        )}
        
        <div className="flex justify-between">
          <button
            type="button"
            onClick={() => router.push(`/store/${storeId}`)}
            className="px-6 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
          >
            취소
          </button>
          <button
            type="submit"
            disabled={loading}
            className={`px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors ${loading ? 'opacity-70 cursor-not-allowed' : ''}`}
          >
            {loading ? '처리 중...' : isEdit ? '제품 수정' : '제품 등록'}
          </button>
        </div>
      </form>
    </div>
  );
} 