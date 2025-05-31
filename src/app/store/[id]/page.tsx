'use client';

import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { extractPathFromUrl } from '@/lib/migration';
import toast from 'react-hot-toast';
import logger from '@/lib/logger';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

type StoreData = {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
  vendor_id: string;
  store_phone?: string;
};

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
  total_sales?: number;
  average_rating?: number;
  discount_percentage?: number;
  category?: string;
};

type StoreDesign = {
  id?: string;
  store_id: string;
  theme_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  layout_style: 'grid' | 'list' | 'masonry';
  header_style: 'minimal' | 'classic' | 'modern';
  product_card_style: 'default' | 'compact' | 'detailed';
  show_store_description: boolean;
  show_contact_info: boolean;
  show_business_hours: boolean;
  banner_height: 'small' | 'medium' | 'large';
  logo_position: 'left' | 'center' | 'right';
  title_font_size: 'small' | 'medium' | 'large' | 'xl';
  description_font_size: 'small' | 'medium' | 'large';
  banner_image_url?: string;
  custom_css?: string;
  title_position_x?: number;
  title_position_y?: number;
  description_position_x?: number;
  description_position_y?: number;
  text_overlay_settings?: {
    titleColor: string;
    descriptionColor: string;
    titleSize: string;
    descriptionSize: string;
    titleWeight: string;
    descriptionWeight: string;
  };
  // 각 층별 레이아웃 설정
  row_layouts?: {
    [rowIndex: number]: {
      layout_type: 'grid' | 'list' | 'masonry' | 'featured' | 'banner' | 'text';
      columns: number;
      card_style: 'default' | 'compact' | 'detailed' | 'large';
      spacing: 'tight' | 'normal' | 'loose';
      height_ratio?: 'square' | 'portrait' | 'landscape' | 'auto';
      show_text_overlay?: boolean;
      background_color?: string;
      text_alignment?: 'left' | 'center' | 'right';
      featured_image_url?: string;
      linked_product_id?: string;
      featured_size?: 'hero' | 'large' | 'medium';
      overlay_position?: 'center' | 'bottom' | 'top';
      // 텍스트 레이아웃 필드들
      text_content?: string;
      text_size?: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
      text_color?: string;
      text_weight?: 'normal' | 'medium' | 'semibold' | 'bold';
      text_style?: 'paragraph' | 'heading' | 'quote' | 'highlight';
      max_width?: 'narrow' | 'medium' | 'wide' | 'full';
      padding?: 'small' | 'medium' | 'large' | 'xl';
      // 배너 레이아웃 필드들
      banner_height?: 'small' | 'medium' | 'large' | 'full';
      banner_style?: 'image' | 'gradient' | 'solid';
      call_to_action?: string;
    };
  };
  products_per_row?: number;
  enable_custom_rows?: boolean;
  // 상품 간격 설정 추가
  product_spacing?: 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose';
};

const defaultDesign: Omit<StoreDesign, 'id' | 'store_id'> = {
  theme_color: '#000000',
  accent_color: '#666666',
  background_color: '#ffffff',
  text_color: '#000000',
  font_family: 'Inter',
  layout_style: 'grid',
  header_style: 'modern',
  product_card_style: 'default',
  show_store_description: true,
  show_contact_info: true,
  show_business_hours: true,
  banner_height: 'medium',
  logo_position: 'center',
  title_font_size: 'large',
  description_font_size: 'medium',
  banner_image_url: '',
  custom_css: '',
  title_position_x: 50,
  title_position_y: 40,
  description_position_x: 50,
  description_position_y: 60,
  text_overlay_settings: {
    titleColor: '#ffffff',
    descriptionColor: '#ffffff',
    titleSize: 'large',
    descriptionSize: 'medium',
    titleWeight: 'normal',
    descriptionWeight: 'normal'
  },
  products_per_row: 4,
  enable_custom_rows: false,
  product_spacing: 'normal'
};

