import React, { useCallback, useEffect } from 'react';
import { EditorProvider, useDetailedEditorState, convertBlocksToRowLayouts } from '@/hooks/useDetailedEditorState';
import { DetailedAutoSaveManager } from '@/components/editor/DetailedAutoSaveManager';
import { BasicInlinePreviewArea } from '@/components/editor/BasicInlinePreviewArea';
import { DraggableInlinePreviewArea } from '@/components/editor/DraggableInlinePreviewArea';
import { ConflictInfo } from '@/types/editorTypes';

// StoreDesignForm에서 사용할 통합 예시
interface DetailedStoreDesignFormProps {
  storeId: string;
  initialDesign: any;
  products: any[];
  onSave: (design: any) => void;
  onError: (error: string) => void;
}

// 메인 컴포넌트 - Provider로 감싸진 형태
export const DetailedStoreDesignForm: React.FC<DetailedStoreDesignFormProps> = ({
  storeId,
  initialDesign,
  products,
  onSave,
  onError
}) => {
  return (
    <EditorProvider storeId={storeId}>
      <StoreDesignFormInner
        storeId={storeId}
        initialDesign={initialDesign}
        products={products}
        onSave={onSave}
        onError={onError}
      />
    </EditorProvider>
  );
};

// 실제 폼 구현부 - Context를 사용하는 부분
const StoreDesignFormInner: React.FC<DetailedStoreDesignFormProps> = ({
  storeId,
  initialDesign,
  products,
  onSave,
  onError
}) => {
  const { state, actions } = useDetailedEditorState();

  // 컴포넌트 마운트 시 초기 데이터 로드
  useEffect(() => {
    if (initialDesign?.row_layouts) {
      actions.loadInitialBlocks(initialDesign.row_layouts);
    }
  }, [initialDesign, actions]);

  // 저장 성공 처리
  const handleSaveSuccess = useCallback(() => {
    actions.setLastSaved();
    onSave(state.blocks); // 또는 변환된 design 객체
  }, [actions, onSave, state.blocks]);

  // 저장 실패 처리
  const handleSaveError = useCallback((error: string) => {
    actions.setSaveError(error);
    onError(error);
  }, [actions, onError]);

  // 충돌 감지 처리
  const handleConflictDetected = useCallback((conflicts: ConflictInfo[]) => {
    console.warn('충돌 감지:', conflicts);
    // 충돌 해결 UI 표시 (추후 구현)
    actions.setSaveError(`충돌이 감지되었습니다 (${conflicts.length}개 블록)`);
  }, [actions]);

  // handleDesignUpdate 대체 - 이제 actions.updateBlock 사용
  const handleBlockUpdate = useCallback((blockId: string, newData: any) => {
    actions.updateBlock(blockId, { data: newData });
  }, [actions]);

  // 블록 추가 핸들러
  const handleAddBlock = useCallback((blockType: 'text' | 'grid' | 'featured' | 'banner' | 'list' | 'masonry') => {
    actions.addBlock(blockType);
  }, [actions]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/50">
      {/* 자동 저장 매니저 */}
      <DetailedAutoSaveManager
        storeId={storeId}
        blocks={state.blocks}
        isDirty={state.isDirty}
        lastSavedAt={state.lastSavedAt}
        onSaveSuccess={handleSaveSuccess}
        onSaveError={handleSaveError}
        onConflictDetected={handleConflictDetected}
      >
        {/* 고급 상단 툴바 */}
        <EditorToolbar 
          onAddBlock={handleAddBlock}
          isLoading={state.isLoading}
          saveError={state.saveError}
        />

        {/* 메인 에디터 영역 */}
        <div className="relative">
          {/* 고급 배경 효과 */}
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 via-transparent to-purple-500/5 pointer-events-none" />
          
          <div className="relative z-10 container mx-auto px-6 py-12">
            <DraggableInlinePreviewArea
              storeId={storeId}
              products={products}
              className="max-w-6xl mx-auto"
            />
          </div>
        </div>

        {/* 디버그 정보 (개발 중에만) */}
        {process.env.NODE_ENV === 'development' && (
          <DebugPanel state={state} />
        )}
      </DetailedAutoSaveManager>
    </div>
  );
};

