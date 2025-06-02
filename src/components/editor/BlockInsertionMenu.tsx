import React, { useState, useRef, useEffect } from 'react';
import { StoreBlock } from '@/types/blockTypes';

interface BlockInsertionMenuProps {
  isOpen: boolean;
  position: { x: number; y: number };
  searchQuery: string;
  onClose: () => void;
  onInsertBlock: (blockType: StoreBlock['type'], position: number) => void;
  insertPosition: number;
}

interface BlockTemplate {
  type: StoreBlock['type'];
  title: string;
  description: string;
  icon: string;
  category: 'basic' | 'content' | 'media' | 'commerce';
  keywords: string[];
}

const BLOCK_TEMPLATES: BlockTemplate[] = [
  // 기본 블록들
  {
    type: 'text',
    title: '텍스트',
    description: '일반 텍스트나 헤딩을 추가합니다',
    icon: '📝',
    category: 'basic',
    keywords: ['텍스트', 'text', '글', '문자', '제목', 'heading', '단락', 'paragraph']
  },
  {
    type: 'banner',
    title: '배너',
    description: '프로모션이나 공지사항 배너를 추가합니다',
    icon: '🎯',
    category: 'content',
    keywords: ['배너', 'banner', '광고', 'promo', '프로모션', '공지', 'notice']
  },
  
  // 상품 블록들
  {
    type: 'grid',
    title: '제품 그리드',
    description: '제품을 그리드 형태로 진열합니다',
    icon: '📦',
    category: 'commerce',
    keywords: ['제품', 'product', '그리드', 'grid', '상품', '진열', '카탈로그']
  },
  {
    type: 'featured',
    title: '피처드 제품',
    description: '특별한 제품을 강조하여 표시합니다',
    icon: '⭐',
    category: 'commerce',
    keywords: ['피처드', 'featured', '추천', '특별', '강조', '하이라이트']
  },
  {
    type: 'list',
    title: '제품 리스트',
    description: '제품을 리스트 형태로 표시합니다',
    icon: '📋',
    category: 'commerce',
    keywords: ['리스트', 'list', '목록', '제품', 'product', '세로', 'vertical']
  },
  {
    type: 'masonry',
    title: '메이슨리 그리드',
    description: '다양한 높이의 그리드로 제품을 표시합니다',
    icon: '🧱',
    category: 'media',
    keywords: ['메이슨리', 'masonry', '벽돌', 'pinterest', '갤러리', '이미지']
  }
];

const CATEGORIES = {
  basic: { title: '기본', icon: '📄' },
  content: { title: '콘텐츠', icon: '🎨' },
  media: { title: '미디어', icon: '📸' },
  commerce: { title: '상거래', icon: '🛒' }
};

