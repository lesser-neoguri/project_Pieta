'use client';

import React, { useState, useRef, useEffect } from 'react';

interface DraggableTextProps {
  text: string;
  position: { x: number; y: number };
  onPositionChange: (position: { x: number; y: number }) => void;
  className?: string;
  style?: React.CSSProperties;
  isEditing?: boolean;
  containerRef?: React.RefObject<HTMLElement | HTMLDivElement | null>;
}

export default function DraggableText({
  text,
  position,
  onPositionChange,
  className = '',
  style = {},
  isEditing = false,
  containerRef
}: DraggableTextProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [initialPosition, setInitialPosition] = useState({ x: 0, y: 0 });
  const textRef = useRef<HTMLDivElement>(null);

  const handleMouseDown = (e: React.MouseEvent) => {
    if (!isEditing) return;
    
    e.preventDefault();
    setIsDragging(true);
    setDragStart({ x: e.clientX, y: e.clientY });
    setInitialPosition(position);
  };

  const handleMouseMove = (e: MouseEvent) => {
    if (!isDragging || !containerRef?.current) return;

    const container = containerRef.current;
    const containerRect = container.getBoundingClientRect();
    
    const deltaX = e.clientX - dragStart.x;
    const deltaY = e.clientY - dragStart.y;
    
    // 컨테이너 크기 대비 퍼센트로 계산
    const newX = initialPosition.x + (deltaX / containerRect.width) * 100;
    const newY = initialPosition.y + (deltaY / containerRect.height) * 100;
    
    // 경계 제한 (0-100%)
    const clampedX = Math.max(0, Math.min(100, newX));
    const clampedY = Math.max(0, Math.min(100, newY));
    
    onPositionChange({ x: clampedX, y: clampedY });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  useEffect(() => {
    if (isDragging) {
      document.addEventListener('mousemove', handleMouseMove);
      document.addEventListener('mouseup', handleMouseUp);
      
      return () => {
        document.removeEventListener('mousemove', handleMouseMove);
        document.removeEventListener('mouseup', handleMouseUp);
      };
    }
  }, [isDragging, dragStart, initialPosition]);

  return (
    <div
      ref={textRef}
      className={`absolute select-none ${isEditing ? 'cursor-move' : 'cursor-default'} ${className}`}
      style={{
        left: `${position.x}%`,
        top: `${position.y}%`,
        transform: 'translate(-50%, -50%)',
        ...style,
        ...(isEditing && {
          outline: '2px dashed rgba(255, 255, 255, 0.5)',
          padding: '8px',
          borderRadius: '4px',
          backgroundColor: 'rgba(0, 0, 0, 0.1)'
        })
      }}
      onMouseDown={handleMouseDown}
    >
      {text}
      {isEditing && (
        <div className="absolute -top-6 left-1/2 transform -translate-x-1/2 bg-black text-white text-xs px-2 py-1 rounded whitespace-nowrap">
          드래그하여 위치 조정
        </div>
      )}
    </div>
  );
} 