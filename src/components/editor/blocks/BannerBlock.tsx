import React, { useState } from 'react';
import { BannerBlockData } from '@/types/blockTypes';

interface BannerBlockProps {
  data: BannerBlockData;
  isEditing: boolean;
  isSelected: boolean;
  onUpdate: (updates: Partial<BannerBlockData>) => void;
}

export const BannerBlock: React.FC<BannerBlockProps> = ({
  data,
  isEditing,
  isSelected,
  onUpdate
}) => {
  const [editingField, setEditingField] = useState<'title' | 'description' | 'cta' | null>(null);

  // 배너 높이 클래스
  const getHeightClass = (): string => {
    switch (data.banner_height) {
      case 'small': return 'h-32';
      case 'large': return 'h-64';
      case 'hero': return 'h-96';
      default: return 'h-48';
    }
  };

  // 배경 스타일 계산
  const getBackgroundStyle = (): React.CSSProperties => {
    const baseStyle: React.CSSProperties = {};

    switch (data.banner_style) {
      case 'solid':
        baseStyle.backgroundColor = data.background_color || '#374151';
        break;
      case 'gradient':
        if (data.gradient_colors && data.gradient_colors.length === 2) {
          const direction = data.gradient_direction === 'vertical' ? 'to bottom' :
                           data.gradient_direction === 'diagonal' ? 'to bottom right' : 'to right';
          baseStyle.background = `linear-gradient(${direction}, ${data.gradient_colors[0]}, ${data.gradient_colors[1]})`;
        }
        break;
      case 'image':
        if (data.background_image_url) {
          baseStyle.backgroundImage = `url(${data.background_image_url})`;
          baseStyle.backgroundSize = 'cover';
          baseStyle.backgroundPosition = 'center';
        } else {
          baseStyle.backgroundColor = data.background_color || '#374151';
        }
        break;
    }

    return baseStyle;
  };

  // 텍스트 정렬 클래스
  const getTextAlignmentClass = (): string => {
    switch (data.text_alignment) {
      case 'left': return 'text-left';
      case 'right': return 'text-right';
      default: return 'text-center';
    }
  };

  // 인라인 텍스트 편집
  const handleInlineEdit = (field: 'title' | 'description' | 'call_to_action', value: string) => {
    onUpdate({ [field]: value });
  };

  return (
    <div 
      className={`
        ${getHeightClass()} 
        ${getTextAlignmentClass()}
        rounded-lg flex items-center justify-center relative overflow-hidden
      `}
      style={getBackgroundStyle()}
    >
      {/* 이미지 배경일 때 오버레이 */}
      {data.banner_style === 'image' && data.background_image_url && (
        <div className="absolute inset-0 bg-black bg-opacity-40" />
      )}

      {/* 콘텐츠 */}
      <div className="relative z-10 p-8 max-w-2xl mx-auto">
        {/* 제목 */}
        {(data.title || isEditing) && (
          <div className="mb-4">
            {editingField === 'title' ? (
              <input
                type="text"
                value={data.title || ''}
                onChange={(e) => handleInlineEdit('title', e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingField(null);
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="bg-transparent border-none outline-none text-3xl font-bold w-full text-center"
                style={{ color: data.text_color || '#FFFFFF' }}
                placeholder="배너 제목을 입력하세요"
                autoFocus
              />
            ) : (
              <h2 
                className="text-3xl font-bold cursor-text"
                style={{ color: data.text_color || '#FFFFFF' }}
                onClick={() => isEditing && setEditingField('title')}
              >
                {data.title || (isEditing ? '제목을 클릭하여 편집' : '')}
              </h2>
            )}
          </div>
        )}

        {/* 설명 */}
        {(data.description || isEditing) && (
          <div className="mb-6">
            {editingField === 'description' ? (
              <textarea
                value={data.description || ''}
                onChange={(e) => handleInlineEdit('description', e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && !e.shiftKey) {
                    e.preventDefault();
                    setEditingField(null);
                  }
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="bg-transparent border-none outline-none text-lg w-full text-center resize-none"
                style={{ color: data.text_color || '#FFFFFF' }}
                placeholder="배너 설명을 입력하세요"
                rows={2}
                autoFocus
              />
            ) : (
              <p 
                className="text-lg cursor-text"
                style={{ color: data.text_color || '#FFFFFF' }}
                onClick={() => isEditing && setEditingField('description')}
              >
                {data.description || (isEditing ? '설명을 클릭하여 편집' : '')}
              </p>
            )}
          </div>
        )}

        {/* 행동 유도 버튼 */}
        {(data.call_to_action || isEditing) && (
          <div>
            {editingField === 'cta' ? (
              <input
                type="text"
                value={data.call_to_action || ''}
                onChange={(e) => handleInlineEdit('call_to_action', e.target.value)}
                onBlur={() => setEditingField(null)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') setEditingField(null);
                  if (e.key === 'Escape') setEditingField(null);
                }}
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium border-none outline-none"
                placeholder="버튼 텍스트"
                autoFocus
              />
            ) : (
              <button 
                className="bg-white text-gray-900 px-6 py-3 rounded-lg font-medium hover:bg-gray-100 transition-colors"
                onClick={() => isEditing && setEditingField('cta')}
              >
                {data.call_to_action || (isEditing ? '버튼 텍스트 편집' : '버튼')}
              </button>
            )}
          </div>
        )}

        {/* 편집 모드 안내 */}
        {isEditing && !data.title && !data.description && !data.call_to_action && (
          <div className="text-center">
            <p className="text-white text-opacity-75 mb-4">
              클릭하여 콘텐츠를 추가하세요
            </p>
            <div className="space-x-2">
              <button 
                onClick={() => {
                  onUpdate({ title: '배너 제목' });
                  setEditingField('title');
                }}
                className="bg-white bg-opacity-20 text-white px-3 py-1 rounded text-sm"
              >
                제목 추가
              </button>
              <button 
                onClick={() => {
                  onUpdate({ description: '배너 설명' });
                  setEditingField('description');
                }}
                className="bg-white bg-opacity-20 text-white px-3 py-1 rounded text-sm"
              >
                설명 추가
              </button>
              <button 
                onClick={() => {
                  onUpdate({ call_to_action: '버튼 텍스트' });
                  setEditingField('cta');
                }}
                className="bg-white bg-opacity-20 text-white px-3 py-1 rounded text-sm"
              >
                버튼 추가
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// 빠른 설정 컨트롤들
export const BannerBlockControls: React.FC<{
  data: BannerBlockData;
  onUpdate: (updates: Partial<BannerBlockData>) => void;
}> = ({ data, onUpdate }) => (
  <div className="space-y-4">
    {/* 배너 높이 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">높이</label>
      <div className="grid grid-cols-2 gap-1">
        {(['small', 'medium', 'large', 'hero'] as const).map((height) => (
          <button
            key={height}
            onClick={() => onUpdate({ banner_height: height })}
            className={`px-2 py-1 text-xs rounded ${
              data.banner_height === height 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {height === 'small' ? '작게' :
             height === 'medium' ? '보통' :
             height === 'large' ? '크게' : '전체'}
          </button>
        ))}
      </div>
    </div>

    {/* 배경 스타일 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">배경 스타일</label>
      <select
        value={data.banner_style}
        onChange={(e) => onUpdate({ 
          banner_style: e.target.value as BannerBlockData['banner_style']
        })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="solid">단색</option>
        <option value="gradient">그라데이션</option>
        <option value="image">이미지</option>
      </select>
    </div>

    {/* 배경색 (단색일 때) */}
    {data.banner_style === 'solid' && (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">배경색</label>
        <input
          type="color"
          value={data.background_color || '#374151'}
          onChange={(e) => onUpdate({ background_color: e.target.value })}
          className="w-full h-8 border border-gray-300 rounded"
        />
      </div>
    )}

    {/* 그라데이션 설정 */}
    {data.banner_style === 'gradient' && (
      <div className="space-y-2">
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">그라데이션 시작</label>
          <input
            type="color"
            value={data.gradient_colors?.[0] || '#3B82F6'}
            onChange={(e) => onUpdate({ 
              gradient_colors: [e.target.value, data.gradient_colors?.[1] || '#8B5CF6']
            })}
            className="w-full h-8 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">그라데이션 끝</label>
          <input
            type="color"
            value={data.gradient_colors?.[1] || '#8B5CF6'}
            onChange={(e) => onUpdate({ 
              gradient_colors: [data.gradient_colors?.[0] || '#3B82F6', e.target.value]
            })}
            className="w-full h-8 border border-gray-300 rounded"
          />
        </div>
        <div>
          <label className="block text-xs font-medium text-gray-700 mb-1">방향</label>
          <select
            value={data.gradient_direction || 'horizontal'}
            onChange={(e) => onUpdate({ 
              gradient_direction: e.target.value as BannerBlockData['gradient_direction']
            })}
            className="w-full text-xs border border-gray-300 rounded px-2 py-1"
          >
            <option value="horizontal">가로</option>
            <option value="vertical">세로</option>
            <option value="diagonal">대각선</option>
          </select>
        </div>
      </div>
    )}

    {/* 배경 이미지 URL (이미지일 때) */}
    {data.banner_style === 'image' && (
      <div>
        <label className="block text-xs font-medium text-gray-700 mb-1">이미지 URL</label>
        <input
          type="url"
          value={data.background_image_url || ''}
          onChange={(e) => onUpdate({ background_image_url: e.target.value })}
          placeholder="https://example.com/image.jpg"
          className="w-full text-xs border border-gray-300 rounded px-2 py-1"
        />
      </div>
    )}

    {/* 텍스트 색상 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">텍스트 색상</label>
      <input
        type="color"
        value={data.text_color || '#FFFFFF'}
        onChange={(e) => onUpdate({ text_color: e.target.value })}
        className="w-full h-8 border border-gray-300 rounded"
      />
    </div>

    {/* 텍스트 정렬 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">텍스트 정렬</label>
      <div className="flex space-x-1">
        {(['left', 'center', 'right'] as const).map((align) => (
          <button
            key={align}
            onClick={() => onUpdate({ text_alignment: align })}
            className={`px-2 py-1 text-xs rounded ${
              data.text_alignment === align 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {align === 'left' ? '왼쪽' : align === 'center' ? '가운데' : '오른쪽'}
          </button>
        ))}
      </div>
    </div>

    {/* 링크 URL */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">버튼 링크</label>
      <input
        type="url"
        value={data.cta_link || ''}
        onChange={(e) => onUpdate({ cta_link: e.target.value })}
        placeholder="https://example.com"
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      />
    </div>

    {/* 애니메이션 효과 */}
    <div>
      <label className="flex items-center">
        <input
          type="checkbox"
          checked={data.enable_animation || false}
          onChange={(e) => onUpdate({ enable_animation: e.target.checked })}
          className="mr-2"
        />
        <span className="text-xs">애니메이션 효과</span>
      </label>
    </div>
  </div>
); 