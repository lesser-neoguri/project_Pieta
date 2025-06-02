import React, { createContext, useContext, useReducer, useCallback } from 'react';
import { EditorState, EditorAction, StoreBlock, StoreBlockData } from '@/types/editorTypes';

// 초기 상태
const initialEditorState: EditorState = {
  blocks: [],
  editingBlockId: null,
  selectedBlockId: null,
  isDirty: false,
  lastSavedAt: null,
  isLoading: false,
  optimisticUpdates: new Map(),
  saveError: null,
  dragState: {
    isDragging: false,
    draggedBlockId: null,
    dragOverIndex: null
  },
  clipboard: null
};

// 리듀서 함수
const editorReducer = (state: EditorState, action: EditorAction): EditorState => {
  switch (action.type) {
    case 'LOAD_INITIAL_BLOCKS':
      return {
        ...state,
        blocks: action.payload,
        isDirty: false,
        optimisticUpdates: new Map(),
        saveError: null
      };

    case 'SET_EDITING':
      return {
        ...state,
        editingBlockId: action.payload,
        selectedBlockId: action.payload || state.selectedBlockId
      };

    case 'SET_SELECTED':
      return {
        ...state,
        selectedBlockId: action.payload,
        editingBlockId: action.payload === state.editingBlockId ? state.editingBlockId : null
      };

    case 'UPDATE_BLOCK': {
      const { blockId, updates, isOptimistic = false } = action.payload;
      
      const newOptimisticUpdates = new Map(state.optimisticUpdates);
      if (isOptimistic) {
        newOptimisticUpdates.set(blockId, { ...newOptimisticUpdates.get(blockId), ...updates });
      } else {
        newOptimisticUpdates.delete(blockId);
      }

      const updatedBlocks = state.blocks.map(block => 
        block.id === blockId 
          ? { ...block, ...updates, updated_at: new Date().toISOString() }
          : block
      );

      return {
        ...state,
        blocks: updatedBlocks,
        optimisticUpdates: newOptimisticUpdates,
        isDirty: true,
        saveError: null
      };
    }

    case 'ADD_BLOCK': {
      const { block, index } = action.payload;
      const newBlocks = [...state.blocks];
      
      const insertIndex = index !== undefined ? index : newBlocks.length;
      newBlocks.splice(insertIndex, 0, {
        ...block,
        position: insertIndex,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });

      newBlocks.forEach((blk, idx) => {
        blk.position = idx;
      });

      return {
        ...state,
        blocks: newBlocks,
        selectedBlockId: block.id,
        editingBlockId: block.type === 'text' ? block.id : null,
        isDirty: true,
        saveError: null
      };
    }

    case 'DELETE_BLOCK': {
      const blockIdToDelete = action.payload;
      const filteredBlocks = state.blocks
        .filter(block => block.id !== blockIdToDelete)
        .map((block, index) => ({ ...block, position: index }));

      return {
        ...state,
        blocks: filteredBlocks,
        selectedBlockId: state.selectedBlockId === blockIdToDelete ? null : state.selectedBlockId,
        editingBlockId: state.editingBlockId === blockIdToDelete ? null : state.editingBlockId,
        isDirty: true,
        saveError: null
      };
    }

    case 'REORDER_BLOCKS': {
      const { fromIndex, toIndex } = action.payload;
      const newBlocks = [...state.blocks];
      
      const [removed] = newBlocks.splice(fromIndex, 1);
      newBlocks.splice(toIndex, 0, removed);
      
      newBlocks.forEach((block, index) => {
        block.position = index;
        block.updated_at = new Date().toISOString();
      });

      return {
        ...state,
        blocks: newBlocks,
        isDirty: true,
        saveError: null
      };
    }

    case 'SET_DIRTY':
      return {
        ...state,
        isDirty: action.payload
      };

    case 'SET_LAST_SAVED':
      return {
        ...state,
        lastSavedAt: action.payload,
        isDirty: false,
        optimisticUpdates: new Map(),
        saveError: null
      };

    case 'SET_LOADING':
      return {
        ...state,
        isLoading: action.payload
      };

    case 'SET_SAVE_ERROR':
      return {
        ...state,
        saveError: action.payload,
        isLoading: false
      };

    case 'CLEAR_OPTIMISTIC_UPDATES':
      return {
        ...state,
        optimisticUpdates: new Map()
      };

    case 'SET_DRAG_STATE':
      return {
        ...state,
        dragState: { ...state.dragState, ...action.payload }
      };

    case 'START_DRAG':
      return {
        ...state,
        dragState: {
          isDragging: true,
          draggedBlockId: action.payload,
          dragOverIndex: null
        }
      };

    case 'END_DRAG':
      return {
        ...state,
        dragState: {
          isDragging: false,
          draggedBlockId: null,
          dragOverIndex: null
        }
      };

    case 'SET_DRAG_OVER':
      return {
        ...state,
        dragState: {
          ...state.dragState,
          dragOverIndex: action.payload
        }
      };

    default:
      return state;
  }
};

