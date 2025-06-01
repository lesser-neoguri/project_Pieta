# 🎯 PIETA 드래그 앤 드롭 통합 가이드

PIETA 스토어 에디터에 드래그 앤 드롭 기능을 성공적으로 통합하기 위한 완전한 가이드입니다.

## 📦 **필수 패키지 설치**

```bash
# 드래그 앤 드롭 라이브러리 설치
npm install @hello-pangea/dnd

# 타입 정의 (TypeScript 사용 시)
npm install --save-dev @types/react-beautiful-dnd
```

## 🏗️ **아키텍처 개요**

### **컴포넌트 계층 구조**
```
InlineStoreEditor (메인)
├── DragDropProvider (컨텍스트)
├── DroppableArea (드롭 영역)
│   └── DraggableBlock (개별 블록)
├── GlobalDragIndicator (전역 상태)
└── DragDropVisualFeedback (시각 효과)
```

### **데이터 플로우**
```
[사용자 드래그] 
    ↓
[DragDropProvider가 이벤트 캐치]
    ↓
[handleReorderBlocks 호출]
    ↓
[블록 배열 재정렬 + position 업데이트]
    ↓
[row_layouts DB 업데이트]
    ↓
[UI 상태 동기화]
```

## 🎯 **1. 기본 설정**

### **A. DragDropProvider 설정**
```tsx
import { DragDropProvider } from '@/components/editor/DragDropProvider';

function MyStoreEditor() {
  const [blocks, setBlocks] = useState<StoreBlock[]>([]);
  
  const handleReorderBlocks = (sourceIndex: number, destinationIndex: number) => {
    const newBlocks = Array.from(blocks);
    const [movedBlock] = newBlocks.splice(sourceIndex, 1);
    newBlocks.splice(destinationIndex, 0, movedBlock);
    
    // position 필드 재정렬
    const reorderedBlocks = newBlocks.map((block, index) => ({
      ...block,
      position: index
    }));
    
    setBlocks(reorderedBlocks);
  };

  return (
    <DragDropProvider
      blocks={blocks}
      onReorderBlocks={handleReorderBlocks}
      isEditMode={isEditMode}
    >
      {/* 에디터 내용 */}
    </DragDropProvider>
  );
}
```

### **B. 드롭 가능한 영역 설정**
```tsx
import { DroppableArea, DraggableBlock } from '@/components/editor/DragDropProvider';

function BlockList({ blocks }: { blocks: StoreBlock[] }) {
  return (
    <DroppableArea droppableId="store-blocks">
      <div className="space-y-4">
        {blocks.map((block, index) => (
          <DraggableBlock
            key={block.id}
            blockId={block.id}
            index={index}
            isEditMode={true}
          >
            {/* 블록 콘텐츠 */}
            <BlockContent block={block} />
          </DraggableBlock>
        ))}
      </div>
    </DroppableArea>
  );
}
```

## 🗄️ **2. 데이터베이스 통합**

### **A. row_layouts 테이블 업데이트**
```sql
-- 기존 테이블에 드래그 앤 드롭 관련 필드 추가
ALTER TABLE store_row_layouts 
ADD COLUMN last_reorder_timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN reorder_count INTEGER DEFAULT 0;

-- 변경 로그 테이블 생성
CREATE TABLE store_block_change_logs (
  id SERIAL PRIMARY KEY,
  store_id UUID NOT NULL,
  block_id VARCHAR(255) NOT NULL,
  block_type VARCHAR(50) NOT NULL,
  action VARCHAR(50) NOT NULL, -- 'moved', 'position_updated'
  old_position INTEGER,
  new_position INTEGER,
  timestamp TIMESTAMP NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (store_id) REFERENCES stores(id) ON DELETE CASCADE
);

-- 인덱스 추가
CREATE INDEX idx_change_logs_store_timestamp ON store_block_change_logs(store_id, timestamp DESC);
CREATE INDEX idx_row_layouts_position ON store_row_layouts(store_id, position);
```

### **B. API 엔드포인트 구현**
```typescript
// /api/stores/[id]/layouts/reorder
export async function PUT(request: Request, { params }: { params: { id: string } }) {
  const { sourceIndex, destinationIndex, blocks } = await request.json();
  const storeId = params.id;
  
  try {
    // 트랜잭션 시작
    await db.transaction(async (trx) => {
      // 기존 블록들 백업
      const oldBlocks = await trx('store_row_layouts')
        .where('store_id', storeId)
        .orderBy('position');
      
      // 새로운 순서로 업데이트
      for (let i = 0; i < blocks.length; i++) {
        await trx('store_row_layouts')
          .where('store_id', storeId)
          .where('id', blocks[i].id)
          .update({
            position: i,
            last_reorder_timestamp: new Date(),
            reorder_count: trx.raw('reorder_count + 1')
          });
      }
      
      // 변경 로그 기록
      const changeLog = generateChangeLog(oldBlocks, blocks, sourceIndex, destinationIndex);
      if (changeLog.length > 0) {
        await trx('store_block_change_logs').insert(changeLog);
      }
    });
    
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Reorder failed:', error);
    return NextResponse.json({ error: 'Failed to reorder blocks' }, { status: 500 });
  }
}
```

