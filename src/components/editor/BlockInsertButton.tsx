import React, { useState, useRef, useEffect } from 'react';
import { BlockType, BLOCK_TYPE_METADATA } from '@/types/blockTypes';
import { SlashCommandMenu } from './SlashCommandMenu';

interface BlockInsertButtonProps {
  position: number;
  onAddBlock: (type: BlockType, position: number) => void;
  className?: string;
  variant?: 'floating' | 'inline' | 'between';
}

export const BlockInsertButton: React.FC<BlockInsertButtonProps> = ({
  position,
  onAddBlock,
  className = '',
  variant = 'floating'
}) => {
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [menuPosition, setMenuPosition] = useState({ x: 0, y: 0 });
  const buttonRef = useRef<HTMLButtonElement>(null);

  const handleButtonClick = () => {
    if (buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect();
      setMenuPosition({
        x: rect.left,
        y: rect.bottom + 8
      });
      setIsMenuOpen(true);
    }
  };

  const handleSelectBlock = (type: BlockType) => {
    onAddBlock(type, position);
    setIsMenuOpen(false);
  };

  const handleCancel = () => {
    setIsMenuOpen(false);
  };

  // 버튼 스타일 variants
  const getButtonStyles = () => {
    const baseStyles = "transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50";
    
    switch (variant) {
      case 'floating':
        return `${baseStyles} 
          w-8 h-8 bg-white border-2 border-gray-300 rounded-full 
          hover:border-blue-500 hover:bg-blue-50 
          shadow-sm hover:shadow-md
          flex items-center justify-center
          text-gray-400 hover:text-blue-500`;
      
      case 'inline':
        return `${baseStyles}
          w-6 h-6 bg-gray-100 border border-gray-200 rounded
          hover:bg-blue-500 hover:border-blue-500 hover:text-white
          flex items-center justify-center
          text-gray-400 text-sm`;
      
      case 'between':
        return `${baseStyles}
          w-full h-10 bg-transparent border-2 border-dashed border-gray-200 rounded
          hover:border-blue-400 hover:bg-blue-50
          flex items-center justify-center space-x-2
          text-gray-400 hover:text-blue-500`;
      
      default:
        return baseStyles;
    }
  };

  const getButtonContent = () => {
    switch (variant) {
      case 'floating':
      case 'inline':
        return <span className="text-lg font-bold">+</span>;
      
      case 'between':
        return (
          <>
            <span className="text-xl">+</span>
            <span className="text-sm font-medium">블록 추가</span>
          </>
        );
      
      default:
        return '+';
    }
  };

  return (
    <>
      <button
        ref={buttonRef}
        onClick={handleButtonClick}
        className={`${getButtonStyles()} ${className}`}
        title="새 블록 추가"
      >
        {getButtonContent()}
      </button>

      {isMenuOpen && (
        <SlashCommandMenu
          position={menuPosition}
          onSelectBlock={handleSelectBlock}
          onCancel={handleCancel}
          searchTerm=""
        />
      )}
    </>
  );
};

// 블록 사이에 표시되는 삽입 존 컴포넌트
export const BlockInsertZone: React.FC<{
  position: number;
  onAddBlock: (type: BlockType, position: number) => void;
  isVisible?: boolean;
}> = ({ position, onAddBlock, isVisible = false }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className={`
        relative py-1 transition-all duration-200
        ${isVisible || isHovered ? 'opacity-100' : 'opacity-0'}
      `}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="flex items-center justify-center">
        <div className="flex-1 h-px bg-gray-200"></div>
        <div className="mx-4">
          <BlockInsertButton
            position={position}
            onAddBlock={onAddBlock}
            variant="inline"
          />
        </div>
        <div className="flex-1 h-px bg-gray-200"></div>
      </div>
    </div>
  );
};

// 플로팅 추가 버튼 (고정 위치)
export const FloatingAddButton: React.FC<{
  onAddBlock: (type: BlockType) => void;
  position?: 'bottom-right' | 'bottom-left' | 'top-right';
}> = ({ onAddBlock, position = 'bottom-right' }) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [quickItems] = useState<BlockType[]>(['text', 'grid', 'featured', 'banner']);

  const getPositionStyles = () => {
    switch (position) {
      case 'bottom-right':
        return 'fixed bottom-6 right-6';
      case 'bottom-left':
        return 'fixed bottom-6 left-6';
      case 'top-right':
        return 'fixed top-20 right-6';
      default:
        return 'fixed bottom-6 right-6';
    }
  };

  const handleQuickAdd = (type: BlockType) => {
    onAddBlock(type);
    setIsExpanded(false);
  };

  return (
    <div className={`${getPositionStyles()} z-40`}>
      {/* 확장된 퀵 액세스 버튼들 */}
      {isExpanded && (
        <div className="absolute bottom-16 right-0 space-y-2 animate-in slide-in-from-bottom-2">
          {quickItems.map((type) => {
            const metadata = BLOCK_TYPE_METADATA[type];
            return (
              <button
                key={type}
                onClick={() => handleQuickAdd(type)}
                className="
                  flex items-center space-x-2 bg-white border border-gray-200 
                  rounded-lg px-3 py-2 shadow-lg hover:bg-gray-50 
                  transition-colors min-w-max
                "
                title={metadata.description}
              >
                <span>{metadata.icon}</span>
                <span className="text-sm font-medium">{metadata.label}</span>
              </button>
            );
          })}
        </div>
      )}

      {/* 메인 플로팅 버튼 */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className={`
          w-14 h-14 bg-blue-500 hover:bg-blue-600 
          rounded-full shadow-lg hover:shadow-xl
          flex items-center justify-center text-white text-xl font-bold
          transition-all duration-200 transform hover:scale-105
          ${isExpanded ? 'rotate-45' : ''}
        `}
        title="새 블록 추가"
      >
        +
      </button>
    </div>
  );
};

// 드래그 앤 드롭 영역
export const BlockDropZone: React.FC<{
  position: number;
  onAddBlock: (type: BlockType, position: number) => void;
  isActive: boolean;
}> = ({ position, onAddBlock, isActive }) => {
  const [dragType, setDragType] = useState<BlockType | null>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'copy';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const blockType = e.dataTransfer.getData('text/block-type') as BlockType;
    if (blockType) {
      onAddBlock(blockType, position);
    }
    setDragType(null);
  };

  const handleDragEnter = (e: React.DragEvent) => {
    const type = e.dataTransfer.getData('text/block-type') as BlockType;
    setDragType(type);
  };

  const handleDragLeave = () => {
    setDragType(null);
  };

  if (!isActive) return null;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      className={`
        h-16 border-2 border-dashed rounded-lg transition-all duration-200
        flex items-center justify-center
        ${dragType 
          ? 'border-blue-500 bg-blue-50' 
          : 'border-gray-300 bg-gray-50'
        }
      `}
    >
      <div className="text-center">
        {dragType ? (
          <>
            <div className="text-lg mb-1">
              {BLOCK_TYPE_METADATA[dragType]?.icon}
            </div>
            <div className="text-sm text-blue-600 font-medium">
              {BLOCK_TYPE_METADATA[dragType]?.label} 추가
            </div>
          </>
        ) : (
          <div className="text-sm text-gray-500">
            여기에 블록을 드래그하세요
          </div>
        )}
      </div>
    </div>
  );
}; 