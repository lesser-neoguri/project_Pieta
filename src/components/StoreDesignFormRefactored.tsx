import React, { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';
import { InlinePreviewArea } from './editor/InlinePreviewArea';

// 기존 StoreDesign 타입 유지 (간략화)
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
  row_layouts?: any; // 인라인 에디터에서 관리
  products_per_row?: number;
  enable_custom_rows?: boolean;
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
  row_layouts: {
    0: {
      layout_type: 'featured',
      featured_size: 'large',
      spacing: 'normal',
      show_text_overlay: true,
      overlay_position: 'center',
      text_alignment: 'center'
    },
    1: {
      layout_type: 'text',
      spacing: 'normal',
      text_content: '프리미엄 컬렉션',
      text_size: 'large',
      text_color: '#333333',
      text_weight: 'medium',
      text_style: 'paragraph',
      max_width: 'medium',
      padding: 'large',
      text_alignment: 'center'
    },
    2: {
      layout_type: 'grid',
      columns: 4,
      card_style: 'default',
      spacing: 'normal',
      height_ratio: 'square',
      text_alignment: 'left'
    }
  },
  products_per_row: 4,
  enable_custom_rows: true,
  product_spacing: 'normal'
};

export default function StoreDesignFormRefactored({ storeId }: { storeId: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [storeData, setStoreData] = useState<any>(null);
  const [products, setProducts] = useState<any[]>([]);
  const [design, setDesign] = useState<StoreDesign>(defaultDesign as StoreDesign);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [sortBy, setSortBy] = useState('newest');

  // 기존 데이터 로딩 로직 유지
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
          throw storeError;
        }

        setStoreData(store);

        // 제품들 가져오기
        const { data: productsData, error: productsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId);

        if (productsError) {
          throw productsError;
        }

        setProducts(productsData || []);

        // 기존 디자인 가져오기
        const { data: existingDesign, error: designError } = await supabase
          .from('store_designs')
          .select('*')
          .eq('store_id', storeId)
          .single();

        if (designError && designError.code !== 'PGRST116') {
          throw designError;
        }

        if (existingDesign) {
          setDesign(prevDesign => ({
            ...prevDesign,
            ...existingDesign
          }));
        }

      } catch (error) {
        logger.error('Failed to fetch store data:', error);
        setMessage({ text: '데이터를 불러오는 중 오류가 발생했습니다.', type: 'error' });
      }
    };

    fetchStoreData();
  }, [user, storeId]);

  // 디자인 업데이트 핸들러 (인라인 에디터에서 호출)
  const handleDesignUpdate = useCallback((updatedDesign: StoreDesign) => {
    setDesign(updatedDesign);
  }, []);

  // 저장 핸들러
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;

    setLoading(true);
    try {
      const { error } = await supabase
        .from('store_designs')
        .upsert({
          ...design,
          store_id: storeId,
          updated_at: new Date().toISOString()
        });

      if (error) throw error;

      setMessage({ text: '디자인이 성공적으로 저장되었습니다!', type: 'success' });
      setTimeout(() => setMessage(null), 3000);
    } catch (error) {
      logger.error('Failed to save design:', error);
      setMessage({ text: '저장 중 오류가 발생했습니다.', type: 'error' });
    } finally {
      setLoading(false);
    }
  };

  // 기본 설정 업데이트 (sidebar에서 사용)
  const updateDesign = (field: keyof StoreDesign, value: any) => {
    setDesign(prev => ({
      ...prev,
      [field]: value
    }));
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* 상단 네비게이션 */}
      <nav className="bg-white border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
              title="사이드바 토글"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            </button>
            <h1 className="text-xl font-semibold text-gray-900">
              스토어 디자인 편집
            </h1>
            <span className="px-2 py-1 bg-blue-100 text-blue-700 text-xs font-medium rounded">
              인라인 편집 모드
            </span>
          </div>

          <div className="flex items-center space-x-3">
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="text-sm border border-gray-300 rounded-md px-3 py-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="newest">최신순</option>
              <option value="price_asc">가격 낮은순</option>
              <option value="price_desc">가격 높은순</option>
              <option value="rating">평점순</option>
            </select>

            <button
              onClick={handleSubmit}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 transition-colors"
            >
              {loading ? '저장 중...' : '저장'}
            </button>
          </div>
        </div>
      </nav>

      {/* 메시지 표시 */}
      {message && (
        <div className={`px-4 py-3 ${
          message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
        }`}>
          {message.text}
        </div>
      )}

      <div className="flex">
        {/* 사이드바 (기본 설정용) */}
        <div className={`${
          sidebarOpen ? 'w-80' : 'w-0'
        } transition-all duration-300 overflow-hidden bg-white border-r border-gray-200`}>
          <div className="p-6 space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900 mb-4">기본 설정</h2>
              
              {/* 테마 색상 */}
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    테마 색상
                  </label>
                  <input
                    type="color"
                    value={design.theme_color}
                    onChange={(e) => updateDesign('theme_color', e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    배경 색상
                  </label>
                  <input
                    type="color"
                    value={design.background_color}
                    onChange={(e) => updateDesign('background_color', e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    텍스트 색상
                  </label>
                  <input
                    type="color"
                    value={design.text_color}
                    onChange={(e) => updateDesign('text_color', e.target.value)}
                    className="w-full h-10 rounded border border-gray-300"
                  />
                </div>
              </div>

              {/* 폰트 및 레이아웃 */}
              <div className="space-y-4 mt-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    폰트 패밀리
                  </label>
                  <select
                    value={design.font_family}
                    onChange={(e) => updateDesign('font_family', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Inter">Inter</option>
                    <option value="Noto Sans KR">Noto Sans KR</option>
                    <option value="Pretendard">Pretendard</option>
                    <option value="Roboto">Roboto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    헤더 스타일
                  </label>
                  <select
                    value={design.header_style}
                    onChange={(e) => updateDesign('header_style', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="minimal">미니멀</option>
                    <option value="classic">클래식</option>
                    <option value="modern">모던</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    배너 높이
                  </label>
                  <select
                    value={design.banner_height}
                    onChange={(e) => updateDesign('banner_height', e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="small">작음</option>
                    <option value="medium">중간</option>
                    <option value="large">큼</option>
                    <option value="full">전체</option>
                  </select>
                </div>
              </div>

              {/* 표시 옵션 */}
              <div className="space-y-4 mt-6">
                <h3 className="text-sm font-semibold text-gray-900">표시 옵션</h3>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={design.show_store_description}
                    onChange={(e) => updateDesign('show_store_description', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">스토어 설명 표시</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={design.show_contact_info}
                    onChange={(e) => updateDesign('show_contact_info', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">연락처 정보 표시</span>
                </label>

                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={design.show_business_hours}
                    onChange={(e) => updateDesign('show_business_hours', e.target.checked)}
                    className="rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  <span className="ml-2 text-sm text-gray-700">영업시간 표시</span>
                </label>
              </div>
            </div>

            {/* 인라인 편집 안내 */}
            <div className="border-t border-gray-200 pt-6">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">인라인 편집 가이드</h3>
              <div className="space-y-2 text-xs text-gray-600">
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                  <span>블록 클릭하여 선택</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span>더블클릭하여 편집</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-purple-500 rounded-full"></div>
                  <span>+ 버튼으로 블록 추가</span>
                </div>
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full"></div>
                  <span>드래그로 순서 변경</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 인라인 편집 영역 */}
        <div className={`flex-1 transition-all duration-300 ${sidebarOpen ? 'ml-0' : 'ml-0'}`}>
          <InlinePreviewArea
            storeId={storeId}
            storeData={storeData}
            products={products}
            design={design}
            onDesignUpdate={handleDesignUpdate}
            sortBy={sortBy}
            className="w-full"
          />
        </div>
      </div>
    </div>
  );
} 