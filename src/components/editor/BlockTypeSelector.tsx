import React, { useEffect, useRef } from 'react';

interface BlockType {
  type: 'featured' | 'grid' | 'text' | 'banner' | 'masonry' | 'list';
  label: string;
  description: string;
  icon: string;
  preview: string;
}

interface BlockTypeSelectorProps {
  position: number;
  onSelect: (type: BlockType['type']) => void;
  onCancel: () => void;
}

const blockTypes: BlockType[] = [
  {
    type: 'featured',
    label: '피처드',
    description: '주요 제품을 큰 이미지로 강조',
    icon: '⭐',
    preview: '대형 제품 쇼케이스'
  },
  {
    type: 'grid',
    label: '그리드',
    description: '제품들을 격자 형태로 정렬',
    icon: '▦',
    preview: '2x2 제품 격자'
  },
  {
    type: 'text',
    label: '텍스트',
    description: '설명글이나 공지사항 추가',
    icon: '📝',
    preview: '텍스트 콘텐츠'
  },
  {
    type: 'banner',
    label: '배너',
    description: '프로모션이나 이벤트 배너',
    icon: '🎯',
    preview: '홍보 배너'
  },
  {
    type: 'masonry',
    label: '메이슨리',
    description: '다양한 크기의 제품 타일',
    icon: '🧱',
    preview: '불규칙 타일'
  },
  {
    type: 'list',
    label: '리스트',
    description: '제품을 목록 형태로 표시',
    icon: '📋',
    preview: '세로 목록'
  }
];

export const BlockTypeSelector: React.FC<BlockTypeSelectorProps> = ({
  position,
  onSelect,
  onCancel
}) => {
  const selectorRef = useRef<HTMLDivElement>(null);

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (selectorRef.current && !selectorRef.current.contains(event.target as Node)) {
        onCancel();
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onCancel();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    document.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleEscape);
    };
  }, [onCancel]);

  return (
    <div className="fixed inset-0 bg-black bg-opacity-25 flex items-center justify-center z-50">
      <div
        ref={selectorRef}
        className="bg-white rounded-xl shadow-2xl border border-gray-200 p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto"
      >
        <div className="flex items-center justify-between mb-6">
          <div>
            <h2 className="text-xl font-semibold text-gray-900">블록 추가</h2>
            <p className="text-sm text-gray-500 mt-1">
              위치 {position + 1}에 추가할 블록 타입을 선택하세요
            </p>
          </div>
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {blockTypes.map((blockType) => (
            <BlockTypeCard
              key={blockType.type}
              blockType={blockType}
              onSelect={() => onSelect(blockType.type)}
            />
          ))}
        </div>

        {/* 키보드 힌트 */}
        <div className="mt-6 pt-4 border-t border-gray-200">
          <p className="text-xs text-gray-500 text-center">
            ESC를 눌러 취소 • 클릭하여 블록 선택
          </p>
        </div>
      </div>
    </div>
  );
};

const BlockTypeCard: React.FC<{
  blockType: BlockType;
  onSelect: () => void;
}> = ({ blockType, onSelect }) => {
  return (
    <button
      onClick={onSelect}
      className="text-left p-4 border-2 border-gray-200 rounded-lg hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
    >
      <div className="flex items-start space-x-3">
        <div className="flex-shrink-0">
          <div className="w-10 h-10 bg-gray-100 rounded-lg flex items-center justify-center text-lg group-hover:bg-blue-100 transition-colors">
            {blockType.icon}
          </div>
        </div>
        <div className="flex-1 min-w-0">
          <h3 className="font-medium text-gray-900 group-hover:text-blue-900">
            {blockType.label}
          </h3>
          <p className="text-sm text-gray-500 mt-1">
            {blockType.description}
          </p>
          <div className="mt-2">
            <span className="inline-flex items-center px-2 py-1 rounded text-xs bg-gray-100 text-gray-600 group-hover:bg-blue-100 group-hover:text-blue-700">
              {blockType.preview}
            </span>
          </div>
        </div>
      </div>
    </button>
  );
};

// 슬래시 명령어 지원을 위한 컴포넌트
export const SlashCommandMenu: React.FC<{
  searchTerm: string;
  onSelect: (type: BlockType['type']) => void;
  onCancel: () => void;
  position: { top: number; left: number };
}> = ({ searchTerm, onSelect, onCancel, position }) => {
  const filteredTypes = blockTypes.filter(type =>
    type.label.toLowerCase().includes(searchTerm.toLowerCase()) ||
    type.description.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div
      className="absolute bg-white border border-gray-200 rounded-lg shadow-lg z-50 py-2 min-w-64 max-h-64 overflow-y-auto"
      style={{ top: position.top, left: position.left }}
    >
      {filteredTypes.length > 0 ? (
        <>
          <div className="px-3 py-2 text-xs text-gray-500 font-medium">
            블록 유형
          </div>
          {filteredTypes.map((blockType, index) => (
            <button
              key={blockType.type}
              onClick={() => onSelect(blockType.type)}
              className="w-full text-left px-3 py-2 hover:bg-gray-100 focus:bg-gray-100 flex items-center space-x-3"
            >
              <span className="text-lg">{blockType.icon}</span>
              <div>
                <div className="text-sm font-medium text-gray-900">
                  {blockType.label}
                </div>
                <div className="text-xs text-gray-500">
                  {blockType.description}
                </div>
              </div>
            </button>
          ))}
        </>
      ) : (
        <div className="px-3 py-4 text-sm text-gray-500 text-center">
          "{searchTerm}"와 일치하는 블록이 없습니다
        </div>
      )}
    </div>
  );
}; 