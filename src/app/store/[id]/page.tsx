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
  }
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
        
        // 현재 사용자가 상점 소유자인지 확인
        if (user && user.id === storeData.vendor_id) {
          setIsOwner(true);
        }

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
            description_position_y: designData.description_position_y || 60
          };
          setDesign(convertedDesign);
        } else {
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
      } catch (error: any) {
        logger.error('데이터 로딩 중 오류 발생:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchStoreAndProducts();
  }, [storeId, user]);

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
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>{store.store_address}</span>
              </div>
              {design.show_contact_info && store.store_phone && (
                <div className="flex items-center">
                  <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                  <span>{store.store_phone}</span>
                </div>
              )}
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <span>제품 {products.length}개</span>
              </div>
              <div className="flex items-center">
                <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>가입일 {new Date(store.created_at).toLocaleDateString('ko-KR')}</span>
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
        {/* 섹션 헤더 */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-12 space-y-4 md:space-y-0">
          <div>
            <h2 className="text-2xl md:text-3xl font-light tracking-wide mb-2" style={{ color: design.text_color }}>
              컬렉션
            </h2>
            <p className="text-gray-600 text-sm">
              {store.store_name}에서 엄선한 {products.length}개의 제품을 만나보세요
            </p>
          </div>
          
          {/* 정렬 옵션 */}
          <div className="flex items-center space-x-4">
            <span className="text-sm text-gray-500 uppercase tracking-wider">정렬</span>
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="border-none bg-transparent text-sm font-medium uppercase tracking-wider cursor-pointer" 
              style={{ color: design.text_color }}
            >
              <option value="newest">최신순</option>
              <option value="price_asc">가격 낮은순</option>
              <option value="price_desc">가격 높은순</option>
              <option value="rating">평점순</option>
            </select>
          </div>
        </div>

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
          <div className={`grid gap-6 md:gap-8 ${
            design.layout_style === 'grid' 
              ? 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4' 
              : design.layout_style === 'list'
              ? 'grid-cols-1'
              : 'grid-cols-2 md:grid-cols-3'
          }`}>
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