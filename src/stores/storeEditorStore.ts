import { create } from 'zustand';
import { devtools, persist, subscribeWithSelector } from 'zustand/middleware';
import { StoreBlock, BlockType } from '@/types/blockTypes';
import { LegacyRowLayout } from '@/utils/legacyDataMapping';

/**
 * PIETA 스토어 에디터 상태 관리
 * 
 * 선택 이유: Zustand
 * 1. 복잡한 중첩 상태 관리 용이
 * 2. TypeScript 완전 지원
 * 3. 미들웨어 확장성 (persist, devtools)
 * 4. 성능 최적화 (선택적 구독)
 * 5. 보일러플레이트 최소화
 */

interface EditingSession {
  sessionId: string;
  storeId: string;
  userId: string;
  startTime: number;
  lastActivity: number;
  isActive: boolean;
}

interface ChangeEntry {
  id: string;
  blockId: string;
  action: 'create' | 'update' | 'delete' | 'reorder';
  timestamp: number;
  oldValue?: any;
  newValue?: any;
  applied: boolean;
}

interface SavingState {
  isSaving: boolean;
  lastSaved: number | null;
  pendingChanges: number;
  autoSaveEnabled: boolean;
  saveInterval: number; // milliseconds
  lastError: string | null;
}

interface StoreEditorState {
  // === 기본 상태 ===
  storeId: string | null;
  blocks: StoreBlock[];
  isEditMode: boolean;
  isLoading: boolean;
  
  // === 편집 세션 관리 ===
  editingSession: EditingSession | null;
  
  // === 변경 추적 ===
  changeHistory: ChangeEntry[];
  currentVersion: number;
  
  // === 저장 상태 ===
  savingState: SavingState;
  
  // === 선택 및 포커스 ===
  selectedBlockId: string | null;
  focusedBlockId: string | null;
  
  // === 실행취소/다시실행 ===
  undoStack: ChangeEntry[][];
  redoStack: ChangeEntry[][];
  canUndo: boolean;
  canRedo: boolean;
  
  // === 협업 및 충돌 방지 ===
  otherEditors: EditingSession[];
  conflictResolution: 'manual' | 'auto-merge' | 'last-writer-wins';
  
  // === 액션들 ===
  actions: {
    // 초기화 및 설정
    initializeStore: (storeId: string, initialBlocks: StoreBlock[]) => void;
    setEditMode: (enabled: boolean) => void;
    
    // 블록 관리
    addBlock: (block: StoreBlock, position?: number) => void;
    updateBlock: (blockId: string, updates: Partial<StoreBlock>) => void;
    deleteBlock: (blockId: string) => void;
    reorderBlocks: (sourceIndex: number, destinationIndex: number) => void;
    
    // 선택 및 포커스
    selectBlock: (blockId: string | null) => void;
    focusBlock: (blockId: string | null) => void;
    
    // 실행취소/다시실행
    undo: () => void;
    redo: () => void;
    
    // 저장 관리
    saveChanges: () => Promise<void>;
    enableAutoSave: (enabled: boolean) => void;
    setAutoSaveInterval: (ms: number) => void;
    
    // 세션 관리
    startEditingSession: (userId: string) => void;
    endEditingSession: () => void;
    updateActivity: () => void;
    
    // 충돌 해결
    resolveConflict: (strategy: 'keep-local' | 'keep-remote' | 'merge') => void;
    
    // 유틸리티
    resetState: () => void;
    loadFromServer: (storeId: string) => Promise<void>;
  };
}

// 초기 상태
const initialState = {
  storeId: null,
  blocks: [],
  isEditMode: false,
  isLoading: false,
  editingSession: null,
  changeHistory: [],
  currentVersion: 0,
  savingState: {
    isSaving: false,
    lastSaved: null,
    pendingChanges: 0,
    autoSaveEnabled: true,
    saveInterval: 3000, // 3초
    lastError: null
  },
  selectedBlockId: null,
  focusedBlockId: null,
  undoStack: [],
  redoStack: [],
  canUndo: false,
  canRedo: false,
  otherEditors: [],
  conflictResolution: 'manual' as const
};