### **C. 실시간 동기화 (WebSocket)**
```typescript
// WebSocket 이벤트 핸들러
import { createReorderEvent } from '@/utils/dragDropDataTransform';

function handleBlockReorder(params: ReorderParams) {
  const event = createReorderEvent({
    storeId: params.storeId,
    userId: params.userId,
    sourceIndex: params.sourceIndex,
    destinationIndex: params.destinationIndex,
    affectedBlocks: params.affectedBlockIds,
    timestamp: new Date().toISOString()
  });
  
  // 같은 스토어를 편집 중인 다른 사용자들에게 전송
  websocketServer.broadcast(event, {
    room: `store-${params.storeId}`,
    exclude: params.userId
  });
}
```

## 🎨 **3. 시각적 피드백 구현**

### **A. 기본 드래그 피드백**
```tsx
import { 
  DragGhost, 
  SmartDropZone, 
  TouchDragFeedback 
} from '@/components/editor/DragDropVisualFeedback';

function EnhancedBlockEditor() {
  const { isDragging, draggedBlockId } = useDragDropState();
  const draggedBlock = blocks.find(b => b.id === draggedBlockId);
  
  return (
    <div>
      {/* 기본 에디터 */}
      <BlockList blocks={blocks} />
      
      {/* 드래그 고스트 */}
      {draggedBlock && (
        <DragGhost block={draggedBlock} isDragging={isDragging} />
      )}
      
      {/* 터치 기기 지원 */}
      <TouchDragFeedback 
        isDragging={isDragging} 
        draggedBlock={draggedBlock} 
      />
    </div>
  );
}
```

### **B. 스마트 드롭 존 커스터마이징**
```tsx
function CustomDropZone({ index, sourceBlock }: DropZoneProps) {
  return (
    <SmartDropZone
      index={index}
      isActive={dropTargetIndex === index}
      isHovered={hoveredIndex === index}
      sourceBlock={sourceBlock}
      targetBlock={blocks[index]}
    />
  );
}
```

### **C. 애니메이션 최적화**
```css
/* globals.css - 드래그 앤 드롭 최적화 */
.drag-transition {
  transition: transform 0.2s ease-out, opacity 0.2s ease-out;
  will-change: transform;
}

.drag-ghost {
  pointer-events: none;
  z-index: 9999;
  filter: drop-shadow(0 10px 15px rgba(0, 0, 0, 0.2));
}

.drop-zone-active {
  animation: pulse-blue 1s infinite;
}

@keyframes pulse-blue {
  0%, 100% { background-color: rgba(59, 130, 246, 0.1); }
  50% { background-color: rgba(59, 130, 246, 0.3); }
}

/* 터치 기기 최적화 */
@media (hover: none) and (pointer: coarse) {
  .drag-handle {
    width: 44px;
    height: 44px;
    opacity: 1 !important;
  }
  
  .drag-transition {
    transition-duration: 0.3s;
  }
}
```

## 📱 **4. 모바일 최적화**

### **A. 터치 제스처 지원**
```tsx
function MobileDragHandle({ block }: { block: StoreBlock }) {
  const [isLongPress, setIsLongPress] = useState(false);
  
  const handleTouchStart = () => {
    const timer = setTimeout(() => {
      setIsLongPress(true);
      // 햅틱 피드백
      if (navigator.vibrate) navigator.vibrate(50);
    }, 500); // 500ms 롱프레스
    
    return () => clearTimeout(timer);
  };
  
  return (
    <div
      className="drag-handle touch-optimized"
      onTouchStart={handleTouchStart}
      style={{
        minWidth: '44px',
        minHeight: '44px',
        padding: '12px'
      }}
    >
      <DragIcon />
    </div>
  );
}
```

### **B. 반응형 드롭 존**
```tsx
function ResponsiveDropZone({ isMobile }: { isMobile: boolean }) {
  return (
    <div
      className={`
        drop-zone
        ${isMobile ? 'h-12 mx-2' : 'h-3 mx-6'}
        ${isMobile ? 'border-4' : 'border-2'}
      `}
    >
      {isMobile && (
        <div className="text-center text-sm text-gray-500 pt-2">
          여기에 드롭하세요
        </div>
      )}
    </div>
  );
}
```

## ⚡ **5. 성능 최적화**

