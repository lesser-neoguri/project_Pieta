import React, { useState, useEffect, useRef } from 'react';
import { StoreBlock, BLOCK_TYPE_METADATA } from '@/types/blockTypes';
import { useDragDropState } from './DragDropProvider';

/**
 * 드래그 앤 드롭 시각적 피드백 시스템
 * 
 * 주요 기능:
 * 1. 드래그 중 블록 미리보기
 * 2. 드롭 가능한 영역 하이라이트
 * 3. 애니메이션 및 전환 효과
 * 4. 접근성 고려한 시각적 단서
 */

// 드래그 중인 블록의 고스트 이미지
export const DragGhost: React.FC<{
  block: StoreBlock;
  isDragging: boolean;
}> = ({ block, isDragging }) => {
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const ghostRef = useRef<HTMLDivElement>(null);

  // 마우스 위치 추적
  useEffect(() => {
    if (!isDragging) return;

    const handleMouseMove = (e: MouseEvent) => {
      setPosition({ x: e.clientX + 20, y: e.clientY - 20 });
    };

    document.addEventListener('mousemove', handleMouseMove);
    return () => document.removeEventListener('mousemove', handleMouseMove);
  }, [isDragging]);

  if (!isDragging) return null;

  return (
    <div
      ref={ghostRef}
      className="fixed pointer-events-none z-[9999] transform transition-transform duration-100"
      style={{
        left: position.x,
        top: position.y,
        transform: 'rotate(-5deg) scale(0.8)'
      }}
    >
      <div className="bg-white border-2 border-blue-400 rounded-lg shadow-2xl p-3 min-w-48 max-w-64">
        <div className="flex items-center space-x-2 mb-2">
          <span className="text-lg">{BLOCK_TYPE_METADATA[block.type].icon}</span>
          <span className="text-sm font-medium text-gray-900 truncate">
            {BLOCK_TYPE_METADATA[block.type].label}
          </span>
        </div>
        
        <div className="text-xs text-gray-500 bg-gray-50 rounded p-2">
          위치 #{block.position + 1}
        </div>
        
        {/* 드래그 표시 애니메이션 */}
        <div className="absolute -top-1 -right-1 w-3 h-3 bg-blue-500 rounded-full animate-pulse">
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping opacity-75"></div>
        </div>
      </div>
    </div>
  );
};

