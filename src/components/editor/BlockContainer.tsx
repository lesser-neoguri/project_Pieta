import React, { useState, useRef } from 'react';
import { 
  StoreBlock, 
  ProductGridBlockData, 
  TextBlockData, 
  FeaturedProductBlockData, 
  BannerBlockData, 
  MasonryBlockData,
  ListBlockData
} from '@/types/blockTypes';

/**
 * 개별 블록을 감싸는 컨테이너 컴포넌트
 * 
 * 기능:
 * - 블록별 호버 상태 및 선택 상태 관리
 * - 드래그 핸들 및 액션 버튼 표시
 * - 인라인 설정 패널
 * - 드래그 앤 드롭 지원
 */

export interface BlockContainerProps {
  block: StoreBlock;
  isSelected: boolean;
  isEditing: boolean;
  isDragging?: boolean;
  onSelect: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<StoreBlock>) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  onDragStart: (blockId: string) => void;
  onDrop: (draggedBlockId: string, targetPosition: number) => void;
}

export const BlockContainer: React.FC<BlockContainerProps> = ({
  block,
  isSelected,
  isEditing,
  isDragging = false,
  onSelect,
  onEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  onDragStart,
  onDrop
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (!isDragging) {
      setIsHovered(true);
    }
  };

  const handleMouseLeave = () => {
    setIsHovered(false);
  };

  const handleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isSelected) {
      onSelect(block.id);
    }
  };

  const handleDoubleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(block.id);
  };

  const handleDragStart = (e: React.DragEvent) => {
    e.dataTransfer.setData('text/plain', block.id);
    onDragStart(block.id);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const draggedBlockId = e.dataTransfer.getData('text/plain');
    if (draggedBlockId !== block.id) {
      onDrop(draggedBlockId, block.position);
    }
  };

  // 블록 타입별 렌더링
  const renderBlockContent = () => {
    switch (block.type) {
      case 'text': {
        const textData = block.data as TextBlockData;
        return (
          <div className="min-h-16 p-4">
            {isEditing ? (
              <textarea
                className="w-full min-h-16 border-none outline-none resize-none bg-transparent"
                value={textData.text_content || ''}
                onChange={(e) => onUpdate(block.id, {
                  data: { ...textData, text_content: e.target.value }
                })}
                placeholder="텍스트를 입력하세요..."
                autoFocus
              />
            ) : (
              <div 
                className={`prose prose-sm max-w-none ${textData.text_size === 'large' ? 'prose-lg' : ''}`}
                style={{ 
                  color: textData.text_color,
                  fontWeight: textData.text_weight === 'bold' ? 'bold' : 'normal'
                }}
              >
                {textData.text_content || '텍스트를 입력하세요...'}
              </div>
            )}
          </div>
        );
      }

      case 'grid': {
        const gridData = block.data as ProductGridBlockData;
        return (
          <div className="p-4">
            <div 
              className="grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${gridData.columns || 4}, 1fr)` 
              }}
            >
              {Array.from({ length: gridData.columns || 4 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                >
                  <span className="text-gray-500 text-sm">제품 {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'featured': {
        const featuredData = block.data as FeaturedProductBlockData;
        return (
          <div className="relative">
            <div 
              className={`
                bg-gray-200 rounded-lg flex items-center justify-center
                ${featuredData.featured_size === 'hero' ? 'h-96' : 
                  featuredData.featured_size === 'large' ? 'h-64' : 'h-48'}
              `}
              style={{ backgroundColor: block.background_color || '#f3f4f6' }}
            >
              <div className="text-center p-8">
                <h3 className="text-2xl font-bold mb-4 text-gray-700">
                  피처드 제품
                </h3>
                <p className="text-gray-600 mb-6">
                  특별한 제품을 강조하여 표시합니다
                </p>
                <button className="bg-gray-700 text-white px-6 py-2 rounded-lg">
                  자세히 보기
                </button>
              </div>
            </div>
          </div>
        );
      }

      case 'banner': {
        const bannerData = block.data as BannerBlockData;
        return (
          <div 
            className={`
              rounded-lg flex items-center justify-center text-center p-8
              ${bannerData.banner_height === 'small' ? 'h-32' :
                bannerData.banner_height === 'large' ? 'h-64' :
                bannerData.banner_height === 'hero' ? 'h-96' : 'h-48'}
            `}
            style={{ 
              backgroundColor: block.background_color || '#374151',
              color: '#ffffff'
            }}
          >
            <div>
              <h2 className="text-3xl font-bold mb-4">배너 제목</h2>
              <p className="mb-6">배너 설명 텍스트</p>
              <button className="bg-white text-gray-900 px-6 py-2 rounded-lg font-medium">
                {bannerData.call_to_action || 'Click here'}
              </button>
            </div>
          </div>
        );
      }

      case 'list': {
        const listData = block.data as ListBlockData;
        return (
          <div className="p-4">
            <div className="space-y-4">
              {Array.from({ length: 3 }).map((_, i) => (
                <div key={i} className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg">
                  <div className="w-16 h-16 bg-gray-300 rounded-lg flex-shrink-0"></div>
                  <div className="flex-1">
                    <h4 className="font-medium text-gray-900">제품 {i + 1}</h4>
                    <p className="text-sm text-gray-600">제품 설명</p>
                    <div className="text-lg font-bold text-gray-900">₩99,000</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );
      }

      case 'masonry': {
        const masonryData = block.data as MasonryBlockData;
        return (
          <div className="p-4">
            <div 
              className="grid gap-4"
              style={{ 
                gridTemplateColumns: `repeat(${masonryData.masonry_columns || 3}, 1fr)` 
              }}
            >
              {Array.from({ length: 6 }).map((_, i) => (
                <div 
                  key={i} 
                  className="bg-gray-100 rounded-lg flex items-center justify-center border-2 border-dashed border-gray-300"
                  style={{ 
                    height: `${120 + (i % 3) * 40}px` // 다양한 높이
                  }}
                >
                  <span className="text-gray-500 text-sm">제품 {i + 1}</span>
                </div>
              ))}
            </div>
          </div>
        );
      }

      default:
        return (
          <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
            미구현 블록
          </div>
        );
    }
  };

  return (
    <div
      ref={containerRef}
      className={`
        relative transition-all duration-200 group
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${isHovered ? 'bg-gray-50' : ''}
        ${isDragging ? 'opacity-50' : ''}
      `}
      draggable
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* 드래그 핸들 */}
      {(isHovered || isSelected) && (
        <div className="absolute left-2 top-2 w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded cursor-grab active:cursor-grabbing flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <svg className="w-3 h-3 text-gray-500" fill="currentColor" viewBox="0 0 20 20">
            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"/>
          </svg>
        </div>
      )}

      {/* 블록 액션 버튼들 */}
      {(isHovered || isSelected) && !isEditing && (
        <div className="absolute right-2 top-2 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity">
          {/* 설정 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              setShowSettings(!showSettings);
            }}
            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
            title="설정"
          >
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          {/* 복제 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDuplicate(block.id);
            }}
            className="w-6 h-6 bg-gray-200 hover:bg-gray-300 rounded flex items-center justify-center"
            title="복제"
          >
            <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </button>

          {/* 삭제 버튼 */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(block.id);
            }}
            className="w-6 h-6 bg-red-100 hover:bg-red-200 rounded flex items-center justify-center"
            title="삭제"
          >
            <svg className="w-3 h-3 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )}

      {/* 빠른 설정 패널 */}
      {showSettings && (
        <div className="absolute right-0 top-8 w-64 bg-white border border-gray-200 rounded-lg shadow-lg p-4 z-10">
          <div className="flex items-center justify-between mb-3">
            <h4 className="font-medium text-gray-900">빠른 설정</h4>
            <button 
              onClick={() => setShowSettings(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          {block.type === 'grid' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">컬럼 수</label>
                <input
                  type="range"
                  min="1"
                  max="6"
                  value={(block.data as ProductGridBlockData).columns || 4}
                  onChange={(e) => onUpdate(block.id, {
                    data: { ...block.data, columns: parseInt(e.target.value) }
                  })}
                  className="w-full"
                />
                <div className="text-xs text-gray-500 text-center">{(block.data as ProductGridBlockData).columns || 4}개</div>
              </div>
            </div>
          )}

          {block.type === 'text' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">텍스트 크기</label>
                <select
                  value={(block.data as TextBlockData).text_size || 'medium'}
                  onChange={(e) => onUpdate(block.id, {
                    data: { 
                      ...block.data, 
                      text_size: e.target.value as 'small' | 'medium' | 'large' | 'xl' | 'xxl'
                    }
                  })}
                  className="w-full text-xs border border-gray-300 rounded px-2 py-1"
                >
                  <option value="small">작게</option>
                  <option value="medium">보통</option>
                  <option value="large">크게</option>
                  <option value="xl">매우 크게</option>
                </select>
              </div>
              
              <div>
                <label className="block text-xs text-gray-600 mb-1">텍스트 색상</label>
                <input
                  type="color"
                  value={(block.data as TextBlockData).text_color || '#333333'}
                  onChange={(e) => onUpdate(block.id, {
                    data: { ...block.data, text_color: e.target.value }
                  })}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
            </div>
          )}

          {(block.type === 'featured' || block.type === 'banner') && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs text-gray-600 mb-1">배경 색상</label>
                <input
                  type="color"
                  value={block.background_color || '#f3f4f6'}
                  onChange={(e) => onUpdate(block.id, {
                    background_color: e.target.value
                  })}
                  className="w-full h-8 border border-gray-300 rounded"
                />
              </div>
            </div>
          )}
        </div>
      )}

      {/* 블록 콘텐츠 */}
      <div className="relative">
        {renderBlockContent()}
      </div>
    </div>
  );
}; 