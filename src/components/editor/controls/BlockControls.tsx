import React from 'react';
import { StoreBlock, BlockType } from '@/types/blockTypes';

// ===========================================
// 공통 컨트롤 컴포넌트들
// ===========================================

interface BaseControlProps {
  value: any;
  onChange: (value: any) => void;
  disabled?: boolean;
}

// 슬라이더 컨트롤
export const SliderControl: React.FC<BaseControlProps & {
  min: number;
  max: number;
  step?: number;
  label: string;
}> = ({ value, onChange, min, max, step = 1, label, disabled }) => (
  <div className="space-y-2">
    <div className="flex justify-between items-center">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      <span className="text-sm text-gray-500">{value}</span>
    </div>
    <input
      type="range"
      min={min}
      max={max}
      step={step}
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      disabled={disabled}
      className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer slider"
    />
  </div>
);

// 선택 드롭다운 컨트롤
export const SelectControl: React.FC<BaseControlProps & {
  options: { value: string; label: string }[];
  label: string;
}> = ({ value, onChange, options, label, disabled }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
    >
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  </div>
);

// 토글 스위치 컨트롤
export const ToggleControl: React.FC<BaseControlProps & {
  label: string;
  description?: string;
}> = ({ value, onChange, label, description, disabled }) => (
  <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
    <div className="flex-1">
      <label className="text-sm font-medium text-gray-700">{label}</label>
      {description && (
        <p className="text-xs text-gray-500 mt-1">{description}</p>
      )}
    </div>
    <button
      onClick={() => onChange(!value)}
      disabled={disabled}
      className={`
        relative inline-flex h-6 w-11 items-center rounded-full transition-colors
        ${value ? 'bg-blue-600' : 'bg-gray-200'}
        ${disabled ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}
      `}
    >
      <span
        className={`
          inline-block h-4 w-4 transform rounded-full bg-white transition-transform
          ${value ? 'translate-x-6' : 'translate-x-1'}
        `}
      />
    </button>
  </div>
);

// 색상 선택 컨트롤
export const ColorControl: React.FC<BaseControlProps & {
  label: string;
  preset?: string[];
}> = ({ value, onChange, label, preset, disabled }) => (
  <div className="space-y-3">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    <div className="flex items-center space-x-3">
      <div className="relative">
        <input
          type="color"
          value={value || '#000000'}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="w-10 h-10 border border-gray-300 rounded cursor-pointer"
        />
      </div>
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        disabled={disabled}
        placeholder="#000000"
        className="flex-1 px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    </div>
    {preset && (
      <div className="flex flex-wrap gap-2">
        {preset.map((color) => (
          <button
            key={color}
            onClick={() => onChange(color)}
            disabled={disabled}
            className="w-8 h-8 rounded-full border-2 border-gray-300 hover:border-gray-400"
            style={{ backgroundColor: color }}
          />
        ))}
      </div>
    )}
  </div>
);

// 텍스트 입력 컨트롤
export const TextControl: React.FC<BaseControlProps & {
  label: string;
  placeholder?: string;
  multiline?: boolean;
  rows?: number;
}> = ({ value, onChange, label, placeholder, multiline, rows = 3, disabled }) => (
  <div className="space-y-2">
    <label className="text-sm font-medium text-gray-700">{label}</label>
    {multiline ? (
      <textarea
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent resize-none"
      />
    ) : (
      <input
        type="text"
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        disabled={disabled}
        className="w-full px-3 py-2 border border-gray-300 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
      />
    )}
  </div>
);

// ===========================================
// 블록별 특화 컨트롤 컴포넌트들
// ===========================================

