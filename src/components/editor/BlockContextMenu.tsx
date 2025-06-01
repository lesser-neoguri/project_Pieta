import React, { useState, useRef, useEffect } from 'react';
import { StoreBlock, BlockType, BLOCK_TYPE_METADATA } from '@/types/blockTypes';
import { BlockControlsRouter } from './controls/BlockControls';

interface BlockContextMenuProps {
  block: StoreBlock;
  position: { x: number; y: number };
  onUpdate: (updates: Partial<StoreBlock>) => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onMoveUp: () => void;
  onMoveDown: () => void;
  onChangeType: (newType: BlockType) => void;
  onClose: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
}

interface ContextMenuItem {
  label: string;
  icon: string;
  action: () => void;
  disabled?: boolean;
  danger?: boolean;
  separator?: boolean;
}

export const BlockContextMenu: React.FC<BlockContextMenuProps> = ({
  block,
  position,
  onUpdate,
  onDelete,
  onDuplicate,
  onMoveUp,
  onMoveDown,
  onChangeType,
  onClose,
  canMoveUp,
  canMoveDown
}) => {
  const [activeSubmenu, setActiveSubmenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  // 메뉴 아이템 정의
  const menuItems: ContextMenuItem[] = [
    {
      label: '복제',
      icon: '📋',
      action: onDuplicate
    },
    {
      label: '위로 이동',
      icon: '⬆️',
      action: onMoveUp,
      disabled: !canMoveUp
    },
    {
      label: '아래로 이동',
      icon: '⬇️',
      action: onMoveDown,
      disabled: !canMoveDown
    },
    {
      separator: true,
      label: '',
      icon: '',
      action: () => {}
    },
    {
      label: '블록 타입 변경',
      icon: '🔄',
      action: () => setActiveSubmenu('change-type')
    },
    {
      separator: true,
      label: '',
      icon: '',
      action: () => {}
    },
    {
      label: '삭제',
      icon: '🗑️',
      action: onDelete,
      danger: true
    }
  ];

  // 블록 타입 변경 옵션
  const typeChangeOptions = Object.entries(BLOCK_TYPE_METADATA)
    .filter(([type]) => type !== block.type)
    .map(([type, metadata]) => ({
      type: type as BlockType,
      label: metadata.label,
      icon: metadata.icon,
      description: metadata.description
    }));

  // 외부 클릭 시 닫기
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // ESC 키로 닫기
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (activeSubmenu) {
          setActiveSubmenu(null);
        } else {
          onClose();
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [activeSubmenu, onClose]);

  const handleTypeChange = (newType: BlockType) => {
    onChangeType(newType);
    onClose();
  };

  return (
    <div
      ref={menuRef}
      className="absolute z-50 bg-white border border-gray-200 rounded-lg shadow-lg py-2 min-w-48"
      style={{ left: position.x, top: position.y }}
    >
      {/* 메인 메뉴 */}
      {!activeSubmenu && (
        <div>
          {/* 헤더 */}
          <div className="px-3 py-2 border-b border-gray-100">
            <div className="flex items-center space-x-2">
              <span className="text-lg">{BLOCK_TYPE_METADATA[block.type].icon}</span>
              <span className="text-sm font-medium text-gray-900">
                {BLOCK_TYPE_METADATA[block.type].label}
              </span>
            </div>
          </div>

          {/* 메뉴 아이템들 */}
          <div className="py-1">
            {menuItems.map((item, index) => {
              if (item.separator) {
                return <hr key={index} className="my-1 border-gray-100" />;
              }

              return (
                <button
                  key={index}
                  onClick={item.action}
                  disabled={item.disabled}
                  className={`
                    w-full text-left px-3 py-2 flex items-center space-x-3 transition-colors
                    ${item.disabled 
                      ? 'text-gray-400 cursor-not-allowed' 
                      : item.danger
                        ? 'text-red-600 hover:bg-red-50'
                        : 'text-gray-700 hover:bg-gray-50'
                    }
                  `}
                >
                  <span className="flex-shrink-0">{item.icon}</span>
                  <span className="text-sm">{item.label}</span>
                  {item.label === '블록 타입 변경' && (
                    <span className="ml-auto text-gray-400">›</span>
                  )}
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* 블록 타입 변경 서브메뉴 */}
      {activeSubmenu === 'change-type' && (
        <div>
          <div className="px-3 py-2 border-b border-gray-100 flex items-center space-x-2">
            <button
              onClick={() => setActiveSubmenu(null)}
              className="text-gray-400 hover:text-gray-600"
            >
              ‹
            </button>
            <span className="text-sm font-medium text-gray-900">블록 타입 변경</span>
          </div>

          <div className="py-1 max-h-64 overflow-y-auto">
            {typeChangeOptions.map((option) => (
              <button
                key={option.type}
                onClick={() => handleTypeChange(option.type)}
                className="w-full text-left px-3 py-2 flex items-center space-x-3 hover:bg-gray-50 transition-colors"
              >
                <span className="text-lg flex-shrink-0">{option.icon}</span>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium text-gray-900">
                    {option.label}
                  </div>
                  <div className="text-xs text-gray-500 truncate">
                    {option.description}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// 인라인 툴바 컴포넌트 (블록 위에 떠다니는 형태)
export const BlockInlineToolbar: React.FC<{
  block: StoreBlock;
  onUpdate: (updates: Partial<StoreBlock>) => void;
  onShowSettings: () => void;
  onShowContextMenu: () => void;
  isVisible: boolean;
  position: { x: number; y: number };
}> = ({ 
  block, 
  onUpdate, 
  onShowSettings, 
  onShowContextMenu, 
  isVisible, 
  position 
}) => {
  const [activeControl, setActiveControl] = useState<string | null>(null);

  if (!isVisible) return null;

  // 블록 타입별 빠른 설정 옵션들
  const getQuickControls = () => {
    switch (block.type) {
      case 'text':
        return [
          {
            label: 'B',
            action: () => onUpdate({
              data: { 
                ...block.data, 
                font_weight: block.data.font_weight === 'bold' ? 'normal' : 'bold'
              }
            }),
            active: block.data.font_weight === 'bold',
            tooltip: '굵게'
          },
          {
            label: 'T',
            action: () => setActiveControl('text-size'),
            tooltip: '텍스트 크기'
          }
        ];

      case 'grid':
        return [
          {
            label: '2×2',
            action: () => onUpdate({ data: { ...block.data, columns: 2 } }),
            active: block.data.columns === 2,
            tooltip: '2열'
          },
          {
            label: '3×3',
            action: () => onUpdate({ data: { ...block.data, columns: 3 } }),
            active: block.data.columns === 3,
            tooltip: '3열'
          },
          {
            label: '4×4',
            action: () => onUpdate({ data: { ...block.data, columns: 4 } }),
            active: block.data.columns === 4,
            tooltip: '4열'
          }
        ];

      default:
        return [];
    }
  };

  const quickControls = getQuickControls();

  return (
    <div
      className="absolute z-40 bg-white border border-gray-200 rounded-lg shadow-lg p-2 flex items-center space-x-2"
      style={{ left: position.x, top: position.y - 50 }}
    >
      {/* 빠른 컨트롤들 */}
      {quickControls.map((control, index) => (
        <button
          key={index}
          onClick={control.action}
          className={`
            px-2 py-1 text-sm font-medium rounded transition-colors
            ${control.active 
              ? 'bg-blue-500 text-white' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
          title={control.tooltip}
        >
          {control.label}
        </button>
      ))}

      {/* 구분선 */}
      {quickControls.length > 0 && (
        <div className="w-px h-6 bg-gray-200"></div>
      )}

      {/* 설정 버튼 */}
      <button
        onClick={onShowSettings}
        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        title="상세 설정"
      >
        ⚙️
      </button>

      {/* 더보기 메뉴 버튼 */}
      <button
        onClick={onShowContextMenu}
        className="p-1 text-gray-500 hover:text-gray-700 transition-colors"
        title="더보기"
      >
        ⋯
      </button>
    </div>
  );
};

// 블록 호버 시 나타나는 액션 버튼들
export const BlockHoverActions: React.FC<{
  block: StoreBlock;
  onEdit: () => void;
  onDuplicate: () => void;
  onDelete: () => void;
  onShowMenu: () => void;
  position: 'top-right' | 'top-left' | 'center';
}> = ({ block, onEdit, onDuplicate, onDelete, onShowMenu, position }) => {
  const getPositionClasses = () => {
    switch (position) {
      case 'top-right':
        return 'absolute top-2 right-2';
      case 'top-left':
        return 'absolute top-2 left-2';
      case 'center':
        return 'absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2';
      default:
        return 'absolute top-2 right-2';
    }
  };

  return (
    <div className={`${getPositionClasses()} z-30 flex space-x-1 opacity-0 group-hover:opacity-100 transition-opacity`}>
      {/* 편집 버튼 */}
      <button
        onClick={onEdit}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center"
        title="편집"
      >
        ✏️
      </button>

      {/* 복제 버튼 */}
      <button
        onClick={onDuplicate}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center"
        title="복제"
      >
        📋
      </button>

      {/* 삭제 버튼 */}
      <button
        onClick={onDelete}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-red-50 flex items-center justify-center text-red-600"
        title="삭제"
      >
        🗑️
      </button>

      {/* 더보기 버튼 */}
      <button
        onClick={onShowMenu}
        className="w-8 h-8 bg-white border border-gray-200 rounded shadow-sm hover:bg-gray-50 flex items-center justify-center"
        title="더보기"
      >
        ⋯
      </button>
    </div>
  );
};

// 컨텍스트 메뉴 관리 훅
export const useBlockContextMenu = () => {
  const [contextMenu, setContextMenu] = useState<{
    block: StoreBlock;
    position: { x: number; y: number };
    visible: boolean;
  } | null>(null);

  const showContextMenu = (
    block: StoreBlock, 
    e: React.MouseEvent | MouseEvent
  ) => {
    e.preventDefault();
    setContextMenu({
      block,
      position: { x: e.clientX, y: e.clientY },
      visible: true
    });
  };

  const hideContextMenu = () => {
    setContextMenu(null);
  };

  return {
    contextMenu,
    showContextMenu,
    hideContextMenu
  };
}; 