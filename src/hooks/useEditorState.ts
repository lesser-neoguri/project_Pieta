import { useReducer, useCallback, useRef, useEffect } from 'react';
import { StoreBlock } from '@/types/blockTypes';
import { supabase } from '@/lib/supabase';

// 에디터 상태 타입 정의
export interface EditorState {
  blocks: StoreBlock[];
  selectedBlockId: string | null;
  editingBlockId: string | null;
  isDirty: boolean;
  isLoading: boolean;
  lastSavedAt: Date | null;
  optimisticUpdates: Map<string, any>; // 낙관적 업데이트 추적
  conflictResolution: {
    hasConflicts: boolean;
    conflicts: Array<{
      blockId: string;
      localVersion: any;
      serverVersion: any;
    }>;
  };
}

// 에디터 액션 타입
export type EditorAction =
  | { type: 'SET_BLOCKS'; payload: StoreBlock[] }
  | { type: 'ADD_BLOCK'; payload: { block: StoreBlock; position: number } }
  | { type: 'UPDATE_BLOCK'; payload: { blockId: string; updates: Partial<StoreBlock>; isOptimistic?: boolean } }
  | { type: 'DELETE_BLOCK'; payload: string }
  | { type: 'REORDER_BLOCKS'; payload: { startIndex: number; endIndex: number } }
  | { type: 'SELECT_BLOCK'; payload: string | null }
  | { type: 'SET_EDITING'; payload: string | null }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'MARK_SAVED'; payload: Date }
  | { type: 'ADD_OPTIMISTIC_UPDATE'; payload: { blockId: string; update: any } }
  | { type: 'REMOVE_OPTIMISTIC_UPDATE'; payload: string }
  | { type: 'SET_CONFLICTS'; payload: Array<{ blockId: string; localVersion: any; serverVersion: any }> }
  | { type: 'RESOLVE_CONFLICT'; payload: { blockId: string; resolution: 'local' | 'server' } };

// 에디터 상태 리듀서
const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'SET_BLOCKS':
      return {
        ...state,
        blocks: action.payload,
        isDirty: false,
        optimisticUpdates: new Map()
      };

    case 'ADD_BLOCK': {
      const { block, position } = action.payload;
      const newBlocks = [...state.blocks];
      
      // 기존 블록들의 position 업데이트
      newBlocks.forEach(b => {
        if (b.position >= position) {
          b.position += 1;
        }
      });
      
      // 새 블록 추가
      newBlocks.push({ ...block, position });
      newBlocks.sort((a, b) => a.position - b.position);

      return {
        ...state,
        blocks: newBlocks,
        selectedBlockId: block.id,
        editingBlockId: block.type === 'text' ? block.id : null,
        isDirty: true
      };
    }

    case 'UPDATE_BLOCK': {
      const { blockId, updates, isOptimistic = false } = action.payload;
      const newBlocks = state.blocks.map(block =>
        block.id === blockId ? { ...block, ...updates } as StoreBlock : block
      );

      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      if (isOptimistic) {
        newOptimisticUpdates.set(blockId, { ...newOptimisticUpdates.get(blockId), ...updates });
      } else {
        newOptimisticUpdates.delete(blockId);
      }

      return {
        ...state,
        blocks: newBlocks,
        optimisticUpdates: newOptimisticUpdates,
        isDirty: true
      };
    }

    case 'DELETE_BLOCK': {
      const blockId = action.payload;
      const blockToDelete = state.blocks.find(b => b.id === blockId);
      if (!blockToDelete) return state;

      const newBlocks = state.blocks
        .filter(block => block.id !== blockId)
        .map(block => ({
          ...block,
          position: block.position > blockToDelete.position 
            ? block.position - 1 
            : block.position
        }));

      return {
        ...state,
        blocks: newBlocks,
        selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
        editingBlockId: state.editingBlockId === blockId ? null : state.editingBlockId,
        isDirty: true
      };
    }

    case 'REORDER_BLOCKS': {
      const { startIndex, endIndex } = action.payload;
      const newBlocks = [...state.blocks];
      const [removed] = newBlocks.splice(startIndex, 1);
      newBlocks.splice(endIndex, 0, removed);

      // position 재계산
      newBlocks.forEach((block, index) => {
        block.position = index;
      });

      return {
        ...state,
        blocks: newBlocks,
        isDirty: true
      };
    }

    case 'SELECT_BLOCK':
      return {
        ...state,
        selectedBlockId: action.payload
      };

    case 'SET_EDITING':
      return {
        ...state,
        editingBlockId: action.payload
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload
      };

    case 'MARK_SAVED':
      return {
        ...state,
        isDirty: false,
        lastSavedAt: action.payload,
        optimisticUpdates: new Map()
      };

    case 'ADD_OPTIMISTIC_UPDATE': {
      const { blockId, update } = action.payload;
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.set(blockId, { ...newOptimisticUpdates.get(blockId), ...update });
      
      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates
      };
    }

    case 'REMOVE_OPTIMISTIC_UPDATE': {
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      newOptimisticUpdates.delete(action.payload);
      
      return {
        ...state,
        optimisticUpdates: newOptimisticUpdates
      };
    }

    case 'SET_CONFLICTS':
      return {
        ...state,
        conflictResolution: {
          hasConflicts: action.payload.length > 0,
          conflicts: action.payload
        }
      };

    case 'RESOLVE_CONFLICT': {
      const { blockId, resolution } = action.payload;
      const conflicts = state.conflictResolution.conflicts.filter(c => c.blockId !== blockId);
      
      return {
        ...state,
        conflictResolution: {
          hasConflicts: conflicts.length > 0,
          conflicts
        }
      };
    }

    default:
      return state;
  }
};

