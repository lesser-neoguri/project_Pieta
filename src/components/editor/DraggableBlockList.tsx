import React from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DragStart,
  DragUpdate
} from '@hello-pangea/dnd';
import { useDetailedEditorState } from '@/hooks/useDetailedEditorState';
import { StoreBlock } from '@/types/editorTypes';

interface DraggableBlockListProps {
  children: (block: StoreBlock, index: number, isDragging: boolean, isOverDragTarget: boolean) => React.ReactNode;
  className?: string;
}

export const DraggableBlockList: React.FC<DraggableBlockListProps> = ({
  children,
  className = ""
}) => {
  const { state, actions } = useDetailedEditorState();
  const { blocks, dragState } = state;

  // 드래그 시작 핸들러
  const handleDragStart = (start: DragStart) => {
    const draggedBlockId = start.draggableId;
    actions.startDrag(draggedBlockId);
  };

  // 드래그 업데이트 핸들러 (드래그 중 위치 변경 시)
  const handleDragUpdate = (update: DragUpdate) => {
    const newIndex = update.destination?.index ?? null;
    actions.setDragOver(newIndex);
  };

  // 드래그 종료 핸들러
  const handleDragEnd = (result: DropResult) => {
    const { source, destination } = result;

    // 드래그 상태 종료
    actions.endDrag();

    // 유효하지 않은 드롭인 경우 무시
    if (!destination) {
      return;
    }

    // 같은 위치에 드롭한 경우 무시
    if (source.index === destination.index) {
      return;
    }

    // 블록 순서 변경
    actions.reorderBlocks(source.index, destination.index);
  };

  return (
    <DragDropContext
      onDragStart={handleDragStart}
      onDragUpdate={handleDragUpdate}
      onDragEnd={handleDragEnd}
    >
      <Droppable droppableId="block-list">
        {(provided, snapshot) => (
          <div
            ref={provided.innerRef}
            {...provided.droppableProps}
            className={`${className} ${
              snapshot.isDraggingOver ? 'bg-blue-50 border-blue-200' : ''
            } transition-colors duration-200`}
          >
            {blocks.map((block, index) => (
              <Draggable 
                key={block.id} 
                draggableId={block.id} 
                index={index}
              >
                {(provided, snapshot) => {
                  const isDragging = snapshot.isDragging;
                  const isOverDragTarget = 
                    dragState.isDragging && 
                    dragState.dragOverIndex === index;

                  return (
                    <div
                      ref={provided.innerRef}
                      {...provided.draggableProps}
                      className={`
                        relative transition-all duration-300 ease-out
                        ${isDragging ? 'transform scale-[1.02] shadow-2xl z-50' : ''}
                        ${isOverDragTarget ? 'transform translate-y-1' : ''}
                      `}
                      style={{
                        ...provided.draggableProps.style,
                        // 드래그 중 고급 스타일 오버라이드
                        ...(isDragging && {
                          transform: `${provided.draggableProps.style?.transform} scale(1.02)`,
                          filter: 'drop-shadow(0 25px 25px rgb(0 0 0 / 0.15))',
                        })
                      }}
                    >
                      {/* 고급 드래그 핸들 */}
                      <div
                        {...provided.dragHandleProps}
                        className={`
                          absolute -left-3 top-1/2 transform -translate-y-1/2 z-20
                          w-8 h-12 flex items-center justify-center
                          bg-gradient-to-br from-gray-50 to-gray-100 
                          border border-gray-200/60 rounded-xl cursor-grab
                          hover:from-blue-50 hover:to-blue-100 hover:border-blue-200/60
                          active:from-blue-100 active:to-blue-150
                          transition-all duration-200 ease-out
                          backdrop-blur-sm shadow-lg hover:shadow-xl
                          ${isDragging ? 'cursor-grabbing scale-110 bg-gradient-to-br from-blue-100 to-blue-200 border-blue-300' : ''}
                          ${dragState.isDragging && !isDragging ? 'opacity-40 scale-90' : ''}
                          group/handle
                        `}
                      >
                        {/* 세련된 6점 그리드 아이콘 */}
                        <div className="grid grid-cols-2 gap-[3px] transition-all duration-200 group-hover/handle:gap-1">
                          {[...Array(6)].map((_, i) => (
                            <div
                              key={i}
                              className={`
                                w-[3px] h-[3px] rounded-full
                                ${isDragging 
                                  ? 'bg-blue-600' 
                                  : 'bg-gray-400 group-hover/handle:bg-blue-500'
                                }
                                transition-all duration-200
                              `}
                            />
                          ))}
                        </div>

                        {/* 핸들 hover 글로우 효과 */}
                        <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/20 to-purple-400/20 opacity-0 group-hover/handle:opacity-100 transition-opacity duration-300" />
                      </div>

                      {/* 블록 콘텐츠 영역 */}
                      <div className={`
                        relative ml-6 transition-all duration-300 ease-out
                        ${isDragging ? 'opacity-95' : ''}
                        ${dragState.isDragging && !isDragging ? 'opacity-60 scale-[0.98]' : ''}
                      `}>
                        {children(block, index, isDragging, isOverDragTarget)}
                      </div>

                      {/* 고급 드롭 타겟 인디케이터 */}
                      {isOverDragTarget && (
                        <>
                          {/* 메인 인디케이터 */}
                          <div className="absolute inset-0 border-2 border-blue-400/80 rounded-xl bg-gradient-to-r from-blue-50/50 to-indigo-50/50 pointer-events-none animate-pulse" />
                          
                          {/* 상단 드롭 라인 */}
                          <div className="absolute -top-1 left-4 right-4 h-0.5 bg-gradient-to-r from-blue-400 via-blue-500 to-indigo-500 rounded-full animate-pulse shadow-lg" />
                          
                          {/* 글로우 효과 */}
                          <div className="absolute inset-0 rounded-xl bg-gradient-to-br from-blue-400/10 via-indigo-400/10 to-purple-400/10 pointer-events-none" />
                        </>
                      )}
                    </div>
                  );
                }}
              </Draggable>
            ))}
            {provided.placeholder}

            {/* 고급 리스트 끝 드롭 존 표시 */}
            {dragState.isDragging && dragState.dragOverIndex === blocks.length && (
              <div className="relative mx-4 mb-4 group">
                {/* 메인 드롭 존 */}
                <div className="h-6 bg-gradient-to-r from-blue-100/60 via-indigo-100/80 to-purple-100/60 border-2 border-dashed border-blue-300/60 rounded-xl backdrop-blur-sm animate-pulse" />
                
                {/* 글로우 효과 라인들 */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-3/4 h-0.5 bg-gradient-to-r from-blue-400 via-indigo-500 to-purple-400 rounded-full animate-pulse" />
                
                {/* 좌우 스파클 효과 */}
                <div className="absolute top-1/2 left-4 transform -translate-y-1/2 w-1 h-1 bg-blue-400 rounded-full animate-ping" />
                <div className="absolute top-1/2 right-4 transform -translate-y-1/2 w-1 h-1 bg-purple-400 rounded-full animate-ping delay-300" />
                
                {/* 중앙 플러스 아이콘 */}
                <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white rounded-full flex items-center justify-center shadow-lg">
                  <svg className="w-2 h-2 text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M12 4v16m8-8H4" />
                  </svg>
                </div>
              </div>
            )}
          </div>
        )}
      </Droppable>
    </DragDropContext>
  );
};

// 개별 블록 래퍼 컴포넌트 (선택사항)
interface DraggableBlockWrapperProps {
  block: StoreBlock;
  index: number;
  isDragging: boolean;
  isOverDragTarget: boolean;
  children: React.ReactNode;
}

export const DraggableBlockWrapper: React.FC<DraggableBlockWrapperProps> = ({
  block,
  index,
  isDragging,
  isOverDragTarget,
  children
}) => {
  const { actions } = useDetailedEditorState();

  return (
    <div
      className={`
        relative mb-8 group transition-all duration-300 ease-out
        ${isDragging ? 'ring-2 ring-blue-400/60 ring-offset-4 ring-offset-white' : ''}
        ${isOverDragTarget ? 'border-t-2 border-gradient-to-r from-blue-400 to-indigo-500' : ''}
      `}
      onClick={() => actions.setSelected(block.id)}
    >
      {children}
      
      {/* 고급스러운 블록 액션 버튼들 */}
      <div className={`
        absolute -top-3 -right-3 z-30
        flex items-center space-x-2 
        opacity-0 group-hover:opacity-100 
        transition-all duration-300 ease-out
        transform translate-y-2 group-hover:translate-y-0
        ${isDragging ? 'hidden' : ''}
      `}>
        {/* 복사 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            // 복사 로직 추후 구현
            console.log('Copy block:', block.id);
          }}
          className="
            group/btn p-2.5 
            bg-gradient-to-br from-blue-50 to-indigo-50
            hover:from-blue-100 hover:to-indigo-100
            border border-blue-200/60 hover:border-blue-300/80
            rounded-xl shadow-lg hover:shadow-xl
            transition-all duration-200 ease-out
            backdrop-blur-sm
          "
          title="블록 복사"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-blue-600 group-hover/btn:text-blue-700">
            <path d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>

        {/* 삭제 버튼 */}
        <button
          onClick={(e) => {
            e.stopPropagation();
            actions.deleteBlock(block.id);
          }}
          className="
            group/btn p-2.5 
            bg-gradient-to-br from-red-50 to-pink-50
            hover:from-red-100 hover:to-pink-100
            border border-red-200/60 hover:border-red-300/80
            rounded-xl shadow-lg hover:shadow-xl
            transition-all duration-200 ease-out
            backdrop-blur-sm
          "
          title="블록 삭제"
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" className="text-red-600 group-hover/btn:text-red-700">
            <path d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </button>
      </div>

      {/* 블록 인덱스 표시 (고급스러운 스타일) */}
      <div className={`
        absolute -top-2 -left-2 z-20
        w-6 h-6 flex items-center justify-center
        bg-gradient-to-br from-gray-100 to-gray-200
        border border-gray-200/60 rounded-lg
        text-xs font-medium text-gray-500
        opacity-0 group-hover:opacity-100
        transition-all duration-300 ease-out
        transform scale-90 group-hover:scale-100
        ${isDragging ? 'hidden' : ''}
      `}>
        {index + 1}
      </div>
    </div>
  );
};

// 드래그 앤 드롭 상태 관리 훅
export const useDragAndDropState = () => {
  const [dragState, setDragState] = React.useState<{
    isDragging: boolean;
    draggedBlockId: string | null;
    draggedOverIndex: number | null;
  }>({
    isDragging: false,
    draggedBlockId: null,
    draggedOverIndex: null
  });

  const handleDragStart = React.useCallback((start: DragStart) => {
    setDragState({
      isDragging: true,
      draggedBlockId: start.draggableId,
      draggedOverIndex: null
    });
  }, []);

  const handleDragUpdate = React.useCallback((update: DragUpdate) => {
    setDragState(prev => ({
      ...prev,
      draggedOverIndex: update.destination?.index || null
    }));
  }, []);

  const handleDragEnd = React.useCallback((result: DropResult) => {
    setDragState({
      isDragging: false,
      draggedBlockId: null,
      draggedOverIndex: null
    });
  }, []);

  return {
    dragState,
    handleDragStart,
    handleDragUpdate,
    handleDragEnd
  };
};

// 블록 재정렬 유틸리티 함수
export const reorderBlocks = <T extends { position: number }>(
  blocks: T[],
  startIndex: number,
  endIndex: number
): T[] => {
  const result = Array.from(blocks);
  const [removed] = result.splice(startIndex, 1);
  result.splice(endIndex, 0, removed);

  // position 속성 재계산
  return result.map((block, index) => ({
    ...block,
    position: index
  }));
};

// row_layouts 객체 재정렬 함수 (StoreDesignForm.tsx에서 사용)
export const reorderRowLayouts = (
  rowLayouts: Record<string, any>,
  startIndex: number,
  endIndex: number
): Record<string, any> => {
  // 객체를 배열로 변환
  const entries = Object.entries(rowLayouts);
  
  // 배열 재정렬
  const [removed] = entries.splice(startIndex, 1);
  entries.splice(endIndex, 0, removed);
  
  // 새로운 객체로 변환 (키를 새로운 인덱스로)
  const reorderedLayouts: Record<string, any> = {};
  entries.forEach(([, value], index) => {
    reorderedLayouts[index.toString()] = value;
  });
  
  return reorderedLayouts;
}; 