### **A. 디바운싱 및 배치 업데이트**
```tsx
import { dragDropPersistence } from '@/utils/dragDropDataTransform';

function OptimizedStoreEditor() {
  const handleReorderBlocks = useCallback((sourceIndex: number, destinationIndex: number) => {
    // 즉시 UI 업데이트
    const newBlocks = reorderBlocks(blocks, sourceIndex, destinationIndex);
    setBlocks(newBlocks);
    
    // 디바운싱된 데이터베이스 저장
    dragDropPersistence.queueUpdate(storeId, newBlocks);
  }, [blocks, storeId]);
  
  // 컴포넌트 언마운트 시 강제 저장
  useEffect(() => {
    return () => {
      dragDropPersistence.forceFlush();
    };
  }, []);
  
  return (
    <DragDropProvider onReorderBlocks={handleReorderBlocks}>
      {/* 에디터 내용 */}
    </DragDropProvider>
  );
}
```

### **B. 메모이제이션 최적화**
```tsx
const MemoizedDraggableBlock = React.memo(DraggableBlock, (prevProps, nextProps) => {
  return (
    prevProps.blockId === nextProps.blockId &&
    prevProps.index === nextProps.index &&
    prevProps.isEditMode === nextProps.isEditMode
  );
});

const MemoizedBlockContent = React.memo(({ block }: { block: StoreBlock }) => {
  // 블록 콘텐츠 렌더링
}, (prevProps, nextProps) => {
  return prevProps.block.id === nextProps.block.id;
});
```

## 🔧 **6. 트러블슈팅**

### **A. 흔한 문제들**

**문제**: 드래그가 시작되지 않음
```tsx
// 해결책: DragDropContext가 올바르게 설정되었는지 확인
<DragDropContext onDragEnd={handleDragEnd}>
  <Droppable droppableId="blocks">
    {/* Draggable 컴포넌트들 */}
  </Droppable>
</DragDropContext>
```

**문제**: 터치 기기에서 드래그가 작동하지 않음
```tsx
// 해결책: 터치 이벤트 핸들러 추가
const dragHandleProps = {
  ...provided.dragHandleProps,
  onTouchStart: (e: TouchEvent) => {
    e.preventDefault();
    provided.dragHandleProps?.onTouchStart?.(e);
  }
};
```

**문제**: 성능 저하
```tsx
// 해결책: React.memo와 useMemo 활용
const optimizedBlocks = useMemo(() => 
  blocks.map(block => ({ ...block })), 
  [blocks]
);

const MemoizedBlockList = React.memo(BlockList);
```

### **B. 디버깅 도구**
```tsx
// 개발 모드에서만 활성화되는 디버깅 컴포넌트
function DragDropDebugger() {
  const { isDragging, draggedBlockId, dropTargetIndex } = useDragDropState();
  
  if (process.env.NODE_ENV !== 'development') return null;
  
  return (
    <div className="fixed bottom-4 right-4 bg-black text-white p-2 rounded text-xs">
      <div>Dragging: {isDragging ? 'Yes' : 'No'}</div>
      <div>Dragged Block: {draggedBlockId || 'None'}</div>
      <div>Drop Target: {dropTargetIndex ?? 'None'}</div>
    </div>
  );
}
```

## 📊 **7. 메트릭 및 분석**

### **A. 사용량 추적**
```typescript
// 드래그 앤 드롭 이벤트 추적
function trackDragDropEvent(event: 'drag_start' | 'drag_end' | 'drop_success') {
  analytics.track('Store Editor Drag Drop', {
    event,
    store_id: storeId,
    block_count: blocks.length,
    timestamp: new Date().toISOString()
  });
}

// Provider에서 이벤트 트래킹
const handleDragStart = (start: DragStart) => {
  trackDragDropEvent('drag_start');
  // ... 기존 로직
};
```

### **B. 성능 모니터링**
```tsx
function PerformanceMonitor() {
  const [metrics, setMetrics] = useState({
    dragStartTime: 0,
    dropEndTime: 0,
    renderCount: 0
  });
  
  useEffect(() => {
    // 렌더링 횟수 추적
    setMetrics(prev => ({ ...prev, renderCount: prev.renderCount + 1 }));
  });
  
  return process.env.NODE_ENV === 'development' ? (
    <div className="debug-metrics">
      Renders: {metrics.renderCount}
    </div>
  ) : null;
}
```

## 🎯 **마무리 체크리스트**

- [ ] `@hello-pangea/dnd` 패키지 설치 완료
- [ ] `DragDropProvider` 설정 완료
- [ ] 데이터베이스 스키마 업데이트 완료
- [ ] API 엔드포인트 구현 완료
- [ ] 시각적 피드백 구현 완료
- [ ] 모바일 최적화 완료
- [ ] 성능 최적화 적용 완료
- [ ] 에러 핸들링 구현 완료
- [ ] 접근성 고려사항 적용 완료
- [ ] 테스트 케이스 작성 완료

이 가이드를 따라 구현하면 PIETA 스토어 에디터에 완전히 기능적이고 사용자 친화적인 드래그 앤 드롭 기능을 성공적으로 통합할 수 있습니다. 