import React, { useState, useCallback } from 'react';
import { StoreBlock } from '@/types/blockTypes';
import { DraggableBlockList, useDragAndDropState, reorderBlocks } from './DraggableBlockList';
import { BlockInsertionMenu, BlockInsertTrigger, useSlashCommand } from './BlockInsertionMenu';
import { TiptapTextBlock } from './TiptapTextBlock';
import { BlockContainer } from './BlockContainer';

interface EnhancedNotionEditorProps {
  initialBlocks: StoreBlock[];
  onChange: (blocks: StoreBlock[]) => void;
  className?: string;
}

export const EnhancedNotionEditor: React.FC<EnhancedNotionEditorProps> = ({
  initialBlocks,
  onChange,
  className = ""
}) => {
  // 기본 상태
  const [blocks, setBlocks] = useState<StoreBlock[]>(initialBlocks);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // 드래그 앤 드롭 상태
  const {
    dragState,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd
  } = useDragAndDropState();

  // 삽입 메뉴 상태
  const [insertionMenu, setInsertionMenu] = useState<{
    isOpen: boolean;
    position: { x: number; y: number };
    searchQuery: string;
    insertPosition: number;
  }>({ isOpen: false, position: { x: 0, y: 0 }, searchQuery: '', insertPosition: 0 });

  // 블록 상태 업데이트
  const updateBlocks = useCallback((newBlocks: StoreBlock[]) => {
    setBlocks(newBlocks);
    onChange(newBlocks);
  }, [onChange]);

  // 블록 재정렬 핸들러
  const handleBlockReorder = useCallback((startIndex: number, endIndex: number) => {
    const reorderedBlocks = reorderBlocks(blocks, startIndex, endIndex);
    updateBlocks(reorderedBlocks);
  }, [blocks, updateBlocks]);

  // 블록 업데이트
  const updateBlock = useCallback((blockId: string, updates: Partial<StoreBlock>) => {
    const newBlocks = blocks.map(block =>
      block.id === blockId ? { ...block, ...updates } : block
    );
    updateBlocks(newBlocks);
  }, [blocks, updateBlocks]);

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
    newBlocks.forEach(block => {
      if (block.position >= position) {
        block.position += 1;
      }
    });
    
    newBlocks.push(newBlock);
    newBlocks.sort((a, b) => a.position - b.position);
    
    updateBlocks(newBlocks);
    setSelectedBlockId(newBlock.id);
    
    if (blockType === 'text') {
      setEditingBlockId(newBlock.id);
    }

    // 삽입 메뉴 닫기
    setInsertionMenu(prev => ({ ...prev, isOpen: false }));
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

  useSlashCommand(handleSlashCommand);

  // 블록 렌더링 함수
  const renderBlock = useCallback((block: StoreBlock, index: number, isDragging: boolean) => {
    const isSelected = selectedBlockId === block.id;
    const isEditing = editingBlockId === block.id && !isDragging;

    const commonProps = {
      isSelected: isSelected && !isDragging,
      isEditing,
      onSelect: () => !isDragging && setSelectedBlockId(block.id),
      onEdit: () => !isDragging && setEditingBlockId(block.id),
      onEditEnd: () => setEditingBlockId(null),
      onUpdate: (updates: Partial<StoreBlock>) => updateBlock(block.id, updates),
    };

    const blockStyle = {
      opacity: isDragging ? 0.8 : 1,
      transform: isDragging ? 'rotate(2deg)' : 'none',
      transition: isDragging ? 'none' : 'all 0.2s ease'
    };

    switch (block.type) {
      case 'text':
        return (
          <div style={blockStyle} className={`${isDragging ? 'cursor-grabbing' : ''} relative`}>
            {/* 드래그 상태 오버레이 */}
            {isDragging && (
              <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg border-2 border-blue-300 z-10 pointer-events-none" />
            )}
            <TiptapTextBlock
              data={block.data}
              isEditing={commonProps.isEditing}
              isSelected={commonProps.isSelected}
              onUpdate={(updates) => commonProps.onUpdate({ data: { ...block.data, ...updates } })}
              onEditStart={commonProps.onEdit}
              onEditEnd={commonProps.onEditEnd}
              onFocus={commonProps.onSelect}
            />
          </div>
        );
      
      default:
        return (
          <div style={blockStyle} className={`${isDragging ? 'cursor-grabbing' : ''} relative`}>
            {/* 드래그 상태 오버레이 */}
            {isDragging && (
              <div className="absolute inset-0 bg-blue-100 bg-opacity-50 rounded-lg border-2 border-blue-300 z-10 pointer-events-none" />
            )}
            <BlockContainer
              block={block}
              isSelected={commonProps.isSelected}
              isEditing={commonProps.isEditing}
              onSelect={commonProps.onSelect}
              onEdit={commonProps.onEdit}
              onUpdate={commonProps.onUpdate}
              onDelete={() => deleteBlock(block.id)}
              onDuplicate={() => {}}
              onDragStart={() => {}}
              onDrop={() => {}}
            />
          </div>
        );
    }
  }, [selectedBlockId, editingBlockId, updateBlock, deleteBlock]);

  const sortedBlocks = [...blocks].sort((a, b) => a.position - b.position);

  return (
    <div className={`enhanced-notion-editor ${className}`}>
      {/* 헤더 */}
      <div className="sticky top-0 bg-white border-b border-gray-200 px-6 py-4 z-30">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <h2 className="text-xl font-semibold text-gray-900">스토어 편집</h2>
            <span className="px-2 py-1 bg-gray-100 text-gray-600 text-sm rounded-full">
              {blocks.length}개 블록
            </span>
            {dragState.isDragging && (
              <span className="px-2 py-1 bg-blue-100 text-blue-600 text-sm rounded-full animate-pulse">
                드래그 중...
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-2">
            <BlockInsertTrigger 
              onTrigger={(position) => setInsertionMenu({
                isOpen: true,
                position,
                searchQuery: '',
                insertPosition: blocks.length
              })}
              className="bg-blue-50 text-blue-600 hover:bg-blue-100"
            />
          </div>
        </div>
      </div>

      {/* 메인 에디터 영역 */}
      <div className="max-w-4xl mx-auto py-8 px-6">
        {blocks.length === 0 ? (
          // 빈 상태
          <div className="text-center py-16">
            <div className="text-gray-400 mb-6">
              <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-medium text-gray-900 mb-4">
              첫 번째 블록을 추가해보세요
            </h3>
            <p className="text-gray-500 mb-8 max-w-md mx-auto">
              <kbd className="px-3 py-1 bg-gray-100 rounded text-sm font-mono">Ctrl + /</kbd> 
              를 누르거나 아래 버튼을 클릭하여 시작하세요
            </p>
            <BlockInsertTrigger 
              onTrigger={(position) => setInsertionMenu({
                isOpen: true,
                position,
                searchQuery: '',
                insertPosition: 0
              })}
              className="bg-blue-500 text-white w-12 h-12 hover:bg-blue-600 shadow-lg"
            />
          </div>
        ) : (
          // 드래그 가능한 블록 리스트
          <div className="space-y-6">
            {/* 드래그 앤 드롭 안내 */}
            {blocks.length > 1 && !dragState.isDragging && (
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
                <div className="flex items-center space-x-2 text-blue-700">
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 11l5-5m0 0l5 5m-5-5v12" />
                  </svg>
                  <span className="text-sm font-medium">
                    블록을 드래그하여 순서를 변경할 수 있습니다
                  </span>
                </div>
              </div>
            )}

            <DraggableBlockList
              blocks={sortedBlocks}
              onReorder={handleBlockReorder}
              onDragStart={handleDragStart}
              onDragUpdate={handleDragUpdate}
              onDragEnd={handleDragEnd}
              renderBlock={renderBlock}
              className="space-y-4"
            />

            {/* 하단 블록 추가 영역 */}
            <div className="flex items-center justify-center pt-8 border-t border-dashed border-gray-200">
              <BlockInsertTrigger 
                onTrigger={(position) => setInsertionMenu({
                  isOpen: true,
                  position,
                  searchQuery: '',
                  insertPosition: blocks.length
                })}
                className="border-2 border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-colors"
              />
            </div>
          </div>
        )}
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

      {/* 드래그 상태 글로벌 오버레이 */}
      {dragState.isDragging && (
        <div className="fixed inset-0 bg-black bg-opacity-5 pointer-events-none z-40" />
      )}
    </div>
  );
};

// 기본 블록 데이터 생성 헬퍼
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
      };
      
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
      };
      
    case 'banner':
      return {
        banner_height: 'medium',
        banner_style: 'gradient',
        gradient_colors: ['#3B82F6', '#8B5CF6'],
        gradient_direction: 'horizontal',
        text_color: '#FFFFFF',
        text_alignment: 'center'
      };
      
    default:
      return {};
  }
}; 