import React, { useState, useRef, useEffect } from 'react';
import { StoreBlock, BlockType, DEFAULT_BLOCK_DATA } from '@/types/blockTypes';
import { InlineTextEditor, ClickToEditText } from './InlineTextEditor';
import { SlashCommandMenu, useSlashCommand } from './SlashCommandMenu';
import { BlockInsertZone, FloatingAddButton } from './BlockInsertButton';
import { 
  BlockContextMenu, 
  BlockInlineToolbar, 
  BlockHoverActions,
  useBlockContextMenu 
} from './BlockContextMenu';
import { BlockControlsRouter } from './controls/BlockControls';
import {
  DragDropProvider,
  DroppableArea,
  DraggableBlock,
  DropZoneIndicator,
  GlobalDragIndicator,
  useDragDropState
} from './DragDropProvider';

interface InlineStoreEditorProps {
  blocks: StoreBlock[];
  onUpdateBlocks: (blocks: StoreBlock[]) => void;
  isEditMode: boolean;
  onToggleEditMode: () => void;
}

// 메인 에디터 컴포넌트 (DragDropProvider로 감싸짐)
export const InlineStoreEditor: React.FC<InlineStoreEditorProps> = ({
  blocks,
  onUpdateBlocks,
  isEditMode,
  onToggleEditMode
}) => {
  // 드래그 앤 드롭을 위한 블록 재정렬 함수
  const handleReorderBlocks = (sourceIndex: number, destinationIndex: number) => {
    const newBlocks = Array.from(blocks);
    const [movedBlock] = newBlocks.splice(sourceIndex, 1);
    newBlocks.splice(destinationIndex, 0, movedBlock);
    
    // position 필드 업데이트
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }));
    
    onUpdateBlocks(reorderedBlocks);
  };

  return (
    <DragDropProvider
      blocks={blocks}
      onReorderBlocks={handleReorderBlocks}
      isEditMode={isEditMode}
    >
      <InlineStoreEditorContent
        blocks={blocks}
        onUpdateBlocks={onUpdateBlocks}
        isEditMode={isEditMode}
        onToggleEditMode={onToggleEditMode}
      />
      <GlobalDragIndicator />
    </DragDropProvider>
  );
};

