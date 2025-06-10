"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';
import { BasicInlinePreviewArea, BlockWidth, DEFAULT_BLOCK_WIDTH, ContainerMaxWidth, ContainerPadding } from './editor/BasicInlinePreviewArea';
import { v4 as uuidv4 } from 'uuid';

// 기본 타입 정의
type StoreBlock = {
  id: string;
  type: 'grid' | 'list' | 'masonry' | 'featured' | 'banner' | 'text';
  position: number;
  spacing: 'tight' | 'normal' | 'loose' | 'extra-loose';
  background_color?: string;
  text_alignment?: 'left' | 'center' | 'right';
  block_width?: BlockWidth;
  columns?: number;
  card_style?: 'default' | 'compact' | 'detailed' | 'large';
  text_content?: string;
  text_size?: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
  text_color?: string;
  text_weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  text_style?: 'paragraph' | 'heading' | 'quote' | 'highlight';
  max_width?: 'narrow' | 'medium' | 'wide' | 'full';
  padding?: 'small' | 'medium' | 'large' | 'xl';
  max_products?: number;
  height?: number; // 픽셀 단위 높이
  min_height?: number; // 최소 높이
  max_height?: number; // 최대 높이
  show_store_header?: boolean; // 상점 헤더 표시 여부 (배너 블록용)
  banner_image_url?: string; // 배너 블록 이미지 URL
  height_unit?: 'px' | 'vh' | 'visible'; // 높이 단위 선택
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
  banner_height: 'small' | 'medium' | 'large' | 'full';

  logo_position: 'left' | 'center' | 'right';
  title_font_size: 'small' | 'medium' | 'large' | 'xl';
  description_font_size: 'small' | 'medium' | 'large';
  enable_custom_rows?: boolean;
  row_layouts?: any;
  // 헤더 네비게이션 색상 설정 (RGBA 지원)
  navbar_background_color?: string;
  navbar_icon_color?: string;
  navbar_logo_color?: string;
  // 네비게이션 바와 콘텐츠 사이의 마진 설정
  navbar_margin_mode?: 'none' | 'navbar-height' | 'custom';
  custom_navbar_margin?: number; // 커스텀 마진 (픽셀 단위)
  // 글로벌 컨테이너 설정
  container_max_width?: number; // 퍼센트 단위 (30 ~ 100)
  container_padding?: number; // 퍼센트 단위 (0 ~ 20)
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
  enable_custom_rows: false,
  // 헤더 네비게이션 기본 색상 (RGBA 지원)
  navbar_background_color: 'rgba(255, 255, 255, 0)', // 투명 배경
  navbar_icon_color: '#FFFFFF',
  navbar_logo_color: '#FFFFFF',
  // 네비게이션 바 마진 기본값
  navbar_margin_mode: 'navbar-height', // 기본적으로 nav 바 높이만큼 마진
  custom_navbar_margin: 64, // 기본 64px
  // 글로벌 컨테이너 기본값
  container_max_width: 85, // 기본적으로 85%
  container_padding: 4 // 기본적으로 4%
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
  const [selectedBlock, setSelectedBlock] = useState<StoreBlock | null>(null);
  const [activeTab, setActiveTab] = useState<'design' | 'block'>('design');
  const [imageUploading, setImageUploading] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);



  useEffect(() => {
    const fetchStoreData = async () => {
      if (!user) return;

      try {
        const { data: store, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) {
          console.error('Store fetch error:', storeError);
          setMessage({ text: '존재하지 않는 상점입니다.', type: 'error' });
          return;
        }

        if (store.vendor_id !== user.id) {
          setMessage({ text: '해당 상점을 수정할 권한이 없습니다.', type: 'error' });
          return;
        }

        setStoreData(store);

        const { data: designData, error: designError } = await supabase
          .from('store_designs')
          .select('*')
          .eq('store_id', storeId)
          .single();

        if (designData && !designError) {
          setDesign({
            ...designData,
            row_layouts: designData.row_layouts || defaultDesign.row_layouts
          });
        }

        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_available', true)
          .order('created_at', { ascending: false });

        if (productsData && !productsError) {
          setProducts(productsData);
        }

      } catch (error) {
        console.error('Error fetching store data:', error);
        setMessage({ text: '데이터를 불러오는 중 오류가 발생했습니다.', type: 'error' });
      }
    };

    fetchStoreData();
  }, [user, storeId]);

  // 사이드바 상태에 따라 전체 페이지(네비게이션 바, 메인 콘텐츠) 동시 이동
  useEffect(() => {
    if (typeof document !== 'undefined') {
      const navbar = document.querySelector('nav') as HTMLElement;
      const mainContent = document.querySelector('main') as HTMLElement;
      
      // 동일한 스타일 설정
      const sidebarWidth = '384px'; // w-96 = 24rem = 384px
      const transition = 'margin-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      
      if (navbar) {
        if (sidebarOpen) {
          navbar.style.marginLeft = sidebarWidth;
          navbar.style.transition = transition;
          navbar.style.width = `calc(100vw - ${sidebarWidth})`;
          navbar.style.maxWidth = `calc(100vw - ${sidebarWidth})`;
        } else {
          navbar.style.marginLeft = '0px';
          navbar.style.transition = transition;
          navbar.style.width = '100vw';
          navbar.style.maxWidth = '100vw';
        }
      }
      
      if (mainContent) {
        if (sidebarOpen) {
          mainContent.style.marginLeft = sidebarWidth;
          mainContent.style.transition = transition;
          mainContent.style.width = `calc(100vw - ${sidebarWidth})`;
          mainContent.style.maxWidth = `calc(100vw - ${sidebarWidth})`;
        } else {
          mainContent.style.marginLeft = '0px';
          mainContent.style.transition = transition;
          mainContent.style.width = '100vw';
          mainContent.style.maxWidth = '100vw';
        }
      }
    }

    // 컴포넌트 언마운트 시 스타일 초기화
    return () => {
      if (typeof document !== 'undefined') {
        const navbar = document.querySelector('nav') as HTMLElement;
        const mainContent = document.querySelector('main') as HTMLElement;
        
        [navbar, mainContent].forEach(element => {
          if (element) {
            element.style.marginLeft = '';
            element.style.transition = '';
            element.style.width = '';
            element.style.maxWidth = '';
          }
        });
      }
    };
  }, [sidebarOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    const designData = {
      // 기본 정보
      id: design.id,
      store_id: storeId,
      
      // 색상 설정
      theme_color: design.theme_color || '#000000',
      accent_color: design.accent_color || '#666666',
      background_color: design.background_color || '#ffffff',
      text_color: design.text_color || '#000000',
      
      // 폰트 및 레이아웃
      font_family: design.font_family || 'Inter',
      layout_style: design.layout_style || 'grid',
      header_style: design.header_style || 'modern',
      product_card_style: design.product_card_style || 'default',
      
      // 표시 옵션
      show_store_description: design.show_store_description ?? true,
      show_contact_info: design.show_contact_info ?? true,
      show_business_hours: design.show_business_hours ?? true,
      
      // 배너 및 로고 설정
      banner_height: design.banner_height || 'medium',

      logo_position: design.logo_position || 'center',
      title_font_size: design.title_font_size || 'large',
      description_font_size: design.description_font_size || 'medium',
      
      // 네비게이션 바 설정
      navbar_background_color: design.navbar_background_color || 'rgba(255, 255, 255, 0)',
      navbar_icon_color: design.navbar_icon_color || '#FFFFFF',
      navbar_logo_color: design.navbar_logo_color || '#FFFFFF',
      navbar_margin_mode: design.navbar_margin_mode || 'navbar-height',
      custom_navbar_margin: typeof design.custom_navbar_margin === 'number' ? design.custom_navbar_margin : 64,
      
      // 컨테이너 설정
      container_max_width: typeof design.container_max_width === 'number' ? design.container_max_width : 85,
      container_padding: typeof design.container_padding === 'number' ? design.container_padding : 4,
      
      // 커스텀 행 설정
      enable_custom_rows: design.row_layouts && Object.keys(design.row_layouts).length > 0 ? true : design.enable_custom_rows,
      row_layouts: design.row_layouts || null
    };

    try {
      console.log('Saving design data:', designData);
      
      const { data, error } = await supabase
        .from('store_designs')
        .upsert(designData)
        .select()
        .single();
      
      console.log('Supabase response:', { data, error });
      
      if (error) {
        console.error('Supabase error details:', error);
        throw error;
      }

      setDesign(data);
      setMessage({ text: '디자인이 성공적으로 저장되었습니다!', type: 'success' });
      
      logger.info('Store design updated successfully', {
        storeId,
        designId: data.id
      });

      setTimeout(() => {
        router.push(`/store/${storeId}`);
      }, 1500);
      
    } catch (error: any) {
      console.error('Error saving design:');
      console.error('Error object:', error);
      console.error('Error message:', error?.message);
      console.error('Error code:', error?.code);
      console.error('Error details:', error?.details);
      console.error('Design data being saved:', JSON.stringify(designData, null, 2));
      
      setMessage({
        text: error?.message || '저장 중 오류가 발생했습니다.', 
        type: 'error'
      });
      
      logger.error('Failed to update store design', {
        storeId,
        error: error?.message,
        errorCode: error?.code,
        errorDetails: error?.details
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/store/${storeId}`);
  };

  const updateDesign = (field: keyof StoreDesign, value: any) => {
    // 숫자 값 안전 처리
    let safeValue = value;
    if (field === 'container_max_width' || field === 'container_padding' || field === 'custom_navbar_margin') {
      const numValue = typeof value === 'string' ? parseFloat(value) : value;
      
      // NaN이나 빈 문자열 체크 - 기본값으로 대체하지 않고 현재값 유지
      if (isNaN(numValue)) {
        return; // 잘못된 값은 무시
      }
      
      // 범위 체크 및 보정
      if (field === 'container_max_width') {
        safeValue = Math.max(30, Math.min(100, numValue));
        safeValue = Math.round(safeValue * 10) / 10; // 소수점 한 자리로 제한
      } else if (field === 'container_padding') {
        safeValue = Math.max(0, Math.min(20, numValue));
        safeValue = Math.round(safeValue * 10) / 10; // 소수점 한 자리로 제한
      } else if (field === 'custom_navbar_margin') {
        safeValue = Math.max(0, Math.min(500, Math.round(numValue))); // 정수로 제한
      }
    }

    const newDesign = { ...design, [field]: safeValue };
    setDesign(newDesign);
    
    // 헤더 네비게이션 및 마진 관련 변경사항을 즉시 Navbar에 반영
    if (field === 'navbar_background_color' || field === 'navbar_logo_color' || field === 'navbar_icon_color' || field === 'navbar_margin_mode' || field === 'custom_navbar_margin') {
      // 커스텀 이벤트를 통해 Navbar에 변경사항 전달
      window.dispatchEvent(new CustomEvent('storeDesignChange', {
        detail: {
          navbar_background_color: field === 'navbar_background_color' ? safeValue : design.navbar_background_color,
          navbar_logo_color: field === 'navbar_logo_color' ? safeValue : design.navbar_logo_color,
          navbar_icon_color: field === 'navbar_icon_color' ? safeValue : design.navbar_icon_color,
          navbar_margin_mode: field === 'navbar_margin_mode' ? safeValue : design.navbar_margin_mode,
          custom_navbar_margin: field === 'custom_navbar_margin' ? safeValue : design.custom_navbar_margin
        }
      }));
    }
  };



  // 배너 블록 이미지 업로드 함수
  const handleBlockImageUpload = async (file: File) => {
    if (!file || !user || !selectedBlock) return;

    // 파일 유효성 검사
    if (!file.type.startsWith('image/')) {
      setMessage({ text: '이미지 파일만 업로드 가능합니다.', type: 'error' });
      return;
    }

    // 파일 크기 제한 (5MB)
    if (file.size > 5 * 1024 * 1024) {
      setMessage({ text: '파일 크기는 5MB 이하여야 합니다.', type: 'error' });
      return;
    }

    setImageUploading(true);
    setMessage(null);

    try {
      // 고유한 파일명 생성
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}/${storeId}/block_${selectedBlock.id}_${Date.now()}.${fileExt}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('store-images')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        });

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 생성
      const { data: urlData } = supabase.storage
        .from('store-images')
        .getPublicUrl(fileName);

      if (urlData?.publicUrl) {
        updateSelectedBlockData('banner_image_url', urlData.publicUrl);
        setMessage({ text: '이미지가 성공적으로 업로드되었습니다!', type: 'success' });
      }

    } catch (error: any) {
      console.error('Block image upload error:', error);
      setMessage({ text: error?.message || '이미지 업로드 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setImageUploading(false);
    }
  };

  // 배너 블록 이미지 삭제 함수
  const handleBlockImageRemove = async () => {
    if (!selectedBlock?.banner_image_url) return;

    try {
      // URL에서 파일 경로 추출
      const url = new URL(selectedBlock.banner_image_url);
      const pathParts = url.pathname.split('/');
      const fileName = pathParts.slice(-3).join('/'); // user_id/store_id/filename

      // Supabase Storage에서 삭제
      const { error } = await supabase.storage
        .from('store-images')
        .remove([fileName]);

      if (error) {
        console.error('File deletion error:', error);
      }

      // 블록에서 이미지 URL 제거
      updateSelectedBlockData('banner_image_url', '');
      setMessage({ text: '이미지가 삭제되었습니다.', type: 'success' });

    } catch (error: any) {
      console.error('Block image removal error:', error);
      setMessage({ text: '이미지 삭제 중 오류가 발생했습니다.', type: 'error' });
    }
  };

  const handleSelectedBlockChange = useCallback((block: StoreBlock | null) => {
    setSelectedBlock(block);
  }, []);

  const handleBlockDoubleClick = useCallback((blockId: string) => {
    if (activeTab !== 'block') {
      setActiveTab('block');
    }
    if (!sidebarOpen) {
      setSidebarOpen(true);
    }
  }, [activeTab, sidebarOpen]);

  const getBlockTypeLabel = (type: string): string => {
    const labels: Record<string, string> = {
      text: 'TEXT',
      grid: 'PRODUCT GRID',
      featured: 'FEATURED',
      banner: 'BANNER',
      list: 'LIST',
      masonry: 'MASONRY'
    };
    return labels[type] || type.toUpperCase();
  };

  const updateSelectedBlockData = (field: string, value: any) => {
    if (!selectedBlock || !design.row_layouts) return;
    
    // 숫자 값 안전 처리
    let safeValue = value;
    let additionalUpdates = {};
    
    // 높이 단위가 변경되는 경우 적절한 기본값으로 조정
    if (field === 'height_unit') {
      if (value === 'vh') {
        // px에서 vh로 변경 시 기본값 50vh 설정
        additionalUpdates = { height: 50 };
      } else if (value === 'visible') {
        // px에서 visible로 변경 시 기본값 50% 설정
        additionalUpdates = { height: 50 };
      } else if (value === 'px') {
        // vh나 visible에서 px로 변경 시 기본값 300px 설정
        additionalUpdates = { height: 300 };
      }
    }
    
    if (field === 'height' || field === 'min_height' || field === 'max_height') {
      const numValue = typeof value === 'string' ? parseInt(value) : value;
      
      // NaN 체크
      if (isNaN(numValue)) {
        return; // 잘못된 값은 무시
      }
      
      // 단위에 따른 범위 체크 및 보정
      const isVhOrVisible = selectedBlock.height_unit === 'vh' || selectedBlock.height_unit === 'visible';
      if (field === 'height') {
        if (isVhOrVisible) {
          safeValue = Math.max(10, Math.min(100, numValue));
        } else {
          safeValue = Math.max(50, Math.min(9999, numValue));
        }
      } else if (field === 'min_height') {
        safeValue = Math.max(50, Math.min(500, numValue));
      } else if (field === 'max_height') {
        safeValue = Math.max(200, Math.min(9999, numValue));
      }
    }
    
    const blockIndex = selectedBlock.position;
    const updatedRowLayouts = {
      ...design.row_layouts,
      [blockIndex]: {
        ...design.row_layouts[blockIndex],
        [field]: safeValue,
        ...additionalUpdates
      }
    };

    setDesign(prev => ({
      ...prev,
      row_layouts: updatedRowLayouts
    }));

    setSelectedBlock(prev => prev ? {
      ...prev,
      [field]: safeValue,
      ...additionalUpdates
    } : null);
  };

  // 블록 삭제 함수 추가
  const handleDeleteBlock = () => {
    if (!selectedBlock || !design.row_layouts) return;
    setShowDeleteModal(true);
  };

  // 삭제 확인 후 실제 삭제 실행
  const confirmDeleteBlock = () => {
    if (!selectedBlock || !design.row_layouts) return;

    const currentLayouts = design.row_layouts;
    const updatedLayouts: { [key: number]: any } = {};
    
    // 삭제할 블록의 위치를 제외하고 나머지 블록들의 위치를 재조정
    Object.keys(currentLayouts).forEach((key) => {
      const position = parseInt(key);
      if (position < selectedBlock.position) {
        // 삭제할 블록보다 앞에 있는 블록들은 그대로
        updatedLayouts[position] = currentLayouts[position];
      } else if (position > selectedBlock.position) {
        // 삭제할 블록보다 뒤에 있는 블록들은 위치를 하나씩 앞으로
        updatedLayouts[position - 1] = {
          ...currentLayouts[position],
          position: position - 1
        };
      }
      // position === selectedBlock.position인 경우는 제외 (삭제)
    });

    setDesign(prev => ({
      ...prev,
      row_layouts: updatedLayouts
    }));

    // 선택된 블록 및 모달 초기화
    setSelectedBlock(null);
    setActiveTab('design');
    setShowDeleteModal(false);
  };

  // 삭제 취소
  const cancelDeleteBlock = () => {
    setShowDeleteModal(false);
  };

  const renderBlockSettings = (block: StoreBlock) => {
    const commonSettings = (
      <>
        <div>
          <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
            ELEMENT SPACING
          </label>
          <div className="border border-black">
            <select
              value={block.spacing || 'normal'}
              onChange={(e) => updateSelectedBlockData('spacing', e.target.value)}
              className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
            >
              <option value="tight">TIGHT</option>
              <option value="normal">NORMAL</option>
              <option value="loose">LOOSE</option>
              <option value="extra-loose">EXTRA LOOSE</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
            TEXT ALIGNMENT
          </label>
          <div className="border border-black">
            <select
              value={block.text_alignment || 'left'}
              onChange={(e) => updateSelectedBlockData('text_alignment', e.target.value)}
              className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
            >
              <option value="left">LEFT</option>
              <option value="center">CENTER</option>
              <option value="right">RIGHT</option>
            </select>
          </div>
        </div>

        {/* 블록 너비 설정 */}
        <div>
          <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
            BLOCK WIDTH
          </label>
          <div className="border border-black">
            <select
              value={block.block_width || DEFAULT_BLOCK_WIDTH}
              onChange={(e) => updateSelectedBlockData('block_width', e.target.value)}
              className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
            >
              <option value="contained">CONTAINED</option>
              <option value="full-width">FULL WIDTH</option>
            </select>
          </div>
          <div className="mt-2 text-xs text-gray-500 font-light tracking-wide">
            Full width extends to screen edges, ignoring margins
          </div>
        </div>

        {/* 높이 조절 설정 - 모든 블록 타입에 적용 */}
        <div>
          <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
            BLOCK HEIGHT
          </label>
          <div className="space-y-6">
            {/* 높이 단위 선택 */}
            <div className="border border-black">
              <select
                value={block.height_unit || 'px'}
                onChange={(e) => updateSelectedBlockData('height_unit', e.target.value)}
                className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
              >
                <option value="px">PIXELS (PX)</option>
                <option value="vh">VIEWPORT HEIGHT (VH)</option>
                <option value="visible">VISIBLE HEIGHT</option>
              </select>
            </div>
            <div className="text-xs text-gray-500 font-light tracking-wide">
              {block.height_unit === 'vh' ? 
                'Viewport height automatically adapts to different screen sizes' : 
                block.height_unit === 'visible' ?
                'Visible height fits exactly to the content area excluding navigation bars' :
                'Use slider or input field to adjust height precisely'
              }
            </div>
            
            {/* 높이 슬라이더 */}
            <div className="relative border border-black p-4">
              <input
                type="range"
                min={block.height_unit === 'vh' || block.height_unit === 'visible' ? 10 : (block.min_height || 100)}
                max={block.height_unit === 'vh' || block.height_unit === 'visible' ? 100 : Math.min(block.max_height || 5000, 5000)} 
                step={block.height_unit === 'vh' || block.height_unit === 'visible' ? 1 : 5}
                value={block.height_unit === 'vh' || block.height_unit === 'visible' ? 
                  Math.min(block.height || 50, 100) : 
                  Math.min(block.height || 300, 5000)
                }
                onChange={(e) => updateSelectedBlockData('height', parseInt(e.target.value))}
                className="w-full slider"
                style={{
                  background: block.height_unit === 'vh' || block.height_unit === 'visible' ?
                    `linear-gradient(to right, #000000 0%, #000000 ${(Math.min(block.height || 50, 100) - 10) / (100 - 10) * 100}%, #e5e7eb ${(Math.min(block.height || 50, 100) - 10) / (100 - 10) * 100}%, #e5e7eb 100%)` :
                    `linear-gradient(to right, #000000 0%, #000000 ${((Math.min(block.height || 300, 5000)) - (block.min_height || 100)) / ((Math.min(block.max_height || 5000, 5000)) - (block.min_height || 100)) * 100}%, #e5e7eb ${((Math.min(block.height || 300, 5000)) - (block.min_height || 100)) / ((Math.min(block.max_height || 5000, 5000)) - (block.min_height || 100)) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between mt-3 text-xs text-gray-500 font-light tracking-wide">
                {block.height_unit === 'vh' ? (
                  <>
                    <span>10VH</span>
                    <span className="text-black font-medium tracking-[0.1em]">{block.height || 50}VH</span>
                    <span>100VH</span>
                  </>
                ) : block.height_unit === 'visible' ? (
                  <>
                    <span>10%</span>
                    <span className="text-black font-medium tracking-[0.1em]">{block.height || 50}%</span>
                    <span>100%</span>
                  </>
                ) : (
                  <>
                    <span>{block.min_height || 100}PX</span>
                    <span className="text-black font-medium tracking-[0.1em]">{block.height || 300}PX</span>
                    <span>5000PX</span>
                  </>
                )}
              </div>
            </div>
            
            {/* 수치 입력 */}
            <div className="flex items-center border border-black">
              <input
                type="number"
                value={block.height || (block.height_unit === 'vh' || block.height_unit === 'visible' ? 50 : 300)}
                onChange={(e) => updateSelectedBlockData('height', parseInt(e.target.value) || (block.height_unit === 'vh' || block.height_unit === 'visible' ? 50 : 300))}
                placeholder={block.height_unit === 'vh' || block.height_unit === 'visible' ? '50' : '300'}
                min={block.height_unit === 'vh' || block.height_unit === 'visible' ? 10 : (block.min_height || 100)}
                max={block.height_unit === 'vh' || block.height_unit === 'visible' ? 100 : (block.max_height || 9999)}
                className="flex-1 px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
              />
              <span className="px-4 py-3 text-xs text-gray-500 font-light tracking-wide border-l border-black">
                {block.height_unit === 'vh' ? 'VH' : block.height_unit === 'visible' ? '%' : 'PX'}
              </span>
            </div>
            
            {/* 최소/최대값 설정 - 픽셀 모드일 때만 표시 */}
            {block.height_unit !== 'vh' && block.height_unit !== 'visible' && (
              <details className="border border-black">
                <summary className="px-4 py-3 text-xs text-gray-700 cursor-pointer hover:bg-gray-50 font-light tracking-[0.1em] uppercase">
                  ADVANCED SETTINGS
                </summary>
                <div className="border-t border-black p-4 space-y-4">
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-light tracking-wide uppercase">MIN HEIGHT</label>
                    <div className="border border-gray-300">
                      <input
                        type="number"
                        value={block.min_height || 100}
                        onChange={(e) => updateSelectedBlockData('min_height', parseInt(e.target.value) || 100)}
                        placeholder="100"
                        min="50"
                        max="500"
                        className="w-full px-3 py-2 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                      />
                    </div>
                  </div>
                  <div>
                    <label className="block text-xs text-gray-600 mb-2 font-light tracking-wide uppercase">MAX HEIGHT</label>
                    <div className="border border-gray-300">
                      <input
                        type="number"
                        value={block.max_height || 9999}
                        onChange={(e) => updateSelectedBlockData('max_height', parseInt(e.target.value) || 9999)}
                        placeholder="9999"
                        min="200"
                        max="9999"
                        className="w-full px-3 py-2 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                      />
                    </div>
                  </div>
                </div>
              </details>
            )}
            
            <div className="text-xs text-gray-500 font-light tracking-wide">
              {block.height_unit === 'vh' ?
                'Viewport height automatically adapts to different screen sizes' :
                block.height_unit === 'visible' ?
                'Visible height fits exactly to the content area excluding navigation bars' :
                'Use slider or input field to adjust height precisely'
              }
            </div>
          </div>
        </div>

        {block.background_color !== undefined && (
          <div>
            <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
              BACKGROUND COLOR
            </label>
            <div className="flex items-center border border-black">
              <input
                type="color"
                value={block.background_color || '#ffffff'}
                onChange={(e) => updateSelectedBlockData('background_color', e.target.value)}
                className="w-12 h-12 border-0 cursor-pointer bg-transparent"
              />
              <input
                type="text"
                value={block.background_color || '#ffffff'}
                onChange={(e) => updateSelectedBlockData('background_color', e.target.value)}
                className="flex-1 px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
              />
            </div>
          </div>
        )}

        {/* 삭제 버튼 */}
        <div className="pt-6 border-t border-gray-200">
          <button
            onClick={handleDeleteBlock}
            className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white text-xs font-medium uppercase tracking-[0.15em] transition-colors duration-200"
          >
            DELETE BLOCK
          </button>
          <div className="mt-2 text-xs text-gray-500 font-light tracking-wide text-center">
            This action cannot be undone
          </div>
        </div>
      </>
    );

    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-12">
            {commonSettings}
            
            <div>
              <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                TEXT CONTENT
              </label>
              <div className="border border-black">
                <textarea
                  value={block.text_content || ''}
                  onChange={(e) => updateSelectedBlockData('text_content', e.target.value)}
                  placeholder="Enter your text content..."
                  rows={6}
                  className="w-full px-4 py-3 text-xs border-0 focus:outline-none resize-none bg-white font-light tracking-wide"
                />
              </div>
            </div>
            
            {/* 텍스트 스타일 및 크기 */}
            <div className="space-y-8">
              <div>
                <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                  TEXT STYLE
                </label>
                <div className="border border-black">
                  <select
                    value={block.text_style || 'paragraph'}
                    onChange={(e) => updateSelectedBlockData('text_style', e.target.value)}
                    className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                  >
                    <option value="paragraph">PARAGRAPH</option>
                    <option value="heading">HEADING</option>
                    <option value="quote">QUOTE</option>
                    <option value="highlight">HIGHLIGHT</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                  TEXT SIZE
                </label>
                <div className="border border-black">
                  <select
                    value={block.text_size || 'medium'}
                    onChange={(e) => updateSelectedBlockData('text_size', e.target.value)}
                    className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                  >
                    <option value="small">SMALL</option>
                    <option value="medium">MEDIUM</option>
                    <option value="large">LARGE</option>
                    <option value="xl">EXTRA LARGE</option>
                    <option value="xxl">XXL</option>
                  </select>
                </div>
              </div>
            </div>

            {/* 글꼴 굵기 및 색상 */}
            <div className="space-y-8">
              <div>
                <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                  FONT WEIGHT
                </label>
                <div className="border border-black">
                  <select
                    value={block.text_weight || 'normal'}
                    onChange={(e) => updateSelectedBlockData('text_weight', e.target.value)}
                    className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                  >
                    <option value="normal">NORMAL</option>
                    <option value="medium">MEDIUM</option>
                    <option value="semibold">SEMIBOLD</option>
                    <option value="bold">BOLD</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                  TEXT COLOR
                </label>
                <div className="flex items-center border border-black">
                  <input
                    type="color"
                    value={block.text_color || '#000000'}
                    onChange={(e) => updateSelectedBlockData('text_color', e.target.value)}
                    className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                  />
                  <input
                    type="text"
                    value={block.text_color || '#000000'}
                    onChange={(e) => updateSelectedBlockData('text_color', e.target.value)}
                    placeholder="#000000"
                    className="flex-1 px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                  />
                </div>
              </div>
            </div>

            {/* 레이아웃 설정 */}
            <div className="space-y-8">
              <div>
                <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                  MAXIMUM WIDTH
                </label>
                <div className="border border-black">
                  <select
                    value={block.max_width || 'medium'}
                    onChange={(e) => updateSelectedBlockData('max_width', e.target.value)}
                    className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                  >
                    <option value="narrow">NARROW</option>
                    <option value="medium">MEDIUM</option>
                    <option value="wide">WIDE</option>
                    <option value="full">FULL WIDTH</option>
                  </select>
                </div>
              </div>
              
              <div>
                <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                  PADDING
                </label>
                <div className="border border-black">
                  <select
                    value={block.padding || 'medium'}
                    onChange={(e) => updateSelectedBlockData('padding', e.target.value)}
                    className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                  >
                    <option value="small">SMALL</option>
                    <option value="medium">MEDIUM</option>
                    <option value="large">LARGE</option>
                    <option value="xl">EXTRA LARGE</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-12">
            {commonSettings}
            
            <div>
              <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                COLUMN COUNT
              </label>
              <div className="border border-black">
                <select
                  value={block.columns || 3}
                  onChange={(e) => updateSelectedBlockData('columns', parseInt(e.target.value))}
                  className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                >
                  <option value={1}>1 COLUMN</option>
                  <option value={2}>2 COLUMNS</option>
                  <option value={3}>3 COLUMNS</option>
                  <option value={4}>4 COLUMNS</option>
                  <option value={5}>5 COLUMNS</option>
                  <option value={6}>6 COLUMNS</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                CARD STYLE
              </label>
              <div className="border border-black">
                <select
                  value={block.card_style || 'default'}
                  onChange={(e) => updateSelectedBlockData('card_style', e.target.value)}
                  className="w-full px-4 py-3 text-xs border-0 focus:outline-none bg-white font-light tracking-wider"
                >
                  <option value="default">DEFAULT</option>
                  <option value="compact">COMPACT</option>
                  <option value="detailed">DETAILED</option>
                  <option value="large">LARGE</option>
                </select>
              </div>
            </div>
          </div>
        );

      case 'banner':
        return (
          <div className="space-y-12">
            {commonSettings}
            
            {/* 배너 이미지 업로드 */}
            <div>
              <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                BANNER IMAGE
              </label>
              <div className="space-y-6">
                {block.banner_image_url ? (
                  <div className="relative border border-black">
                    <Image
                      src={block.banner_image_url}
                      alt="Banner Image"
                      width={200}
                      height={100}
                      className="w-full h-20 object-cover"
                    />
                    <button
                      type="button"
                      onClick={handleBlockImageRemove}
                      className="absolute top-2 right-2 bg-black text-white text-xs px-3 py-1 hover:bg-white hover:text-black border border-black transition-all duration-300 uppercase font-light tracking-wide"
                    >
                      REMOVE
                    </button>
                  </div>
                ) : (
                  <div className="w-full h-20 border border-black flex items-center justify-center bg-gray-50">
                    <span className="text-xs text-gray-600 font-light tracking-wide uppercase">Upload Banner Image</span>
                  </div>
                )}
                
                <div className="relative">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        handleBlockImageUpload(file);
                      }
                    }}
                    className="sr-only"
                    id={`banner-block-image-upload-${block.id}`}
                    disabled={imageUploading}
                  />
                  <label
                    htmlFor={`banner-block-image-upload-${block.id}`}
                    className={`block w-full px-6 py-3 text-xs text-center border border-black cursor-pointer hover:bg-black hover:text-white transition-all duration-300 uppercase font-light tracking-[0.15em] ${
                      imageUploading ? 'opacity-50 cursor-not-allowed' : 'bg-white text-black'
                    }`}
                  >
                    {imageUploading ? 'UPLOADING...' : block.banner_image_url ? 'CHANGE IMAGE' : 'UPLOAD IMAGE'}
                  </label>
                </div>
                
                <div className="text-xs text-gray-500 font-light tracking-wide">
                  JPG, PNG files (Maximum 5MB)
                </div>
              </div>
            </div>

            {/* 상점 헤더 표시 옵션 */}
            <div className="border border-black p-6">
              <label className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  checked={block.show_store_header ?? true}
                  onChange={(e) => updateSelectedBlockData('show_store_header', e.target.checked)}
                  className="w-4 h-4"
                />
                <span className="text-xs text-gray-700 uppercase tracking-[0.15em] font-light">DISPLAY STORE HEADER</span>
              </label>
              <div className="mt-3 text-xs text-gray-500 font-light tracking-wide">
                Shows store logo and title above the banner
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-12">
            {commonSettings}
            <div className="text-center border border-black p-8 bg-gray-50">
              <div className="w-12 h-12 mx-auto bg-black flex items-center justify-center mb-4">
                <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                </svg>
              </div>
              <div className="text-xs text-gray-700 font-light tracking-[0.15em] uppercase">
                {getBlockTypeLabel(block.type)} BLOCK CONFIGURATION
              </div>
            </div>
          </div>
        );
    }
  };

  if (!storeData) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-900 mx-auto mb-4"></div>
          <p className="text-gray-600">상점 정보를 불러오는 중...</p>
        </div>
      </div>
    );
  }

  if (message?.type === 'error' && !design.id) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">오류가 발생했습니다</h3>
          <p className="text-gray-600 mb-6">{message.text}</p>
          <button
            onClick={() => router.push('/vendor/stores')}
            className="px-6 py-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

      return (
      <div className="min-h-screen bg-white flex">
      {/* 사이드바 토글 버튼 - 디올 스타일 */}
      <div className={`fixed top-1/2 -translate-y-1/2 z-[100] transition-all duration-500 ${
        sidebarOpen ? 'left-96' : 'left-0'
      }`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className={`bg-black text-white border border-black hover:bg-white hover:text-black transition-all duration-300 flex flex-col items-center justify-center !rounded-none rounded-none ${
            sidebarOpen 
              ? 'py-4 px-2' 
              : 'py-8 px-3 border-l-0'
          }`}
          style={{
            writingMode: 'vertical-rl',
            textOrientation: 'mixed',
            borderRadius: '0',
            borderTopLeftRadius: '0',
            borderTopRightRadius: '0',
            borderBottomLeftRadius: '0',
            borderBottomRightRadius: '0',
            WebkitBorderRadius: '0',
            MozBorderRadius: '0'
          }}
        >
          <div className="flex flex-col items-center space-y-2">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
              )}
            </svg>
            {!sidebarOpen && (
              <div className="text-[10px] font-light uppercase tracking-[0.2em] whitespace-nowrap">
                <span style={{ writingMode: 'vertical-rl', textOrientation: 'mixed' }}>
                  DESIGN ATELIER
                </span>
              </div>
            )}
          </div>
        </button>
      </div>

      {/* 디자인 설정 사이드바 - 디올 스타일 */}
      <div className={`fixed left-0 top-0 h-full bg-white border-r border-black transition-transform duration-500 z-40 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-96 overflow-y-auto`}>
        <div className="flex flex-col h-full">
          {/* 헤더 섹션 */}
          <div className="px-8 py-12 border-b border-gray-900">
            <div className="text-center mb-12">
              <div className="w-16 h-16 mx-auto bg-black flex items-center justify-center mb-6">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                </svg>
              </div>
              <h2 className="text-2xl font-light text-black tracking-[0.2em] uppercase mb-3">
                Design Atelier
              </h2>
              <p className="text-xs text-gray-600 font-light tracking-[0.15em] uppercase">
                Haute Couture Experience
              </p>
            </div>
            
            {/* 탭 네비게이션 */}
            <div className="border border-black">
              <button
                onClick={() => setActiveTab('design')}
                className={`w-full px-6 py-4 text-xs font-light uppercase tracking-[0.15em] transition-all duration-300 border-b border-black ${
                  activeTab === 'design'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  <span>Global Design</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('block')}
                className={`w-full px-6 py-4 text-xs font-light uppercase tracking-[0.15em] transition-all duration-300 ${
                  activeTab === 'block'
                    ? 'bg-black text-white'
                    : 'bg-white text-black hover:bg-gray-50'
                }`}
              >
                <div className="flex items-center justify-center space-x-3">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>Block Elements</span>
                  {selectedBlock && (
                    <div className="w-2 h-2 bg-white"></div>
                  )}
                </div>
              </button>
            </div>
          </div>
          
          {/* 메시지 영역 */}
          {message && (
            <div className="px-8 pt-6">
              <div className={`px-6 py-4 border text-sm font-light tracking-wide ${
                message.type === 'success' 
                  ? 'border-black bg-black text-white' 
                  : 'border-black bg-white text-black'
              }`}>
                {message.text}
              </div>
            </div>
          )}
          
          {/* 탭 콘텐츠 */}
          <div className="flex-1 px-8 py-8">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
              {activeTab === 'design' && (
                <div className="space-y-12 flex-1">
                  <div className="border border-black bg-gray-50 p-6">
                    <div className="flex items-start space-x-4">
                      <svg className="w-6 h-6 text-black mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-light text-black mb-2 uppercase tracking-[0.1em]">Global Design Configuration</h4>
                        <p className="text-xs text-gray-600 font-light leading-relaxed tracking-wide">
                          Configuration applied to the entire store collection. Individual block settings available in Block Elements tab.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 색상 설정 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      COLOR COMPOSITION
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-8">
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Theme Signature
                        </label>
                        <div className="flex items-center border border-black">
                          <input
                            type="color"
                            value={design.theme_color || '#000000'}
                            onChange={(e) => updateDesign('theme_color', e.target.value)}
                            className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={design.theme_color || '#000000'}
                            onChange={(e) => updateDesign('theme_color', e.target.value)}
                            className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Accent Refinement
                        </label>
                        <div className="flex items-center border border-black">
                          <input
                            type="color"
                            value={design.accent_color || '#666666'}
                            onChange={(e) => updateDesign('accent_color', e.target.value)}
                            className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={design.accent_color || '#666666'}
                            onChange={(e) => updateDesign('accent_color', e.target.value)}
                            className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Canvas Foundation
                        </label>
                        <div className="flex items-center border border-black">
                          <input
                            type="color"
                            value={design.background_color || '#ffffff'}
                            onChange={(e) => updateDesign('background_color', e.target.value)}
                            className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={design.background_color || '#ffffff'}
                            onChange={(e) => updateDesign('background_color', e.target.value)}
                            className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Typography Tone
                        </label>
                        <div className="flex items-center border border-black">
                          <input
                            type="color"
                            value={design.text_color || '#000000'}
                            onChange={(e) => updateDesign('text_color', e.target.value)}
                            className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={design.text_color || '#000000'}
                            onChange={(e) => updateDesign('text_color', e.target.value)}
                            className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 헤더 네비게이션 색상 설정 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      NAVIGATION ARCHITECTURE
                    </h3>
                    
                    <div className="border border-black bg-gray-50 p-6">
                      <div className="flex items-start space-x-4">
                        <svg className="w-6 h-6 text-black mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="text-xs font-light text-black mb-2 uppercase tracking-[0.1em]">Navigation Configuration</h4>
                          <p className="text-xs text-gray-600 font-light leading-relaxed tracking-wide">
                            PIETA logotype remains fixed, background and icon tones are customizable.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Navigation Background
                        </label>
                        
                        {/* 색상 선택기와 텍스트 입력 */}
                        <div className="border border-black mb-6">
                          <div className="flex items-center">
                            <input
                              type="color"
                              value={(() => {
                                const color = design.navbar_background_color;
                                if (!color || color === 'rgba(255, 255, 255, 0)') return '#ffffff';
                                if (color.startsWith('#')) return color;
                                if (color.startsWith('rgba')) {
                                  const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
                                  if (match) {
                                    const [, r, g, b] = match;
                                    return `#${parseInt(r).toString(16).padStart(2, '0')}${parseInt(g).toString(16).padStart(2, '0')}${parseInt(b).toString(16).padStart(2, '0')}`;
                                  }
                                }
                                return '#ffffff';
                              })()}
                              onChange={(e) => {
                                const hexColor = e.target.value;
                                const r = parseInt(hexColor.slice(1, 3), 16);
                                const g = parseInt(hexColor.slice(3, 5), 16);
                                const b = parseInt(hexColor.slice(5, 7), 16);
                                
                                // 현재 알파값 유지하거나 기본값 1 사용
                                let alpha = 1;
                                const currentColor = design.navbar_background_color;
                                if (currentColor && currentColor.startsWith('rgba')) {
                                  const match = currentColor.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
                                  if (match) alpha = parseFloat(match[1]);
                                }
                                
                                updateDesign('navbar_background_color', `rgba(${r}, ${g}, ${b}, ${alpha})`);
                              }}
                              className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                            />
                            <input
                              type="text"
                              value={design.navbar_background_color || 'rgba(255, 255, 255, 0)'}
                              onChange={(e) => updateDesign('navbar_background_color', e.target.value)}
                              className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                              placeholder="rgba(255, 255, 255, 0) or #ffffff"
                            />
                          </div>
                        </div>
                        
                        {/* 투명도 슬라이더 */}
                        <div className="mb-6">
                          <div className="flex items-center justify-between mb-4">
                            <label className="text-xs text-gray-700 uppercase tracking-[0.15em] font-light">
                              Opacity Control
                            </label>
                            <span className="text-xs text-black font-light tracking-wider bg-gray-50 px-3 py-1 border border-black">
                              {(() => {
                                const color = design.navbar_background_color;
                                if (!color || color === 'rgba(255, 255, 255, 0)') return '0%';
                                if (color.startsWith('rgba')) {
                                  const match = color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
                                  if (match) return `${Math.round(parseFloat(match[1]) * 100)}%`;
                                }
                                return '100%';
                              })()}
                            </span>
                          </div>
                          <div className="border border-black p-4 bg-gray-50">
                            <input
                              type="range"
                              min="0"
                              max="1"
                              step="0.005"
                              value={(() => {
                                const color = design.navbar_background_color;
                                if (!color || color === 'rgba(255, 255, 255, 0)') return 0;
                                if (color.startsWith('rgba')) {
                                  const match = color.match(/rgba\(\d+,\s*\d+,\s*\d+,\s*([\d.]+)\)/);
                                  if (match) return parseFloat(match[1]);
                                }
                                return 1;
                              })()}
                              onChange={(e) => {
                                const alpha = parseFloat(e.target.value);
                                const color = design.navbar_background_color;
                                
                                let r = 255, g = 255, b = 255;
                                
                                if (color && color.startsWith('rgba')) {
                                  const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
                                  if (match) {
                                    r = parseInt(match[1]);
                                    g = parseInt(match[2]);
                                    b = parseInt(match[3]);
                                  }
                                } else if (color && color.startsWith('#')) {
                                  r = parseInt(color.slice(1, 3), 16);
                                  g = parseInt(color.slice(3, 5), 16);
                                  b = parseInt(color.slice(5, 7), 16);
                                }
                                
                                updateDesign('navbar_background_color', `rgba(${r}, ${g}, ${b}, ${alpha})`);
                              }}
                              className="w-full h-4 appearance-none cursor-pointer bg-white border border-black"
                              style={{
                                background: `linear-gradient(to right, transparent 0%, black 100%)`
                              }}
                            />
                          </div>
                        </div>
                        
                        {/* 빠른 투명도 프리셋 */}
                        <div className="flex items-center justify-between">
                          <span className="text-xs text-gray-700 uppercase tracking-[0.15em] font-light">Quick Presets:</span>
                          <div className="flex">
                            {[
                              { label: 'TRANSPARENT', value: 0 },
                              { label: 'TRANSLUCENT', value: 0.5 },
                              { label: 'OPAQUE', value: 1 }
                            ].map((preset, index) => (
                              <button
                                key={preset.label}
                                type="button"
                                onClick={() => {
                                  const alpha = preset.value;
                                  const color = design.navbar_background_color;
                                  
                                  let r = 255, g = 255, b = 255;
                                  
                                  if (color && color.startsWith('rgba')) {
                                    const match = color.match(/rgba\((\d+),\s*(\d+),\s*(\d+),\s*[\d.]+\)/);
                                    if (match) {
                                      r = parseInt(match[1]);
                                      g = parseInt(match[2]);
                                      b = parseInt(match[3]);
                                    }
                                  } else if (color && color.startsWith('#')) {
                                    r = parseInt(color.slice(1, 3), 16);
                                    g = parseInt(color.slice(3, 5), 16);
                                    b = parseInt(color.slice(5, 7), 16);
                                  }
                                  
                                  updateDesign('navbar_background_color', `rgba(${r}, ${g}, ${b}, ${alpha})`);
                                }}
                                className={`px-4 py-2 text-xs font-light tracking-wider border border-black bg-white hover:bg-black hover:text-white transition-all duration-300 ${
                                  index === 0 ? '' : 'border-l-0'
                                }`}
                              >
                                {preset.label}
                              </button>
                            ))}
                          </div>
                        </div>
                        
                        <p className="text-xs text-gray-500 mt-2">
                          투명도 0%는 완전 투명, 100%는 완전 불투명입니다.
                        </p>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          PIETA Logo Color
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={design.navbar_logo_color || '#ffffff'}
                            onChange={(e) => updateDesign('navbar_logo_color', e.target.value)}
                            className="w-8 h-8 border border-gray-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={design.navbar_logo_color || '#ffffff'}
                            onChange={(e) => updateDesign('navbar_logo_color', e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                            placeholder="#ffffff, rgba(255, 255, 255, 1) 등"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Icon Tone
                        </label>
                        <div className="flex items-center border border-black">
                          <input
                            type="color"
                            value={design.navbar_icon_color || '#ffffff'}
                            onChange={(e) => updateDesign('navbar_icon_color', e.target.value)}
                            className="w-12 h-12 border-0 cursor-pointer bg-transparent"
                          />
                          <input
                            type="text"
                            value={design.navbar_icon_color || '#ffffff'}
                            onChange={(e) => updateDesign('navbar_icon_color', e.target.value)}
                            className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                            placeholder="#ffffff or rgba(255, 255, 255, 1)"
                          />
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 네비게이션 바 마진 설정 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      NAVIGATION SPACING
                    </h3>
                    
                    <div className="border border-black bg-gray-50 p-6">
                      <div className="flex items-start space-x-4">
                        <svg className="w-6 h-6 text-black mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <div>
                          <h4 className="text-xs font-light text-black mb-2 uppercase tracking-[0.1em]">Vertical Content Spacing</h4>
                          <p className="text-xs text-gray-600 font-light leading-relaxed tracking-wide">
                            Configure the margin between navigation bar and page content.
                          </p>
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-8">
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Spacing Mode
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.navbar_margin_mode || 'navbar-height'}
                            onChange={(e) => updateDesign('navbar_margin_mode', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="none">NO MARGIN (Flush to Navigation)</option>
                            <option value="navbar-height">NAVIGATION HEIGHT (Default)</option>
                            <option value="custom">CUSTOM MARGIN</option>
                          </select>
                        </div>
                        <p className="text-xs text-gray-600 font-light mt-4 tracking-wide">
                          No margin aligns content directly beneath the navigation bar.
                        </p>
                      </div>

                      {design.navbar_margin_mode === 'custom' && (
                        <div>
                          <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                            Custom Margin (Pixels)
                          </label>
                          <div className="border border-black p-4 bg-gray-50">
                            <div className="flex items-center space-x-4">
                              <input
                                type="range"
                                min="0"
                                max="200"
                                step="1"
                                value={design.custom_navbar_margin ?? 64}
                                onChange={(e) => updateDesign('custom_navbar_margin', parseInt(e.target.value))}
                                className="flex-1 h-1 bg-white border border-black cursor-pointer"
                              />
                              <div className="flex items-center border border-black bg-white">
                                <input
                                  type="number"
                                  min="0"
                                  max="500"
                                  value={design.custom_navbar_margin ?? 64}
                                  onChange={(e) => updateDesign('custom_navbar_margin', parseInt(e.target.value) ?? 0)}
                                  className="w-20 px-3 py-2 text-xs font-light tracking-wider border-0 focus:outline-none text-center"
                                />
                                <span className="text-xs text-gray-600 font-light px-2">px</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* 레이아웃 설정 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      LAYOUT ARCHITECTURE
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-8">
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Header Style
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.header_style || 'modern'}
                            onChange={(e) => updateDesign('header_style', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="minimal">MINIMAL</option>
                            <option value="classic">CLASSIC</option>
                            <option value="modern">MODERN</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Product Card Style
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.product_card_style || 'default'}
                            onChange={(e) => updateDesign('product_card_style', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="default">DEFAULT</option>
                            <option value="compact">COMPACT</option>
                            <option value="detailed">DETAILED</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Banner Height
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.banner_height || 'medium'}
                            onChange={(e) => updateDesign('banner_height', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="small">SMALL</option>
                            <option value="medium">MEDIUM</option>
                            <option value="large">LARGE</option>
                            <option value="full">FULL SCREEN</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Logo Position
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.logo_position || 'center'}
                            onChange={(e) => updateDesign('logo_position', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="left">LEFT</option>
                            <option value="center">CENTER</option>
                            <option value="right">RIGHT</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 표시 옵션 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      DISPLAY CONFIGURATION
                    </h3>
                    
                    <div className="space-y-6">
                      <label className="flex items-center space-x-4 border border-black p-4 bg-gray-50 hover:bg-white transition-colors duration-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={design.show_store_description || false}
                          onChange={(e) => updateDesign('show_store_description', e.target.checked)}
                          className="w-4 h-4 text-black border-black focus:ring-black focus:ring-1"
                        />
                        <span className="text-xs text-black font-light uppercase tracking-[0.15em]">Store Description Display</span>
                      </label>

                      <label className="flex items-center space-x-4 border border-black p-4 bg-gray-50 hover:bg-white transition-colors duration-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={design.show_contact_info || false}
                          onChange={(e) => updateDesign('show_contact_info', e.target.checked)}
                          className="w-4 h-4 text-black border-black focus:ring-black focus:ring-1"
                        />
                        <span className="text-xs text-black font-light uppercase tracking-[0.15em]">Contact Information Display</span>
                      </label>

                      <label className="flex items-center space-x-4 border border-black p-4 bg-gray-50 hover:bg-white transition-colors duration-300 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={design.show_business_hours || false}
                          onChange={(e) => updateDesign('show_business_hours', e.target.checked)}
                          className="w-4 h-4 text-black border-black focus:ring-black focus:ring-1"
                        />
                        <span className="text-xs text-black font-light uppercase tracking-[0.15em]">Business Hours Display</span>
                      </label>
                    </div>
                  </div>

                  {/* 타이포그래피 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      TYPOGRAPHY SYSTEM
                    </h3>
                    
                    <div className="grid grid-cols-1 gap-8">
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Title Scale
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.title_font_size || 'large'}
                            onChange={(e) => updateDesign('title_font_size', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="small">SMALL</option>
                            <option value="medium">MEDIUM</option>
                            <option value="large">LARGE</option>
                            <option value="xl">EXTRA LARGE</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Description Scale
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.description_font_size || 'medium'}
                            onChange={(e) => updateDesign('description_font_size', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="small">SMALL</option>
                            <option value="medium">MEDIUM</option>
                            <option value="large">LARGE</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Font Family
                        </label>
                        <div className="border border-black">
                          <select
                            value={design.font_family || 'Inter'}
                            onChange={(e) => updateDesign('font_family', e.target.value)}
                            className="w-full px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none bg-white"
                          >
                            <option value="Inter">INTER</option>
                            <option value="Noto Sans KR">NOTO SANS KR</option>
                            <option value="Roboto">ROBOTO</option>
                            <option value="Open Sans">OPEN SANS</option>
                            <option value="Lato">LATO</option>
                          </select>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 컨테이너 설정 */}
                  <div className="space-y-8">
                    <h3 className="text-sm font-light text-black uppercase tracking-[0.2em] border-b border-black pb-4">
                      CONTAINER ARCHITECTURE
                    </h3>
                    
                    <div className="space-y-8">
                      {/* 컨테이너 최대 너비 슬라이더 */}
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Container Maximum Width
                        </label>
                        <div className="border border-black p-6 bg-gray-50">
                          <div className="space-y-4">
                            <div className="relative">
                              <input
                                type="range"
                                min="30"
                                max="100"
                                step="0.5"
                                value={design.container_max_width ?? 85}
                                onChange={(e) => updateDesign('container_max_width', parseFloat(e.target.value))}
                                className="w-full h-1 bg-white border border-black appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between mt-3 text-xs text-gray-600 font-light">
                                <span>30%</span>
                                <span className="font-light text-black tracking-wider">{(design.container_max_width ?? 85).toFixed(1)}%</span>
                                <span>100%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center border border-black bg-white">
                              <input
                                type="number"
                                value={(design.container_max_width ?? 85).toFixed(1)}
                                onChange={(e) => updateDesign('container_max_width', parseFloat(e.target.value) ?? 85)}
                                placeholder="85.0"
                                min="30"
                                max="100"
                                step="0.5"
                                className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none"
                              />
                              <span className="text-xs text-gray-600 font-light px-3">%</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* 컨테이너 패딩 슬라이더 */}
                      <div>
                        <label className="block text-xs text-gray-700 mb-4 uppercase tracking-[0.15em] font-light">
                          Container Padding
                        </label>
                        <div className="border border-black p-6 bg-gray-50">
                          <div className="space-y-4">
                            <div className="relative">
                              <input
                                type="range"
                                min="0"
                                max="20"
                                step="0.1"
                                value={design.container_padding ?? 4}
                                onChange={(e) => updateDesign('container_padding', parseFloat(e.target.value))}
                                className="w-full h-1 bg-white border border-black appearance-none cursor-pointer"
                              />
                              <div className="flex justify-between mt-3 text-xs text-gray-600 font-light">
                                <span>0%</span>
                                <span className="font-light text-black tracking-wider">{(design.container_padding ?? 4).toFixed(1)}%</span>
                                <span>20%</span>
                              </div>
                            </div>
                            
                            <div className="flex items-center border border-black bg-white">
                              <input
                                type="number"
                                value={(design.container_padding ?? 4).toFixed(1)}
                                onChange={(e) => updateDesign('container_padding', parseFloat(e.target.value) ?? 4)}
                                placeholder="4.0"
                                min="0"
                                max="20"
                                step="0.1"
                                className="flex-1 px-4 py-3 text-xs font-light tracking-wider border-0 focus:outline-none"
                              />
                              <span className="text-xs text-gray-600 font-light px-3">%</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                    
                    <div className="text-xs text-gray-600 font-light tracking-wide">
                      Container settings apply exclusively to "contained" block elements
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'block' && (
                <div className="space-y-12 flex-1">
                  {selectedBlock ? (
                    <div>
                      <div className="flex items-center space-x-4 mb-8 pb-6 border-b border-black">
                        <div className="w-12 h-12 bg-black flex items-center justify-center">
                          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-light text-black uppercase tracking-[0.2em]">
                            {getBlockTypeLabel(selectedBlock.type)} Element
                          </h3>
                          <p className="text-xs text-gray-600 font-light tracking-wider">
                            Block #{selectedBlock.position + 1} Configuration
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-8">
                        {renderBlockSettings(selectedBlock)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-12">
                      <div className="w-24 h-24 mx-auto bg-gray-50 border border-black flex items-center justify-center">
                        <svg className="w-10 h-10 text-black" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>

                      <div>
                        <h3 className="text-sm font-light text-black mb-4 uppercase tracking-[0.2em]">
                          SELECT ELEMENT
                        </h3>
                        <p className="text-xs text-gray-600 font-light leading-relaxed tracking-wide">
                          Click on an element in the preview to configure<br/>
                          its specific properties and styling options.
                        </p>
                      </div>

                      <div className="border border-black bg-gray-50 p-6">
                        <div className="space-y-4 text-xs text-gray-700 font-light">
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-black"></div>
                            <span className="tracking-wide">CLICK: Select & Configure</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-black"></div>
                            <span className="tracking-wide">DOUBLE CLICK: Open Block Tab</span>
                          </div>
                          <div className="flex items-center space-x-3">
                            <div className="w-2 h-2 bg-black"></div>
                            <span className="tracking-wide">DRAG: Reorder Elements</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 저장 및 취소 버튼 */}
              <div className="pt-8 border-t border-black mt-auto">
                <div className="flex">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-8 py-4 border border-black bg-white text-black text-xs font-light tracking-[0.2em] uppercase hover:bg-black hover:text-white transition-all duration-300 border-r-0"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-8 py-4 border border-black bg-black text-white text-xs font-light tracking-[0.2em] uppercase hover:bg-white hover:text-black disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300"
                  >
                    {loading ? 'PRESERVING...' : 'PRESERVE DESIGN'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 - 우측 미리보기 영역 */}
      <div className="flex-1 border-l border-black bg-gray-50">
        <div className="store-design-preview">
          <BasicInlinePreviewArea 
            storeId={storeId}
            design={design}
            onDesignUpdate={setDesign}
            products={products}
            storeData={storeData}
            onSelectedBlockChange={handleSelectedBlockChange}
            onBlockDoubleClick={handleBlockDoubleClick}
            sidebarOpen={sidebarOpen}
          />
        </div>
      </div>
      
      {/* 디자인 페이지용 스타일 */}
      <style jsx>{`
        .store-design-preview {
          position: relative;
          overflow-x: hidden; /* 가로 스크롤 방지 */
        }
        
        /* 디올 스타일 슬라이더 */
        :global(.slider) {
          -webkit-appearance: none;
          appearance: none;
          outline: none;
          background: #ffffff;
          border: 1px solid #000000;
        }
        
        :global(.slider::-webkit-slider-thumb) {
          -webkit-appearance: none;
          appearance: none;
          width: 16px;
          height: 16px;
          background: #000000;
          border: 1px solid #000000;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        :global(.slider::-webkit-slider-thumb:hover) {
          background: #ffffff;
          border: 2px solid #000000;
        }
        
        :global(.slider::-moz-range-thumb) {
          width: 16px;
          height: 16px;
          background: #000000;
          border: 1px solid #000000;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        :global(.slider::-moz-range-thumb:hover) {
          background: #ffffff;
          border: 2px solid #000000;
        }

        /* 디올 체크박스 스타일 */
        :global(input[type="checkbox"]) {
          -webkit-appearance: none;
          appearance: none;
          width: 1rem;
          height: 1rem;
          border: 1px solid #000000;
          background: #ffffff;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        :global(input[type="checkbox"]:checked) {
          background: #000000;
          border: 1px solid #000000;
        }
        
        :global(input[type="checkbox"]:checked::after) {
          content: '✓';
          color: #ffffff;
          font-size: 0.75rem;
          font-weight: 300;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        
        :global(input[type="checkbox"]:hover) {
          border: 2px solid #000000;
        }
        
        /* contained 블록 컨테이너 스타일은 이제 BasicInlinePreviewArea에서 직접 처리 */
        
        /* 풀 와이드 블록 컨테이너 설정 - 사이드바 상태에 따라 동적 조정 */
        .store-design-preview :global([style*="calc(100% + 4rem)"]) {
          width: calc(100vw - ${sidebarOpen ? '384px' : '0px'}) !important;
          max-width: none !important;
          transition: width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), margin-left 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94) !important;
          margin-left: calc(-50vw + 50% + ${sidebarOpen ? '192px' : '0px'}) !important;
          margin-right: calc(-50vw + 50%) !important;
        }
        
        /* 모바일 반응형 설정 */
        @media (max-width: 1023px) {
          .store-design-preview :global([style*="calc(100% + 4rem)"]) {
            width: 100vw !important;
            margin-left: calc(-50vw + 50%) !important;
            margin-right: calc(-50vw + 50%) !important;
          }
        }

        /* 디올 스타일 전용 애니메이션 */
        :global(.dior-transition) {
          transition: all 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
      `}</style>

      {/* 삭제 확인 모달 */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* 오버레이 */}
          <div 
            className="absolute inset-0 bg-black bg-opacity-50 transition-opacity duration-300"
            onClick={cancelDeleteBlock}
          />
          
          {/* 모달 컨텐츠 */}
          <div className="relative bg-white w-full max-w-md mx-4 transform transition-all duration-300 scale-100">
            {/* 헤더 */}
            <div className="border-b border-gray-200 px-8 py-6">
              <div className="flex items-center space-x-4">
                <div className="w-12 h-12 bg-red-50 border border-red-200 flex items-center justify-center">
                  <svg className="w-6 h-6 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-lg font-medium text-gray-900 uppercase tracking-[0.1em]">
                    DELETE CONFIRMATION
                  </h3>
                  <p className="text-xs text-gray-500 font-light tracking-wide mt-1">
                    {selectedBlock ? getBlockTypeLabel(selectedBlock.type) : 'BLOCK'} ELEMENT
                  </p>
                </div>
              </div>
            </div>

            {/* 바디 */}
            <div className="px-8 py-8">
              <div className="space-y-6">
                <p className="text-sm text-gray-700 font-light leading-relaxed tracking-wide">
                  이 블록을 삭제하시겠습니까? 블록의 모든 설정과 콘텐츠가 영구적으로 제거되며, 
                  이 작업은 되돌릴 수 없습니다.
                </p>
                
                <div className="bg-gray-50 border border-gray-200 p-4">
                  <div className="flex items-start space-x-3">
                    <svg className="w-5 h-5 text-gray-400 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="1.5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
                    </svg>
                    <div>
                      <p className="text-xs font-medium text-gray-700 uppercase tracking-[0.1em] mb-1">
                        NOTICE
                      </p>
                      <p className="text-xs text-gray-600 font-light leading-relaxed">
                        다른 블록들의 순서가 자동으로 재정렬됩니다.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* 푸터 */}
            <div className="border-t border-gray-200 px-8 py-6">
              <div className="flex space-x-4">
                <button
                  onClick={cancelDeleteBlock}
                  className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-xs font-medium uppercase tracking-[0.15em] hover:bg-gray-50 transition-colors duration-200"
                >
                  CANCEL
                </button>
                <button
                  onClick={confirmDeleteBlock}
                  className="flex-1 px-6 py-3 bg-red-600 text-white text-xs font-medium uppercase tracking-[0.15em] hover:bg-red-700 transition-colors duration-200"
                >
                  DELETE
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 