import React, { useState, useCallback, useRef } from 'react';
import { StoreBlock, TextBlockData, ProductGridBlockData, BannerBlockData } from '@/types/blockTypes';
import { TiptapTextBlock } from './TiptapTextBlock';
import { BlockInsertionMenu, BlockInsertTrigger, useSlashCommand } from './BlockInsertionMenu';
import { BlockContextMenu, FloatingToolbar, BlockSettingsPanel } from './BlockContextMenu';
import { BlockContainer } from './BlockContainer';
import { useDesignHistory } from '@/hooks/useDesignHistory';

interface NotionStyleEditorProps {
  initialBlocks: StoreBlock[];
  onChange: (blocks: StoreBlock[]) => void;
  className?: string;
}

export const NotionStyleEditor: React.FC<NotionStyleEditorProps> = ({
  initialBlocks,
  onChange,
  className = ""
}) => {
  // 상태 관리
  const [blocks, setBlocks] = useState<StoreBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  
  // UI 상태
  const [contextMenu, setContextMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    blockId: string;
  }>({ isOpen: false, position: { x: 0, y: 0 }, blockId: '' });
  
  const [insertionMenu, setInsertionMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    searchQuery: string;
    insertPosition: number;
  }>({ isOpen: false, position: { x: 0, y: 0 }, searchQuery: '', insertPosition: 0 });
  
  const [settingsPanel, setSettingsPanel] = useState<{
    isOpen: boolean;
    blockId: string;
  }>({ isOpen: false, blockId: '' });

  // 히스토리 관리
  const { saveState, undo, redo, canUndo, canRedo } = useDesignHistory(blocks, setBlocks);

  // 에디터 참조
  const editorRef = useRef<HTMLDivElement>(null);

  // 블록 업데이트
  const updateBlocks = useCallback((newBlocks: StoreBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
    saveState(newBlocks);
  }, [onChange, saveState]);

  // 블록 추가
  const insertBlock = useCallback((blockType: StoreBlock['type'], position: number) => {
    const newBlock: StoreBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type: blockType,
      position,
      data: getDefaultBlockData(blockType),
      created_at: new Date().toISOString(),
      spacing: 'normal'
    };

    const newBlocks = [...blocks];
    // 위치 조정: 삽입 위치 이후의 모든 블록 position 증가
    newBlocks.forEach(block => {
      if (block.position >= position) {
        block.position += 1;
      }
    });
    
    newBlocks.push(newBlock);
    newBlocks.sort((a, b) => a.position - b.position);
    
    updateBlocks(newBlocks);
    
    // 새 블록 자동 선택 및 편집 시작
    setSelectedBlockId(newBlock.id);
    if (blockType === 'text') {
      setEditingBlockId(newBlock.id);
    }
  }, [blocks, updateBlocks]);

  // 블록 업데이트
  const updateBlock = useCallback((blockId: string, updates: Partial<StoreBlock>) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // 블록 삭제
  const deleteBlock = useCallback((blockId: string) => {
    const blockToDelete = blocks.find(b => b.id === blockId);
    if (!blockToDelete) return;

    const newBlocks = blocks
      .filter(block => block.id !== blockId)
      .map(block => ({
        ...block,
        position: block.position > blockToDelete.position 
          ? block.position - 1 
          : block.position
      }));
    
    updateBlocks(newBlocks);
    setSelectedBlockId(null);
    setEditingBlockId(null);
  }, [blocks, updateBlocks]);

  // 블록 복제
  const duplicateBlock = useCallback((blockId: string) => {
    const originalBlock = blocks.find(b => b.id === blockId);
    if (!originalBlock) return;

    const newBlock: StoreBlock = {
      ...originalBlock,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: originalBlock.position + 1,
      created_at: new Date().toISOString()
    };

    const newBlocks = [...blocks];
    // 복제된 블록 이후의 모든 블록 position 증가
    newBlocks.forEach(block => {
      if (block.position > originalBlock.position) {
        block.position += 1;
      }
    });
    
    newBlocks.push(newBlock);
    newBlocks.sort((a, b) => a.position - b.position);
    
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
  }, [blocks, updateBlocks]);

  // 블록 타입 변경
  const changeBlockType = useCallback((blockId: string, newType: StoreBlock['type']) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const newData = convertBlockData(block.data, block.type, newType);
    updateBlock(blockId, { type: newType, data: newData });
  }, [blocks, updateBlock]);

  // 블록 이동
  const moveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const targetPosition = direction === 'up' ? block.position - 1 : block.position + 1;
    const targetBlock = blocks.find(b => b.position === targetPosition);
    
    if (!targetBlock) return;

    const newBlocks = blocks.map(b => {
      if (b.id === blockId) {
        return { ...b, position: targetPosition };
      }
      if (b.id === targetBlock.id) {
        return { ...b, position: block.position };
      }
      return b;
    });

    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

  // 슬래시 명령어 핸들러
  const handleSlashCommand = useCallback((query: string, position: { x: number; y: number }) => {
    const insertPosition = selectedBlockId 
      ? (blocks.find(b => b.id === selectedBlockId)?.position || 0) + 1
      : blocks.length;
    
    setInsertionMenu({
      isOpen: true,
      position,
      searchQuery: query,
      insertPosition
    });
  }, [selectedBlockId, blocks]);

  // 슬래시 명령어 훅 사용
  useSlashCommand(handleSlashCommand);

  // 키보드 단축키
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // 편집 중일 때는 단축키 비활성화
      if (editingBlockId) return;

      if ((e.ctrlKey || e.metaKey)) {
        switch (e.key) {
          case 'z':
            e.preventDefault();
            if (e.shiftKey) {
              redo();
            } else {
              undo();
            }
            break;
          case 'd':
            e.preventDefault();
            if (selectedBlockId) {
              duplicateBlock(selectedBlockId);
            }
            break;
        }
      }

      if (selectedBlockId && !editingBlockId) {
        switch (e.key) {
          case 'Delete':
          case 'Backspace':
            e.preventDefault();
            deleteBlock(selectedBlockId);
            break;
          case 'Enter':
            e.preventDefault();
            setEditingBlockId(selectedBlockId);
            break;
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [selectedBlockId, editingBlockId, deleteBlock, duplicateBlock, undo, redo]);

  // 컨텍스트 메뉴 핸들러
  const handleContextMenu = useCallback((e: React.MouseEvent, blockId: string) => {
    e.preventDefault();
    setContextMenu({
      isOpen: true,
      position: { x: e.clientX, y: e.clientY },
      blockId
    });
  }, []);

  const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);

  return (
    <div className={`notion-style-editor ${className}`} ref={editorRef}>
      {/* 메인 에디터 영역 */}
      <div className="min-h-screen bg-white">
        {/* 툴바 */}
        <div className="sticky top-0 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between z-20">
          <div className="flex items-center space-x-2">
            <h2 className="text-lg font-medium">스토어 편집</h2>
            <span className="text-sm text-gray-500">
              {blocks.length}개 블록
            </span>
          </div>
          
          <div className="flex items-center space-x-2">
            {/* 실행취소/다시실행 */}
            <button
              onClick={undo}
              disabled={!canUndo}
              className={`p-1 rounded ${
                canUndo 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="실행취소 (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            
            <button
              onClick={redo}
              disabled={!canRedo}
              className={`p-1 rounded ${
                canRedo 
                  ? 'text-gray-600 hover:bg-gray-100' 
                  : 'text-gray-300 cursor-not-allowed'
              }`}
              title="다시실행 (Ctrl+Shift+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10h-10a8 8 0 00-8 8v2m18-10l-6 6m6-6l-6-6" />
              </svg>
            </button>

            {/* 블록 추가 버튼 */}
            <BlockInsertTrigger 
              onTrigger={(position) => setInsertionMenu({
                isOpen: true,
                position,
                searchQuery: '',
                insertPosition: blocks.length
              })}
              className="ml-2"
            />
          </div>
        </div>

        {/* 블록 목록 */}
        <div className="max-w-4xl mx-auto py-8 px-4">
          {sortedBlocks.length === 0 ? (
            // 빈 상태
            <div className="text-center py-12">
              <div className="text-gray-400 mb-4">
                <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                첫 번째 블록을 추가해보세요
              </h3>
              <p className="text-gray-500 mb-4">
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs">Ctrl + /</kbd> 또는 
                <kbd className="px-2 py-1 bg-gray-100 rounded text-xs ml-1">+</kbd> 버튼을 눌러서 시작하세요
              </p>
              <BlockInsertTrigger 
                onTrigger={(position) => setInsertionMenu({
                  isOpen: true,
                  position,
                  searchQuery: '',
                  insertPosition: 0
                })}
                className="bg-blue-50 text-blue-600 w-8 h-8"
              />
            </div>
          ) : (
            // 블록 렌더링
            <div className="space-y-4">
              {sortedBlocks.map((block, index) => (
                <div
                  key={block.id}
                  className="relative group"
                  onMouseEnter={() => setHoveredBlockId(block.id)}
                  onMouseLeave={() => setHoveredBlockId(null)}
                  onContextMenu={(e) => handleContextMenu(e, block.id)}
                >
                  {/* 블록 간 삽입 영역 */}
                  <div className="flex items-center justify-center h-4 opacity-0 group-hover:opacity-100 transition-opacity">
                    <BlockInsertTrigger 
                      onTrigger={(position) => setInsertionMenu({
                        isOpen: true,
                        position,
                        searchQuery: '',
                        insertPosition: block.position
                      })}
                      className="bg-white border-2 border-dashed border-gray-300 hover:border-blue-400"
                    />
                  </div>

                  {/* 실제 블록 */}
                  {renderBlock(block, {
                    isSelected: selectedBlockId === block.id,
                    isEditing: editingBlockId === block.id,
                    isHovered: hoveredBlockId === block.id,
                    onSelect: () => setSelectedBlockId(block.id),
                    onEdit: () => setEditingBlockId(block.id),
                    onEditEnd: () => setEditingBlockId(null),
                    onUpdate: (updates) => updateBlock(block.id, updates),
                  })}

                  {/* 플로팅 툴바 */}
                  <FloatingToolbar
                    isVisible={hoveredBlockId === block.id || selectedBlockId === block.id}
                    position={{ x: 20, y: 0 }}
                    block={block}
                    onChangeBlockType={(newType) => changeBlockType(block.id, newType)}
                    onToggleSettings={() => setSettingsPanel({
                      isOpen: true,
                      blockId: block.id
                    })}
                    onDelete={() => deleteBlock(block.id)}
                    onDuplicate={() => duplicateBlock(block.id)}
                  />
                </div>
              ))}

              {/* 마지막 블록 추가 영역 */}
              <div className="flex items-center justify-center h-8 border-t border-dashed border-gray-200 pt-4">
                <BlockInsertTrigger 
                  onTrigger={(position) => setInsertionMenu({
                    isOpen: true,
                    position,
                    searchQuery: '',
                    insertPosition: blocks.length
                  })}
                />
              </div>
            </div>
          )}
        </div>
      </div>

      {/* 블록 삽입 메뉴 */}
      <BlockInsertionMenu
        isOpen={insertionMenu.isOpen}
        position={insertionMenu.position}
        searchQuery={insertionMenu.searchQuery}
        onClose={() => setInsertionMenu(prev => ({ ...prev, isOpen: false }))}
        onInsertBlock={insertBlock}
        insertPosition={insertionMenu.insertPosition}
      />

      {/* 컨텍스트 메뉴 */}
      <BlockContextMenu
        isOpen={contextMenu.isOpen}
        position={contextMenu.position}
        block={blocks.find(b => b.id === contextMenu.blockId)!}
        onClose={() => setContextMenu(prev => ({ ...prev, isOpen: false }))}
        onChangeBlockType={(newType) => changeBlockType(contextMenu.blockId, newType)}
        onDuplicateBlock={() => duplicateBlock(contextMenu.blockId)}
        onDeleteBlock={() => deleteBlock(contextMenu.blockId)}
        onMoveUp={() => moveBlock(contextMenu.blockId, 'up')}
        onMoveDown={() => moveBlock(contextMenu.blockId, 'down')}
      />

      {/* 설정 패널 */}
      <BlockSettingsPanel
        isOpen={settingsPanel.isOpen}
        block={blocks.find(b => b.id === settingsPanel.blockId)!}
        onClose={() => setSettingsPanel({ isOpen: false, blockId: '' })}
        onUpdate={(updates) => updateBlock(settingsPanel.blockId, updates)}
      />
    </div>
  );
};

// 블록 렌더링 함수
const renderBlock = (
  block: StoreBlock,
  handlers: {
    isSelected: boolean;
    isEditing: boolean;
    isHovered: boolean;
    onSelect: () => void;
    onEdit: () => void;
    onEditEnd: () => void;
    onUpdate: (updates: Partial<StoreBlock>) => void;
  }
) => {
  const { isSelected, isEditing, onSelect, onEdit, onEditEnd, onUpdate } = handlers;

  switch (block.type) {
    case 'text':
      return (
        <TiptapTextBlock
          data={block.data as TextBlockData}
          isEditing={isEditing}
          isSelected={isSelected}
          onUpdate={(updates) => onUpdate({ data: { ...block.data, ...updates } })}
          onEditStart={onEdit}
          onEditEnd={onEditEnd}
          onFocus={onSelect}
        />
      );
    
    default:
      // 다른 블록들은 기존 BlockContainer 사용
      return (
        <BlockContainer
          block={block}
          isSelected={isSelected}
          isEditing={isEditing}
          onSelect={onSelect}
          onEdit={onEdit}
          onUpdate={onUpdate}
          onDelete={() => {}}
          onDuplicate={() => {}}
          onDragStart={() => {}}
          onDrop={() => {}}
        />
      );
  }
};

// 기본 블록 데이터 생성
const getDefaultBlockData = (blockType: StoreBlock['type']): any => {
  switch (blockType) {
    case 'text':
      return {
        text_content: '',
        text_size: 'medium',
        text_alignment: 'left',
        text_color: '#333333',
        text_weight: 'normal',
        max_width: 'large',
        padding: 'medium',
        line_height: 'normal'
      } as TextBlockData;
      
    case 'grid':
      return {
        columns: 4,
        spacing: 'normal',
        card_style: 'default',
        height_ratio: 'square',
        show_price: true,
        show_description: true,
        show_rating: false,
        sort_by: 'newest'
      } as ProductGridBlockData;
      
    case 'banner':
      return {
        banner_height: 'medium',
        banner_style: 'gradient',
        gradient_colors: ['#3B82F6', '#8B5CF6'],
        gradient_direction: 'horizontal',
        text_color: '#FFFFFF',
        text_alignment: 'center'
      } as BannerBlockData;
      
    default:
      return {};
  }
};

// 블록 데이터 변환 (타입 변경 시)
const convertBlockData = (currentData: any, fromType: StoreBlock['type'], toType: StoreBlock['type']): any => {
  // 기본 데이터로 시작
  const defaultData = getDefaultBlockData(toType);
  
  // 타입별 변환 로직
  if (fromType === 'text' && toType === 'banner') {
    return {
      ...defaultData,
      title: currentData.text_content?.replace(/<[^>]*>/g, ''), // HTML 태그 제거
      text_color: currentData.text_color,
      text_alignment: currentData.text_alignment
    };
  }
  
  if (fromType === 'banner' && toType === 'text') {
    return {
      ...defaultData,
      text_content: currentData.title || '',
      text_color: currentData.text_color,
      text_alignment: currentData.text_alignment
    };
  }
  
  // 기본적으로 새로운 타입의 기본값 반환
  return defaultData;
}; 