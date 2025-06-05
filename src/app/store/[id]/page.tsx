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
import { BasicInlinePreviewArea, BlockWidth, DEFAULT_BLOCK_WIDTH } from '@/components/editor/BasicInlinePreviewArea';
import { redirect } from 'next/navigation';
import Image from 'next/image';
import { Metadata } from 'next';

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
      max_products?: number;
      show_text_overlay?: boolean;
      background_color?: string;
      text_alignment?: 'left' | 'center' | 'right';
      block_width?: BlockWidth;
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
      banner_title?: string;
      banner_description?: string;
      banner_image_url?: string;
      // LIST 전용 필드
      list_style?: 'horizontal' | 'vertical' | 'card';
      show_description?: boolean;
      show_price_prominent?: boolean;
      // MASONRY 전용 필드
      masonry_columns?: number;
      min_height?: 'small' | 'medium' | 'large';
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
          console.log('=== 스토어 디자인 디버깅 ===');
          console.log('Raw designData from DB:', designData);
          console.log('enable_custom_rows from DB:', designData.enable_custom_rows);
          console.log('row_layouts from DB:', designData.row_layouts);
          
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
            row_layouts: (() => {
              try {
                console.log('Processing row_layouts:', designData.row_layouts, 'type:', typeof designData.row_layouts);
                if (typeof designData.row_layouts === 'string') {
                  const parsed = JSON.parse(designData.row_layouts);
                  console.log('Parsed row_layouts:', parsed);
                  return parsed;
                } else if (typeof designData.row_layouts === 'object') {
                  console.log('Using object row_layouts:', designData.row_layouts);
                  return designData.row_layouts;
                } else {
                  console.log('No row_layouts, using empty object');
                  return {};
                }
              } catch (e) {
                console.error('Error parsing row_layouts:', e);
                return {};
              }
            })(),
            // row_layouts가 있으면 자동으로 enable_custom_rows를 true로 설정
            enable_custom_rows: (() => {
              try {
                let rowLayouts = {};
                if (typeof designData.row_layouts === 'string') {
                  rowLayouts = JSON.parse(designData.row_layouts);
                } else if (typeof designData.row_layouts === 'object') {
                  rowLayouts = designData.row_layouts || {};
                }
                
                const hasRowLayouts = Object.keys(rowLayouts).length > 0;
                const finalValue = hasRowLayouts || designData.enable_custom_rows || false;
                console.log('Enable custom rows calculation:');
                console.log('- hasRowLayouts:', hasRowLayouts);
                console.log('- designData.enable_custom_rows:', designData.enable_custom_rows);
                console.log('- finalValue:', finalValue);
                return finalValue;
              } catch (e) {
                console.error('Error determining enable_custom_rows:', e);
                return designData.enable_custom_rows || false;
              }
            })(),
            product_spacing: designData.product_spacing || 'normal'
          };
          console.log('Final converted design:', convertedDesign);
          console.log('Final enable_custom_rows:', convertedDesign.enable_custom_rows);
          console.log('Final row_layouts:', convertedDesign.row_layouts);
          console.log('=== 디버깅 종료 ===');
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
      {/* 제품 목록 섹션 */}
        {products.length === 0 ? (
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
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
          </div>
        ) : (
          <div className="space-y-8">
            {design.enable_custom_rows ? (
            <>
              <div className="store-preview-readonly">
                <BasicInlinePreviewArea 
                  storeId={storeId}
                  design={design}
                  onDesignUpdate={() => {}}
                  products={sortedProducts}
                  storeData={store}
                  onSelectedBlockChange={undefined}
                  readOnly={true}
                              />
                            </div>
              

            </>
            ) : (
              // 기본 레이아웃
            <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
              <>
                <div className={`grid ${getProductSpacing()}`}
                     style={{
                       gridTemplateColumns: `repeat(${design.products_per_row || 4}, minmax(0, 1fr))`
                     }}>
                      {isOwner && (
                    <Link
                      href={`/store/${store.id}/product/create`}
                      className="group aspect-square border-2 border-dashed border-gray-300 hover:border-gray-400 flex flex-col items-center justify-center p-6 text-gray-500 hover:text-gray-600 transition-colors bg-gray-50 hover:bg-gray-100"
                    >
                      <svg className="w-12 h-12 mb-3 text-gray-400 group-hover:text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                      <span className="text-sm font-light tracking-wide">새 제품 추가</span>
                        </Link>
                      )}
                      {sortedProducts.map((product) => (
                    <Link
                          key={product.id}
                      href={`/store/${store.id}/product/${product.id}`}
                      className="block"
                    >
                          <ProductCard
                        product={{
                          id: product.id,
                          store_id: product.store_id,
                          product_name: product.product_name,
                          product_description: product.product_description,
                          product_image_url: product.product_image_url,
                          price: product.price,
                          stock: product.stock,
                          is_available: product.is_available,
                          created_at: product.created_at,
                          total_sales: product.total_sales,
                          average_rating: product.average_rating,
                          discount_percentage: product.discount_percentage,
                          category: product.category
                        }}
                        variant={design.product_card_style || 'default'}
                            showActions={isOwner}
                            isOwner={isOwner}
                        onEdit={isOwner ? () => router.push(`/store/${store.id}/product/edit/${product.id}`) : undefined}
                        onDelete={isOwner ? () => setDeleteProductId(product.id) : undefined}
                          />
                    </Link>
                      ))}
                    </div>
                

              </>
                            </div>
          )}
                    </div>
            )}

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

      {/* DIOR 스타일 상점 관리 메뉴 (소유자만) */}
      {isOwner && (
        <div className="fixed bottom-8 right-8 z-50">
          {/* 메인 관리 버튼 */}
          <div className="group">
            {/* 호버 시 나타나는 메뉴들 */}
            <div className="absolute bottom-20 left-1/2 transform -translate-x-1/2 mb-4 opacity-0 group-hover:opacity-100 translate-y-2 group-hover:translate-y-0 transition-all duration-300 ease-out space-y-1">
              
              {/* 상품 등록 */}
              <div className="relative">
                <Link
                  href={`/store/${store.id}/product/create`}
                  className="flex items-center justify-center px-6 py-4 bg-white text-black border border-gray-100 hover:border-black font-light transition-all duration-300 group/item w-[140px]"
                >
                  <span className="text-xs font-light tracking-[0.15em] uppercase text-center w-full">NEW PRODUCT</span>
                </Link>
              </div>

              {/* 디자인 수정 */}
              <div className="relative">
                <Link
                  href={`/store/${store.id}/design`}
                  className="flex items-center justify-center px-6 py-4 bg-white text-black border border-gray-100 hover:border-black font-light transition-all duration-300 group/item w-[140px]"
                >
                  <span className="text-xs font-light tracking-[0.15em] uppercase text-center w-full">DESIGN</span>
                </Link>
              </div>

              {/* 상점 설정 */}
              <div className="relative">
                <Link
                  href={`/vendor/store/edit/${store.id}`}
                  className="flex items-center justify-center px-6 py-4 bg-white text-black border border-gray-100 hover:border-black font-light transition-all duration-300 group/item w-[140px]"
                >
                  <span className="text-xs font-light tracking-[0.15em] uppercase text-center w-full">SETTINGS</span>
                </Link>
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
                Management
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 커스텀 CSS 적용 */}
      {design.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: design.custom_css }} />
      )}
      
      {/* 읽기 전용 스토어 미리보기 스타일 */}
      <style jsx>{`
        .store-preview-readonly {
          /* 편집 UI 요소들 숨기기 */
        }
        
        /* contained 블록은 적절한 컨테이너와 패딩 유지 */
        .store-preview-readonly :global(.inline-block:not([style*="calc(100% + 4rem)"])) {
          max-width: 1280px; /* max-w-7xl equivalent */
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem; /* px-4 equivalent */
          padding-right: 1rem;
        }
        
        /* 중간 이상 화면에서 패딩 증가 */
        @media (min-width: 640px) {
          .store-preview-readonly :global(.inline-block:not([style*="calc(100% + 4rem)"])) {
            padding-left: 1.5rem; /* sm:px-6 equivalent */
            padding-right: 1.5rem;
          }
        }
        
        @media (min-width: 1024px) {
          .store-preview-readonly :global(.inline-block:not([style*="calc(100% + 4rem)"])) {
            padding-left: 2rem; /* lg:px-8 equivalent */
            padding-right: 2rem;
          }
        }
        
        /* full-width 블록은 화면 전체 너비 사용 */
        .store-preview-readonly :global([style*="calc(100% + 4rem)"]) {
          width: 100vw !important;
          margin-left: calc(-50vw + 50%) !important;
          margin-right: calc(-50vw + 50%) !important;
          max-width: none !important;
          transition: margin-left 0.3s ease, margin-right 0.3s ease !important;
        }
        
        .store-preview-readonly :global(.block-add-button),
        .store-preview-readonly :global(.block-toolbar),
        .store-preview-readonly :global(.block-controls),
        .store-preview-readonly :global(.edit-overlay),
        .store-preview-readonly :global(.drag-handle),
        .store-preview-readonly :global(.block-menu),
        .store-preview-readonly :global([data-testid="block-toolbar"]),
        .store-preview-readonly :global([class*="toolbar"]),
        .store-preview-readonly :global([class*="controls"]),
        .store-preview-readonly :global([class*="edit-"]) {
          display: none !important;
        }
        
        /* 제품 카드는 클릭 가능하게 유지 */
        .store-preview-readonly :global(a),
        .store-preview-readonly :global(button:not([class*="edit"]):not([class*="toolbar"]):not([class*="control"])),
        .store-preview-readonly :global([role="button"]:not([class*="edit"]):not([class*="toolbar"])) {
          pointer-events: auto !important;
        }
        
        /* 블록 선택 방지 */
        .store-preview-readonly :global(.inline-block) {
          cursor: default !important;
        }
        
        .store-preview-readonly :global(.inline-block):hover {
          box-shadow: none !important;
          border: none !important;
        }
      `}</style>
    </div>
  );
} 