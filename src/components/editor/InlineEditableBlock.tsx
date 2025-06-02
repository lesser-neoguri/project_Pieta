import React, { useState, useCallback, useRef, useEffect } from 'react';
import { StoreBlock } from '@/types/blockTypes';

interface InlineEditableBlockProps {
  block: StoreBlock;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onUpdate: (blockId: string, updates: Partial<StoreBlock>) => void;
  onDelete: (blockId: string) => void;
  onDuplicate: (blockId: string) => void;
  children: React.ReactNode;
  className?: string;
}

export const InlineEditableBlock: React.FC<InlineEditableBlockProps> = ({
  block,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onUpdate,
  onDelete,
  onDuplicate,
  children,
  className = ""
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showToolbar, setShowToolbar] = useState(false);
  const blockRef = useRef<HTMLDivElement>(null);
  const toolbarTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 클릭 핸들러
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(block.id);
  }, [block.id, onSelect]);

  // 더블클릭으로 편집 모드 진입
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(block.id);
  }, [block.id, onEdit]);

  // 키보드 단축키 처리
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isSelected) return;

      switch (e.key) {
        case 'Enter':
          if (!isEditing) {
            e.preventDefault();
            onEdit(block.id);
          }
          break;
        case 'Delete':
        case 'Backspace':
          if (!isEditing) {
            e.preventDefault();
            onDelete(block.id);
          }
          break;
        case 'Escape':
          if (isEditing) {
            e.preventDefault();
            // 편집 모드 종료는 부모에서 처리
          }
          break;
        case 'd':
          if ((e.ctrlKey || e.metaKey) && !isEditing) {
            e.preventDefault();
            onDuplicate(block.id);
          }
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isSelected, isEditing, block.id, onEdit, onDelete, onDuplicate]);

  // 툴바 표시/숨김 관리
  const handleMouseEnter = useCallback(() => {
    setIsHovered(true);
    if (!isEditing) {
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
      toolbarTimeoutRef.current = setTimeout(() => {
        setShowToolbar(true);
      }, 200);
    }
  }, [isEditing]);

  const handleMouseLeave = useCallback(() => {
    setIsHovered(false);
    if (toolbarTimeoutRef.current) {
      clearTimeout(toolbarTimeoutRef.current);
    }
    setShowToolbar(false);
  }, []);

  // 클린업
  useEffect(() => {
    return () => {
      if (toolbarTimeoutRef.current) {
        clearTimeout(toolbarTimeoutRef.current);
      }
    };
  }, []);

  return (
    <div
      ref={blockRef}
      className={`
        relative group
        ${className}
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isHovered && !isEditing ? 'ring-1 ring-gray-300 ring-offset-1' : ''}
        ${isEditing ? 'ring-2 ring-green-500 ring-offset-2' : ''}
        transition-all duration-200 ease-in-out
        cursor-pointer
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      {/* 선택 표시 */}
      {isSelected && (
        <div className="absolute -top-6 left-0 px-2 py-1 bg-blue-500 text-white text-xs font-medium rounded-t z-10">
          {getBlockTypeLabel(block.type)} #{block.position + 1}
        </div>
      )}

      {/* 편집 중 표시 */}
      {isEditing && (
        <div className="absolute -top-6 right-0 px-2 py-1 bg-green-500 text-white text-xs font-medium rounded-t z-10">
          편집 중
        </div>
      )}

      {/* 플로팅 툴바 */}
      {showToolbar && isHovered && !isEditing && (
        <FloatingToolbar
          block={block}
          onEdit={() => onEdit(block.id)}
          onDelete={() => onDelete(block.id)}
          onDuplicate={() => onDuplicate(block.id)}
          onChangeType={(newType) => {
            // 타입 변경 시 기본 데이터로 변환
            const newData = getDefaultDataForType(newType);
            onUpdate(block.id, { type: newType, data: newData });
          }}
        />
      )}

      {/* 드래그 핸들 */}
      {(isSelected || isHovered) && !isEditing && (
        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-8 opacity-0 group-hover:opacity-100 transition-opacity">
          <div className="w-6 h-6 bg-gray-400 hover:bg-gray-600 cursor-grab active:cursor-grabbing rounded flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM7 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 2a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 8a2 2 0 1 0 0 4 2 2 0 0 0 0-4zM13 14a2 2 0 1 0 0 4 2 2 0 0 0 0-4z"/>
            </svg>
          </div>
        </div>
      )}

      {/* 실제 블록 콘텐츠 */}
      <div className={isEditing ? 'pointer-events-auto' : 'pointer-events-none'}>
        {children}
      </div>
    </div>
  );
};

// 플로팅 툴바 컴포넌트
const FloatingToolbar: React.FC<{
  block: StoreBlock;
  onEdit: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onChangeType: (type: StoreBlock['type']) => void;
}> = ({ block, onEdit, onDelete, onDuplicate, onChangeType }) => {
  const [showTypeMenu, setShowTypeMenu] = useState(false);

  const blockTypes: Array<{ type: StoreBlock['type']; label: string; icon: string }> = [
    { type: 'text', label: '텍스트', icon: '📝' },
    { type: 'grid', label: '제품 그리드', icon: '⊞' },
    { type: 'featured', label: '피처드', icon: '⭐' },
    { type: 'banner', label: '배너', icon: '🖼️' },
    { type: 'list', label: '리스트', icon: '📋' },
    { type: 'masonry', label: '메이슨리', icon: '🧱' }
  ];

  return (
    <div className="absolute -top-12 left-1/2 -translate-x-1/2 z-20">
      <div className="bg-white border border-gray-200 rounded-lg shadow-lg p-1 flex items-center space-x-1">
        {/* 편집 버튼 */}
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="편집 (Enter)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
          </svg>
        </button>

        {/* 타입 변경 드롭다운 */}
        <div className="relative">
          <button
            onClick={() => setShowTypeMenu(!showTypeMenu)}
            className="p-2 hover:bg-gray-100 rounded transition-colors"
            title="블록 타입 변경"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
            </svg>
          </button>

          {showTypeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-40">
              {blockTypes.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    onChangeType(type);
                    setShowTypeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 ${
                    type === block.type ? 'bg-blue-50 text-blue-700' : ''
                  }`}
                >
                  <span>{icon}</span>
                  <span className="text-sm">{label}</span>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* 복제 버튼 */}
        <button
          onClick={onDuplicate}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="복제 (Ctrl+D)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 text-red-600 rounded transition-colors"
          title="삭제 (Delete)"
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
          </svg>
        </button>
      </div>
    </div>
  );
};

