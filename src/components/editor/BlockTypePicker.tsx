import React from 'react';
import { BlockType, BLOCK_TYPE_METADATA } from '@/types/blockTypes';

interface BlockTypePickerProps {
  position: { x: number; y: number };
  onSelect: (type: BlockType) => void;
  onClose: () => void;
}

export const BlockTypePicker: React.FC<BlockTypePickerProps> = ({
  position,
  onSelect,
  onClose
}) => {
  return (
    <div
      className="fixed z-50 bg-white border border-gray-200 rounded-lg shadow-lg p-2 w-64"
      style={{
        left: position.x,
        top: position.y
      }}
    >
      <div className="text-sm font-medium text-gray-900 mb-2 px-2">
        블록 타입 선택
      </div>
      
      <div className="space-y-1">
        {Object.entries(BLOCK_TYPE_METADATA).map(([type, metadata]) => (
          <button
            key={type}
            onClick={() => onSelect(type as BlockType)}
            className="w-full flex items-center space-x-3 px-2 py-2 rounded hover:bg-gray-100 text-left transition-colors"
          >
            <span className="text-lg">{metadata.icon}</span>
            <div className="flex-1">
              <div className="font-medium text-sm text-gray-900">
                {metadata.label}
              </div>
              <div className="text-xs text-gray-500">
                {metadata.description}
              </div>
            </div>
          </button>
        ))}
      </div>

      <div className="border-t border-gray-200 mt-2 pt-2">
        <button
          onClick={onClose}
          className="w-full text-center text-xs text-gray-500 hover:text-gray-700 py-1"
        >
          ESC로 닫기
        </button>
      </div>
    </div>
  );
}; 