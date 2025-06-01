import React, { useState, useEffect, useRef } from 'react';
import { BlockType, BLOCK_TYPE_METADATA } from '@/types/blockTypes';

interface SlashCommandMenuProps {
  position: { x: number; y: number };
  onSelectBlock: (type: BlockType) => void;
  onCancel: () => void;
  searchTerm: string;
}

interface CommandItem {
  type: BlockType;
  label: string;
  description: string;
  icon: string;
  keywords: string[];
}

// 슬래시 명령어 아이템 정의
const COMMAND_ITEMS: CommandItem[] = [
  {
    type: 'text',
    label: '텍스트',
    description: '일반 텍스트나 제목을 추가합니다',
    icon: '📝',
    keywords: ['text', 'paragraph', '텍스트', '문단', '글']
  },
  {
    type: 'grid',
    label: '제품 그리드',
    description: '제품들을 격자 형태로 표시합니다',
    icon: '▦',
    keywords: ['grid', 'products', '그리드', '제품', '격자']
  },
  {
    type: 'featured',
    label: '피처드 제품',
    description: '주요 제품을 크게 강조하여 표시합니다',
    icon: '⭐',
    keywords: ['featured', 'hero', '피처드', '강조', '메인']
  },
  {
    type: 'banner',
    label: '배너',
    description: '프로모션이나 공지사항 배너를 추가합니다',
    icon: '🎯',
    keywords: ['banner', 'promotion', '배너', '홍보', '공지']
  },
  {
    type: 'masonry',
    label: '메이슨리',
    description: '다양한 크기의 이미지 타일을 표시합니다',
    icon: '🧱',
    keywords: ['masonry', 'tiles', '메이슨리', '타일', '불규칙']
  },
  {
    type: 'list',
    label: '제품 리스트',
    description: '제품을 목록 형태로 표시합니다',
    icon: '📋',
    keywords: ['list', 'products', '리스트', '목록', '나열']
  }
];

export const SlashCommandMenu: React.FC<SlashCommandMenuProps> = ({
  position,
  onSelectBlock,
  onCancel,
  searchTerm
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const menuRef = useRef<HTMLDivElement>(null);

  // 검색 결과 필터링
  const filteredItems = COMMAND_ITEMS.filter(item => {
    if (!searchTerm) return true;
    
    const searchLower = searchTerm.toLowerCase();
    return (
      item.label.toLowerCase().includes(searchLower) ||
      item.description.toLowerCase().includes(searchLower) ||
      item.keywords.some(keyword => keyword.toLowerCase().includes(searchLower))
    );
  });

  // 키보드 내비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredItems.length - 1 ? prev + 1 : 0
          );
          break;
        
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredItems.length - 1
          );
          break;
        
        case 'Enter':
          e.preventDefault();
          if (filteredItems[selectedIndex]) {
            onSelectBlock(filteredItems[selectedIndex].type);
          }
          break;
        
        case 'Escape':
          e.preventDefault();
          onCancel();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedIndex, filteredItems, onSelectBlock, onCancel]);

  // 선택된 항목이 범위를 벗어나면 조정
  useEffect(() => {
    if (selectedIndex >= filteredItems.length) {
      setSelectedIndex(Math.max(0, filteredItems.length - 1));
    }
  }, [filteredItems.length, selectedIndex]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onCancel]);

  if (filteredItems.length === 0) {
    return (
      <div
        ref={menuRef}
        className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-4 min-w-64"
        style={{ left: position.x, top: position.y }}
      >
        <div className="text-gray-500 text-sm text-center">
          "{searchTerm}"과 일치하는 블록이 없습니다
        </div>
      </div>
    );
  }

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-80 max-h-64 overflow-y-auto"
      style={{ left: position.x, top: position.y }}
    >
      {/* 헤더 */}
      <div className="px-3 py-2 border-b border-gray-100">
        <div className="text-xs text-gray-500 font-medium">
          블록 추가 {searchTerm && `· "${searchTerm}"`}
        </div>
      </div>

      {/* 명령어 리스트 */}
      <div className="py-1">
        {filteredItems.map((item, index) => (
          <CommandMenuItem
            key={item.type}
            item={item}
            isSelected={index === selectedIndex}
            onClick={() => onSelectBlock(item.type)}
            onHover={() => setSelectedIndex(index)}
          />
        ))}
      </div>

      {/* 푸터 힌트 */}
      <div className="px-3 py-2 border-t border-gray-100">
        <div className="text-xs text-gray-400">
          ↑↓ 탐색 · Enter 선택 · Esc 취소
        </div>
      </div>
    </div>
  );
};

// 개별 명령어 아이템 컴포넌트
const CommandMenuItem: React.FC<{
  item: CommandItem;
  isSelected: boolean;
  onClick: () => void;
  onHover: () => void;
}> = ({ item, isSelected, onClick, onHover }) => (
  <button
    className={`
      w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors
      ${isSelected ? 'bg-blue-50 border-r-2 border-blue-500' : 'hover:bg-gray-50'}
    `}
    onClick={onClick}
    onMouseEnter={onHover}
  >
    <span className="text-lg flex-shrink-0">{item.icon}</span>
    <div className="flex-1 min-w-0">
      <div className={`font-medium text-sm ${isSelected ? 'text-blue-900' : 'text-gray-900'}`}>
        {item.label}
      </div>
      <div className="text-xs text-gray-500 truncate">
        {item.description}
      </div>
    </div>
    {isSelected && (
      <span className="text-blue-500 text-sm">⏎</span>
    )}
  </button>
);

// 슬래시 명령어 트리거 훅
export const useSlashCommand = (
  onAddBlock: (type: BlockType, position: number) => void
) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const [searchTerm, setSearchTerm] = useState('');
  const [insertPosition, setInsertPosition] = useState(0);

  const triggerSlashMenu = (
    cursorPosition: { x: number; y: number },
    position: number
  ) => {
    setMenuPosition(cursorPosition);
    setInsertPosition(position);
    setSearchTerm('');
    setIsMenuOpen(true);
  };

  const handleSelectBlock = (type: BlockType) => {
    onAddBlock(type, insertPosition);
    setIsMenuOpen(false);
    setSearchTerm('');
  };

  const handleCancel = () => {
    setIsMenuOpen(false);
    setSearchTerm('');
  };

  const updateSearch = (term: string) => {
    setSearchTerm(term);
  };

  return {
    isMenuOpen,
    menuPosition,
    searchTerm,
    triggerSlashMenu,
    handleSelectBlock,
    handleCancel,
    updateSearch
  };
}; 