// 유틸리티 함수들
const getBlockTypeLabel = (type: StoreBlock['type']): string => {
  const labels: Record<StoreBlock['type'], string> = {
    text: '텍스트',
    grid: '그리드',
    featured: '피처드',
    banner: '배너',
    list: '리스트',
    masonry: '메이슨리'
  };
  return labels[type] || type;
};

const getDefaultDataForType = (type: StoreBlock['type']): any => {
  switch (type) {
    case 'text':
      return {
        text_content: '새 텍스트 블록입니다.',
        text_size: 'medium',
        text_color: '#333333',
        text_weight: 'normal',
        text_style: 'paragraph',
        max_width: 'medium',
        padding: 'medium'
      };
    case 'grid':
      return {
        columns: 4,
        card_style: 'default',
        height_ratio: 'square',
        spacing: 'normal'
      };
    case 'featured':
      return {
        featured_size: 'large',
        show_text_overlay: true,
        overlay_position: 'center'
      };
    case 'banner':
      return {
        banner_height: 'medium',
        banner_style: 'gradient',
        call_to_action: '지금 구매하기'
      };
    case 'list':
      return {
        list_style: 'horizontal',
        show_description: true,
        show_price_prominent: false
      };
    case 'masonry':
      return {
        masonry_columns: 3,
        min_height: 'medium'
      };
    default:
      return {};
  }
}; 