// 스마트 드롭 존 - 컨텍스트에 따라 다른 시각적 피드백
export const SmartDropZone: React.FC<{
  index: number;
  isActive: boolean;
  isHovered: boolean;
  targetBlock?: StoreBlock;
  sourceBlock?: StoreBlock;
}> = ({ index, isActive, isHovered, targetBlock, sourceBlock }) => {
  const [animationPhase, setAnimationPhase] = useState<'idle' | 'preview' | 'confirm'>('idle');

  useEffect(() => {
    if (isActive) {
      setAnimationPhase('preview');
      const timer = setTimeout(() => setAnimationPhase('confirm'), 200);
      return () => clearTimeout(timer);
    } else {
      setAnimationPhase('idle');
    }
  }, [isActive]);

  const getDropZoneStyle = () => {
    if (!isActive && !isHovered) return 'opacity-0';

    const baseStyle = 'h-3 mx-6 my-2 rounded-full transition-all duration-300';
    
    switch (animationPhase) {
      case 'preview':
        return `${baseStyle} bg-blue-300 opacity-60 transform scale-75`;
      case 'confirm':
        return `${baseStyle} bg-blue-500 opacity-100 transform scale-100 shadow-lg`;
      default:
        return `${baseStyle} bg-gray-300 opacity-40`;
    }
  };

  const getInsertionPreview = () => {
    if (!sourceBlock || !isActive) return null;

    return (
      <div className="mx-6 my-1 p-2 border-2 border-dashed border-blue-400 rounded-lg bg-blue-50 animate-pulse">
        <div className="flex items-center space-x-2 text-blue-700">
          <span>{BLOCK_TYPE_METADATA[sourceBlock.type].icon}</span>
          <span className="text-sm font-medium">
            여기에 {BLOCK_TYPE_METADATA[sourceBlock.type].label} 삽입
          </span>
          <div className="ml-auto text-xs bg-blue-200 px-2 py-1 rounded">
            위치 #{index + 1}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="relative">
      <div className={getDropZoneStyle()}>
        {isActive && (
          <div className="absolute inset-0 bg-blue-500 rounded-full animate-pulse opacity-50"></div>
        )}
      </div>
      {getInsertionPreview()}
    </div>
  );
};

// 블록별 특화된 드래그 인디케이터
export const BlockTypeIndicator: React.FC<{
  blockType: string;
  isSource: boolean;
  isTarget: boolean;
}> = ({ blockType, isSource, isTarget }) => {
  const metadata = BLOCK_TYPE_METADATA[blockType as keyof typeof BLOCK_TYPE_METADATA];
  
  if (!metadata) return null;

  const getIndicatorStyle = () => {
    if (isSource) {
      return 'bg-orange-100 border-orange-300 text-orange-700';
    }
    if (isTarget) {
      return 'bg-green-100 border-green-300 text-green-700';
    }
    return 'bg-gray-100 border-gray-300 text-gray-600';
  };

  return (
    <div className={`
      absolute -top-2 -right-2 px-2 py-1 rounded-full border text-xs font-medium
      transform transition-all duration-200 z-10
      ${getIndicatorStyle()}
    `}>
      <span className="mr-1">{metadata.icon}</span>
      {isSource && '이동 중'}
      {isTarget && '드롭 가능'}
      {!isSource && !isTarget && metadata.label}
    </div>
  );
};

// 접근성을 위한 음성 피드백 컴포넌트
export const DragDropAnnouncer: React.FC = () => {
  const { isDragging, draggedBlockId } = useDragDropState();
  const [announcement, setAnnouncement] = useState('');

  useEffect(() => {
    if (isDragging && draggedBlockId) {
      setAnnouncement(`블록을 드래그 중입니다. 원하는 위치에 드롭하세요.`);
    } else {
      setAnnouncement('');
    }
  }, [isDragging, draggedBlockId]);

  return (
    <div 
      aria-live="polite" 
      aria-atomic="true"
      className="sr-only"
    >
      {announcement}
    </div>
  );
};

// 드래그 성공/실패 토스트 알림
export const DragDropToast: React.FC<{
  type: 'success' | 'error' | 'warning';
  message: string;
  isVisible: boolean;
  onClose: () => void;
}> = ({ type, message, isVisible, onClose }) => {
  useEffect(() => {
    if (isVisible) {
      const timer = setTimeout(onClose, 3000);
      return () => clearTimeout(timer);
    }
  }, [isVisible, onClose]);

  const getToastStyle = () => {
    const baseStyle = `
      fixed top-4 right-4 p-4 rounded-lg shadow-lg z-50
      transform transition-all duration-300 max-w-sm
    `;
    
    if (!isVisible) return `${baseStyle} translate-x-full opacity-0`;
    
    switch (type) {
      case 'success':
        return `${baseStyle} bg-green-500 text-white translate-x-0 opacity-100`;
      case 'error':
        return `${baseStyle} bg-red-500 text-white translate-x-0 opacity-100`;
      case 'warning':
        return `${baseStyle} bg-orange-500 text-white translate-x-0 opacity-100`;
      default:
        return `${baseStyle} bg-gray-500 text-white translate-x-0 opacity-100`;
    }
  };

  const getIcon = () => {
    switch (type) {
      case 'success': return '✅';
      case 'error': return '❌';
      case 'warning': return '⚠️';
      default: return 'ℹ️';
    }
  };

  return (
    <div className={getToastStyle()}>
      <div className="flex items-center space-x-2">
        <span className="text-lg">{getIcon()}</span>
        <span className="text-sm font-medium">{message}</span>
        <button
          onClick={onClose}
          className="ml-auto text-white hover:text-gray-200 transition-colors"
        >
          ✕
        </button>
      </div>
    </div>
  );
};

// 터치 기기를 위한 특별한 드래그 피드백
export const TouchDragFeedback: React.FC<{
  isDragging: boolean;
  draggedBlock?: StoreBlock;
}> = ({ isDragging, draggedBlock }) => {
  const [touchPosition, setTouchPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    if (!isDragging) return;

    const handleTouchMove = (e: TouchEvent) => {
      const touch = e.touches[0];
      if (touch) {
        setTouchPosition({ x: touch.clientX, y: touch.clientY });
      }
    };

    document.addEventListener('touchmove', handleTouchMove);
    return () => document.removeEventListener('touchmove', handleTouchMove);
  }, [isDragging]);

  if (!isDragging || !draggedBlock) return null;

  return (
    <>
      {/* 터치 위치 표시 */}
      <div
        className="fixed pointer-events-none z-[9999] w-12 h-12 bg-blue-500 rounded-full opacity-30 transform -translate-x-1/2 -translate-y-1/2"
        style={{
          left: touchPosition.x,
          top: touchPosition.y,
        }}
      >
        <div className="absolute inset-0 bg-blue-500 rounded-full animate-ping"></div>
      </div>

      {/* 터치 가이드 */}
      <div className="fixed bottom-20 left-1/2 transform -translate-x-1/2 z-50 bg-gray-900 text-white text-sm px-4 py-2 rounded-lg">
        터치를 유지하고 이동하세요
      </div>
    </>
  );
};

