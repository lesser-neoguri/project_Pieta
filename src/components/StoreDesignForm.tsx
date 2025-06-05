"use client";

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { DragDropContext, Droppable, Draggable, DropResult } from '@hello-pangea/dnd';
import Image from 'next/image';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';
import { BasicInlinePreviewArea, BlockWidth, DEFAULT_BLOCK_WIDTH } from './editor/BasicInlinePreviewArea';
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
  max_products?: number;
  height?: number; // 픽셀 단위 높이
  min_height?: number; // 최소 높이
  max_height?: number; // 최대 높이
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
  enable_custom_rows: false
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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    setMessage(null);

    try {
      const designData = {
        ...design,
        store_id: storeId,
        enable_custom_rows: design.row_layouts && Object.keys(design.row_layouts).length > 0 ? true : design.enable_custom_rows
      };

      const { data, error } = await supabase
        .from('store_designs')
        .upsert(designData)
        .select()
        .single();
      
      if (error) {
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
      console.error('Error saving design:', error);
      setMessage({
        text: error.message || '저장 중 오류가 발생했습니다.', 
        type: 'error'
      });
      
      logger.error('Failed to update store design', {
        storeId,
        error: error.message
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCancel = () => {
    router.push(`/store/${storeId}`);
  };

  const updateDesign = (field: keyof StoreDesign, value: any) => {
    setDesign(prev => ({ ...prev, [field]: value }));
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
      text: '텍스트',
      grid: '제품 그리드',
      featured: '피처드',
      banner: '배너',
      list: '리스트',
      masonry: '메이슨리'
    };
    return labels[type] || type;
  };

  const updateSelectedBlockData = (field: string, value: any) => {
    if (!selectedBlock || !design.row_layouts) return;
    
    const blockIndex = selectedBlock.position;
    const updatedRowLayouts = {
      ...design.row_layouts,
      [blockIndex]: {
        ...design.row_layouts[blockIndex],
        [field]: value
      }
    };

    setDesign(prev => ({
      ...prev,
      row_layouts: updatedRowLayouts
    }));

    setSelectedBlock(prev => prev ? {
      ...prev,
      [field]: value
    } : null);
  };

  const renderBlockSettings = (block: StoreBlock) => {
    const commonSettings = (
      <>
        <div>
          <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
            간격
          </label>
          <select
            value={block.spacing || 'normal'}
            onChange={(e) => updateSelectedBlockData('spacing', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
          >
            <option value="tight">좁음</option>
            <option value="normal">보통</option>
            <option value="loose">넓음</option>
            <option value="extra-loose">매우 넓음</option>
          </select>
        </div>

        <div>
          <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
            텍스트 정렬
          </label>
          <select
            value={block.text_alignment || 'left'}
            onChange={(e) => updateSelectedBlockData('text_alignment', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
          >
            <option value="left">왼쪽</option>
            <option value="center">중앙</option>
            <option value="right">오른쪽</option>
          </select>
        </div>

        {/* 블록 너비 설정 */}
        <div>
          <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
            블록 너비
          </label>
          <select
            value={block.block_width || DEFAULT_BLOCK_WIDTH}
            onChange={(e) => updateSelectedBlockData('block_width', e.target.value)}
            className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
          >
            <option value="contained">컨테이너 내</option>
            <option value="full-width">전체 너비</option>
          </select>
          <div className="mt-1 text-xs text-gray-400">
            전체 너비 선택 시 좌우 마진이 무시되고 화면 끝까지 확장됩니다
          </div>
        </div>

        {/* 높이 조절 설정 - 모든 블록 타입에 적용 */}
        <div>
          <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
            블록 높이
          </label>
          <div className="space-y-3">
            {/* 높이 슬라이더 */}
            <div className="relative">
              <input
                type="range"
                min={block.min_height || 100}
                max={block.max_height || 800}
                value={block.height || 300}
                onChange={(e) => updateSelectedBlockData('height', parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
                style={{
                  background: `linear-gradient(to right, #374151 0%, #374151 ${((block.height || 300) - (block.min_height || 100)) / ((block.max_height || 800) - (block.min_height || 100)) * 100}%, #e5e7eb ${((block.height || 300) - (block.min_height || 100)) / ((block.max_height || 800) - (block.min_height || 100)) * 100}%, #e5e7eb 100%)`
                }}
              />
              <div className="flex justify-between mt-1 text-xs text-gray-400">
                <span>{block.min_height || 100}px</span>
                <span className="font-medium text-gray-600">{block.height || 300}px</span>
                <span>{block.max_height || 800}px</span>
              </div>
            </div>
            
            {/* 수치 입력 */}
            <div className="flex items-center space-x-2">
              <input
                type="number"
                value={block.height || 300}
                onChange={(e) => updateSelectedBlockData('height', parseInt(e.target.value) || 300)}
                placeholder="300"
                min={block.min_height || 100}
                max={block.max_height || 800}
                className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none rounded"
              />
              <span className="text-xs text-gray-500">px</span>
            </div>
            
            {/* 최소/최대값 설정 */}
            <details className="mt-2">
              <summary className="text-xs text-gray-500 cursor-pointer hover:text-gray-700">
                고급 설정
              </summary>
              <div className="grid grid-cols-2 gap-2 mt-2">
                <div>
                  <label className="block text-xs text-gray-500 mb-1">최소 높이</label>
                  <input
                    type="number"
                    value={block.min_height || 100}
                    onChange={(e) => updateSelectedBlockData('min_height', parseInt(e.target.value) || 100)}
                    placeholder="100"
                    min="50"
                    max="500"
                    className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none rounded"
                  />
                </div>
                <div>
                  <label className="block text-xs text-gray-500 mb-1">최대 높이</label>
                  <input
                    type="number"
                    value={block.max_height || 800}
                    onChange={(e) => updateSelectedBlockData('max_height', parseInt(e.target.value) || 800)}
                    placeholder="800"
                    min="200"
                    max="2000"
                    className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none rounded"
                  />
                </div>
              </div>
            </details>
            
            <div className="text-xs text-gray-400">
              슬라이더나 드래그로 높이를 조절할 수 있습니다
            </div>
          </div>
        </div>

        {block.background_color !== undefined && (
          <div>
            <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
              배경색
            </label>
            <div className="flex items-center space-x-2">
              <input
                type="color"
                value={block.background_color || '#ffffff'}
                onChange={(e) => updateSelectedBlockData('background_color', e.target.value)}
                className="w-8 h-8 border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={block.background_color || '#ffffff'}
                onChange={(e) => updateSelectedBlockData('background_color', e.target.value)}
                className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
              />
            </div>
          </div>
        )}
      </>
    );

    switch (block.type) {
      case 'text':
        return (
          <div className="space-y-4">
            {commonSettings}
            
            <div>
              <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                텍스트 내용
              </label>
              <textarea
                value={block.text_content || ''}
                onChange={(e) => updateSelectedBlockData('text_content', e.target.value)}
                placeholder="텍스트를 입력하세요..."
                rows={4}
                className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none resize-none"
              />
            </div>
            
            <div>
              <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                텍스트 크기
              </label>
              <select
                value={block.text_size || 'medium'}
                onChange={(e) => updateSelectedBlockData('text_size', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
              >
                <option value="small">작음</option>
                <option value="medium">보통</option>
                <option value="large">큼</option>
                <option value="xl">매우 큼</option>
                <option value="xxl">초대형</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                텍스트 색상
              </label>
              <div className="flex items-center space-x-2">
                <input
                  type="color"
                  value={block.text_color || '#000000'}
                  onChange={(e) => updateSelectedBlockData('text_color', e.target.value)}
                  className="w-8 h-8 border border-gray-200 cursor-pointer"
                />
                <input
                  type="text"
                  value={block.text_color || '#000000'}
                  onChange={(e) => updateSelectedBlockData('text_color', e.target.value)}
                  className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                />
              </div>
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-4">
            {commonSettings}
            
            <div>
              <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                컬럼 수
              </label>
              <select
                value={block.columns || 3}
                onChange={(e) => updateSelectedBlockData('columns', parseInt(e.target.value))}
                className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
              >
                <option value={1}>1컬럼</option>
                <option value={2}>2컬럼</option>
                <option value={3}>3컬럼</option>
                <option value={4}>4컬럼</option>
                <option value={5}>5컬럼</option>
                <option value={6}>6컬럼</option>
              </select>
            </div>

            <div>
              <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                카드 스타일
              </label>
              <select
                value={block.card_style || 'default'}
                onChange={(e) => updateSelectedBlockData('card_style', e.target.value)}
                className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
              >
                <option value="default">기본</option>
                <option value="compact">컴팩트</option>
                <option value="detailed">상세</option>
                <option value="large">대형</option>
              </select>
            </div>
          </div>
        );

      default:
        return (
          <div className="space-y-4">
            {commonSettings}
            <div className="text-center text-gray-500 text-xs">
              {getBlockTypeLabel(block.type)} 블록 설정
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
    <div className="min-h-screen bg-gray-50 flex">
      {/* 사이드바 토글 버튼 */}
      <div className={`fixed top-4 z-50 transition-all duration-300 ${
        sidebarOpen ? 'left-80' : 'left-4'
      }`}>
        <button
          onClick={() => setSidebarOpen(!sidebarOpen)}
          className="p-4 bg-white shadow-xl border border-gray-200 hover:shadow-2xl transition-all duration-300"
        >
          <div className="flex items-center space-x-3">
            <svg className="w-5 h-5 text-gray-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              {sidebarOpen ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 19l-7-7 7-7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5l7 7-7 7" />
              )}
            </svg>
            {!sidebarOpen && (
              <span className="text-xs font-medium text-gray-900 uppercase tracking-wider">
                Design Studio
              </span>
            )}
          </div>
        </button>
      </div>

      {/* 디자인 설정 사이드바 */}
      <div className={`fixed left-0 top-0 h-full bg-white shadow-2xl border-r border-gray-200 transition-transform duration-300 z-40 ${
        sidebarOpen ? 'translate-x-0' : '-translate-x-full'
      } w-80 overflow-y-auto`}>
        <div className="flex flex-col h-full">
          {/* 헤더 섹션 */}
          <div className="p-6 border-b border-gray-100">
            <div className="text-center mb-6">
              <div className="w-12 h-12 mx-auto bg-gradient-to-br from-gray-900 to-gray-700 flex items-center justify-center mb-3">
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
            
            {/* 탭 네비게이션 */}
            <div className="flex bg-gray-50 p-1">
              <button
                onClick={() => setActiveTab('design')}
                className={`flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wide transition-all duration-200 ${
                  activeTab === 'design'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
                  </svg>
                  <span>디자인</span>
                </div>
              </button>
              <button
                onClick={() => setActiveTab('block')}
                className={`flex-1 px-4 py-2 text-xs font-medium uppercase tracking-wide transition-all duration-200 ${
                  activeTab === 'block'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <div className="flex items-center justify-center space-x-2">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                  </svg>
                  <span>블록</span>
                  {selectedBlock && (
                    <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  )}
                </div>
              </button>
            </div>
          </div>
          
          {/* 메시지 영역 */}
          {message && (
            <div className="px-6 pt-4">
              <div className={`px-4 py-3 border text-sm ${
                message.type === 'success' 
                  ? 'border-green-200 bg-green-50 text-green-700' 
                  : 'border-red-200 bg-red-50 text-red-700'
              }`}>
                {message.text}
              </div>
            </div>
          )}
          
          {/* 탭 콘텐츠 */}
          <div className="flex-1 p-6">
            <form onSubmit={handleSubmit} className="h-full flex flex-col">
              {activeTab === 'design' && (
                <div className="space-y-8 flex-1">
                  <div className="bg-blue-50 border border-blue-200 p-4">
                    <div className="flex items-start space-x-3">
                      <svg className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      <div>
                        <h4 className="text-sm font-medium text-blue-900 mb-1">글로벌 디자인 설정</h4>
                        <p className="text-xs text-blue-700 leading-relaxed">
                          여기서 변경하는 설정은 전체 상점에 적용됩니다. 개별 블록 설정은 "블록" 탭에서 할 수 있습니다.
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* 색상 설정 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                      Color Palette
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          테마 색상
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={design.theme_color || '#000000'}
                            onChange={(e) => updateDesign('theme_color', e.target.value)}
                            className="w-8 h-8 border border-gray-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={design.theme_color || '#000000'}
                            onChange={(e) => updateDesign('theme_color', e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          강조 색상
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={design.accent_color || '#666666'}
                            onChange={(e) => updateDesign('accent_color', e.target.value)}
                            className="w-8 h-8 border border-gray-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={design.accent_color || '#666666'}
                            onChange={(e) => updateDesign('accent_color', e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          배경 색상
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={design.background_color || '#ffffff'}
                            onChange={(e) => updateDesign('background_color', e.target.value)}
                            className="w-8 h-8 border border-gray-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={design.background_color || '#ffffff'}
                            onChange={(e) => updateDesign('background_color', e.target.value)}
                            className="flex-1 px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          텍스트 색상
                        </label>
                        <div className="flex items-center space-x-2">
                          <input
                            type="color"
                            value={design.text_color || '#000000'}
                            onChange={(e) => updateDesign('text_color', e.target.value)}
                            className="w-8 h-8 border border-gray-200 cursor-pointer"
                          />
                          <input
                            type="text"
                            value={design.text_color || '#000000'}
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
                      Layout Settings
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          헤더 스타일
                        </label>
                        <select
                          value={design.header_style || 'modern'}
                          onChange={(e) => updateDesign('header_style', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="minimal">미니멀</option>
                          <option value="classic">클래식</option>
                          <option value="modern">모던</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          제품 카드 스타일
                        </label>
                        <select
                          value={design.product_card_style || 'default'}
                          onChange={(e) => updateDesign('product_card_style', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="default">기본</option>
                          <option value="compact">컴팩트</option>
                          <option value="detailed">상세</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          배너 높이
                        </label>
                        <select
                          value={design.banner_height || 'medium'}
                          onChange={(e) => updateDesign('banner_height', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="small">작음</option>
                          <option value="medium">보통</option>
                          <option value="large">큼</option>
                          <option value="full">전체화면</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          로고 위치
                        </label>
                        <select
                          value={design.logo_position || 'center'}
                          onChange={(e) => updateDesign('logo_position', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="left">왼쪽</option>
                          <option value="center">중앙</option>
                          <option value="right">오른쪽</option>
                        </select>
                      </div>
                    </div>
                  </div>

                  {/* 표시 옵션 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                      Display Options
                    </h3>
                    
                    <div className="space-y-3">
                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={design.show_store_description || false}
                          onChange={(e) => updateDesign('show_store_description', e.target.checked)}
                          className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500 focus:ring-2"
                        />
                        <span className="text-xs text-gray-700 uppercase tracking-wide">상점 설명 표시</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={design.show_contact_info || false}
                          onChange={(e) => updateDesign('show_contact_info', e.target.checked)}
                          className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500 focus:ring-2"
                        />
                        <span className="text-xs text-gray-700 uppercase tracking-wide">연락처 정보 표시</span>
                      </label>

                      <label className="flex items-center space-x-3">
                        <input
                          type="checkbox"
                          checked={design.show_business_hours || false}
                          onChange={(e) => updateDesign('show_business_hours', e.target.checked)}
                          className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500 focus:ring-2"
                        />
                        <span className="text-xs text-gray-700 uppercase tracking-wide">영업시간 표시</span>
                      </label>
                    </div>
                  </div>

                  {/* 타이포그래피 */}
                  <div className="space-y-4">
                    <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide border-b border-gray-200 pb-2">
                      Typography
                    </h3>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          제목 크기
                        </label>
                        <select
                          value={design.title_font_size || 'large'}
                          onChange={(e) => updateDesign('title_font_size', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="small">작음</option>
                          <option value="medium">보통</option>
                          <option value="large">큼</option>
                          <option value="xl">매우 큼</option>
                        </select>
                      </div>

                      <div>
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          설명 크기
                        </label>
                        <select
                          value={design.description_font_size || 'medium'}
                          onChange={(e) => updateDesign('description_font_size', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="small">작음</option>
                          <option value="medium">보통</option>
                          <option value="large">큼</option>
                        </select>
                      </div>

                      <div className="col-span-2">
                        <label className="block text-xs text-gray-600 mb-2 uppercase tracking-wide">
                          폰트 패밀리
                        </label>
                        <select
                          value={design.font_family || 'Inter'}
                          onChange={(e) => updateDesign('font_family', e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-gray-200 focus:border-gray-400 focus:outline-none"
                        >
                          <option value="Inter">Inter</option>
                          <option value="Noto Sans KR">Noto Sans KR</option>
                          <option value="Roboto">Roboto</option>
                          <option value="Open Sans">Open Sans</option>
                          <option value="Lato">Lato</option>
                        </select>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {activeTab === 'block' && (
                <div className="space-y-6 flex-1">
                  {selectedBlock ? (
                    <div>
                      <div className="flex items-center space-x-3 mb-6">
                        <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                          <svg className="w-5 h-5 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                          </svg>
                        </div>
                        <div>
                          <h3 className="text-sm font-medium text-gray-900 uppercase tracking-wide">
                            {getBlockTypeLabel(selectedBlock.type)} 블록
                          </h3>
                          <p className="text-xs text-gray-500">
                            블록 #{selectedBlock.position + 1} 설정
                          </p>
                        </div>
                      </div>
                      
                      <div className="space-y-6">
                        {renderBlockSettings(selectedBlock)}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center space-y-6">
                      <div className="w-20 h-20 mx-auto bg-gray-100 flex items-center justify-center">
                        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
                        </svg>
                      </div>

                      <div>
                        <h3 className="text-sm font-medium text-gray-900 mb-2">
                          블록을 선택해주세요
                        </h3>
                        <p className="text-xs text-gray-500 leading-relaxed">
                          우측 미리보기에서 편집하고 싶은 블록을 클릭하면<br/>
                          해당 블록의 설정을 여기에서 변경할 수 있습니다.
                        </p>
                      </div>

                      <div className="bg-gray-50 border border-gray-200 p-4">
                        <div className="space-y-3 text-xs text-gray-600">
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                            <span>블록 클릭: 선택 및 설정</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>더블클릭: 블록 탭 열기</span>
                          </div>
                          <div className="flex items-center space-x-2">
                            <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                            <span>드래그: 순서 변경</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              {/* 저장 및 취소 버튼 */}
              <div className="pt-6 border-t border-gray-200 mt-auto">
                <div className="flex space-x-3">
                  <button
                    type="button"
                    onClick={handleCancel}
                    className="flex-1 px-6 py-3 border border-gray-300 text-gray-700 text-sm font-medium tracking-wider uppercase hover:bg-gray-50 transition-colors duration-300"
                  >
                    CANCEL
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 px-6 py-3 bg-gray-900 text-white text-sm font-medium tracking-wider uppercase hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors duration-300"
                  >
                    {loading ? 'SAVING...' : 'SAVE DESIGN'}
                  </button>
                </div>
              </div>
            </form>
          </div>
        </div>
      </div>

      {/* 메인 콘텐츠 - 우측 미리보기 영역 */}
      <div 
        className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-80' : 'ml-0'}`}
        style={{
          '--sidebar-width': sidebarOpen ? '20rem' : '0rem',
          '--sidebar-open': sidebarOpen ? '1' : '0'
        } as React.CSSProperties}
      >
        <div className="store-design-preview">
          <BasicInlinePreviewArea 
            storeId={storeId}
            design={design}
            onDesignUpdate={setDesign}
            products={products}
            storeData={storeData}
            onSelectedBlockChange={handleSelectedBlockChange}
            onBlockDoubleClick={handleBlockDoubleClick}
          />
        </div>
      </div>
      
      {/* 디자인 페이지용 스타일 */}
      <style jsx>{`
        .store-design-preview {
          position: relative;
          overflow-x: hidden; /* 가로 스크롤 방지 */
        }
        
        /* 높이 조절 슬라이더 스타일 */
        :global(.slider) {
          -webkit-appearance: none;
          appearance: none;
          outline: none;
        }
        
        :global(.slider::-webkit-slider-thumb) {
          -webkit-appearance: none;
          appearance: none;
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #374151;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        :global(.slider::-webkit-slider-thumb:hover) {
          background: #1f2937;
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        :global(.slider::-moz-range-thumb) {
          width: 18px;
          height: 18px;
          border-radius: 50%;
          background: #374151;
          border: 2px solid #ffffff;
          cursor: pointer;
          box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
          transition: all 0.2s ease;
        }
        
        :global(.slider::-moz-range-thumb:hover) {
          background: #1f2937;
          transform: scale(1.1);
          box-shadow: 0 4px 8px rgba(0, 0, 0, 0.2);
        }
        
        /* contained 블록은 적절한 컨테이너와 패딩 유지 */
        .store-design-preview :global(.inline-block:not([style*="calc(100% + 4rem)"])) {
          max-width: 1280px; /* max-w-7xl equivalent */
          margin-left: auto;
          margin-right: auto;
          padding-left: 1rem; /* px-4 equivalent */
          padding-right: 1rem;
        }
        
        /* 중간 이상 화면에서 패딩 증가 */
        @media (min-width: 640px) {
          .store-design-preview :global(.inline-block:not([style*="calc(100% + 4rem)"])) {
            padding-left: 1.5rem; /* sm:px-6 equivalent */
            padding-right: 1.5rem;
          }
        }
        
        @media (min-width: 1024px) {
          .store-design-preview :global(.inline-block:not([style*="calc(100% + 4rem)"])) {
            padding-left: 2rem; /* lg:px-8 equivalent */
            padding-right: 2rem;
          }
        }
        
        /* full-width 블록은 사용 가능한 전체 너비 사용 */
        .store-design-preview :global([style*="calc(100% + 4rem)"]) {
          /* 사이드바 상태에 따른 동적 너비 */
          width: calc(100vw - var(--sidebar-width, 0rem)) !important;
          max-width: none !important;
          transition: width 0.3s ease, margin-left 0.3s ease !important;
          /* 사이드바가 열렸을 때: 사이드바 끝에서 시작 */
          margin-left: calc(-50vw + 50% + var(--sidebar-width, 0rem) / 2) !important;
          margin-right: calc(-50vw + 50%) !important;
        }
        
        /* 모바일에서는 사이드바가 오버레이이므로 전체 너비 유지 */
        @media (max-width: 1023px) {
          .store-design-preview :global([style*="calc(100% + 4rem)"]) {
            width: 100vw !important;
            margin-left: calc(-50vw + 50%) !important;
            margin-right: calc(-50vw + 50%) !important;
          }
        }
      `}</style>
    </div>
  );
} 