export default function StorePage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const storeId = params?.id as string;
  
  const [loading, setLoading] = useState(true);
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [design, setDesign] = useState<StoreDesign>(defaultDesign as StoreDesign);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [deleteProductId, setDeleteProductId] = useState<string | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [sortBy, setSortBy] = useState('newest');
  const [showInfoPopup, setShowInfoPopup] = useState<string | null>(null);

  useEffect(() => {
    const fetchStoreAndProducts = async () => {
      if (!storeId) {
        setError('잘못된 상점 ID입니다.');
        setLoading(false);
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

        // 상점 디자인 설정 가져오기
        const { data: designData, error: designError } = await supabase
          .from('store_designs')
          .select('*')
          .eq('store_id', storeId)
          .single();

        if (designError && designError.code !== 'PGRST116') {
          logger.error('디자인 설정 로딩 오류:', designError);
        }

        if (designData) {
          const convertedDesign = {
            ...designData,
            title_position_x: designData.title_position_x || 50,
            title_position_y: designData.title_position_y || 40,
            description_position_x: designData.description_position_x || 50,
            description_position_y: designData.description_position_y || 60,
            text_overlay_settings: (() => {
              try {
                if (typeof designData.text_overlay_settings === 'string') {
                  return JSON.parse(designData.text_overlay_settings);
                } else if (typeof designData.text_overlay_settings === 'object') {
                  return designData.text_overlay_settings;
                } else {
                  return defaultDesign.text_overlay_settings;
                }
              } catch (e) {
                console.error('Error parsing text_overlay_settings:', e);
                return defaultDesign.text_overlay_settings;
              }
            })(),
            // 타입 변환 명시적 처리
            products_per_row: (() => {
              console.log('Raw products_per_row from DB:', designData.products_per_row, 'type:', typeof designData.products_per_row);
              if (typeof designData.products_per_row === 'string') {
                const parsed = parseInt(designData.products_per_row);
                console.log('Parsed products_per_row:', parsed);
                return parsed;
              } else if (typeof designData.products_per_row === 'number') {
                console.log('Using number products_per_row:', designData.products_per_row);
                return designData.products_per_row;
              } else {
                console.log('Using default products_per_row: 4');
                return 4;
              }
            })(),
            enable_custom_rows: designData.enable_custom_rows || false,
            row_layouts: (() => {
              try {
                if (typeof designData.row_layouts === 'string') {
                  return JSON.parse(designData.row_layouts);
                } else if (typeof designData.row_layouts === 'object') {
                  return designData.row_layouts;
                } else {
                  return {};
                }
              } catch (e) {
                console.error('Error parsing row_layouts:', e);
                return {};
              }
            })(),
            product_spacing: designData.product_spacing || 'normal'
          };
          console.log('Loaded design data:', convertedDesign);
          console.log('Final products_per_row:', convertedDesign.products_per_row, 'type:', typeof convertedDesign.products_per_row);
          console.log('Row layouts loaded:', convertedDesign.row_layouts);
          setDesign(convertedDesign);
        } else {
          console.log('No design data found, using default design');
          setDesign({ ...defaultDesign, store_id: storeId });
        }

        // 상점의 제품 목록 가져오기
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false });

        if (productsError) throw productsError;

        if (productsData) {
          setProducts(productsData);
          logger.debug(`${productsData?.length || 0}개의 제품을 불러왔습니다.`);
        }

        // 현재 사용자가 상점 소유자인지 확인
        if (user && user.id === storeData.vendor_id) {
          setIsOwner(true);
        }
      } catch (error: any) {
        logger.error('데이터 로딩 중 오류 발생:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreAndProducts();
  }, [storeId, user]);

  // 팝업 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showInfoPopup) {
        setShowInfoPopup(null);
      }
    };

    if (showInfoPopup) {
      document.addEventListener('click', handleClickOutside);
    }

    return () => {
      document.removeEventListener('click', handleClickOutside);
    };
  }, [showInfoPopup]);

  // 제품 이미지 삭제 함수
  const handleRemoveImage = async (imageUrl: string) => {
    if (!imageUrl) return;
    
    const filePath = extractPathFromUrl(imageUrl);
    if (!filePath) {
      alert('이미지 경로를 찾을 수 없습니다.');
      return;
    }
    
    logger.debug('제품 이미지 삭제 시도:', filePath);
    
    try {
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
      
      if (error) {
        logger.error('이미지 삭제 오류:', error);
        alert('이미지 삭제 중 오류가 발생했습니다.');
        return;
      }
      
      logger.debug('이미지 삭제 성공');
      
    } catch (error: any) {
      logger.error('이미지 삭제 중 오류 발생:', error);
      alert('이미지 삭제 중 오류가 발생했습니다.');
    }
  };

  // 제품 삭제 함수
  const handleDeleteProduct = async () => {
    if (!deleteProductId || !isOwner || !storeId) return;
    
    setDeleteLoading(true);
    
    try {
      // 삭제할 제품 찾기
      const productToDelete = products.find(p => p.id === deleteProductId);
      if (!productToDelete) {
        throw new Error('삭제할 제품을 찾을 수 없습니다.');
      }
      
      // 제품 삭제
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', deleteProductId)
        .eq('store_id', storeId);
        
      if (error) throw error;
      
      // 제품 이미지 삭제
      if (productToDelete.product_image_url) {
        await handleRemoveImage(productToDelete.product_image_url);
      }
      
      // 제품 목록 업데이트
      setProducts(products.filter(p => p.id !== deleteProductId));
      
      // 성공 메시지
      alert('제품이 성공적으로 삭제되었습니다.');
    } catch (error: any) {
      console.error('제품 삭제 중 오류 발생:', error);
      alert(`제품 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setDeleteLoading(false);
      setDeleteProductId(null);
    }
  };

  // 스토어 로고 삭제 함수
  const handleDeleteLogo = async () => {
    if (!store || !store.store_logo_url) return;
    
    try {
      const filePath = extractPathFromUrl(store.store_logo_url);
      if (!filePath) {
        toast.error('이미지 경로를 추출할 수 없습니다.');
        return;
      }
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        toast.error('로고 삭제 중 오류가 발생했습니다.');
        logger.error('로고 삭제 오류:', error);
        return;
      }
      
      // DB에서 logo_url 제거
      const { error: updateError } = await supabase
        .from('stores')
        .update({ store_logo_url: null })
        .eq('id', store.id);
        
      if (updateError) {
        toast.error('스토어 업데이트 중 오류가 발생했습니다.');
        logger.error('스토어 업데이트 오류:', updateError);
        return;
      }
      
      // 성공 메시지 표시 및 페이지 새로고침
      toast.success('로고가 삭제되었습니다.');
      window.location.reload();
    } catch (error) {
      toast.error('오류가 발생했습니다.');
      logger.error('로고 삭제 처리 중 오류:', error);
    }
  };

  // 제품 정렬 함수
  const sortProducts = (products: ProductData[], sortBy: string) => {
    const sorted = [...products];
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      case 'newest':
      default:
        return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
    }
  };

  // 디자인 헬퍼 함수들
  const getBannerHeight = () => {
    switch (design.banner_height) {
      case 'small': return 'h-96 md:h-[32rem]';
      case 'large': return 'h-[40rem] md:h-[48rem]';
      default: return 'h-[36rem] md:h-[44rem]';
    }
  };

  const getTitleSize = () => {
    switch (design.title_font_size) {
      case 'small': return 'text-2xl md:text-3xl';
      case 'medium': return 'text-3xl md:text-4xl';
      case 'large': return 'text-4xl md:text-5xl';
      case 'xl': return 'text-5xl md:text-6xl';
      default: return 'text-4xl md:text-5xl';
    }
  };

  const getDescriptionSize = () => {
    switch (design.description_font_size) {
      case 'small': return 'text-xs md:text-sm';
      case 'medium': return 'text-sm md:text-base';
      case 'large': return 'text-base md:text-lg';
      default: return 'text-sm md:text-base';
    }
  };

  const getProductSpacing = () => {
    switch (design.product_spacing) {
      case 'none': return 'gap-0';
      case 'tight': return 'gap-2 md:gap-3';
      case 'normal': return 'gap-6 md:gap-8';
      case 'loose': return 'gap-8 md:gap-12';
      case 'extra-loose': return 'gap-12 md:gap-16';
      default: return 'gap-6 md:gap-8';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <div className="w-12 h-12 mx-auto mb-4 border-2 border-gray-300 border-t-gray-900 rounded-full animate-spin"></div>
          <p className="text-lg font-light text-gray-600 tracking-wide">Loading Store...</p>
        </div>
      </div>
    );
  }

  if (error || !store) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error || '상점 정보를 불러올 수 없습니다.'}
            </div>
            <div className="flex justify-center mt-4">
              <Link
                href="/storelist"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                상점 목록으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  const sortedProducts = sortProducts(products, sortBy);

  return (
    <div className="min-h-screen" style={{ 
      backgroundColor: design.background_color,
      color: design.text_color,
      fontFamily: design.font_family 
    }}>
      {/* 상점 헤더 배너 */}
      <div className={`relative ${getBannerHeight()} overflow-hidden`}
           style={{ 
             backgroundColor: design.theme_color,
             backgroundImage: design.banner_image_url 
               ? `linear-gradient(to bottom right, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${design.banner_image_url})`
               : `linear-gradient(to bottom right, ${design.theme_color}, #1f2937)`,
             backgroundSize: 'cover',
             backgroundPosition: 'center',
             backgroundRepeat: 'no-repeat'
           }}>
        {/* 배경 패턴 (이미지가 없을 때만) */}
        {!design.banner_image_url && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-y-12"></div>
          </div>
        )}

        {/* 상점 정보 오버레이 */}
        <div className="absolute inset-0">
          {/* 상점명 */}
          <div 
            className="absolute text-white"
            style={{
              left: `${design.title_position_x || 50}%`,
              top: `${design.title_position_y || 40}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center space-x-4">
              <h1 className={`${getTitleSize()} font-light tracking-wide`}>
                {store.store_name}
              </h1>
              <span className={`px-3 py-1 text-xs uppercase tracking-wider font-medium rounded-full ${
                store.is_open 
                  ? 'bg-green-500/20 text-green-100 border border-green-400/30'
                  : 'bg-red-500/20 text-red-100 border border-red-400/30'
              }`}>
                {store.is_open ? '영업중' : '영업종료'}
              </span>
            </div>
          </div>
          
          {/* 상점 설명 */}
          {design.show_store_description && (
            <div 
              className="absolute text-white"
              style={{
                left: `${design.description_position_x || 50}%`,
                top: `${design.description_position_y || 60}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <p className={`text-center text-gray-200 ${getDescriptionSize()} max-w-2xl leading-relaxed`}>
                {store.store_description}
              </p>
            </div>
          )}
        </div>
      </div>

      {/* 상점 상세 정보 */}
      <div className="bg-white border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-6 md:space-y-0">
            {/* 상점 메타 정보 */}
            <div className="flex flex-wrap items-center gap-6 text-sm text-gray-600">
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>총 {products.length}개 제품</span>
              </div>
              <div className="flex items-center relative">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setShowInfoPopup(showInfoPopup === 'info' ? null : 'info');
                  }}
                  className="flex items-center hover:text-gray-800 transition-colors"
                >
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </button>
                {showInfoPopup === 'info' && (
                  <div className="absolute bottom-full left-0 mb-2 bg-black text-white text-xs px-3 py-2 rounded shadow-lg whitespace-nowrap z-10">
                    <div className="space-y-1">
                      <div>주소: {store.store_address}</div>
                      {design.show_contact_info && store.store_phone && (
                        <div>전화번호: {store.store_phone}</div>
                      )}
                      <div>가입일: {new Date(store.created_at).toLocaleDateString('ko-KR')}</div>
                    </div>
                    <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-black"></div>
                  </div>
                )}
              </div>
            </div>

            {/* 관리자 버튼 */}
            {isOwner && (
              <div className="flex items-center space-x-3">
                <Link
                  href={`/store/${store.id}/design`}
                  className="px-6 py-2 border border-gray-300 text-sm uppercase tracking-wider font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  디자인 수정
                </Link>
                <Link
                  href={`/vendor/store/edit/${store.id}`}
                  className="px-6 py-2 border border-gray-300 text-sm uppercase tracking-wider font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-300"
                >
                  상점 수정
                </Link>
                <Link
                  href={`/store/${store.id}/product/create`}
                  className="px-6 py-2 bg-gray-900 text-white text-sm uppercase tracking-wider font-medium hover:bg-gray-800 transition-colors duration-300"
                >
                  상품 등록
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* 제품 목록 섹션 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* 제품 그리드 */}
        {products.length === 0 ? (
          <div className="text-center py-20">
            <div className="w-16 h-16 mx-auto mb-6 text-gray-300">
              <svg fill="none" stroke="currentColor" viewBox="0 0 24 24" className="w-full h-full">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} 
                  d="M20 13V6a2 2 0 00-2-2H6a2 2 0 00-2 2v7m16 0v5a2 2 0 01-2 2H6a2 2 0 01-2-2v-5m16 0h-2.586a1 1 0 00-.707.293l-2.414 2.414a1 1 0 01-.707.293h-3.172a1 1 0 01-.707-.293l-2.414-2.414A1 1 0 006.586 13H4" />
              </svg>
            </div>
            <h3 className="text-xl font-light mb-3 tracking-wide" style={{ color: design.text_color }}>
              아직 등록된 제품이 없습니다
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto leading-relaxed">
              첫 번째 제품을 등록하여 고객들에게 선보이세요
            </p>
            {isOwner && (
              <Link
                href={`/store/${store.id}/product/create`}
                className="inline-block px-8 py-3 bg-gray-900 text-white text-sm uppercase tracking-widest font-medium hover:bg-gray-800 transition-colors duration-300"
              >
                제품 등록하기
              </Link>
            )}
          </div>
        ) : (
          <div className="space-y-8">
            {design.enable_custom_rows ? (
              // 커스텀 행 레이아웃
              (() => {
                const allProducts = [
                  ...(isOwner ? [{ id: 'add-product', isAddCard: true }] : []),
                  ...sortedProducts
                ];

                const rowLayouts = design.row_layouts || {};
                const rows: any[] = [];
                let productIndex = 0;

                // 각 행별로 제품 배치
                Object.entries(rowLayouts).forEach(([rowIndexStr, rowLayout]) => {
                  const rowIndex = parseInt(rowIndexStr);
                  
                  // 텍스트와 배너 레이아웃은 제품을 소비하지 않음
                  if (rowLayout.layout_type === 'text' || rowLayout.layout_type === 'banner') {
                    rows.push({
                      index: rowIndex,
                      layout: rowLayout,
                      products: []
                    });
                    return;
                  }
                  
                  // 피처드 레이아웃에 이미지가 있는 경우도 제품을 소비하지 않음
                  if (rowLayout.layout_type === 'featured' && rowLayout.featured_image_url) {
                    rows.push({
                      index: rowIndex,
                      layout: rowLayout,
                      products: []
                    });
                    return;
                  }
                  
                  // 제품을 사용하는 레이아웃의 경우
                  const productsNeeded = rowLayout.columns || 4;
                  const productsInRow = allProducts.slice(productIndex, productIndex + productsNeeded);
                  
                  if (productsInRow.length > 0 || rowLayout.layout_type === 'featured') {
                    rows.push({
                      index: rowIndex,
                      layout: rowLayout,
                      products: productsInRow
                    });
                    productIndex += productsNeeded;
                  }
                });

                return rows.map((row) => {
                  const { layout, products: rowProducts } = row;
                  
                  // 간격 설정
                  const gapClass = layout.spacing === 'none' ? 'gap-0' :
                                 layout.spacing === 'tight' ? 'gap-2' : 
                                 layout.spacing === 'loose' ? 'gap-8' : 
                                 layout.spacing === 'extra-loose' ? 'gap-12' : 'gap-6';
                  
                  // 높이 비율 설정
                  const aspectClass = layout.height_ratio === 'portrait' ? 'aspect-[3/4]' :
                                     layout.height_ratio === 'landscape' ? 'aspect-[4/3]' :
                                     layout.height_ratio === 'auto' ? '' : 'aspect-square';
                  
                  // 컬럼 설정
                  const gridCols = layout.columns <= 4 
                    ? `grid-cols-${layout.columns}` 
                    : layout.columns === 5 
                    ? 'grid-cols-5' 
                    : 'grid-cols-6';
                  
                  // 5개, 6개 컬럼을 위한 인라인 스타일
                  const gridStyle = layout.columns > 4 ? {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`,
                    gap: layout.spacing === 'none' ? '0' :
                         layout.spacing === 'tight' ? '0.5rem' :
                         layout.spacing === 'loose' ? '2rem' :
                         layout.spacing === 'extra-loose' ? '3rem' : '1.5rem'
                  } : {};
                  
                  // 레이아웃 타입별 처리
                  if (layout.layout_type === 'text') {
                    // 텍스트 레이아웃
                    const textSizeClass = layout.text_size === 'small' ? 'text-sm' :
                                         layout.text_size === 'large' ? 'text-lg' :
                                         layout.text_size === 'xl' ? 'text-xl' :
                                         layout.text_size === 'xxl' ? 'text-2xl' : 'text-base';
                    const textWeightClass = layout.text_weight === 'medium' ? 'font-medium' :
                                          layout.text_weight === 'semibold' ? 'font-semibold' :
                                          layout.text_weight === 'bold' ? 'font-bold' : 'font-normal';
                    const textAlignClass = layout.text_alignment === 'center' ? 'text-center' :
                                         layout.text_alignment === 'right' ? 'text-right' : 'text-left';
                    const maxWidthClass = layout.max_width === 'narrow' ? 'max-w-2xl' :
                                        layout.max_width === 'wide' ? 'max-w-6xl' :
                                        layout.max_width === 'full' ? 'max-w-full' : 'max-w-4xl';
                    const paddingClass = layout.padding === 'small' ? 'py-4' :
                                       layout.padding === 'large' ? 'py-12' :
                                       layout.padding === 'xl' ? 'py-16' : 'py-8';
                    
                    return (
                      <div 
                        key={row.index} 
                        className={`${paddingClass} ${textAlignClass}`}
                        style={{ backgroundColor: layout.background_color }}
                      >
                        <div className={`${maxWidthClass} mx-auto px-4`}>
                          <div 
                            className={`${textSizeClass} ${textWeightClass} leading-relaxed whitespace-pre-wrap`}
                            style={{ color: layout.text_color || '#000000' }}
                          >
                            {layout.text_content || '텍스트를 입력하세요...'}
                          </div>
                        </div>
                      </div>
                    );
                  }

                  if (layout.layout_type === 'banner') {
                    // 배너 레이아웃
                    const bannerHeightClass = layout.banner_height === 'small' ? 'h-32' :
                                            layout.banner_height === 'large' ? 'h-64' :
                                            layout.banner_height === 'full' ? 'h-screen' : 'h-48';
                    
                    return (
                      <div 
                        key={row.index} 
                        className={`${bannerHeightClass} relative overflow-hidden flex items-center justify-center`}
                        style={{ 
                          backgroundColor: layout.background_color || '#f3f4f6',
                          backgroundImage: layout.banner_style === 'gradient' 
                            ? 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
                            : layout.banner_style === 'solid' 
                            ? 'none' 
                            : 'url("https://images.unsplash.com/photo-1441986300917-64674bd600d8?w=1200&h=400&fit=crop")',
                          backgroundSize: 'cover',
                          backgroundPosition: 'center'
                        }}
                      >
                        <div className="text-center text-white z-10">
                          <h3 className="text-2xl md:text-4xl font-bold mb-4">
                            특별 프로모션
                          </h3>
                          <p className="text-lg mb-6 opacity-90">
                            지금 구매하시면 특별 할인 혜택을 받으실 수 있습니다
                          </p>
                          {layout.call_to_action && (
                            <button className="px-8 py-3 bg-white text-gray-900 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                              {layout.call_to_action}
                            </button>
                          )}
                        </div>
                        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
                      </div>
                    );
                  }

                  if (layout.layout_type === 'featured' && layout.featured_image_url) {
                    // 피처드 이미지가 있는 경우
                    return (
                      <div 
                        key={row.index}
                        className="relative w-full cursor-pointer group overflow-hidden"
                        style={{ 
                          height: layout.featured_size === 'hero' ? '80vh' : 
                                 layout.featured_size === 'large' ? '400px' : '300px'
                        }}
                        onClick={() => {
                          if (layout.linked_product_id) {
                            router.push(`/store/${store.id}/product/${layout.linked_product_id}`);
                          }
                        }}
                      >
                        <img
                          src={layout.featured_image_url}
                          alt="Featured content"
                          className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                        />
                        
                        {/* 오버레이 */}
                        <div className="absolute inset-0 bg-black bg-opacity-20 group-hover:bg-opacity-30 transition-all duration-300"></div>
                        
                        {/* 텍스트 오버레이 */}
                        {layout.show_text_overlay && (
                          <div className={`absolute inset-0 flex ${
                            layout.overlay_position === 'top' ? 'items-start pt-8' :
                            layout.overlay_position === 'bottom' ? 'items-end pb-8' : 'items-center'
                          } justify-center`}>
                            <div className="text-center text-white z-10">
                              <h3 className="text-xl md:text-3xl font-bold mb-2">
                                {layout.linked_product_id 
                                  ? sortedProducts.find(p => p.id === layout.linked_product_id)?.product_name || '특별 제품'
                                  : '특별 제품'
                                }
                              </h3>
                              <p className="text-sm md:text-base opacity-90 mb-4">
                                {layout.linked_product_id 
                                  ? `₩${sortedProducts.find(p => p.id === layout.linked_product_id)?.price.toLocaleString() || '0'}`
                                  : '프리미엄 컬렉션'
                                }
                              </p>
                              {layout.linked_product_id && (
                                <div className="inline-flex items-center px-4 py-2 bg-white bg-opacity-20 backdrop-blur-sm border border-white border-opacity-30 text-white text-sm font-medium hover:bg-opacity-30 transition-all duration-300">
                                  자세히 보기
                                  <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                                  </svg>
                                </div>
                              )}
                            </div>
                          </div>
                        )}
                        
                        {/* 클릭 힌트 */}
                        {layout.linked_product_id && (
                          <div className="absolute top-4 right-4 bg-black bg-opacity-50 text-white px-2 py-1 text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity duration-300">
                            클릭하여 제품 보기
                          </div>
                        )}
                      </div>
                    );
                  }

                  // 일반 제품 그리드 레이아웃 (grid, list, masonry, featured without image)
                  let containerClass = '';
                  let cardClass = '';
                  
                  switch (layout.layout_type) {
                    case 'featured':
                      containerClass = `grid ${gridCols} ${gapClass}`;
                      cardClass = layout.card_style === 'large' ? 'transform hover:scale-105' : '';
                      break;
                    case 'masonry':
                      containerClass = `columns-${layout.columns} ${gapClass}`;
                      cardClass = 'break-inside-avoid mb-6';
                      break;
                    case 'list':
                      containerClass = 'space-y-4';
                      cardClass = 'flex items-center space-x-4';
                      break;
                    default:
                      containerClass = `grid ${gridCols} ${gapClass}`;
                  }

                  return (
                    <div 
                      key={row.index} 
                      className={`${containerClass} transition-all duration-300`}
                      style={{ backgroundColor: layout.background_color, ...gridStyle }}
                    >
                      {rowProducts.map((product: any) => {
                        if (product.isAddCard) {
                          return (
                            <Link key="add-product" href={`/store/${store.id}/product/create`} className={`group cursor-pointer ${cardClass}`}>
                              <div className={`bg-[#f8f8f8] border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center ${aspectClass || 'aspect-square'}`}>
                                <div className={`text-center ${layout.text_alignment === 'center' ? 'text-center' : layout.text_alignment === 'right' ? 'text-right' : 'text-left'}`}>
                                  <svg className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                                  </svg>
                                  <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium uppercase tracking-wider">
                                    제품 등록
                                  </span>
                                </div>
                              </div>
                            </Link>
                          );
                        }

                        if (layout.layout_type === 'list') {
                          return (
                            <Link key={product.id} href={`/store/${store.id}/product/${product.id}`} className={`${cardClass} p-4 border border-gray-200 hover:shadow-lg transition-shadow`}>
                              <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                                {product.product_image_url ? (
                                  <img src={product.product_image_url} alt={product.product_name} className="w-full h-full object-cover" />
                                ) : (
                                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                                    <span className="text-gray-400 text-xs">No Image</span>
                                  </div>
                                )}
                              </div>
                              <div className={`flex-1 ${layout.text_alignment === 'center' ? 'text-center' : layout.text_alignment === 'right' ? 'text-right' : 'text-left'}`}>
                                <h3 className="font-medium text-gray-900 mb-1">{product.product_name}</h3>
                                <p className="text-lg font-light text-gray-900">
                                  {product.discount_percentage ? (
                                    <>
                                      <span className="line-through text-gray-500 text-sm mr-2">
                                        ₩{product.price.toLocaleString()}
                                      </span>
                                      <span className="text-red-600">
                                        ₩{Math.round(product.price * (1 - product.discount_percentage / 100)).toLocaleString()}
                                      </span>
                                    </>
                                  ) : (
                                    `₩${product.price.toLocaleString()}`
                                  )}
                                </p>
                              </div>
                            </Link>
                          );
                        }

                        return (
                          <div key={product.id} className={cardClass}>
                            <ProductCard
                              product={product as ProductCardData}
                              variant="compact"
                              showRating={true}
                              showActions={isOwner}
                              isOwner={isOwner}
                              onEdit={() => router.push(`/store/${store.id}/product/${product.id}/edit`)}
                              onDelete={() => setDeleteProductId(product.id)}
                              customAspectRatio={aspectClass}
                              textAlignment={layout.text_alignment}
                            />
                          </div>
                        );
                      })}
                    </div>
                  );
                });
              })()
            ) : (
              // 기본 레이아웃
              (() => {
                const productsPerRow = design.products_per_row || 4;
                
                // layout_style에 따른 처리
                if (design.layout_style === 'list') {
                  return (
                    <div className="space-y-4">
                      {/* 제품 등록 카드 */}
                      {isOwner && (
                        <Link href={`/store/${store.id}/product/create`} className="group cursor-pointer">
                          <div className="flex items-center space-x-4 p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                            <div className="w-24 h-24 bg-[#f8f8f8] border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center">
                              <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                              </svg>
                            </div>
                            <div className="flex-1">
                              <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium uppercase tracking-wider">
                                제품 등록
                              </span>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      {/* 실제 제품 카드들 */}
                      {sortedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product as ProductCardData}
                          variant="compact"
                          showRating={true}
                          showActions={isOwner}
                          isOwner={isOwner}
                          onEdit={() => router.push(`/store/${store.id}/product/${product.id}/edit`)}
                          onDelete={() => setDeleteProductId(product.id)}
                        />
                      ))}
                    </div>
                  );
                } else if (design.layout_style === 'masonry') {
                  return (
                    <div className={`columns-2 md:columns-3 ${getProductSpacing()}`}>
                      {/* 제품 등록 카드 */}
                      {isOwner && (
                        <Link href={`/store/${store.id}/product/create`} className="group cursor-pointer break-inside-avoid mb-6">
                          <div className="aspect-square bg-[#f8f8f8] border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium uppercase tracking-wider">
                                제품 등록
                              </span>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      {/* 실제 제품 카드들 */}
                      {sortedProducts.map((product) => (
                        <div key={product.id} className="break-inside-avoid mb-6">
                          <ProductCard
                            product={product as ProductCardData}
                            variant="compact"
                            showRating={true}
                            showActions={isOwner}
                            isOwner={isOwner}
                            onEdit={() => router.push(`/store/${store.id}/product/${product.id}/edit`)}
                            onDelete={() => setDeleteProductId(product.id)}
                          />
                        </div>
                      ))}
                    </div>
                  );
                } else {
                  // grid 레이아웃 (기본)
                  // 인라인 스타일로 확실한 적용 보장
                  const gridStyle = {
                    display: 'grid',
                    gridTemplateColumns: `repeat(${productsPerRow}, minmax(0, 1fr))`,
                    gap: design.product_spacing === 'none' ? '0' :
                         design.product_spacing === 'tight' ? '0.5rem' :
                         design.product_spacing === 'loose' ? '2rem' :
                         design.product_spacing === 'extra-loose' ? '3rem' : '1.5rem'
                  };
                  
                  console.log('Grid Style Applied:', gridStyle);
                  console.log('Products per row:', productsPerRow);

                  return (
                    <div style={gridStyle}>
                      {/* 제품 등록 카드 */}
                      {isOwner && (
                        <Link href={`/store/${store.id}/product/create`} className="group cursor-pointer">
                          <div className="aspect-square bg-[#f8f8f8] border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center">
                            <div className="text-center">
                              <svg className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                              </svg>
                              <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium uppercase tracking-wider">
                                제품 등록
                              </span>
                            </div>
                          </div>
                        </Link>
                      )}
                      
                      {/* 실제 제품 카드들 */}
                      {sortedProducts.map((product) => (
                        <ProductCard
                          key={product.id}
                          product={product as ProductCardData}
                          variant={design.product_card_style as any}
                          showRating={true}
                          showActions={isOwner}
                          isOwner={isOwner}
                          onEdit={() => router.push(`/store/${store.id}/product/${product.id}/edit`)}
                          onDelete={() => setDeleteProductId(product.id)}
                        />
                      ))}
                    </div>
                  );
                }
              })()
            )}
          </div>
        )}
      </div>

      {/* 추가 정보 섹션 */}
      {(design.show_contact_info || design.show_business_hours) && (
        <div className="bg-gray-50 border-t border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-12">
              {design.show_contact_info && (
                <div>
                  <h3 className="text-lg font-medium mb-6 tracking-wide" style={{ color: design.text_color }}>
                    연락처 정보
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    {store.store_phone && <p>전화: {store.store_phone}</p>}
                    <p>주소: {store.store_address}</p>
                  </div>
                </div>
              )}
              
              {design.show_business_hours && (
                <div>
                  <h3 className="text-lg font-medium mb-6 tracking-wide" style={{ color: design.text_color }}>
                    영업시간
                  </h3>
                  <div className="space-y-3 text-sm text-gray-600">
                    <p>월-금: 9:00 AM - 6:00 PM</p>
                    <p>토-일: 10:00 AM - 5:00 PM</p>
                    <p>공휴일: 휴무</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {deleteProductId && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 max-w-md w-full rounded-lg shadow-xl">
            <h3 className="text-lg font-medium text-gray-900 mb-4">제품 삭제</h3>
            <p className="text-gray-600 mb-6">
              이 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setDeleteProductId(null)}
                className="px-4 py-2 border border-gray-300 text-sm font-medium text-gray-700 hover:bg-gray-50 transition-colors rounded-md"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors text-sm font-medium disabled:opacity-50 rounded-md"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 CSS 적용 */}
      {design.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: design.custom_css }} />
      )}
    </div>
  );
} 