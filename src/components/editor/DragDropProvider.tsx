import React, { createContext, useContext, useCallback } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable,
  DropResult,
  DragStart,
  DragUpdate
} from '@hello-pangea/dnd';
import { StoreBlock } from '@/types/blockTypes';

interface DragDropContextValue {
  isDragging: boolean;
  draggedBlockId: string | null;
  dropTargetIndex: number | null;
}

const DragDropContext_Internal = createContext<DragDropContextValue>({
  isDragging: false,
  draggedBlockId: null,
  dropTargetIndex: null
});

interface DragDropProviderProps {
  children: React.ReactNode;
  blocks: StoreBlock[];
  onReorderBlocks: (sourceIndex: number, destinationIndex: number) => void;
  isEditMode: boolean;
}

export const DragDropProvider: React.FC<DragDropProviderProps> = ({
  children,
  blocks,
  onReorderBlocks,
  isEditMode
}) => {
  const [dragState, setDragState] = React.useState<DragDropContextValue>({
    isDragging: false,
    draggedBlockId: null,
    dropTargetIndex: null
  });

  // 드래그 시작 시 호출
  const handleDragStart = useCallback((start: DragStart) => {
    const draggedBlock = blocks.find(block => block.id === start.draggableId);
    
    setDragState({
      isDragging: true,
      draggedBlockId: start.draggableId,
      dropTargetIndex: null
    });

    // 햅틱 피드백 (모바일)
    if (navigator.vibrate) {
      navigator.vibrate(50);
    }

    // 드래그 시작 애니메이션
    document.body.style.cursor = 'grabbing';
  }, [blocks]);

  // 드래그 중 업데이트 시 호출
  const handleDragUpdate = useCallback((update: DragUpdate) => {
    setDragState(prev => ({
      ...prev,
      dropTargetIndex: update.destination?.index ?? null
    }));
  }, []);

  // 드래그 종료 시 호출
  const handleDragEnd = useCallback((result: DropResult) => {
    const { source, destination } = result;
    
    // 드래그 상태 초기화
    setDragState({
      isDragging: false,
      draggedBlockId: null,
      dropTargetIndex: null
    });

    document.body.style.cursor = '';

    // 유효하지 않은 드롭인 경우
    if (!destination) {
      return;
    }

    // 같은 위치에 드롭한 경우
    if (source.index === destination.index) {
      return;
    }

    // 블록 순서 업데이트
    onReorderBlocks(source.index, destination.index);

    // 성공 햅틱 피드백
    if (navigator.vibrate) {
      navigator.vibrate([50, 100, 50]);
    }
  }, [onReorderBlocks]);

  if (!isEditMode) {
    // 편집 모드가 아닐 때는 DragDropContext 없이 렌더링
    return (
      <DragDropContext_Internal.Provider value={dragState}>
        {children}
      </DragDropContext_Internal.Provider>
    );
  }

  return (
    <DragDropContext_Internal.Provider value={dragState}>
      <DragDropContext
        onDragStart={handleDragStart}
        onDragUpdate={handleDragUpdate}
        onDragEnd={handleDragEnd}
      >
        {children}
      </DragDropContext>
    </DragDropContext_Internal.Provider>
  );
};

// 드롭 영역 컴포넌트
export const DroppableArea: React.FC<{
  children: React.ReactNode;
  droppableId: string;
}> = ({ children, droppableId }) => {
  return (
    <Droppable droppableId={droppableId} type="BLOCK">
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.droppableProps}
          className={`
            transition-all duration-200
            ${snapshot.isDraggingOver ? 'bg-blue-50 border-2 border-dashed border-blue-300 rounded-lg' : ''}
          `}
        >
          {children}
          {provided.placeholder}
        </div>
      )}
    </Droppable>
  );
};

// 드래그 가능한 블록 컴포넌트
export const DraggableBlock: React.FC<{
  children: React.ReactNode;
  blockId: string;
  index: number;
  isEditMode: boolean;
}> = ({ children, blockId, index, isEditMode }) => {
  if (!isEditMode) {
    // 편집 모드가 아닐 때는 드래그 불가능
    return <div>{children}</div>;
  }

  return (
    <Draggable draggableId={blockId} index={index}>
      {(provided, snapshot) => (
        <div
          ref={provided.innerRef}
          {...provided.draggableProps}
          className={`
            transition-all duration-200
            ${snapshot.isDragging ? 'rotate-2 scale-105 shadow-2xl z-50' : ''}
            ${snapshot.isDragging ? 'bg-white border border-gray-300 rounded-lg' : ''}
          `}
        >
          {/* 드래그 핸들 */}
          <div
            {...provided.dragHandleProps}
            className={`
              absolute left-0 top-1/2 transform -translate-y-1/2 -translate-x-12
              w-8 h-8 bg-gray-100 border border-gray-300 rounded-md
              flex items-center justify-center cursor-grab active:cursor-grabbing
              opacity-0 group-hover:opacity-100 transition-opacity
              hover:bg-gray-200
              ${snapshot.isDragging ? 'opacity-100 bg-blue-100 border-blue-300' : ''}
            `}
            title="드래그하여 이동"
          >
            <svg
              className="w-4 h-4 text-gray-500"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M8 9l4-4 4 4m0 6l-4 4-4-4"
              />
            </svg>
          </div>

          {children}
        </div>
      )}
    </Draggable>
  );
};

// 드래그 상태 훅
export const useDragDropState = () => {
  const context = useContext(DragDropContext_Internal);
  if (!context) {
    throw new Error('useDragDropState must be used within DragDropProvider');
  }
  return context;
};

// 드롭 영역 표시기 컴포넌트
export const DropZoneIndicator: React.FC<{
  index: number;
  isVisible: boolean;
  isActive: boolean;
}> = ({ index, isVisible, isActive }) => {
  if (!isVisible) return null;

  return (
    <div
      className={`
        h-2 mx-4 my-1 rounded-full transition-all duration-200
        ${isActive 
          ? 'bg-blue-400 shadow-lg transform scale-105' 
          : 'bg-gray-300 opacity-50'
        }
      `}
    >
      {isActive && (
        <div className="absolute inset-0 bg-blue-400 rounded-full animate-pulse" />
      )}
    </div>
  );
};

// 글로벌 드래그 상태 표시기
export const GlobalDragIndicator: React.FC = () => {
  const { isDragging, draggedBlockId } = useDragDropState();
  
  if (!isDragging || !draggedBlockId) return null;

  return (
    <div className="fixed top-4 left-1/2 transform -translate-x-1/2 z-50">
      <div className="bg-blue-500 text-white px-4 py-2 rounded-lg shadow-lg">
        <div className="flex items-center space-x-2">
          <div className="w-2 h-2 bg-white rounded-full animate-bounce"></div>
          <span className="text-sm font-medium">블록 이동 중...</span>
        </div>
      </div>
    </div>
  );
}; 