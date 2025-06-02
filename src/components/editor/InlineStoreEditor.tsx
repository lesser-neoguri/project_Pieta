import React, { useState, useCallback, useEffect } from 'react';
import { StoreBlock, BlockType } from '@/types/blockTypes';
import { EditorState } from '@/types/editorTypes';
import { useStoreEditorStore } from '@/stores/storeEditorStore';
import { BlockContainer } from './BlockContainer';
import { BlockTypePicker } from './BlockTypePicker';
import { EditorToolbar } from './EditorToolbar';

/**
 * Notion-style 인라인 스토어 에디터
 * 
 * 핵심 기능:
 * - 실시간 프리뷰와 편집 모드
 * - 드래그 앤 드롭 블록 재정렬
 * - 키보드 단축키 (/, Ctrl+Z 등)
 * - 호버 시 블록 컨트롤 표시
 * - 인라인 텍스트 편집
 */

interface InlineStoreEditorProps {
  storeId: string;
  initialBlocks: StoreBlock[];
  isEditMode: boolean;
  onEditModeChange: (editMode: boolean) => void;
  className?: string;
}

export const InlineStoreEditor: React.FC<InlineStoreEditorProps> = ({
  storeId,
  initialBlocks,
  isEditMode,
  onEditModeChange,
  className = ''
}) => {
  // Zustand store
  const {
    blocks,
    selectedBlockId,
    focusedBlockId,
    canUndo,
    canRedo,
    actions
  } = useStoreEditorStore();

  // 로컬 에디터 상태
  const [editorState, setEditorState] = useState<EditorState>({
    selectedBlockId: null,
    editingBlockId: null,
    dragState: {
      isDragging: false,
      draggedBlockId: null,
      dropZone: null
    },
    clipboard: null
  });

  const [showTypePicker, setShowTypePicker] = useState<{
    show: boolean;
    position: number;
    x: number;
    y: number;
  }>({
    show: false,
    position: 0,
    x: 0,
    y: 0
  });

  // 초기 데이터 로드
  useEffect(() => {
    if (initialBlocks.length > 0) {
      actions.initializeStore(storeId, initialBlocks);
    }
  }, [storeId, initialBlocks, actions]);

  // 편집 모드 진입/종료
  const handleEditModeToggle = useCallback(() => {
    if (!isEditMode) {
      // 편집 모드 시작
      actions.startEditingSession('current-user-id'); // 실제 user ID 사용
      onEditModeChange(true);
    } else {
      // 편집 모드 종료
      actions.endEditingSession();
      onEditModeChange(false);
    }
  }, [isEditMode, actions, onEditModeChange]);

  // 블록 추가
  const handleAddBlock = useCallback((
    type: BlockType, 
    position: number,
    sourceEvent?: React.MouseEvent
  ) => {
    const newBlock: StoreBlock = {
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      type,
      position,
      spacing: 'normal',
      text_alignment: 'left',
      data: getDefaultDataForType(type),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    actions.addBlock(newBlock, position);
    
    // 새로 추가된 블록에 포커스
    setTimeout(() => {
      actions.selectBlock(newBlock.id);
      if (type === 'text') {
        setEditorState(prev => ({
          ...prev,
          editingBlockId: newBlock.id
        }));
      }
    }, 50);

    setShowTypePicker({ show: false, position: 0, x: 0, y: 0 });
  }, [actions]);

  // 블록 선택
  const handleBlockSelect = useCallback((blockId: string) => {
    if (!isEditMode) return;
    
    actions.selectBlock(blockId);
    setEditorState(prev => ({
      ...prev,
      selectedBlockId: blockId,
      editingBlockId: null
    }));
  }, [isEditMode, actions]);

  // 블록 편집 모드 진입
  const handleBlockEdit = useCallback((blockId: string) => {
    if (!isEditMode) return;
    
    setEditorState(prev => ({
      ...prev,
      editingBlockId: blockId,
      selectedBlockId: blockId
    }));
    actions.focusBlock(blockId);
  }, [isEditMode, actions]);

  // 블록 업데이트
  const handleBlockUpdate = useCallback((
    blockId: string, 
    updates: Partial<StoreBlock>
  ) => {
    actions.updateBlock(blockId, updates);
  }, [actions]);

  // 블록 삭제
  const handleBlockDelete = useCallback((blockId: string) => {
    if (window.confirm('이 블록을 삭제하시겠습니까?')) {
      actions.deleteBlock(blockId);
    }
  }, [actions]);

  // 블록 복제
  const handleBlockDuplicate = useCallback((blockId: string) => {
    const sourceBlock = blocks.find((b: StoreBlock) => b.id === blockId);
    if (!sourceBlock) return;

    const duplicatedBlock: StoreBlock = {
      ...sourceBlock,
      id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      position: sourceBlock.position + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    actions.addBlock(duplicatedBlock, duplicatedBlock.position);
  }, [blocks, actions]);

  // 드래그 앤 드롭 핸들러
  const handleDragStart = useCallback((blockId: string) => {
    setEditorState(prev => ({
      ...prev,
      dragState: {
        isDragging: true,
        draggedBlockId: blockId,
        dropZone: null
      }
    }));
  }, []);

  const handleDragEnd = useCallback(() => {
    setEditorState(prev => ({
      ...prev,
      dragState: {
        isDragging: false,
        draggedBlockId: null,
        dropZone: null
      }
    }));
  }, []);

  const handleDrop = useCallback((
    draggedBlockId: string, 
    targetPosition: number
  ) => {
    const draggedBlock = blocks.find((b: StoreBlock) => b.id === draggedBlockId);
    if (!draggedBlock) return;

    const sourceIndex = draggedBlock.position;
    actions.reorderBlocks(sourceIndex, targetPosition);
    
    handleDragEnd();
  }, [blocks, actions, handleDragEnd]);

  // 블록 사이 "+" 버튼 클릭
  const handleAddButtonClick = useCallback((
    position: number,
    event: React.MouseEvent
  ) => {
    const rect = event.currentTarget.getBoundingClientRect();
    setShowTypePicker({
      show: true,
      position,
      x: rect.left,
      y: rect.bottom
    });
  }, []);

  // 키보드 단축키
  useEffect(() => {
    if (!isEditMode) return;

    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl/Cmd + Z - 실행취소
      if ((event.ctrlKey || event.metaKey) && event.key === 'z' && !event.shiftKey) {
        event.preventDefault();
        if (canUndo) actions.undo();
      }
      
      // Ctrl/Cmd + Shift + Z 또는 Ctrl/Cmd + Y - 다시실행
      if (((event.ctrlKey || event.metaKey) && event.shiftKey && event.key === 'Z') ||
          ((event.ctrlKey || event.metaKey) && event.key === 'y')) {
        event.preventDefault();
        if (canRedo) actions.redo();
      }

      // ESC - 편집 모드 종료
      if (event.key === 'Escape') {
        setEditorState(prev => ({
          ...prev,
          editingBlockId: null,
          selectedBlockId: null
        }));
        actions.selectBlock(null);
      }

      // Delete - 선택된 블록 삭제
      if (event.key === 'Delete' || event.key === 'Backspace') {
        if (selectedBlockId && !editorState.editingBlockId) {
          event.preventDefault();
          handleBlockDelete(selectedBlockId);
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [
    isEditMode, 
    canUndo, 
    canRedo, 
    selectedBlockId, 
    editorState.editingBlockId,
    actions,
    handleBlockDelete
  ]);

  if (!isEditMode) {
    // 읽기 전용 모드 - 실제 스토어 페이지 렌더링
    return (
      <div className={`inline-store-editor read-only ${className}`}>
        <div className="blocks-container">
          {blocks.map((block: StoreBlock) => (
            <BlockContainer
              key={block.id}
              block={block}
              isSelected={false}
              isEditing={false}
              onSelect={() => {}}
              onEdit={() => {}}
              onUpdate={() => {}}
              onDelete={() => {}}
              onDuplicate={() => {}}
              onDragStart={() => {}}
              onDrop={() => {}}
            />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className={`inline-store-editor edit-mode ${className}`}>
      {/* 에디터 툴바 */}
      <EditorToolbar
        isEditMode={isEditMode}
        canUndo={canUndo}
        canRedo={canRedo}
        onEditModeToggle={handleEditModeToggle}
        onUndo={actions.undo}
        onRedo={actions.redo}
        onSave={actions.saveChanges}
      />

      {/* 블록 컨테이너 */}
      <div className="blocks-container space-y-2">
        {/* 첫 번째 블록 전에 추가 버튼 */}
        <div 
          className="add-block-trigger h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
          onClick={(e) => handleAddButtonClick(0, e)}
        >
          <button className="add-block-button w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 group-hover:shadow-md transition-all">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>

        {/* 블록들 */}
        {blocks.map((block: StoreBlock, index: number) => (
          <React.Fragment key={block.id}>
            <BlockContainer
              block={block}
              isSelected={selectedBlockId === block.id}
              isEditing={editorState.editingBlockId === block.id}
              isDragging={editorState.dragState.draggedBlockId === block.id}
              onSelect={handleBlockSelect}
              onEdit={handleBlockEdit}
              onUpdate={handleBlockUpdate}
              onDelete={handleBlockDelete}
              onDuplicate={handleBlockDuplicate}
              onDragStart={handleDragStart}
              onDrop={handleDrop}
            />
            
            {/* 블록 사이 추가 버튼 */}
            <div 
              className="add-block-trigger h-8 flex items-center justify-center opacity-0 hover:opacity-100 transition-opacity group"
              onClick={(e) => handleAddButtonClick(index + 1, e)}
            >
              <button className="add-block-button w-8 h-8 rounded-full bg-gray-200 hover:bg-gray-300 flex items-center justify-center text-gray-600 group-hover:shadow-md transition-all">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>
          </React.Fragment>
        ))}

        {/* 마지막에 추가 버튼 (블록이 없을 때) */}
        {blocks.length === 0 && (
          <div 
            className="add-first-block min-h-64 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center hover:border-gray-400 transition-colors cursor-pointer"
            onClick={(e) => handleAddButtonClick(0, e)}
          >
            <div className="text-center">
              <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-gray-100 flex items-center justify-center">
                <svg className="w-6 h-6 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                </svg>
              </div>
              <h3 className="text-lg font-medium text-gray-900 mb-2">
                첫 번째 블록을 추가하세요
              </h3>
              <p className="text-gray-500">
                스토어 레이아웃을 시작하려면 여기를 클릭하세요
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 블록 타입 선택기 */}
      {showTypePicker.show && (
        <BlockTypePicker
          position={{
            x: showTypePicker.x,
            y: showTypePicker.y
          }}
          onSelect={(type: BlockType) => handleAddBlock(type, showTypePicker.position)}
          onClose={() => setShowTypePicker({ show: false, position: 0, x: 0, y: 0 })}
        />
      )}
    </div>
  );
};

// 블록 타입별 기본 데이터
function getDefaultDataForType(type: BlockType): any {
  switch (type) {
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
      
    case 'list':
      return {
        list_style: 'vertical',
        item_layout: 'comfortable',
        show_images: true,
        image_position: 'left',
        image_size: 'medium',
        show_description: true,
        show_price: true,
        show_rating: false,
        enable_dividers: true,
        show_price_prominent: false
      };
      
    case 'masonry':
      return {
        columns: 3,
        masonry_columns: 3,
        spacing: 'normal',
        min_height: 'medium',
        maintain_aspect_ratio: false,
        enable_lightbox: true,
        show_product_info: true,
        hover_effect: 'overlay'
      };
      
    case 'featured':
      return {
        featured_size: 'large',
        layout_style: 'overlay',
        show_text_overlay: true,
        overlay_position: 'center',
        call_to_action: '자세히 보기',
        enable_parallax: false
      };
      
    case 'banner':
      return {
        banner_height: 'medium',
        banner_style: 'gradient',
        gradient_colors: ['#3B82F6', '#8B5CF6'],
        gradient_direction: 'horizontal',
        title: '특별 프로모션',
        call_to_action: '지금 확인하기',
        text_color: '#FFFFFF',
        text_alignment: 'center',
        enable_animation: false
      };
      
    case 'text':
      return {
        text_content: '여기에 텍스트를 입력하세요...',
        text_size: 'medium',
        text_color: '#333333',
        text_weight: 'normal',
        text_style: 'paragraph',
        max_width: 'medium',
        padding: 'medium',
        font_weight: 'normal',
        line_height: 'normal',
        text_alignment: 'center',
        enable_markdown: false
      };
      
    default:
      return {};
  }
} 