import React, { useState, useRef, useEffect } from 'react';

interface BasicFloatingToolbarProps {
  isVisible: boolean;
  position: { x: number; y: number };
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onChangeType: (type: string) => void;
  currentBlockType: string;
}

export const BasicFloatingToolbar: React.FC<BasicFloatingToolbarProps> = ({
  isVisible,
  position,
  onEdit,
  onDuplicate,
  onDelete,
  onChangeType,
  currentBlockType
}) => {
  const [showTypeMenu, setShowTypeMenu] = useState(false);
  const toolbarRef = useRef<HTMLDivElement>(null);

  const blockTypes = [
    { type: 'text', label: '텍스트', icon: '📝' },
    { type: 'grid', label: '제품 그리드', icon: '⊞' },
    { type: 'featured', label: '피처드', icon: '⭐' },
    { type: 'banner', label: '배너', icon: '🖼️' },
    { type: 'list', label: '리스트', icon: '📋' },
    { type: 'masonry', label: '메이슨리', icon: '🧱' }
  ];

  if (!isVisible) return null;

  return (
    <div
      ref={toolbarRef}
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg"
      style={{
        left: `${position.x}px`,
        top: `${position.y}px`,
        transform: 'translateY(-100%)'
      }}
    >
      <div className="flex items-center p-1">
        {/* 편집 버튼 */}
        <button
          onClick={onEdit}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="편집"
        >
          ✏️
        </button>

        {/* 타입 변경 버튼 */}
        <button
          onClick={() => setShowTypeMenu(!showTypeMenu)}
          className="p-2 hover:bg-gray-100 rounded transition-colors relative"
          title="블록 타입 변경"
        >
          {blockTypes.find(t => t.type === currentBlockType)?.icon || '📄'}
          
          {showTypeMenu && (
            <div className="absolute top-full left-0 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg py-1 min-w-32 z-10">
              {blockTypes.map(({ type, label, icon }) => (
                <button
                  key={type}
                  onClick={() => {
                    onChangeType(type);
                    setShowTypeMenu(false);
                  }}
                  className={`w-full text-left px-3 py-2 hover:bg-gray-100 flex items-center space-x-2 text-sm ${
                    type === currentBlockType ? 'bg-blue-50 text-blue-700' : 'text-gray-700'
                  }`}
                >
                  <span>{icon}</span>
                  <span>{label}</span>
                </button>
              ))}
            </div>
          )}
        </button>

        {/* 복제 버튼 */}
        <button
          onClick={onDuplicate}
          className="p-2 hover:bg-gray-100 rounded transition-colors"
          title="복제"
        >
          📋
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={onDelete}
          className="p-2 hover:bg-red-100 rounded transition-colors"
          title="삭제"
        >
          🗑️
        </button>
      </div>
    </div>
  );
};

// 플로팅 툴바 사용을 위한 훅
export const useFloatingToolbar = () => {
  const [isVisible, setIsVisible] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });

  const showToolbar = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
    
    setPosition({
      x: rect.left + rect.width / 2 - 100,
      y: rect.top + scrollTop - 10
    });
    
    setIsVisible(true);
  };

  const hideToolbar = () => {
    setIsVisible(false);
  };

  return {
    isVisible,
    position,
    showToolbar,
    hideToolbar
  };
}; 