export const useStoreEditorStore = create<StoreEditorState>()(
  devtools(
    persist(
      subscribeWithSelector((set, get) => ({
        ...initialState,
        
        actions: {
          // === 초기화 및 설정 ===
          initializeStore: (storeId: string, initialBlocks: StoreBlock[]) => {
            set({
              storeId,
              blocks: initialBlocks,
              currentVersion: Date.now(),
              changeHistory: [],
              undoStack: [],
              redoStack: [],
              canUndo: false,
              canRedo: false
            });
          },
          
          setEditMode: (enabled: boolean) => {
            const state = get();
            if (enabled && !state.editingSession) {
              // 편집 모드 시작 시 세션 생성 필요
              console.warn('편집 세션이 없습니다. startEditingSession을 먼저 호출하세요.');
            }
            set({ isEditMode: enabled });
          },
          
          // === 블록 관리 ===
          addBlock: (block: StoreBlock, position?: number) => {
            const state = get();
            const newBlocks = [...state.blocks];
            const insertPosition = position ?? newBlocks.length;
            
            // position 필드 조정
            const blockWithPosition = { ...block, position: insertPosition };
            newBlocks.splice(insertPosition, 0, blockWithPosition);
            
            // 이후 블록들의 position 재조정
            const adjustedBlocks = newBlocks.map((b, index) => ({ ...b, position: index }));
            
            const changeEntry: ChangeEntry = {
              id: `add-${Date.now()}`,
              blockId: block.id,
              action: 'create',
              timestamp: Date.now(),
              newValue: blockWithPosition,
              applied: true
            };
            
            set({
              blocks: adjustedBlocks,
              changeHistory: [...state.changeHistory, changeEntry],
              savingState: {
                ...state.savingState,
                pendingChanges: state.savingState.pendingChanges + 1
              }
            });
            
            // 실행취소 스택 업데이트
            get().actions.updateUndoStack([changeEntry]);
            get().actions.updateActivity();
          },
          
          updateBlock: (blockId: string, updates: Partial<StoreBlock>) => {
            const state = get();
            const blockIndex = state.blocks.findIndex(b => b.id === blockId);
            if (blockIndex === -1) return;
            
            const oldBlock = state.blocks[blockIndex];
            const newBlock = { ...oldBlock, ...updates };
            const newBlocks = [...state.blocks];
            newBlocks[blockIndex] = newBlock;
            
            const changeEntry: ChangeEntry = {
              id: `update-${Date.now()}`,
              blockId,
              action: 'update',
              timestamp: Date.now(),
              oldValue: oldBlock,
              newValue: updates,
              applied: true
            };
            
            set({
              blocks: newBlocks,
              changeHistory: [...state.changeHistory, changeEntry],
              savingState: {
                ...state.savingState,
                pendingChanges: state.savingState.pendingChanges + 1
              }
            });
            
            get().actions.updateUndoStack([changeEntry]);
            get().actions.updateActivity();
          },
          
          deleteBlock: (blockId: string) => {
            const state = get();
            const blockIndex = state.blocks.findIndex(b => b.id === blockId);
            if (blockIndex === -1) return;
            
            const deletedBlock = state.blocks[blockIndex];
            const newBlocks = state.blocks
              .filter(b => b.id !== blockId)
              .map((b, index) => ({ ...b, position: index }));
            
            const changeEntry: ChangeEntry = {
              id: `delete-${Date.now()}`,
              blockId,
              action: 'delete',
              timestamp: Date.now(),
              oldValue: deletedBlock,
              applied: true
            };
            
            set({
              blocks: newBlocks,
              changeHistory: [...state.changeHistory, changeEntry],
              selectedBlockId: state.selectedBlockId === blockId ? null : state.selectedBlockId,
              focusedBlockId: state.focusedBlockId === blockId ? null : state.focusedBlockId,
              savingState: {
                ...state.savingState,
                pendingChanges: state.savingState.pendingChanges + 1
              }
            });
            
            get().actions.updateUndoStack([changeEntry]);
            get().actions.updateActivity();
          },
          
          reorderBlocks: (sourceIndex: number, destinationIndex: number) => {
            const state = get();
            if (sourceIndex === destinationIndex) return;
            
            const newBlocks = [...state.blocks];
            const [movedBlock] = newBlocks.splice(sourceIndex, 1);
            newBlocks.splice(destinationIndex, 0, movedBlock);
            
            // position 재조정
            const adjustedBlocks = newBlocks.map((block, index) => ({
              ...block,
              position: index
            }));
            
            const changeEntry: ChangeEntry = {
              id: `reorder-${Date.now()}`,
              blockId: movedBlock.id,
              action: 'reorder',
              timestamp: Date.now(),
              oldValue: { sourceIndex, destinationIndex },
              newValue: { sourceIndex: destinationIndex, destinationIndex: sourceIndex },
              applied: true
            };
            
            set({
              blocks: adjustedBlocks,
              changeHistory: [...state.changeHistory, changeEntry],
              savingState: {
                ...state.savingState,
                pendingChanges: state.savingState.pendingChanges + 1
              }
            });
            
            get().actions.updateUndoStack([changeEntry]);
            get().actions.updateActivity();
          },
          
          // === 선택 및 포커스 ===
          selectBlock: (blockId: string | null) => {
            set({ selectedBlockId: blockId });
            get().actions.updateActivity();
          },
          
          focusBlock: (blockId: string | null) => {
            set({ focusedBlockId: blockId });
            get().actions.updateActivity();
          },
          
          // === 실행취소/다시실행 ===
          undo: () => {
            const state = get();
            if (!state.canUndo || state.undoStack.length === 0) return;
            
            const lastChanges = state.undoStack[state.undoStack.length - 1];
            const newUndoStack = state.undoStack.slice(0, -1);
            const newRedoStack = [...state.redoStack, lastChanges];
            
            // 변경사항을 역순으로 적용
            let newBlocks = [...state.blocks];
            lastChanges.reverse().forEach(change => {
              newBlocks = applyUndoChange(newBlocks, change);
            });
            
            set({
              blocks: newBlocks,
              undoStack: newUndoStack,
              redoStack: newRedoStack,
              canUndo: newUndoStack.length > 0,
              canRedo: true,
              savingState: {
                ...state.savingState,
                pendingChanges: state.savingState.pendingChanges + 1
              }
            });
          },
          
          redo: () => {
            const state = get();
            if (!state.canRedo || state.redoStack.length === 0) return;
            
            const nextChanges = state.redoStack[state.redoStack.length - 1];
            const newRedoStack = state.redoStack.slice(0, -1);
            const newUndoStack = [...state.undoStack, nextChanges];
            
            // 변경사항 재적용
            let newBlocks = [...state.blocks];
            nextChanges.forEach(change => {
              newBlocks = applyRedoChange(newBlocks, change);
            });
            
            set({
              blocks: newBlocks,
              undoStack: newUndoStack,
              redoStack: newRedoStack,
              canUndo: true,
              canRedo: newRedoStack.length > 0,
              savingState: {
                ...state.savingState,
                pendingChanges: state.savingState.pendingChanges + 1
              }
            });
          },
          
          // === 저장 관리 ===
          saveChanges: async () => {
            const state = get();
            if (state.savingState.isSaving || state.savingState.pendingChanges === 0) return;
            
            set({
              savingState: {
                ...state.savingState,
                isSaving: true,
                lastError: null
              }
            });
            
            try {
              await saveToServer(state.storeId!, state.blocks, state.changeHistory);
              
              set({
                savingState: {
                  ...state.savingState,
                  isSaving: false,
                  lastSaved: Date.now(),
                  pendingChanges: 0
                }
              });
            } catch (error) {
              set({
                savingState: {
                  ...state.savingState,
                  isSaving: false,
                  lastError: error instanceof Error ? error.message : 'Unknown error'
                }
              });
            }
          },
          
          enableAutoSave: (enabled: boolean) => {
            set({
              savingState: {
                ...get().savingState,
                autoSaveEnabled: enabled
              }
            });
          },
          
          setAutoSaveInterval: (ms: number) => {
            set({
              savingState: {
                ...get().savingState,
                saveInterval: ms
              }
            });
          },
          
          // === 세션 관리 ===
          startEditingSession: (userId: string) => {
            const sessionId = `session-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
            set({
              editingSession: {
                sessionId,
                storeId: get().storeId!,
                userId,
                startTime: Date.now(),
                lastActivity: Date.now(),
                isActive: true
              }
            });
          },
          
          endEditingSession: () => {
            const state = get();
            if (state.editingSession) {
              // 마지막 저장 시도
              if (state.savingState.pendingChanges > 0) {
                get().actions.saveChanges();
              }
            }
            set({ editingSession: null, isEditMode: false });
          },
          
          updateActivity: () => {
            const state = get();
            if (state.editingSession) {
              set({
                editingSession: {
                  ...state.editingSession,
                  lastActivity: Date.now()
                }
              });
            }
          },
          
          // === 충돌 해결 ===
          resolveConflict: (strategy: 'keep-local' | 'keep-remote' | 'merge') => {
            // 충돌 해결 로직 구현
            console.log('Resolving conflict with strategy:', strategy);
          },
          
          // === 유틸리티 ===
          resetState: () => {
            set(initialState);
          },
          
          loadFromServer: async (storeId: string) => {
            set({ isLoading: true });
            try {
              const { blocks, version } = await loadStoreFromServer(storeId);
              get().actions.initializeStore(storeId, blocks);
              set({ currentVersion: version });
            } catch (error) {
              console.error('Failed to load store:', error);
            } finally {
              set({ isLoading: false });
            }
          },
          
          // 내부 헬퍼 메서드들
          updateUndoStack: (changes: ChangeEntry[]) => {
            const state = get();
            const newUndoStack = [...state.undoStack, changes];
            
            // 스택 크기 제한 (최대 50개 작업)
            if (newUndoStack.length > 50) {
              newUndoStack.shift();
            }
            
            set({
              undoStack: newUndoStack,
              redoStack: [], // 새 작업 시 redo 스택 초기화
              canUndo: true,
              canRedo: false
            });
          }
        }
      })),
      {
        name: 'store-editor-state',
        partialize: (state) => ({
          // 중요한 상태만 로컬 스토리지에 저장
          storeId: state.storeId,
          savingState: {
            autoSaveEnabled: state.savingState.autoSaveEnabled,
            saveInterval: state.savingState.saveInterval
          },
          conflictResolution: state.conflictResolution
        })
      }
    ),
    { name: 'store-editor' }
  )
);

// === 헬퍼 함수들 ===

function applyUndoChange(blocks: StoreBlock[], change: ChangeEntry): StoreBlock[] {
  switch (change.action) {
    case 'create':
      return blocks.filter(b => b.id !== change.blockId);
    case 'update':
      const updateIndex = blocks.findIndex(b => b.id === change.blockId);
      if (updateIndex !== -1) {
        blocks[updateIndex] = change.oldValue;
      }
      return blocks;
    case 'delete':
      // 삭제된 블록을 원래 위치에 복원
      return [...blocks, change.oldValue].sort((a, b) => a.position - b.position);
    case 'reorder':
      // 순서를 원래대로 되돌리기
      const { sourceIndex, destinationIndex } = change.oldValue;
      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(destinationIndex, 1);
      newBlocks.splice(sourceIndex, 0, movedBlock);
      return newBlocks.map((block, index) => ({ ...block, position: index }));
    default:
      return blocks;
  }
}

function applyRedoChange(blocks: StoreBlock[], change: ChangeEntry): StoreBlock[] {
  switch (change.action) {
    case 'create':
      return [...blocks, change.newValue].sort((a, b) => a.position - b.position);
    case 'update':
      const updateIndex = blocks.findIndex(b => b.id === change.blockId);
      if (updateIndex !== -1) {
        blocks[updateIndex] = { ...blocks[updateIndex], ...change.newValue };
      }
      return blocks;
    case 'delete':
      return blocks.filter(b => b.id !== change.blockId);
    case 'reorder':
      const { sourceIndex, destinationIndex } = change.newValue;
      const newBlocks = [...blocks];
      const [movedBlock] = newBlocks.splice(sourceIndex, 1);
      newBlocks.splice(destinationIndex, 0, movedBlock);
      return newBlocks.map((block, index) => ({ ...block, position: index }));
    default:
      return blocks;
  }
}

async function saveToServer(storeId: string, blocks: StoreBlock[], changes: ChangeEntry[]) {
  const response = await fetch(`/api/stores/${storeId}/designs`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      blocks,
      changes,
      timestamp: Date.now()
    })
  });
  
  if (!response.ok) {
    throw new Error(`Save failed: ${response.statusText}`);
  }
  
  return response.json();
}

async function loadStoreFromServer(storeId: string) {
  const response = await fetch(`/api/stores/${storeId}/designs`);
  if (!response.ok) {
    throw new Error(`Load failed: ${response.statusText}`);
  }
  return response.json();
} 