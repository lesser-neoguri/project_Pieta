'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

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
      layout_type: 'grid' | 'list' | 'masonry' | 'featured' | 'banner';
      columns: number; // 1-6 컬럼
      card_style: 'default' | 'compact' | 'detailed' | 'large';
      spacing: 'tight' | 'normal' | 'loose' | 'extra-loose';
      height_ratio?: 'square' | 'portrait' | 'landscape' | 'auto';
      show_text_overlay?: boolean;
      background_color?: string;
      text_alignment?: 'left' | 'center' | 'right';
    };
  };
  products_per_row?: number; // 기본 행당 제품 수
  enable_custom_rows?: boolean; // 커스텀 행 레이아웃 활성화
  // 상품 간격 설정 추가
  product_spacing?: 'tight' | 'normal' | 'loose' | 'extra-loose';
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
  // 새로운 기본값들
  row_layouts: {
    0: {
      layout_type: 'featured',
      columns: 1,
      card_style: 'large',
      spacing: 'normal',
      height_ratio: 'landscape',
      show_text_overlay: true,
      text_alignment: 'center'
    },
    1: {
      layout_type: 'grid',
      columns: 4,
      card_style: 'default',
      spacing: 'normal',
      height_ratio: 'square',
      text_alignment: 'left'
    },
    2: {
      layout_type: 'grid',
      columns: 3,
      card_style: 'detailed',
      spacing: 'loose',
      height_ratio: 'portrait',
      text_alignment: 'center'
    }
  },
  products_per_row: 4,
  enable_custom_rows: false,
  product_spacing: 'normal'
};