// 드래그 중 다른 블록들의 위치 미리보기
export const PositionPreview: React.FC<{
  blocks: StoreBlock[];
  sourceIndex: number;
  targetIndex: number;
}> = ({ blocks, sourceIndex, targetIndex }) => {
  const getPreviewBlocks = () => {
    if (sourceIndex === targetIndex) return blocks;
    
    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(sourceIndex, 1);
    newBlocks.splice(targetIndex, 0, movedBlock);
    
    return newBlocks;
  };

  const previewBlocks = getPreviewBlocks();

  return (
    <div className="fixed top-4 left-4 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-40 max-w-xs">
      <div className="text-xs font-medium text-gray-700 mb-2">위치 미리보기</div>
      <div className="space-y-1">
        {previewBlocks.map((block, index) => (
          <div
            key={block.id}
            className={`
              flex items-center space-x-2 text-xs p-1 rounded
              ${index === targetIndex ? 'bg-blue-100 text-blue-700' : 'text-gray-600'}
            `}
          >
            <span className="w-4 text-center">{index + 1}</span>
            <span>{BLOCK_TYPE_METADATA[block.type].icon}</span>
            <span className="truncate">{BLOCK_TYPE_METADATA[block.type].label}</span>
            {index === targetIndex && (
              <span className="text-blue-500 text-xs">← 새 위치</span>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// 성능 모니터링을 위한 FPS 표시기 (개발 모드에서만)
export const DragPerformanceMonitor: React.FC = () => {
  const [fps, setFps] = useState(0);
  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const { isDragging } = useDragDropState();

  useEffect(() => {
    if (!isDragging || process.env.NODE_ENV !== 'development') return;

    const updateFPS = () => {
      frameCountRef.current++;
      const now = Date.now();
      
      if (now - lastTimeRef.current >= 1000) {
        setFps(frameCountRef.current);
        frameCountRef.current = 0;
        lastTimeRef.current = now;
      }
      
      requestAnimationFrame(updateFPS);
    };

    requestAnimationFrame(updateFPS);
  }, [isDragging]);

  if (!isDragging || process.env.NODE_ENV !== 'development') return null;

  return (
    <div className="fixed top-4 right-4 bg-black text-green-400 text-xs font-mono px-2 py-1 rounded z-50">
      FPS: {fps}
    </div>
  );
}; 