// 실제 에디터 내용 컴포넌트
const InlineStoreEditorContent: React.FC<InlineStoreEditorProps> = ({
  blocks,
  onUpdateBlocks,
  isEditMode,
  onToggleEditMode
}) => {
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [hoveredBlockId, setHoveredBlockId] = useState<string | null>(null);
  const [settingsPanelVisible, setSettingsPanelVisible] = useState(false);
  const editorRef = useRef<HTMLDivElement>(null);

  // 드래그 상태 가져오기
  const { isDragging, draggedBlockId, dropTargetIndex } = useDragDropState();

  // 슬래시 명령어 관리
  const slashCommand = useSlashCommand((type: BlockType, position: number) => {
    handleAddBlock(type, position);
  });

  // 컨텍스트 메뉴 관리
  const { contextMenu, showContextMenu, hideContextMenu } = useBlockContextMenu();

  // ========================================
  // 블록 조작 함수들
  // ========================================

  const handleAddBlock = (type: BlockType, position: number) => {
    const newBlock: StoreBlock = {
      ...DEFAULT_BLOCK_DATA[type],
      id: `${type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position
    };

    const newBlocks = [...blocks];
    newBlocks.splice(position, 0, newBlock);
    
    // 위치 재정렬
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }));

    onUpdateBlocks(reorderedBlocks);
    setSelectedBlockId(newBlock.id);
  };

  const handleUpdateBlock = (blockId: string, updates: Partial<StoreBlock>) => {
    const newBlocks = blocks.map(block => 
      block.id === blockId ? { ...block, ...updates } as StoreBlock : block
    );
    onUpdateBlocks(newBlocks);
  };

  const handleDeleteBlock = (blockId: string) => {
    const newBlocks = blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({ ...block, position: index }));
    
    onUpdateBlocks(newBlocks);
    setSelectedBlockId(null);
    hideContextMenu();
  };

  const handleDuplicateBlock = (blockId: string) => {
    const blockToDuplicate = blocks.find(block => block.id === blockId);
    if (!blockToDuplicate) return;

    const newBlock: StoreBlock = {
      ...blockToDuplicate,
      id: `${blockToDuplicate.type}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    };

    const insertPosition = blockToDuplicate.position + 1;
    const newBlocks = [...blocks];
    newBlocks.splice(insertPosition, 0, newBlock);
    
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }));

    onUpdateBlocks(reorderedBlocks);
    hideContextMenu();
  };

  const handleMoveBlock = (blockId: string, direction: 'up' | 'down') => {
    const currentIndex = blocks.findIndex(block => block.id === blockId);
    if (currentIndex === -1) return;

    const newIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const newBlocks = [...blocks];
    const [movedBlock] = newBlocks.splice(currentIndex, 1);
    newBlocks.splice(newIndex, 0, movedBlock);

    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }));

    onUpdateBlocks(reorderedBlocks);
    hideContextMenu();
  };

  const handleChangeBlockType = (blockId: string, newType: BlockType) => {
    const block = blocks.find(b => b.id === blockId);
    if (!block) return;

    const newBlock: StoreBlock = {
      ...DEFAULT_BLOCK_DATA[newType],
      id: block.id,
      position: block.position
    };

    handleUpdateBlock(blockId, newBlock);
    hideContextMenu();
  };

  // ========================================
  // 키보드 단축키 처리
  // ========================================
  
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isEditMode) return;

      // 전역 단축키들
      if (e.key === 'Escape') {
        setSelectedBlockId(null);
        setSettingsPanelVisible(false);
        hideContextMenu();
        if (slashCommand.isMenuOpen) {
          slashCommand.handleCancel();
        }
      }

      // 편집 모드 토글 (Ctrl/Cmd + E)
      if ((e.ctrlKey || e.metaKey) && e.key === 'e') {
        e.preventDefault();
        onToggleEditMode();
      }

      // 선택된 블록 삭제 (Delete/Backspace)
      if (selectedBlockId && (e.key === 'Delete' || e.key === 'Backspace')) {
        e.preventDefault();
        handleDeleteBlock(selectedBlockId);
      }

      // 블록 복제 (Ctrl/Cmd + D)
      if (selectedBlockId && (e.ctrlKey || e.metaKey) && e.key === 'd') {
        e.preventDefault();
        handleDuplicateBlock(selectedBlockId);
      }

      // 블록 이동 (Ctrl/Cmd + 화살표)
      if (selectedBlockId && (e.ctrlKey || e.metaKey)) {
        if (e.key === 'ArrowUp') {
          e.preventDefault();
          handleMoveBlock(selectedBlockId, 'up');
        } else if (e.key === 'ArrowDown') {
          e.preventDefault();
          handleMoveBlock(selectedBlockId, 'down');
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isEditMode, selectedBlockId, slashCommand, onToggleEditMode]);

  // ========================================
  // 렌더링
  // ========================================

  const renderBlock = (block: StoreBlock, index: number) => {
    const isSelected = selectedBlockId === block.id;
    const isHovered = hoveredBlockId === block.id;
    const canMoveUp = index > 0;
    const canMoveDown = index < blocks.length - 1;
    const isBeingDragged = draggedBlockId === block.id;
    const isDropTarget = dropTargetIndex === index;

    return (
      <React.Fragment key={block.id}>
        {/* 드롭 영역 표시기 */}
        {isEditMode && isDragging && (
          <DropZoneIndicator
            index={index}
            isVisible={true}
            isActive={isDropTarget}
          />
        )}

        {/* 드래그 가능한 블록 */}
        <DraggableBlock
          blockId={block.id}
          index={index}
          isEditMode={isEditMode}
        >
          <div
            className={`
              group relative transition-all duration-200 rounded-lg
              ${isEditMode ? 'cursor-pointer pl-12' : ''}
              ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
              ${isHovered && isEditMode ? 'bg-gray-50' : ''}
              ${isBeingDragged ? 'opacity-50' : ''}
            `}
            onClick={() => isEditMode && !isDragging && setSelectedBlockId(block.id)}
            onMouseEnter={() => !isDragging && setHoveredBlockId(block.id)}
            onMouseLeave={() => setHoveredBlockId(null)}
            onContextMenu={(e) => isEditMode && !isDragging && showContextMenu(block, e)}
          >
            {/* 블록 사이 삽입 존 */}
            {isEditMode && !isDragging && (
              <BlockInsertZone
                position={index}
                onAddBlock={handleAddBlock}
                isVisible={isHovered || isSelected}
              />
            )}

            {/* 블록 콘텐츠 */}
            <div className="relative">
              {renderBlockContent(block)}
            </div>

            {/* 호버 액션 버튼들 */}
            {isEditMode && isHovered && !isSelected && !isDragging && (
              <BlockHoverActions
                block={block}
                onEdit={() => setSelectedBlockId(block.id)}
                onDuplicate={() => handleDuplicateBlock(block.id)}
                onDelete={() => handleDeleteBlock(block.id)}
                onShowMenu={() => {}}
                position="top-right"
              />
            )}

            {/* 인라인 툴바 */}
            {isEditMode && isSelected && !isDragging && (
              <BlockInlineToolbar
                block={block}
                onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
                onShowSettings={() => setSettingsPanelVisible(true)}
                onShowContextMenu={() => {}}
                isVisible={true}
                position={{ x: 0, y: 0 }}
              />
            )}
          </div>
        </DraggableBlock>
      </React.Fragment>
    );
  };

  const renderBlockContent = (block: StoreBlock) => {
    switch (block.type) {
      case 'text':
        return isEditMode ? (
          <ClickToEditText
            block={block}
            onUpdate={(updates) => handleUpdateBlock(block.id, updates)}
            placeholder="텍스트를 입력하세요..."
          />
        ) : (
          <div 
            className="prose prose-sm max-w-none"
            dangerouslySetInnerHTML={{ __html: block.data.text_content }}
          />
        );

      case 'grid':
        return (
          <div className="grid gap-4" style={{ gridTemplateColumns: `repeat(${block.data.columns}, 1fr)` }}>
            {/* 제품 그리드 렌더링 로직 */}
            {Array.from({ length: 8 }).map((_, i) => (
              <div key={i} className="bg-gray-100 aspect-square rounded-lg flex items-center justify-center">
                <span className="text-gray-500">제품 {i + 1}</span>
              </div>
            ))}
          </div>
        );

      case 'banner':
        return (
          <div 
            className={`rounded-lg p-8 text-center ${getBannerHeightClass(block.data.banner_height)}`}
            style={{
              backgroundColor: block.data.background_color,
              color: block.data.text_color
            }}
          >
            {block.data.title && (
              <h2 className="text-2xl font-bold mb-4">{block.data.title}</h2>
            )}
            {block.data.description && (
              <p className="mb-6">{block.data.description}</p>
            )}
            {block.data.call_to_action && (
              <button className="bg-white text-gray-900 px-6 py-2 rounded-lg font-medium">
                {block.data.call_to_action}
              </button>
            )}
          </div>
        );

      default:
        return (
          <div className="p-8 bg-gray-100 rounded-lg text-center text-gray-500">
            {block.type} 블록 (미구현)
          </div>
        );
    }
  };

  return (
    <div ref={editorRef} className="relative">
      {/* 편집 모드 토글 헤더 */}
      <div className="flex items-center justify-between mb-6 p-4 bg-gray-50 rounded-lg">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">스토어 편집기</span>
          {isEditMode && (
            <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
              편집 모드
            </span>
          )}
          {isDragging && (
            <span className="text-xs bg-orange-100 text-orange-700 px-2 py-1 rounded">
              드래그 중
            </span>
          )}
        </div>
        
        <button
          onClick={onToggleEditMode}
          className={`
            px-4 py-2 rounded-lg font-medium transition-colors
            ${isEditMode 
              ? 'bg-blue-500 text-white hover:bg-blue-600' 
              : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
            }
          `}
        >
          {isEditMode ? '편집 완료' : '편집 시작'}
        </button>
      </div>

      {/* 드롭 가능한 영역으로 블록들을 감싸기 */}
      <DroppableArea droppableId="store-blocks">
        <div className="space-y-6">
          {blocks.map((block, index) => renderBlock(block, index))}
          
          {/* 마지막 드롭 영역 */}
          {isEditMode && isDragging && (
            <DropZoneIndicator
              index={blocks.length}
              isVisible={true}
              isActive={dropTargetIndex === blocks.length}
            />
          )}
          
          {/* 마지막 삽입 존 */}
          {isEditMode && !isDragging && (
            <BlockInsertZone
              position={blocks.length}
              onAddBlock={handleAddBlock}
              isVisible={true}
            />
          )}
        </div>
      </DroppableArea>

      {/* 빈 상태 */}
      {blocks.length === 0 && (
        <div className="text-center py-12">
          <div className="text-gray-400 mb-4">
            <span className="text-6xl">📝</span>
          </div>
          <h3 className="text-lg font-medium text-gray-600 mb-2">
            아직 콘텐츠가 없습니다
          </h3>
          <p className="text-gray-500 mb-6">
            첫 번째 블록을 추가하여 스토어를 꾸며보세요
          </p>
          {isEditMode && (
            <button
              onClick={() => handleAddBlock('text', 0)}
              className="bg-blue-500 text-white px-6 py-3 rounded-lg hover:bg-blue-600 transition-colors"
            >
              첫 블록 추가하기
            </button>
          )}
        </div>
      )}

      {/* 플로팅 추가 버튼 */}
      {isEditMode && blocks.length > 0 && !isDragging && (
        <FloatingAddButton
          onAddBlock={(type) => handleAddBlock(type, blocks.length)}
        />
      )}

      {/* 슬래시 명령어 메뉴 */}
      {slashCommand.isMenuOpen && (
        <SlashCommandMenu
          position={slashCommand.menuPosition}
          onSelectBlock={slashCommand.handleSelectBlock}
          onCancel={slashCommand.handleCancel}
          searchTerm={slashCommand.searchTerm}
        />
      )}

      {/* 컨텍스트 메뉴 */}
      {contextMenu && !isDragging && (
        <BlockContextMenu
          block={contextMenu.block}
          position={contextMenu.position}
          onUpdate={(updates) => handleUpdateBlock(contextMenu.block.id, updates)}
          onDelete={() => handleDeleteBlock(contextMenu.block.id)}
          onDuplicate={() => handleDuplicateBlock(contextMenu.block.id)}
          onMoveUp={() => handleMoveBlock(contextMenu.block.id, 'up')}
          onMoveDown={() => handleMoveBlock(contextMenu.block.id, 'down')}
          onChangeType={(newType) => handleChangeBlockType(contextMenu.block.id, newType)}
          onClose={hideContextMenu}
          canMoveUp={contextMenu.block.position > 0}
          canMoveDown={contextMenu.block.position < blocks.length - 1}
        />
      )}

      {/* 설정 패널 */}
      {settingsPanelVisible && selectedBlockId && !isDragging && (
        <div className="fixed inset-y-0 right-0 w-80 bg-white border-l border-gray-200 shadow-lg z-50 overflow-y-auto">
          <div className="p-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="font-medium text-gray-900">블록 설정</h3>
            <button
              onClick={() => setSettingsPanelVisible(false)}
              className="text-gray-400 hover:text-gray-600"
            >
              ✕
            </button>
          </div>
          
          <div className="p-4">
            {(() => {
              const selectedBlock = blocks.find(b => b.id === selectedBlockId);
              return selectedBlock ? (
                <BlockControlsRouter
                  block={selectedBlock}
                  onUpdate={(updates) => handleUpdateBlock(selectedBlockId, updates)}
                />
              ) : null;
            })()}
          </div>
        </div>
      )}

      {/* 편집 모드 도움말 */}
      {isEditMode && !isDragging && (
        <div className="fixed bottom-4 left-4 bg-gray-900 text-white text-xs p-3 rounded-lg max-w-xs">
          <div className="font-medium mb-1">편집 단축키</div>
          <div className="space-y-1 text-gray-300">
            <div>• 드래그: 블록 이동</div>
            <div>• / : 새 블록 추가</div>
            <div>• Ctrl+D : 복제</div>
            <div>• Delete : 삭제</div>
            <div>• Ctrl+↑↓ : 이동</div>
            <div>• Esc : 선택 해제</div>
          </div>
        </div>
      )}

      {/* 드래그 중 도움말 */}
      {isDragging && (
        <div className="fixed bottom-4 left-4 bg-blue-900 text-white text-xs p-3 rounded-lg max-w-xs">
          <div className="font-medium mb-1">드래그 앤 드롭</div>
          <div className="space-y-1 text-blue-200">
            <div>• 원하는 위치에 드롭하세요</div>
            <div>• ESC로 취소할 수 있습니다</div>
          </div>
        </div>
      )}
    </div>
  );
};

// 헬퍼 함수들
function getBannerHeightClass(height: string): string {
  const heightMap: Record<string, string> = {
    small: 'h-32',
    medium: 'h-48',
    large: 'h-64',
    hero: 'h-96'
  };
  return heightMap[height] || 'h-48';
} 