export default function StoreDesignForm({ storeId }: { storeId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [design, setDesign] = useState<StoreDesign>(defaultDesign as StoreDesign);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  useEffect(() => {
    const fetchStoreData = async () => {
      if (!user) return;

      try {
        // 상점 정보 가져오기
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) {
          if (storeError.code === 'PGRST116') {
            setMessage({
              text: '존재하지 않는 상점입니다.',
              type: 'error'
            });
          } else {
            throw storeError;
          }
          return;
        }

        if (store.vendor_id !== user.id) {
          setMessage({
            text: '해당 상점을 수정할 권한이 없습니다.',
            type: 'error'
          });
          return;
        }

        setStoreData(store);

        // 상점의 제품들 가져오기
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .order('created_at', { ascending: false })
          .limit(8); // 미리보기용으로 8개만

        if (productsError) throw productsError;
        setProducts(productsData || []);

        // 기존 디자인 설정 가져오기
        const { data: existingDesign, error: designError } = await supabase
          .from('store_designs')
          .select('*')
          .eq('store_id', storeId)
          .single();

        if (designError && designError.code !== 'PGRST116') {
          throw designError;
        }

        if (existingDesign) {
          // 기존 데이터가 있으면 새로운 구조에 맞게 변환
          const convertedDesign = {
            ...existingDesign,
            title_position_x: existingDesign.title_position_x || 50,
            title_position_y: existingDesign.title_position_y || 40,
            description_position_x: existingDesign.description_position_x || 50,
            description_position_y: existingDesign.description_position_y || 60,
            // 새로운 필드들 처리 - 타입 변환 명시적 처리
            row_layouts: existingDesign.row_layouts || defaultDesign.row_layouts,
            products_per_row: typeof existingDesign.products_per_row === 'string' 
              ? parseInt(existingDesign.products_per_row) 
              : (existingDesign.products_per_row || 4),
            enable_custom_rows: existingDesign.enable_custom_rows || false,
            product_spacing: existingDesign.product_spacing || 'normal'
          };
          setDesign(convertedDesign);
        } else {
          setDesign({ ...defaultDesign, store_id: storeId });
        }
      } catch (error: any) {
        logger.error('데이터 로딩 중 오류 발생:', error);
        setMessage({
          text: '데이터를 불러오는 중 오류가 발생했습니다.',
          type: 'error'
        });
      }
    };

    fetchStoreData();
  }, [user, storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !storeData) {
      setMessage({
        text: '로그인이 필요합니다.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const designData = {
        store_id: storeId,
        theme_color: design.theme_color,
        accent_color: design.accent_color,
        background_color: design.background_color,
        text_color: design.text_color,
        font_family: design.font_family,
        layout_style: design.layout_style,
        header_style: design.header_style,
        product_card_style: design.product_card_style,
        show_store_description: design.show_store_description,
        show_contact_info: design.show_contact_info,
        show_business_hours: design.show_business_hours,
        banner_height: design.banner_height,
        logo_position: design.logo_position,
        title_font_size: design.title_font_size,
        description_font_size: design.description_font_size,
        banner_image_url: design.banner_image_url || '',
        custom_css: design.custom_css || '',
        title_position_x: design.title_position_x,
        title_position_y: design.title_position_y,
        description_position_x: design.description_position_x,
        description_position_y: design.description_position_y,
        text_overlay_settings: design.text_overlay_settings,
        // 새로운 필드들 추가
        row_layouts: design.row_layouts || {},
        products_per_row: design.products_per_row || 4,
        enable_custom_rows: design.enable_custom_rows || false,
        product_spacing: design.product_spacing || 'normal'
      };

      let result;
      
      if (design.id) {
        // 기존 디자인 업데이트
        result = await supabase
          .from('store_designs')
          .update(designData)
          .eq('id', design.id);
      } else {
        // 새 디자인 생성
        result = await supabase
          .from('store_designs')
          .insert([designData]);
      }

      if (result.error) {
        throw result.error;
      }

      setMessage({
        text: '상점 디자인이 성공적으로 저장되었습니다.',
        type: 'success'
      });

      // 성공 후 상점 페이지로 이동
      setTimeout(() => {
        router.push(`/store/${storeId}`);
      }, 2000);
    } catch (error: any) {
      console.error('디자인 저장 중 오류 발생:', error);
      logger.error('디자인 저장 중 오류 발생:', error);
      setMessage({
        text: `디자인 저장 실패: ${error.message || JSON.stringify(error) || '알 수 없는 오류'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateDesign = (field: keyof StoreDesign, value: any) => {
    setDesign(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 사용자 인증 확인
    if (!user) {
      setMessage({
        text: '이미지 업로드를 위해 로그인이 필요합니다.',
        type: 'error'
      });
      return;
    }

    // 파일 크기 체크 (5MB 제한)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({
        text: '파일 크기는 5MB 이하여야 합니다.',
        type: 'error'
      });
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setMessage({
        text: '이미지 파일만 업로드 가능합니다.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setMessage(null);
    
    try {
      const fileExt = file.name.split('.').pop();
      const fileName = `banners/banner-${storeId}-${Date.now()}.${fileExt}`;
      
      console.log('Uploading file:', fileName, 'Size:', file.size, 'Type:', file.type);
      
      const { data, error } = await supabase.storage
        .from('images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (error) {
        console.error('Storage upload error:', error);
        throw new Error(`Storage error: ${error.message}`);
      }

      console.log('Upload successful:', data);

      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(fileName);

      console.log('Public URL:', publicUrl);

      updateDesign('banner_image_url', publicUrl);
      
      setMessage({
        text: '배경 이미지가 업로드되었습니다.',
        type: 'success'
      });
    } catch (error: any) {
      console.error('이미지 업로드 중 오류 발생:', error);
      setMessage({
        text: `이미지 업로드 실패: ${error.message || '알 수 없는 오류'}`,
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const removeBannerImage = () => {
    updateDesign('banner_image_url', '');
    setMessage({
      text: '배경 이미지가 제거되었습니다.',
      type: 'success'
    });
  };

  if (message && (message.text === '존재하지 않는 상점입니다.' || 
                 message.text === '해당 상점을 수정할 권한이 없습니다.')) {
    return (
      <div className="bg-white">
        <div className="text-center space-y-8">
          <div className={`inline-block px-8 py-4 border ${
            message.type === 'success' 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            <p className="font-light text-sm tracking-wide">
              {message.text}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 border border-gray-900 text-gray-900 bg-white hover:bg-gray-900 hover:text-white transition-all duration-300 text-sm tracking-wider uppercase font-light"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

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
      case 'tight': return 'gap-2 md:gap-3';
      case 'normal': return 'gap-6 md:gap-8';
      case 'loose': return 'gap-8 md:gap-12';
      case 'extra-loose': return 'gap-12 md:gap-16';
      default: return 'gap-6 md:gap-8';
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 토글 버튼 */}
      <div className={`fixed top-4 z-50 transition-all duration-300 ${
        sidebarOpen ? 'left-80' : 'left-4'
      }`}>
        <div className="group">
          <button
            onClick={() => setSidebarOpen(!sidebarOpen)}
            className="relative p-4 bg-white shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300 overflow-hidden"
          >
            {/* 배경 그라데이션 효과 */}
            <div className="absolute inset-0 bg-gradient-to-r from-gray-50 to-white opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
            
            {/* 아이콘과 텍스트 컨테이너 */}
            <div className="relative flex items-center space-x-3">
              {/* 토글 아이콘 */}
              <div className="flex-shrink-0">
                <svg className="w-5 h-5 text-gray-700 group-hover:text-gray-900 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  {sidebarOpen ? (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
                  ) : (
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
                  )}
                </svg>
              </div>
              
              {/* 텍스트 레이블 (닫혀있을 때만 표시) */}
              {!sidebarOpen && (
                <div className="flex flex-col items-start">
                  <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                    Design Studio
                  </span>
                  <span className="text-xs text-gray-500 font-light">
                    Customize Store
                  </span>
                </div>
              )}
            </div>
            
            {/* 하단 장식 라인 */}
            <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          </button>
          
          {/* 닫혀있을 때 추가 힌트 */}
          {!sidebarOpen && (
            <div className="mt-2 px-4 py-2 bg-gray-900 text-white text-xs rounded shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-300">
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="font-light tracking-wide">Live Preview Active</span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 디자인 설정 사이드바 */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-2xl border-r border-gray-200 transition-transform duration-300 z-40 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-80 overflow-y-auto`}>
        <div className="p-6">
          {/* 헤더 섹션 */}
          <div className="text-center mb-8 pb-6 border-b border-gray-100">
            <div className="mb-4">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-900 to-gray-700 rounded-full flex items-center justify-center mb-3">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h2 className="text-xl font-light text-gray-900 tracking-wider uppercase mb-1">
                Design Studio
              </h2>
              <p className="text-xs text-gray-500 font-light tracking-wide">
                Craft Your Brand Experience
              </p>
            </div>
            <div className="w-16 h-px bg-gradient-to-r from-transparent via-gray-400 to-transparent mx-auto"></div>
          </div>
          
          {message && (
            <div className="mb-6">
              <div className={`px-4 py-3 border text-sm ${
                message.type === 'success' 
                  ? 'border-green-200 bg-green-50 text-green-700' 
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            </div>
          )}
          
          <form onSubmit={handleSubmit} className="space-y-8">
            {/* 색상 설정 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Colors
              </h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                    테마 컬러
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={design.theme_color}
                      onChange={(e) => updateDesign('theme_color', e.target.value)}
                      className="w-8 h-8 border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={design.theme_color}
                      onChange={(e) => updateDesign('theme_color', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                    강조 컬러
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={design.accent_color}
                      onChange={(e) => updateDesign('accent_color', e.target.value)}
                      className="w-8 h-8 border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={design.accent_color}
                      onChange={(e) => updateDesign('accent_color', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                    배경 컬러
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={design.background_color}
                      onChange={(e) => updateDesign('background_color', e.target.value)}
                      className="w-8 h-8 border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={design.background_color}
                      onChange={(e) => updateDesign('background_color', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
                
                <div>
                  <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                    텍스트 컬러
                  </label>
                  <div className="flex items-center space-x-2">
                    <input
                      type="color"
                      value={design.text_color}
                      onChange={(e) => updateDesign('text_color', e.target.value)}
                      className="w-8 h-8 border border-gray-200 cursor-pointer"
                    />
                    <input
                      type="text"
                      value={design.text_color}
                      onChange={(e) => updateDesign('text_color', e.target.value)}
                      className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* 레이아웃 설정 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Layout
              </h3>
              
              <div>
                <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                  폰트
                </label>
                <select
                  value={design.font_family}
                  onChange={(e) => updateDesign('font_family', e.target.value)}
                  className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                >
                  <option value="Inter">Inter</option>
                  <option value="Helvetica">Helvetica</option>
                  <option value="Arial">Arial</option>
                  <option value="Times New Roman">Times New Roman</option>
                  <option value="Georgia">Georgia</option>
                  <option value="Playfair Display">Playfair Display</option>
                  <option value="Montserrat">Montserrat</option>
                </select>
              </div>
              
              {/* 커스텀 행 레이아웃 활성화 */}
              <div>
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={design.enable_custom_rows || false}
                    onChange={(e) => updateDesign('enable_custom_rows', e.target.checked)}
                    className="w-3 h-3 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-1"
                  />
                  <span className="ml-2 text-xs text-gray-700 uppercase tracking-wide">
                    각 층별 레이아웃 설정
                  </span>
                </label>
              </div>

              {/* 기본 레이아웃 설정 (커스텀 행이 비활성화된 경우) */}
              {!design.enable_custom_rows && (
                <>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                      제품 레이아웃
                    </label>
                    <div className="grid grid-cols-3 gap-1">
                      {['grid', 'list', 'masonry'].map((style) => (
                        <button
                          key={style}
                          type="button"
                          onClick={() => updateDesign('layout_style', style)}
                          className={`p-2 border text-xs uppercase transition-all ${
                            design.layout_style === style
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {style}
                        </button>
                      ))}
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                      행당 제품 수
                    </label>
                    <select
                      value={design.products_per_row || 4}
                      onChange={(e) => updateDesign('products_per_row', parseInt(e.target.value))}
                      className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                    >
                      <option value={2}>2개</option>
                      <option value={3}>3개</option>
                      <option value={4}>4개</option>
                      <option value={5}>5개</option>
                      <option value={6}>6개</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                      상품 간격
                    </label>
                    <div className="grid grid-cols-2 gap-1">
                      {[
                        { value: 'tight', label: '좁게' },
                        { value: 'normal', label: '보통' },
                        { value: 'loose', label: '넓게' },
                        { value: 'extra-loose', label: '더 넓게' }
                      ].map(({ value, label }) => (
                        <button
                          key={value}
                          type="button"
                          onClick={() => updateDesign('product_spacing', value)}
                          className={`p-2 border text-xs uppercase transition-all ${
                            design.product_spacing === value
                              ? 'border-gray-900 bg-gray-900 text-white'
                              : 'border-gray-200 text-gray-600 hover:border-gray-400'
                          }`}
                        >
                          {label}
                        </button>
                      ))}
                    </div>
                  </div>
                </>
              )}

              {/* 커스텀 행 레이아웃 설정 */}
              {design.enable_custom_rows && (
                <div className="space-y-4">
                  <div className="text-xs text-gray-500 uppercase tracking-wide mb-3">
                    각 층별 레이아웃 설정
                  </div>
                  
                  {/* 행 추가/제거 버튼 */}
                  <div className="flex space-x-2 mb-4">
                    <button
                      type="button"
                      onClick={() => {
                        const currentLayouts = design.row_layouts || {};
                        const newRowIndex = Object.keys(currentLayouts).length;
                        updateDesign('row_layouts', {
                          ...currentLayouts,
                          [newRowIndex]: {
                            layout_type: 'grid',
                            columns: 4,
                            card_style: 'default',
                            spacing: 'normal',
                            height_ratio: 'square',
                            text_alignment: 'left'
                          }
                        });
                      }}
                      className="px-3 py-1 text-xs border border-gray-300 text-gray-600 hover:border-gray-400 hover:text-gray-800 transition-colors uppercase tracking-wide"
                    >
                      + 행 추가
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        const currentLayouts = design.row_layouts || {};
                        const keys = Object.keys(currentLayouts);
                        if (keys.length > 1) {
                          const lastKey = keys[keys.length - 1];
                          const newLayouts = { ...currentLayouts };
                          delete newLayouts[parseInt(lastKey)];
                          updateDesign('row_layouts', newLayouts);
                        }
                      }}
                      className="px-3 py-1 text-xs border border-red-300 text-red-600 hover:border-red-400 hover:text-red-800 transition-colors uppercase tracking-wide"
                    >
                      - 행 제거
                    </button>
                  </div>

                  {/* 각 행 설정 */}
                  {Object.entries(design.row_layouts || {}).map(([rowIndex, rowLayout]) => (
                    <div key={rowIndex} className="border border-gray-200 p-3 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-medium text-gray-700 uppercase tracking-wide">
                          {parseInt(rowIndex) + 1}번째 층
                        </span>
                        <button
                          type="button"
                          onClick={() => {
                            const currentLayouts = design.row_layouts || {};
                            const newLayouts = { ...currentLayouts };
                            delete newLayouts[parseInt(rowIndex)];
                            // 인덱스 재정렬
                            const reorderedLayouts: any = {};
                            Object.values(newLayouts).forEach((layout, index) => {
                              reorderedLayouts[index] = layout;
                            });
                            updateDesign('row_layouts', reorderedLayouts);
                          }}
                          className="text-xs text-red-500 hover:text-red-700 transition-colors"
                        >
                          삭제
                        </button>
                      </div>
                      
                      {/* 레이아웃 타입 */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">레이아웃 타입</label>
                        <select
                          value={rowLayout.layout_type}
                          onChange={(e) => {
                            const currentLayouts = design.row_layouts || {};
                            updateDesign('row_layouts', {
                              ...currentLayouts,
                              [rowIndex]: {
                                ...rowLayout,
                                layout_type: e.target.value as any
                              }
                            });
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="grid">그리드</option>
                          <option value="list">리스트</option>
                          <option value="masonry">메이슨리</option>
                          <option value="featured">피처드</option>
                          <option value="banner">배너</option>
                        </select>
                      </div>
                      
                      {/* 컬럼 수 */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">컬럼 수</label>
                        <select
                          value={rowLayout.columns}
                          onChange={(e) => {
                            const currentLayouts = design.row_layouts || {};
                            updateDesign('row_layouts', {
                              ...currentLayouts,
                              [rowIndex]: {
                                ...rowLayout,
                                columns: parseInt(e.target.value)
                              }
                            });
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value={1}>1개</option>
                          <option value={2}>2개</option>
                          <option value={3}>3개</option>
                          <option value={4}>4개</option>
                          <option value={5}>5개</option>
                          <option value={6}>6개</option>
                        </select>
                      </div>
                      
                      {/* 카드 스타일 */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">카드 스타일</label>
                        <select
                          value={rowLayout.card_style}
                          onChange={(e) => {
                            const currentLayouts = design.row_layouts || {};
                            updateDesign('row_layouts', {
                              ...currentLayouts,
                              [rowIndex]: {
                                ...rowLayout,
                                card_style: e.target.value as any
                              }
                            });
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="default">기본</option>
                          <option value="compact">컴팩트</option>
                          <option value="detailed">상세</option>
                          <option value="large">대형</option>
                        </select>
                      </div>
                      
                      {/* 간격 */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">간격</label>
                        <div className="grid grid-cols-2 gap-1">
                          {['tight', 'normal', 'loose', 'extra-loose'].map((spacing) => (
                            <button
                              key={spacing}
                              type="button"
                              onClick={() => {
                                const currentLayouts = design.row_layouts || {};
                                updateDesign('row_layouts', {
                                  ...currentLayouts,
                                  [rowIndex]: {
                                    ...rowLayout,
                                    spacing: spacing as any
                                  }
                                });
                              }}
                              className={`p-1 border text-xs transition-all ${
                                rowLayout.spacing === spacing
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}
                            >
                              {spacing === 'tight' ? '좁게' : spacing === 'normal' ? '보통' : spacing === 'loose' ? '넓게' : '더 넓게'}
                            </button>
                          ))}
                        </div>
                      </div>
                      
                      {/* 높이 비율 */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">높이 비율</label>
                        <select
                          value={rowLayout.height_ratio || 'square'}
                          onChange={(e) => {
                            const currentLayouts = design.row_layouts || {};
                            updateDesign('row_layouts', {
                              ...currentLayouts,
                              [rowIndex]: {
                                ...rowLayout,
                                height_ratio: e.target.value as any
                              }
                            });
                          }}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="square">정사각형</option>
                          <option value="portrait">세로형</option>
                          <option value="landscape">가로형</option>
                          <option value="auto">자동</option>
                        </select>
                      </div>
                      
                      {/* 텍스트 정렬 */}
                      <div>
                        <label className="block text-xs text-gray-500 mb-1">텍스트 정렬</label>
                        <div className="grid grid-cols-3 gap-1">
                          {['left', 'center', 'right'].map((alignment) => (
                            <button
                              key={alignment}
                              type="button"
                              onClick={() => {
                                const currentLayouts = design.row_layouts || {};
                                updateDesign('row_layouts', {
                                  ...currentLayouts,
                                  [rowIndex]: {
                                    ...rowLayout,
                                    text_alignment: alignment as any
                                  }
                                });
                              }}
                              className={`p-1 border text-xs transition-all ${
                                rowLayout.text_alignment === alignment
                                  ? 'border-gray-900 bg-gray-900 text-white'
                                  : 'border-gray-200 text-gray-600 hover:border-gray-400'
                              }`}
                            >
                              {alignment === 'left' ? '왼쪽' : alignment === 'center' ? '가운데' : '오른쪽'}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
              
              <div>
                <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                  배너 높이
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {['small', 'medium', 'large'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateDesign('banner_height', size)}
                      className={`p-2 border text-xs uppercase transition-all ${
                        design.banner_height === size
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                  로고 위치
                </label>
                <div className="grid grid-cols-3 gap-1">
                  {['left', 'center', 'right'].map((position) => (
                    <button
                      key={position}
                      type="button"
                      onClick={() => updateDesign('logo_position', position)}
                      className={`p-2 border text-xs uppercase transition-all ${
                        design.logo_position === position
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {position}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                  상점명 크기
                </label>
                <div className="grid grid-cols-4 gap-1">
                  {['small', 'medium', 'large', 'xl'].map((size) => (
                    <button
                      key={size}
                      type="button"
                      onClick={() => updateDesign('title_font_size', size)}
                      className={`p-2 border text-xs uppercase transition-all ${
                        design.title_font_size === size
                          ? 'border-gray-900 bg-gray-900 text-white'
                          : 'border-gray-200 text-gray-600 hover:border-gray-400'
                      }`}
                    >
                      {size}
                    </button>
                  ))}
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                  텍스트 위치 조정
                </label>
                <div className="space-y-4">
                  {/* 상점명 위치 */}
                  <div className="space-y-2">
                    <span className="text-xs text-gray-500">상점명 위치</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">X (좌우)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(design.title_position_x || 50)}
                          onChange={(e) => updateDesign('title_position_x', parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">{design.title_position_x || 50}%</span>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Y (상하)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(design.title_position_y || 50)}
                          onChange={(e) => updateDesign('title_position_y', parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">{design.title_position_y || 50}%</span>
                      </div>
                    </div>
                  </div>
                  
                  {/* 설명 위치 */}
                  <div className="space-y-2">
                    <span className="text-xs text-gray-500">설명 위치</span>
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="text-xs text-gray-400">X (좌우)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(design.description_position_x || 50)}
                          onChange={(e) => updateDesign('description_position_x', parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">{design.description_position_x || 50}%</span>
                      </div>
                      <div>
                        <label className="text-xs text-gray-400">Y (상하)</label>
                        <input
                          type="range"
                          min="0"
                          max="100"
                          value={(design.description_position_y || 50)}
                          onChange={(e) => updateDesign('description_position_y', parseInt(e.target.value))}
                          className="w-full h-1 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                        />
                        <span className="text-xs text-gray-400">{design.description_position_y || 50}%</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 배경 이미지 설정 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Banner Image
              </h3>
              
              <div className="space-y-3">
                {design.banner_image_url ? (
                  <div className="space-y-3">
                    <div className="relative">
                      <img
                        src={design.banner_image_url}
                        alt="Banner preview"
                        className="w-full h-20 object-cover border border-gray-200"
                      />
                      <button
                        type="button"
                        onClick={removeBannerImage}
                        className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white text-xs flex items-center justify-center hover:bg-red-600 transition-colors"
                      >
                        ×
                      </button>
                    </div>
                    <label className="block">
                      <span className="text-xs text-gray-600 uppercase tracking-wide mb-2 block">
                        새 이미지로 변경
                      </span>
                      <input
                        type="file"
                        accept="image/*"
                        onChange={handleImageUpload}
                        className="w-full text-xs border border-gray-200 file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                      />
                    </label>
                  </div>
                ) : (
                  <label className="block">
                    <span className="text-xs text-gray-600 uppercase tracking-wide mb-2 block">
                      배경 이미지 업로드
                    </span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={handleImageUpload}
                      className="w-full text-xs border border-gray-200 file:mr-2 file:py-1 file:px-2 file:border-0 file:text-xs file:bg-gray-50 file:text-gray-700 hover:file:bg-gray-100"
                    />
                  </label>
                )}
                
                <p className="text-xs text-gray-500">
                  권장 크기: 1920x600px, 최대 5MB
                </p>
              </div>
            </div>

            {/* 표시 옵션 */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Display
              </h3>
              
              <div className="space-y-3">
                {[
                  { key: 'show_store_description', label: '상점 설명' },
                  { key: 'show_contact_info', label: '연락처 정보' },
                  { key: 'show_business_hours', label: '영업시간' }
                ].map(({ key, label }) => (
                  <label key={key} className="flex items-center">
                    <input
                      type="checkbox"
                      checked={design[key as keyof StoreDesign] as boolean}
                      onChange={(e) => updateDesign(key as keyof StoreDesign, e.target.checked)}
                      className="w-3 h-3 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-1"
                    />
                    <span className="ml-2 text-xs text-gray-700">{label}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* 커스텀 CSS */}
            <div className="space-y-4">
              <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                Custom CSS
              </h3>
              
              <textarea
                value={design.custom_css || ''}
                onChange={(e) => updateDesign('custom_css', e.target.value)}
                rows={4}
                className="w-full px-2 py-2 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none font-mono resize-none"
                placeholder="/* 커스텀 CSS */"
              />
            </div>

            {/* 액션 버튼 */}
            <div className="space-y-3 pt-4 border-t border-gray-200">
              <button
                type="submit"
                disabled={loading}
                className="w-full px-4 py-3 bg-gray-900 text-white text-xs uppercase tracking-wider font-medium hover:bg-gray-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? 'Saving...' : 'Save Design'}
              </button>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => router.push(`/store/${storeId}`)}
                  className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wide"
                >
                  Preview
                </button>
                <button
                  type="button"
                  onClick={() => setDesign({ ...defaultDesign, store_id: storeId })}
                  className="px-3 py-2 text-xs text-gray-600 hover:text-gray-900 transition-colors uppercase tracking-wide"
                >
                  Reset
                </button>
              </div>
            </div>
          </form>
        </div>
      </div>

      {/* 메인 미리보기 영역 */}
      <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}>
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
                    {storeData?.store_name || 'Store Name'}
                  </h1>
                  <span className="px-3 py-1 text-xs uppercase tracking-wider font-medium rounded-full bg-green-500/20 text-green-100 border border-green-400/30">
                    영업중
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
                    {storeData?.store_description || '상점 설명이 여기에 표시됩니다.'}
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
                    <span>{storeData?.store_address || '서울시 강남구'}</span>
                  </div>
                  {design.show_contact_info && storeData?.store_phone && (
                    <div className="flex items-center">
                      <svg className="w-4 h-4 mr-2 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                      </svg>
                      <span>{storeData.store_phone}</span>
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
                    <span>가입일 {new Date().toLocaleDateString('ko-KR')}</span>
                  </div>
                </div>

                {/* 관리자 버튼 */}
                <div className="flex items-center space-x-3">
                  <button className="px-6 py-2 border border-gray-300 text-sm uppercase tracking-wider font-medium text-gray-700 hover:bg-gray-50 transition-colors duration-300">
                    상점 수정
                  </button>
                  <button className="px-6 py-2 bg-gray-900 text-white text-sm uppercase tracking-wider font-medium hover:bg-gray-800 transition-colors duration-300">
                    상품 등록
                  </button>
                </div>
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
                  {storeData?.store_name || 'Store'}에서 엄선한 {products.length}개의 제품을 만나보세요
                </p>
              </div>
              
              {/* 정렬 옵션 */}
              <div className="flex items-center space-x-4">
                <span className="text-sm text-gray-500 uppercase tracking-wider">정렬</span>
                <select className="border-none bg-transparent text-sm font-medium uppercase tracking-wider cursor-pointer" style={{ color: design.text_color }}>
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
                <button className="inline-block px-8 py-3 bg-gray-900 text-white text-sm uppercase tracking-widest font-medium hover:bg-gray-800 transition-colors duration-300">
                  제품 등록하기
                </button>
              </div>
            ) : (
              <div className="space-y-8">
                {design.enable_custom_rows ? (
                  // 커스텀 행 레이아웃
                  (() => {
                    const allProducts = [
                      // 제품 등록 카드를 첫 번째에 추가
                      { id: 'add-product', isAddCard: true },
                      ...products,
                      // 샘플 제품들 추가
                      ...Array.from({ length: Math.max(0, 8 - products.length) }).map((_, i) => ({
                        id: `sample-${i}`,
                        product_name: `Sample Product ${i + 1}`,
                        price: 99000 + (i * 10000),
                        discount_percentage: i % 3 === 0 ? 10 : undefined,
                        product_image_url: null,
                        store_id: storeId,
                        category: 'jewelry',
                        is_available: true,
                        created_at: new Date().toISOString(),
                        isSample: true
                      }))
                    ];

                    const rowLayouts = design.row_layouts || {};
                    const rows: any[] = [];
                    let productIndex = 0;

                    // 각 행별로 제품 배치
                    Object.entries(rowLayouts).forEach(([rowIndexStr, rowLayout]) => {
                      const rowIndex = parseInt(rowIndexStr);
                      const productsInRow = allProducts.slice(productIndex, productIndex + rowLayout.columns);
                      
                      if (productsInRow.length > 0) {
                        rows.push({
                          index: rowIndex,
                          layout: rowLayout,
                          products: productsInRow
                        });
                        productIndex += rowLayout.columns;
                      }
                    });

                    return rows.map((row) => {
                      const { layout, products: rowProducts } = row;
                      
                      // 간격 설정
                      const gapClass = layout.spacing === 'tight' ? 'gap-2' : 
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
                        gridTemplateColumns: `repeat(${layout.columns}, minmax(0, 1fr))`
                      } : {};
                      
                      // 레이아웃 타입별 스타일
                      let containerClass = '';
                      let cardClass = '';
                      
                      switch (layout.layout_type) {
                        case 'featured':
                          containerClass = `grid ${gridCols} ${gapClass}`;
                          cardClass = layout.card_style === 'large' ? 'transform hover:scale-105' : '';
                          break;
                        case 'banner':
                          containerClass = `grid ${gridCols} ${gapClass}`;
                          cardClass = 'relative overflow-hidden';
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
                                <div key="add-product" className={`group cursor-pointer ${cardClass}`}>
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
                                </div>
                              );
                            }

                            if (layout.layout_type === 'list') {
                              return (
                                <div key={product.id} className={`${cardClass} p-4 border border-gray-200 hover:shadow-lg transition-shadow`}>
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
                                </div>
                              );
                            }

                            return (
                              <div key={product.id} className={cardClass}>
                                <ProductCard
                                  product={product as ProductCardData}
                                  variant={layout.card_style as any}
                                  showRating={!product.isSample}
                                  showActions={!product.isSample}
                                  isOwner={!product.isSample}
                                  onEdit={() => {}}
                                  onDelete={() => {}}
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
                          <div className="group cursor-pointer">
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
                          </div>
                          
                          {/* 실제 제품 카드들 */}
                          {products.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product as ProductCardData}
                              variant="compact"
                              showRating={true}
                              showActions={true}
                              isOwner={true}
                              onEdit={() => {}}
                              onDelete={() => {}}
                            />
                          ))}
                          
                          {/* 샘플 제품 카드들 (실제 제품이 부족할 때) */}
                          {Array.from({ length: Math.max(0, 6 - products.length) }).map((_, i) => {
                            const sampleProduct: ProductCardData = {
                              id: `sample-${i}`,
                              product_name: `Sample Product ${i + 1}`,
                              price: 99000 + (i * 10000),
                              discount_percentage: i % 3 === 0 ? 10 : undefined,
                              product_image_url: null,
                              store_id: storeId,
                              category: 'jewelry',
                              is_available: true,
                              created_at: new Date().toISOString()
                            };

                            return (
                              <ProductCard
                                key={`sample-${i}`}
                                product={sampleProduct}
                                variant="compact"
                                showRating={false}
                                showActions={false}
                                isOwner={false}
                                onEdit={() => {}}
                                onDelete={() => {}}
                              />
                            );
                          })}
                        </div>
                      );
                    } else if (design.layout_style === 'masonry') {
                      return (
                        <div className={`columns-2 md:columns-3 ${getProductSpacing()}`}>
                          {/* 제품 등록 카드 */}
                          <div className="group cursor-pointer break-inside-avoid mb-6">
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
                          </div>
                          
                          {/* 실제 제품 카드들 */}
                          {products.map((product) => (
                            <div key={product.id} className="break-inside-avoid mb-6">
                              <ProductCard
                                product={product as ProductCardData}
                                variant={design.product_card_style as any}
                                showRating={true}
                                showActions={true}
                                isOwner={true}
                                onEdit={() => {}}
                                onDelete={() => {}}
                              />
                            </div>
                          ))}
                          
                          {/* 샘플 제품 카드들 (실제 제품이 부족할 때) */}
                          {Array.from({ length: Math.max(0, 6 - products.length) }).map((_, i) => {
                            const sampleProduct: ProductCardData = {
                              id: `sample-${i}`,
                              product_name: `Sample Product ${i + 1}`,
                              price: 99000 + (i * 10000),
                              discount_percentage: i % 3 === 0 ? 10 : undefined,
                              product_image_url: null,
                              store_id: storeId,
                              category: 'jewelry',
                              is_available: true,
                              created_at: new Date().toISOString()
                            };

                            return (
                              <div key={`sample-${i}`} className="break-inside-avoid mb-6">
                                <ProductCard
                                  product={sampleProduct}
                                  variant={design.product_card_style as any}
                                  showRating={false}
                                  showActions={false}
                                  isOwner={false}
                                  onEdit={() => {}}
                                  onDelete={() => {}}
                                />
                              </div>
                            );
                          })}
                        </div>
                      );
                    } else {
                      // grid 레이아웃 (기본)
                      const gridStyle = productsPerRow > 4 ? {
                        display: 'grid',
                        gridTemplateColumns: `repeat(${productsPerRow}, minmax(0, 1fr))`,
                        gap: design.product_spacing === 'tight' ? '0.5rem' :
                             design.product_spacing === 'loose' ? '2rem' :
                             design.product_spacing === 'extra-loose' ? '3rem' : '1.5rem'
                      } : {};
                      
                      // 반응형 클래스 개선: 모바일에서도 적절한 컬럼 수 표시
                      const mobileColumns = Math.min(productsPerRow, 2); // 모바일에서는 최대 2개
                      const tabletColumns = Math.min(productsPerRow, 3); // 태블릿에서는 최대 3개
                      
                      const gridClass = productsPerRow <= 4 
                        ? `grid ${getProductSpacing()} grid-cols-${mobileColumns} sm:grid-cols-${tabletColumns} md:grid-cols-${productsPerRow}`
                        : getProductSpacing();
                      
                      return (
                        <div 
                          className={gridClass}
                          style={gridStyle}
                        >
                          {/* 제품 등록 카드 */}
                          <div className="group cursor-pointer">
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
                          </div>
                          
                          {/* 실제 제품 카드들 */}
                          {products.map((product) => (
                            <ProductCard
                              key={product.id}
                              product={product as ProductCardData}
                              variant={design.product_card_style as any}
                              showRating={true}
                              showActions={true}
                              isOwner={true}
                              onEdit={() => {}}
                              onDelete={() => {}}
                            />
                          ))}
                          
                          {/* 샘플 제품 카드들 (실제 제품이 부족할 때) */}
                          {Array.from({ length: Math.max(0, 6 - products.length) }).map((_, i) => {
                            const sampleProduct: ProductCardData = {
                              id: `sample-${i}`,
                              product_name: `Sample Product ${i + 1}`,
                              price: 99000 + (i * 10000),
                              discount_percentage: i % 3 === 0 ? 10 : undefined,
                              product_image_url: null,
                              store_id: storeId,
                              category: 'jewelry',
                              is_available: true,
                              created_at: new Date().toISOString()
                            };

                            return (
                              <ProductCard
                                key={`sample-${i}`}
                                product={sampleProduct}
                                variant={design.product_card_style as any}
                                showRating={false}
                                showActions={false}
                                isOwner={false}
                                onEdit={() => {}}
                                onDelete={() => {}}
                              />
                            );
                          })}
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
                        <p>전화: {storeData?.store_phone || '02-1234-5678'}</p>
                        <p>이메일: {storeData?.store_email || 'store@example.com'}</p>
                        <p>주소: {storeData?.store_address || '서울시 강남구'}</p>
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
        </div>
      </div>

      {/* 커스텀 CSS 적용 */}
      {design.custom_css && (
        <style dangerouslySetInnerHTML={{ __html: design.custom_css }} />
      )}
    </div>
  );
} 