export const BlockInsertionMenu: React.FC<BlockInsertionMenuProps> = ({
  isOpen,
  position,
  searchQuery,
  onClose,
  onInsertBlock,
  insertPosition
}) => {
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 검색 및 필터링
  const filteredBlocks = BLOCK_TEMPLATES.filter(block => {
    if (selectedCategory && block.category !== selectedCategory) {
      return false;
    }
    
    if (!searchQuery) return true;
    
    const query = searchQuery.toLowerCase();
    return (
      block.title.toLowerCase().includes(query) ||
      block.description.toLowerCase().includes(query) ||
      block.keywords.some(keyword => keyword.toLowerCase().includes(query))
    );
  });

  // 키보드 네비게이션
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isOpen) return;

      switch (e.key) {
        case 'ArrowDown':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev < filteredBlocks.length - 1 ? prev + 1 : 0
          );
          break;
        case 'ArrowUp':
          e.preventDefault();
          setSelectedIndex(prev => 
            prev > 0 ? prev - 1 : filteredBlocks.length - 1
          );
          break;
        case 'Enter':
          e.preventDefault();
          if (filteredBlocks[selectedIndex]) {
            handleInsertBlock(filteredBlocks[selectedIndex].type);
          }
          break;
        case 'Escape':
          e.preventDefault();
          onClose();
          break;
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, selectedIndex, filteredBlocks, insertPosition]);

  // 선택된 인덱스 리셋
  useEffect(() => {
    setSelectedIndex(0);
  }, [searchQuery, selectedCategory]);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onClose]);

  const handleInsertBlock = (blockType: StoreBlock['type']) => {
    onInsertBlock(blockType, insertPosition);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      ref={menuRef}
      className="fixed bg-white border border-gray-200 rounded-lg shadow-lg p-2 max-w-sm w-80 max-h-96 overflow-hidden z-50"
      style={{
        left: Math.min(position.x, window.innerWidth - 320),
        top: Math.min(position.y, window.innerHeight - 400)
      }}
    >
      {/* 검색 헤더 */}
      <div className="p-2 border-b border-gray-100">
        <div className="flex items-center space-x-2 text-sm text-gray-600">
          <span>블록 추가</span>
          {searchQuery && (
            <span className="text-blue-600">"{searchQuery}"</span>
          )}
        </div>
      </div>

      {/* 카테고리 탭 */}
      <div className="flex space-x-1 p-2 border-b border-gray-100">
        <button
          onClick={() => setSelectedCategory(null)}
          className={`px-2 py-1 text-xs rounded ${
            selectedCategory === null 
              ? 'bg-blue-100 text-blue-700' 
              : 'text-gray-600 hover:bg-gray-100'
          }`}
        >
          전체
        </button>
        {Object.entries(CATEGORIES).map(([key, category]) => (
          <button
            key={key}
            onClick={() => setSelectedCategory(key)}
            className={`px-2 py-1 text-xs rounded ${
              selectedCategory === key 
                ? 'bg-blue-100 text-blue-700' 
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            {category.icon} {category.title}
          </button>
        ))}
      </div>

      {/* 블록 목록 */}
      <div className="max-h-64 overflow-y-auto">
        {filteredBlocks.length === 0 ? (
          <div className="p-4 text-center text-gray-500 text-sm">
            "{searchQuery}" 검색 결과가 없습니다
          </div>
        ) : (
          <div className="space-y-1 p-1">
            {filteredBlocks.map((block, index) => (
              <button
                key={block.type}
                onClick={() => handleInsertBlock(block.type)}
                className={`
                  w-full flex items-start space-x-3 p-2 rounded text-left transition-colors
                  ${index === selectedIndex 
                    ? 'bg-blue-50 border border-blue-200' 
                    : 'hover:bg-gray-50 border border-transparent'
                  }
                `}
                onMouseEnter={() => setSelectedIndex(index)}
              >
                <span className="text-lg flex-shrink-0 mt-0.5">
                  {block.icon}
                </span>
                <div className="flex-1 min-w-0">
                  <div className="font-medium text-sm text-gray-900">
                    {block.title}
                  </div>
                  <div className="text-xs text-gray-500 mt-0.5">
                    {block.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        )}
      </div>

      {/* 키보드 단축키 안내 */}
      <div className="p-2 border-t border-gray-100 text-xs text-gray-400">
        <div className="flex justify-between">
          <span>↑↓ 이동</span>
          <span>Enter 선택</span>
          <span>Esc 닫기</span>
        </div>
      </div>
    </div>
  );
};

// 블록 삽입 트리거 버튼
export const BlockInsertTrigger: React.FC<{
  onTrigger: (position: { x: number; y: number }) => void;
  className?: string;
}> = ({ onTrigger, className = "" }) => {
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      onTrigger({
        x: rect.left,
        y: rect.bottom + 8
      });
    }
  };

  return (
    <button
      ref={buttonRef}
      onClick={handleClick}
      className={`
        group inline-flex items-center justify-center w-6 h-6 
        text-gray-400 hover:text-gray-600 hover:bg-gray-100 
        rounded transition-colors
        ${className}
      `}
      title="블록 추가 (Ctrl + /, Cmd + /)"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>
  );
};

// 슬래시 명령어 감지 훅
export const useSlashCommand = (onTrigger: (query: string, position: { x: number; y: number }) => void) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ctrl+/ 또는 Cmd+/ 감지
      if ((e.ctrlKey || e.metaKey) && e.key === '/') {
        e.preventDefault();
        
        // 현재 커서 위치 계산
        const selection = window.getSelection();
        let position = { x: 100, y: 100 }; // 기본 위치
        
        if (selection && selection.rangeCount > 0) {
          const range = selection.getRangeAt(0);
          const rect = range.getBoundingClientRect();
          position = {
            x: rect.left,
            y: rect.bottom + 8
          };
        }
        
        onTrigger('', position);
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onTrigger]);
};

// 텍스트 내 '/' 명령어 감지
export const useInlineSlashCommand = (
  editor: any,
  onTrigger: (query: string, position: { x: number; y: number }) => void
) => {
  useEffect(() => {
    if (!editor) return;

    const handleUpdate = () => {
      const { selection } = editor.state;
      const { $from } = selection;
      
      // 현재 줄의 텍스트 가져오기
      const currentLineText = $from.parent.textContent;
      const cursorPos = $from.parentOffset;
      
      // '/' 명령어 패턴 찾기
      const beforeCursor = currentLineText.slice(0, cursorPos);
      const slashMatch = beforeCursor.match(/\/([a-zA-Z가-힣]*)$/);
      
      if (slashMatch) {
        const query = slashMatch[1];
        
        // 커서 위치 계산
        const coords = editor.view.coordsAtPos(selection.from);
        const position = {
          x: coords.left,
          y: coords.bottom + 8
        };
        
        onTrigger(query, position);
      }
    };

    editor.on('update', handleUpdate);
    return () => editor.off('update', handleUpdate);
  }, [editor, onTrigger]);
}; 