// TEXT BLOCK 컨트롤
export const TextBlockControls: React.FC<{
  block: Extract<StoreBlock, { type: 'text' }>;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, onUpdate }) => {
  const updateData = (field: string, value: any) => {
    onUpdate({
      data: { ...block.data, [field]: value }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg">
      <h3 className="font-medium text-gray-900">텍스트 설정</h3>
      
      <TextControl
        value={block.data.text_content}
        onChange={(value) => updateData('text_content', value)}
        label="텍스트 내용"
        placeholder="여기에 텍스트를 입력하세요..."
        multiline
        rows={4}
      />

      <SelectControl
        value={block.data.text_size}
        onChange={(value) => updateData('text_size', value)}
        label="텍스트 크기"
        options={[
          { value: 'small', label: '작게' },
          { value: 'medium', label: '보통' },
          { value: 'large', label: '크게' },
          { value: 'xl', label: '매우 크게' },
          { value: 'xxl', label: '초대형' }
        ]}
      />

      <SelectControl
        value={block.data.text_alignment}
        onChange={(value) => updateData('text_alignment', value)}
        label="텍스트 정렬"
        options={[
          { value: 'left', label: '왼쪽' },
          { value: 'center', label: '가운데' },
          { value: 'right', label: '오른쪽' },
          { value: 'justify', label: '양쪽 정렬' }
        ]}
      />

      <SelectControl
        value={block.data.font_weight}
        onChange={(value) => updateData('font_weight', value)}
        label="글자 굵기"
        options={[
          { value: 'normal', label: '보통' },
          { value: 'medium', label: '중간' },
          { value: 'semibold', label: '반굵게' },
          { value: 'bold', label: '굵게' }
        ]}
      />

      <ColorControl
        value={block.data.text_color}
        onChange={(value) => updateData('text_color', value)}
        label="텍스트 색상"
        preset={['#000000', '#333333', '#666666', '#999999', '#FFFFFF']}
      />

      <ColorControl
        value={block.data.background_color}
        onChange={(value) => updateData('background_color', value)}
        label="배경 색상"
        preset={['#FFFFFF', '#F3F4F6', '#E5E7EB', '#D1D5DB', '#9CA3AF']}
      />

      <ToggleControl
        value={block.data.enable_markdown}
        onChange={(value) => updateData('enable_markdown', value)}
        label="마크다운 지원"
        description="**굵게**, *기울임* 등 마크다운 문법 사용"
      />
    </div>
  );
};

// PRODUCT GRID BLOCK 컨트롤
export const ProductGridControls: React.FC<{
  block: Extract<StoreBlock, { type: 'grid' }>;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, onUpdate }) => {
  const updateData = (field: string, value: any) => {
    onUpdate({
      data: { ...block.data, [field]: value }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg">
      <h3 className="font-medium text-gray-900">제품 그리드 설정</h3>

      <SliderControl
        value={block.data.columns}
        onChange={(value) => updateData('columns', value)}
        min={1}
        max={8}
        label="컬럼 수"
      />

      <SelectControl
        value={block.data.spacing}
        onChange={(value) => updateData('spacing', value)}
        label="간격"
        options={[
          { value: 'none', label: '없음' },
          { value: 'tight', label: '좁게' },
          { value: 'normal', label: '보통' },
          { value: 'loose', label: '넓게' },
          { value: 'extra-loose', label: '매우 넓게' }
        ]}
      />

      <SelectControl
        value={block.data.card_style}
        onChange={(value) => updateData('card_style', value)}
        label="카드 스타일"
        options={[
          { value: 'default', label: '기본' },
          { value: 'compact', label: '컴팩트' },
          { value: 'detailed', label: '상세' },
          { value: 'minimal', label: '미니멀' }
        ]}
      />

      <SelectControl
        value={block.data.height_ratio}
        onChange={(value) => updateData('height_ratio', value)}
        label="높이 비율"
        options={[
          { value: 'square', label: '정사각형' },
          { value: 'portrait', label: '세로형' },
          { value: 'landscape', label: '가로형' },
          { value: 'auto', label: '자동' }
        ]}
      />

      <div className="space-y-3">
        <h4 className="text-sm font-medium text-gray-700">표시 옵션</h4>
        
        <ToggleControl
          value={block.data.show_price}
          onChange={(value) => updateData('show_price', value)}
          label="가격 표시"
        />

        <ToggleControl
          value={block.data.show_description}
          onChange={(value) => updateData('show_description', value)}
          label="설명 표시"
        />

        <ToggleControl
          value={block.data.show_rating}
          onChange={(value) => updateData('show_rating', value)}
          label="평점 표시"
        />
      </div>

      <SelectControl
        value={block.data.sort_by}
        onChange={(value) => updateData('sort_by', value)}
        label="정렬 기준"
        options={[
          { value: 'newest', label: '최신순' },
          { value: 'price_asc', label: '가격 낮은순' },
          { value: 'price_desc', label: '가격 높은순' },
          { value: 'rating', label: '평점순' },
          { value: 'sales', label: '판매량순' }
        ]}
      />
    </div>
  );
};

// FEATURED PRODUCT BLOCK 컨트롤
export const FeaturedProductControls: React.FC<{
  block: Extract<StoreBlock, { type: 'featured' }>;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, onUpdate }) => {
  const updateData = (field: string, value: any) => {
    onUpdate({
      data: { ...block.data, [field]: value }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg">
      <h3 className="font-medium text-gray-900">피처드 제품 설정</h3>

      <SelectControl
        value={block.data.featured_size}
        onChange={(value) => updateData('featured_size', value)}
        label="크기"
        options={[
          { value: 'medium', label: '중간' },
          { value: 'large', label: '크게' },
          { value: 'hero', label: '영웅 크기' }
        ]}
      />

      <SelectControl
        value={block.data.layout_style}
        onChange={(value) => updateData('layout_style', value)}
        label="레이아웃 스타일"
        options={[
          { value: 'overlay', label: '오버레이' },
          { value: 'side-by-side', label: '나란히' },
          { value: 'bottom', label: '하단' }
        ]}
      />

      <ToggleControl
        value={block.data.show_text_overlay}
        onChange={(value) => updateData('show_text_overlay', value)}
        label="텍스트 오버레이"
        description="이미지 위에 텍스트 표시"
      />

      {block.data.show_text_overlay && (
        <SelectControl
          value={block.data.overlay_position}
          onChange={(value) => updateData('overlay_position', value)}
          label="오버레이 위치"
          options={[
            { value: 'top-left', label: '왼쪽 상단' },
            { value: 'top-right', label: '오른쪽 상단' },
            { value: 'bottom-left', label: '왼쪽 하단' },
            { value: 'bottom-right', label: '오른쪽 하단' },
            { value: 'center', label: '중앙' }
          ]}
        />
      )}

      <TextControl
        value={block.data.custom_title}
        onChange={(value) => updateData('custom_title', value)}
        label="커스텀 제목"
        placeholder="제품명 대신 사용할 제목"
      />

      <TextControl
        value={block.data.custom_description}
        onChange={(value) => updateData('custom_description', value)}
        label="커스텀 설명"
        placeholder="제품 설명 대신 사용할 내용"
        multiline
      />

      <TextControl
        value={block.data.call_to_action}
        onChange={(value) => updateData('call_to_action', value)}
        label="행동 유도 버튼"
        placeholder="자세히 보기"
      />

      <ToggleControl
        value={block.data.enable_parallax}
        onChange={(value) => updateData('enable_parallax', value)}
        label="패럴랙스 효과"
        description="스크롤 시 시각적 효과"
      />
    </div>
  );
};

// BANNER BLOCK 컨트롤
export const BannerControls: React.FC<{
  block: Extract<StoreBlock, { type: 'banner' }>;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, onUpdate }) => {
  const updateData = (field: string, value: any) => {
    onUpdate({
      data: { ...block.data, [field]: value }
    });
  };

  return (
    <div className="space-y-4 p-4 bg-white border rounded-lg">
      <h3 className="font-medium text-gray-900">배너 설정</h3>

      <SelectControl
        value={block.data.banner_height}
        onChange={(value) => updateData('banner_height', value)}
        label="높이"
        options={[
          { value: 'small', label: '작게' },
          { value: 'medium', label: '보통' },
          { value: 'large', label: '크게' },
          { value: 'hero', label: '영웅 크기' }
        ]}
      />

      <SelectControl
        value={block.data.banner_style}
        onChange={(value) => updateData('banner_style', value)}
        label="배경 스타일"
        options={[
          { value: 'solid', label: '단색' },
          { value: 'gradient', label: '그라데이션' },
          { value: 'image', label: '이미지' }
        ]}
      />

      {block.data.banner_style === 'solid' && (
        <ColorControl
          value={block.data.background_color}
          onChange={(value) => updateData('background_color', value)}
          label="배경 색상"
        />
      )}

      {block.data.banner_style === 'gradient' && (
        <div className="space-y-3">
          <ColorControl
            value={block.data.gradient_colors?.[0]}
            onChange={(value) => updateData('gradient_colors', [value, block.data.gradient_colors?.[1] || '#8B5CF6'])}
            label="그라데이션 시작 색상"
          />
          <ColorControl
            value={block.data.gradient_colors?.[1]}
            onChange={(value) => updateData('gradient_colors', [block.data.gradient_colors?.[0] || '#3B82F6', value])}
            label="그라데이션 끝 색상"
          />
          <SelectControl
            value={block.data.gradient_direction}
            onChange={(value) => updateData('gradient_direction', value)}
            label="그라데이션 방향"
            options={[
              { value: 'horizontal', label: '가로' },
              { value: 'vertical', label: '세로' },
              { value: 'diagonal', label: '대각선' }
            ]}
          />
        </div>
      )}

      <TextControl
        value={block.data.title}
        onChange={(value) => updateData('title', value)}
        label="제목"
        placeholder="배너 제목"
      />

      <TextControl
        value={block.data.description}
        onChange={(value) => updateData('description', value)}
        label="설명"
        placeholder="배너 설명"
        multiline
      />

      <TextControl
        value={block.data.call_to_action}
        onChange={(value) => updateData('call_to_action', value)}
        label="버튼 텍스트"
        placeholder="지금 확인하기"
      />

      <ColorControl
        value={block.data.text_color}
        onChange={(value) => updateData('text_color', value)}
        label="텍스트 색상"
      />

      <SelectControl
        value={block.data.text_alignment}
        onChange={(value) => updateData('text_alignment', value)}
        label="텍스트 정렬"
        options={[
          { value: 'left', label: '왼쪽' },
          { value: 'center', label: '가운데' },
          { value: 'right', label: '오른쪽' }
        ]}
      />

      <ToggleControl
        value={block.data.enable_animation}
        onChange={(value) => updateData('enable_animation', value)}
        label="애니메이션 효과"
        description="배너에 동적 효과 추가"
      />
    </div>
  );
};

// 통합 블록 컨트롤 라우터
export const BlockControlsRouter: React.FC<{
  block: StoreBlock;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, onUpdate }) => {
  switch (block.type) {
    case 'text':
      return <TextBlockControls block={block} onUpdate={onUpdate} />;
    case 'grid':
      return <ProductGridControls block={block} onUpdate={onUpdate} />;
    case 'featured':
      return <FeaturedProductControls block={block} onUpdate={onUpdate} />;
    case 'banner':
      return <BannerControls block={block} onUpdate={onUpdate} />;
    default:
      return (
        <div className="p-4 text-gray-500 text-center">
          이 블록 타입에 대한 컨트롤이 아직 구현되지 않았습니다.
        </div>
      );
  }
}; 