// 상단 툴바 컴포넌트
interface EditorToolbarProps {
  onAddBlock: (blockType: 'text' | 'grid' | 'featured' | 'banner' | 'list' | 'masonry') => void;
  isLoading: boolean;
  saveError: string | null;
}

const EditorToolbar: React.FC<EditorToolbarProps> = ({ onAddBlock, isLoading, saveError }) => {
  const blockTypes = [
    { 
      type: 'text' as const, 
      label: '텍스트', 
      icon: '📝',
      gradient: 'from-emerald-500 to-teal-600',
      hoverGradient: 'hover:from-emerald-600 hover:to-teal-700',
      bgGradient: 'from-emerald-50 to-teal-50'
    },
    { 
      type: 'grid' as const, 
      label: '제품 그리드', 
      icon: '⊞',
      gradient: 'from-blue-500 to-indigo-600',
      hoverGradient: 'hover:from-blue-600 hover:to-indigo-700',
      bgGradient: 'from-blue-50 to-indigo-50'
    },
    { 
      type: 'featured' as const, 
      label: '피처드', 
      icon: '⭐',
      gradient: 'from-purple-500 to-pink-600',
      hoverGradient: 'hover:from-purple-600 hover:to-pink-700',
      bgGradient: 'from-purple-50 to-pink-50'
    },
    { 
      type: 'banner' as const, 
      label: '배너', 
      icon: '🖼️',
      gradient: 'from-cyan-500 to-blue-600',
      hoverGradient: 'hover:from-cyan-600 hover:to-blue-700',
      bgGradient: 'from-cyan-50 to-blue-50'
    },
    { 
      type: 'list' as const, 
      label: '리스트', 
      icon: '📋',
      gradient: 'from-orange-500 to-red-600',
      hoverGradient: 'hover:from-orange-600 hover:to-red-700',
      bgGradient: 'from-orange-50 to-red-50'
    },
    { 
      type: 'masonry' as const, 
      label: '메이슨리', 
      icon: '🧱',
      gradient: 'from-violet-500 to-purple-600',
      hoverGradient: 'hover:from-violet-600 hover:to-purple-700',
      bgGradient: 'from-violet-50 to-purple-50'
    }
  ];

  return (
    <div className="sticky top-0 z-50 backdrop-blur-xl border-b border-white/20">
      {/* 고급 배경 효과 */}
      <div className="absolute inset-0 bg-gradient-to-r from-white/90 via-white/95 to-white/90" />
      <div 
        className="absolute inset-0 opacity-40"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(99, 102, 241, 0.1) 1px, transparent 0)`,
          backgroundSize: '20px 20px'
        }}
      />

      <div className="relative z-10 container mx-auto px-6">
        <div className="flex items-center justify-between py-6">
          {/* 왼쪽: 블록 추가 섹션 */}
          <div className="flex items-center space-x-6">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
              <h2 className="text-lg font-semibold text-gray-800">블록 추가</h2>
            </div>
            
            <div className="flex items-center space-x-3">
              {blockTypes.map(({ type, label, icon, gradient, hoverGradient, bgGradient }) => (
                <button
                  key={type}
                  onClick={() => onAddBlock(type)}
                  disabled={isLoading}
                  className={`
                    group relative overflow-hidden
                    flex items-center space-x-3 px-4 py-3 
                    bg-gradient-to-br ${bgGradient}
                    border border-white/60 hover:border-white/80
                    rounded-xl shadow-sm hover:shadow-lg
                    transition-all duration-300 ease-out
                    transform hover:scale-105 hover:-translate-y-0.5
                    disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none
                  `}
                  title={`${label} 블록 추가`}
                >
                  {/* 배경 글로우 효과 */}
                  <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`} />
                  
                  <span className="text-lg relative z-10">{icon}</span>
                  <span className="text-sm font-medium text-gray-700 group-hover:text-gray-800 relative z-10 transition-colors duration-200">
                    {label}
                  </span>
                  
                  {/* 호버 시 스파클 효과 */}
                  <div className="absolute top-1 right-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                  <div className="absolute bottom-1 left-1 w-1 h-1 bg-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 delay-75" />
                </button>
              ))}
            </div>
          </div>

          {/* 오른쪽: 상태 표시 */}
          <div className="flex items-center space-x-6">
            {isLoading && (
              <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200/60 rounded-xl">
                <div className="relative">
                  <div className="w-4 h-4 border-2 border-blue-500/30 border-t-blue-500 rounded-full animate-spin"></div>
                </div>
                <span className="text-sm font-medium text-blue-700">저장 중...</span>
              </div>
            )}
            
            {saveError && (
              <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-red-50 to-pink-50 border border-red-200/60 rounded-xl">
                <svg className="w-4 h-4 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
                </svg>
                <span className="text-sm font-medium text-red-700">오류: {saveError}</span>
              </div>
            )}

            {!isLoading && !saveError && (
              <div className="flex items-center space-x-3 px-4 py-2 bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200/60 rounded-xl">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span className="text-sm font-medium text-green-700">동기화됨</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// 디버그 패널 (개발용)
const DebugPanel: React.FC<{ state: any }> = ({ state }) => {
  return (
    <div className="fixed bottom-0 left-0 right-0 bg-black bg-opacity-90 text-white p-4 text-xs overflow-auto max-h-48">
      <div className="grid grid-cols-3 gap-4">
        <div>
          <h4 className="font-bold mb-2">Blocks ({state.blocks.length})</h4>
          <pre>{JSON.stringify(state.blocks.map((b: any) => ({ id: b.id, type: b.type })), null, 2)}</pre>
        </div>
        <div>
          <h4 className="font-bold mb-2">State</h4>
          <pre>{JSON.stringify({
            editingBlockId: state.editingBlockId,
            selectedBlockId: state.selectedBlockId,
            isDirty: state.isDirty,
            isLoading: state.isLoading,
            saveError: state.saveError,
            lastSavedAt: state.lastSavedAt?.toLocaleTimeString()
          }, null, 2)}</pre>
        </div>
        <div>
          <h4 className="font-bold mb-2">Optimistic Updates</h4>
          <pre>{JSON.stringify(Object.fromEntries(state.optimisticUpdates), null, 2)}</pre>
        </div>
      </div>
    </div>
  );
};

// 기존 StoreDesignForm.tsx에서의 변화점:
/*
1. handleDesignUpdate 콜백 제거/대체:
   - 기존: onDesignUpdate={(updatedDesign) => setDesign(updatedDesign)}
   - 신규: actions.updateBlock(blockId, updates) 직접 사용

2. 상태 관리 단순화:
   - 기존: useState로 design 상태 관리
   - 신규: useDetailedEditorState로 통합 관리

3. 자동 저장:
   - 기존: 수동 저장 또는 복잡한 로직
   - 신규: DetailedAutoSaveManager가 자동 처리

4. 낙관적 업데이트:
   - 기존: 즉시 반영 후 서버 동기화 누락 가능
   - 신규: isOptimistic 플래그로 안전한 업데이트

5. 충돌 해결:
   - 기존: 고려되지 않음
   - 신규: 자동 감지 및 해결 메커니즘

사용 예시:
```tsx
// 기존 방식
const StoreDesignForm = () => {
  const [design, setDesign] = useState(initialDesign);
  
  const handleSave = async () => {
    try {
      await saveToSupabase(design);
    } catch (error) {
      // 에러 처리
    }
  };
  
  return (
    <BasicInlinePreviewArea 
      design={design}
      onDesignUpdate={setDesign}
    />
  );
};

// 신규 방식
const StoreDesignForm = () => {
  return (
    <EditorProvider storeId={storeId}>
      <DetailedAutoSaveManager {...autoSaveProps}>
        <BasicInlinePreviewArea 
          // 상태는 Context에서 관리, 직접 props 전달 불필요
        />
      </DetailedAutoSaveManager>
    </EditorProvider>
  );
};
```
*/ 