// Context 타입
interface EditorContextType {
  state: EditorState;
  dispatch: React.Dispatch<EditorAction>;
  actions: {
    loadInitialBlocks: (rowLayouts: any) => void;
    setEditing: (blockId: string | null) => void;
    setSelected: (blockId: string | null) => void;
    updateBlock: (blockId: string, updates: Partial<StoreBlock>, isOptimistic?: boolean) => void;
    addBlock: (blockType: StoreBlock['type'], data?: Partial<StoreBlockData>, index?: number) => void;
    deleteBlock: (blockId: string) => void;
    reorderBlocks: (fromIndex: number, toIndex: number) => void;
    setDirty: (isDirty: boolean) => void;
    setLastSaved: () => void;
    setLoading: (isLoading: boolean) => void;
    setSaveError: (error: string | null) => void;
    clearOptimisticUpdates: () => void;
    setDragState: (dragState: Partial<{ isDragging: boolean; draggedBlockId: string | null; dragOverIndex: number | null }>) => void;
    startDrag: (blockId: string) => void;
    endDrag: () => void;
    setDragOver: (index: number | null) => void;
  };
}

const EditorContext = createContext<EditorContextType | null>(null);

// Provider 컴포넌트
interface EditorProviderProps {
  children: React.ReactNode;
  storeId: string;
}