// 초기 상태
const initialState: EditorState = {
  blocks: [],
  selectedBlockId: null,
  editingBlockId: null,
  isDirty: false,
  isLoading: false,
  lastSavedAt: null,
  optimisticUpdates: new Map(),
  conflictResolution: {
    hasConflicts: false,
    conflicts: []
  }
};

// 에디터 상태 관리 훅
export const useEditorState = (storeId: string) => {
  const [state, dispatch] = useReducer(editorReducer, initialState);
  const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveVersionRef = useRef<number>(0);
  const isAutoSaving = useRef<boolean>(false);

  // 디바운스된 자동 저장
  const debouncedSave = useCallback(async () => {
    if (!state.isDirty || isAutoSaving.current) return;

    // 저장 타이머 클리어
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(async () => {
      isAutoSaving.current = true;
      dispatch({ type: 'SET_LOADING', payload: true });

      try {
        // 충돌 감지를 위한 현재 서버 버전 확인
        const { data: currentDesign, error: fetchError } = await supabase
          .from('store_designs')
          .select('row_layouts, updated_at')
          .eq('store_id', storeId)
          .single();

        if (fetchError && fetchError.code !== 'PGRST116') {
          throw fetchError;
        }

        // 충돌 감지 로직
        if (currentDesign && state.lastSavedAt) {
          const serverUpdatedAt = new Date(currentDesign.updated_at);
          if (serverUpdatedAt > state.lastSavedAt) {
            // 서버에 더 최신 데이터가 있음 - 충돌 해결 필요
            const conflicts = detectConflicts(state.blocks, currentDesign.row_layouts);
            if (conflicts.length > 0) {
              dispatch({ type: 'SET_CONFLICTS', payload: conflicts });
              return;
            }
          }
        }

        // row_layouts 객체로 변환
        const rowLayouts: Record<string, any> = {};
        state.blocks.forEach((block, index) => {
          rowLayouts[index.toString()] = {
            ...block.data,
            layout_type: block.type
          };
        });

        // 데이터베이스 업데이트
        const { error: saveError } = await supabase
          .from('store_designs')
          .upsert({
            store_id: storeId,
            row_layouts: rowLayouts,
            updated_at: new Date().toISOString()
          });

        if (saveError) {
          throw saveError;
        }

        dispatch({ type: 'MARK_SAVED', payload: new Date() });
        lastSaveVersionRef.current += 1;

      } catch (error) {
        console.error('자동 저장 실패:', error);
        // 에러 처리 - 사용자에게 알림
      } finally {
        dispatch({ type: 'SET_LOADING', payload: false });
        isAutoSaving.current = false;
      }
    }, 2000); // 2초 디바운스
  }, [state.blocks, state.isDirty, state.lastSavedAt, storeId]);

  // 상태 변경 시 자동 저장 트리거
  useEffect(() => {
    if (state.isDirty) {
      debouncedSave();
    }
  }, [state.isDirty, debouncedSave]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, []);

  // 액션 크리에이터들
  const actions = {
    setBlocks: (blocks: StoreBlock[]) => dispatch({ type: 'SET_BLOCKS', payload: blocks }),
    
    addBlock: (block: StoreBlock, position: number) => 
      dispatch({ type: 'ADD_BLOCK', payload: { block, position } }),
    
    updateBlock: (blockId: string, updates: Partial<StoreBlock>, isOptimistic = false) => 
      dispatch({ type: 'UPDATE_BLOCK', payload: { blockId, updates, isOptimistic } }),
    
    deleteBlock: (blockId: string) => dispatch({ type: 'DELETE_BLOCK', payload: blockId }),
    
    reorderBlocks: (startIndex: number, endIndex: number) => 
      dispatch({ type: 'REORDER_BLOCKS', payload: { startIndex, endIndex } }),
    
    selectBlock: (blockId: string | null) => dispatch({ type: 'SELECT_BLOCK', payload: blockId }),
    
    setEditing: (blockId: string | null) => dispatch({ type: 'SET_EDITING', payload: blockId }),

    forceSave: async () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
      await debouncedSave();
    },

    resolveConflict: (blockId: string, resolution: 'local' | 'server') => {
      dispatch({ type: 'RESOLVE_CONFLICT', payload: { blockId, resolution } });
    }
  };

  return {
    state,
    actions,
    // 유틸리티 함수들
    canUndo: state.blocks.length > 0,
    canRedo: false, // 실제로는 히스토리 스택으로 구현
    hasUnsavedChanges: state.isDirty,
    isAutoSaving: isAutoSaving.current
  };
};

// 충돌 감지 함수
const detectConflicts = (localBlocks: StoreBlock[], serverRowLayouts: any): Array<{
  blockId: string;
  localVersion: any;
  serverVersion: any;
}> => {
  const conflicts: Array<{
    blockId: string;
    localVersion: any;
    serverVersion: any;
  }> = [];

  // 로컬 블록과 서버 데이터 비교
  localBlocks.forEach((localBlock, index) => {
    const serverBlock = serverRowLayouts[index.toString()];
    if (serverBlock && hasSignificantDifference(localBlock.data, serverBlock)) {
      conflicts.push({
        blockId: localBlock.id,
        localVersion: localBlock.data,
        serverVersion: serverBlock
      });
    }
  });

  return conflicts;
};

// 의미있는 차이점 감지 함수
const hasSignificantDifference = (local: any, server: any): boolean => {
  // 간단한 구현 - 실제로는 더 정교한 비교 필요
  return JSON.stringify(local) !== JSON.stringify(server);
}; 