export const EditorProvider: React.FC<EditorProviderProps> = ({ children, storeId }) => {
  const [state, dispatch] = useReducer(editorReducer, initialEditorState);

  const convertRowLayoutsToBlocks = useCallback((rowLayouts: any): StoreBlock[] => {
    if (!rowLayouts) return [];
    
    return Object.entries(rowLayouts).map(([index, layout]: [string, any]) => ({
      id: `block-${storeId}-${index}-${Date.now()}`,
      type: layout.layout_type,
      position: parseInt(index),
      data: layout,
      spacing: layout.spacing || 'normal',
      background_color: layout.background_color,
      text_alignment: layout.text_alignment || 'left',
      created_at: layout.created_at || new Date().toISOString(),
      updated_at: layout.updated_at || new Date().toISOString()
    })) as StoreBlock[];
  }, [storeId]);

  const getDefaultBlockData = useCallback((type: StoreBlock['type']): StoreBlockData => {
    switch (type) {
      case 'text':
        return {
          text_content: '<p>새 텍스트 블록입니다.</p>',
          text_size: 'medium',
          text_color: '#333333',
          text_weight: 'normal',
          text_style: 'paragraph',
          max_width: 'medium',
          padding: 'medium'
        };
      case 'grid':
        return {
          columns: 4,
          card_style: 'default',
          height_ratio: 'square',
          spacing: 'normal',
          show_prices: true,
          show_ratings: true
        };
      case 'featured':
        return {
          featured_size: 'large',
          show_text_overlay: true,
          overlay_position: 'center',
          featured_product_ids: []
        };
      case 'banner':
        return {
          banner_height: 'medium',
          banner_style: 'gradient',
          call_to_action: '지금 구매하기',
          button_text: '더 보기',
          button_link: '#'
        };
      case 'list':
        return {
          list_style: 'horizontal',
          show_description: true,
          show_price_prominent: false,
          max_items: 6
        };
      case 'masonry':
        return {
          masonry_columns: 3,
          min_height: 'medium',
          gap_size: 'medium'
        };
      default:
        return {} as StoreBlockData;
    }
  }, []);

  const actions = {
    loadInitialBlocks: useCallback((rowLayouts: any) => {
      const blocks = convertRowLayoutsToBlocks(rowLayouts);
      dispatch({ type: 'LOAD_INITIAL_BLOCKS', payload: blocks });
    }, [convertRowLayoutsToBlocks]),

    setEditing: useCallback((blockId: string | null) => {
      dispatch({ type: 'SET_EDITING', payload: blockId });
    }, []),

    setSelected: useCallback((blockId: string | null) => {
      dispatch({ type: 'SET_SELECTED', payload: blockId });
    }, []),

    updateBlock: useCallback((blockId: string, updates: Partial<StoreBlock>, isOptimistic = false) => {
      dispatch({ 
        type: 'UPDATE_BLOCK', 
        payload: { blockId, updates, isOptimistic } 
      });
    }, []),

    addBlock: useCallback((blockType: StoreBlock['type'], data?: Partial<StoreBlockData>, index?: number) => {
      const defaultData = getDefaultBlockData(blockType);
      const newBlock: StoreBlock = {
        id: `block-${storeId}-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        type: blockType,
        position: index || 0,
        data: { ...defaultData, ...data } as StoreBlockData,
        spacing: 'normal',
        text_alignment: 'left',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };
      
      dispatch({ type: 'ADD_BLOCK', payload: { block: newBlock, index } });
    }, [storeId, getDefaultBlockData]),

    deleteBlock: useCallback((blockId: string) => {
      dispatch({ type: 'DELETE_BLOCK', payload: blockId });
    }, []),

    reorderBlocks: useCallback((fromIndex: number, toIndex: number) => {
      dispatch({ type: 'REORDER_BLOCKS', payload: { fromIndex, toIndex } });
    }, []),

    setDirty: useCallback((isDirty: boolean) => {
      dispatch({ type: 'SET_DIRTY', payload: isDirty });
    }, []),

    setLastSaved: useCallback(() => {
      dispatch({ type: 'SET_LAST_SAVED', payload: new Date() });
    }, []),

    setLoading: useCallback((isLoading: boolean) => {
      dispatch({ type: 'SET_LOADING', payload: isLoading });
    }, []),

    setSaveError: useCallback((error: string | null) => {
      dispatch({ type: 'SET_SAVE_ERROR', payload: error });
    }, []),

    clearOptimisticUpdates: useCallback(() => {
      dispatch({ type: 'CLEAR_OPTIMISTIC_UPDATES' });
    }, []),

    setDragState: useCallback((dragState: Partial<{ isDragging: boolean; draggedBlockId: string | null; dragOverIndex: number | null }>) => {
      dispatch({ type: 'SET_DRAG_STATE', payload: dragState });
    }, []),

    startDrag: useCallback((blockId: string) => {
      dispatch({ type: 'START_DRAG', payload: blockId });
    }, []),

    endDrag: useCallback(() => {
      dispatch({ type: 'END_DRAG' });
    }, []),

    setDragOver: useCallback((index: number | null) => {
      dispatch({ type: 'SET_DRAG_OVER', payload: index });
    }, [])
  };

  const contextValue = {
    state,
    dispatch,
    actions
  };

  return (
    <EditorContext.Provider value={contextValue}>
      {children}
    </EditorContext.Provider>
  );
};

// 훅
export const useDetailedEditorState = () => {
  const context = useContext(EditorContext);
  if (!context) {
    throw new Error('useDetailedEditorState must be used within an EditorProvider');
  }
  return context;
};

// 유틸리티 함수
export const convertBlocksToRowLayouts = (blocks: StoreBlock[]) => {
  const rowLayouts: any = {};
  blocks.forEach((block, index) => {
    rowLayouts[index.toString()] = {
      ...block.data,
      layout_type: block.type,
      spacing: block.spacing,
      background_color: block.background_color,
      text_alignment: block.text_alignment,
      created_at: block.created_at,
      updated_at: block.updated_at
    };
  });
  return rowLayouts;
};  