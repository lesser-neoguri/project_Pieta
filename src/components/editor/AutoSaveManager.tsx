import React, { useState, useEffect, useRef, useCallback } from 'react';
import { StoreBlock } from '@/types/blockTypes';
import { supabase } from '@/lib/supabase';

// 저장 전략 타입
export type SaveStrategy = 'immediate' | 'debounced' | 'interval' | 'manual';

interface AutoSaveManagerProps {
  storeId: string;
  blocks: StoreBlock[];
  isDirty: boolean;
  strategy: SaveStrategy;
  children: React.ReactNode;
  onSaveSuccess?: (timestamp: Date) => void;
  onSaveError?: (error: Error) => void;
  onConflictDetected?: (conflicts: any[]) => void;
}

interface SaveState {
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveCount: number;
  errors: Error[];
  retryCount: number;
}

export const AutoSaveManager: React.FC<AutoSaveManagerProps> = ({
  storeId,
  blocks,
  isDirty,
  strategy,
  children,
  onSaveSuccess,
  onSaveError,
  onConflictDetected
}) => {
  const [saveState, setSaveState] = useState<SaveState>({
    isSaving: false,
    lastSavedAt: null,
    saveCount: 0,
    errors: [],
    retryCount: 0
  });

  // 각 전략별 타이머 참조
  const debouncedTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const intervalTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  
  // 마지막 저장된 버전의 해시값 (변경 감지용)
  const lastSavedHashRef = useRef<string>('');

  // 블록 데이터를 row_layouts 형태로 변환
  const convertBlocksToRowLayouts = useCallback((blocks: StoreBlock[]): Record<string, any> => {
    const rowLayouts: Record<string, any> = {};
    blocks.forEach((block, index) => {
      rowLayouts[index.toString()] = {
        ...block.data,
        layout_type: block.type
      };
    });
    return rowLayouts;
  }, []);

  // 데이터 해시 생성 (변경 감지용)
  const generateDataHash = useCallback((blocks: StoreBlock[]): string => {
    return btoa(JSON.stringify(convertBlocksToRowLayouts(blocks)));
  }, [convertBlocksToRowLayouts]);

  // 실제 저장 로직
  const performSave = useCallback(async (blocks: StoreBlock[], isRetry = false): Promise<boolean> => {
    const currentHash = generateDataHash(blocks);
    
    // 변경사항이 없으면 저장하지 않음
    if (currentHash === lastSavedHashRef.current) {
      return true;
    }

    setSaveState(prev => ({ ...prev, isSaving: true }));

    try {
      // 1. 충돌 감지를 위한 현재 서버 상태 확인
      const { data: currentDesign, error: fetchError } = await supabase
        .from('store_designs')
        .select('row_layouts, updated_at')
        .eq('store_id', storeId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        throw new Error(`서버 상태 확인 실패: ${fetchError.message}`);
      }

      // 2. 충돌 감지 로직
      if (currentDesign && saveState.lastSavedAt) {
        const serverUpdatedAt = new Date(currentDesign.updated_at);
        if (serverUpdatedAt > saveState.lastSavedAt) {
          // 잠재적 충돌 감지
          const conflicts = detectConflicts(blocks, currentDesign.row_layouts);
          if (conflicts.length > 0) {
            onConflictDetected?.(conflicts);
            return false;
          }
        }
      }

      // 3. 데이터 변환 및 저장
      const rowLayouts = convertBlocksToRowLayouts(blocks);
      const saveData = {
        store_id: storeId,
        row_layouts: rowLayouts,
        updated_at: new Date().toISOString()
      };

      const { error: saveError } = await supabase
        .from('store_designs')
        .upsert(saveData);

      if (saveError) {
        throw new Error(`저장 실패: ${saveError.message}`);
      }

      // 4. 성공 처리
      const now = new Date();
      lastSavedHashRef.current = currentHash;
      
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        lastSavedAt: now,
        saveCount: prev.saveCount + 1,
        retryCount: 0,
        errors: []
      }));

      onSaveSuccess?.(now);
      return true;

    } catch (error) {
      const saveError = error as Error;
      
      setSaveState(prev => ({
        ...prev,
        isSaving: false,
        errors: [...prev.errors.slice(-4), saveError], // 최근 5개 에러만 유지
        retryCount: prev.retryCount + 1
      }));

      onSaveError?.(saveError);

      // 자동 재시도 로직 (최대 3회)
      if (!isRetry && saveState.retryCount < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, saveState.retryCount), 10000); // 지수 백오프
        retryTimeoutRef.current = setTimeout(() => {
          performSave(blocks, true);
        }, retryDelay);
      }

      return false;
    }
  }, [storeId, saveState.lastSavedAt, saveState.retryCount, convertBlocksToRowLayouts, generateDataHash, onSaveSuccess, onSaveError, onConflictDetected]);

  // 전략별 저장 트리거
  useEffect(() => {
    if (!isDirty || !blocks.length) return;

    switch (strategy) {
      case 'immediate':
        // 즉시 저장
        performSave(blocks);
        break;

      case 'debounced':
        // 디바운스 저장 (2초 후)
        if (debouncedTimeoutRef.current) {
          clearTimeout(debouncedTimeoutRef.current);
        }
        debouncedTimeoutRef.current = setTimeout(() => {
          performSave(blocks);
        }, 2000);
        break;

      case 'interval':
        // 30초마다 저장
        if (!intervalTimeoutRef.current) {
          intervalTimeoutRef.current = setInterval(() => {
            if (isDirty) {
              performSave(blocks);
            }
          }, 30000);
        }
        break;

      case 'manual':
        // 수동 저장 - 아무것도 하지 않음
        break;
    }

    // 클린업
    return () => {
      if (debouncedTimeoutRef.current) {
        clearTimeout(debouncedTimeoutRef.current);
      }
    };
  }, [blocks, isDirty, strategy, performSave]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      [debouncedTimeoutRef, intervalTimeoutRef, retryTimeoutRef].forEach(ref => {
        if (ref.current) {
          clearTimeout(ref.current);
        }
      });
    };
  }, []);

  // 수동 저장 함수
  const manualSave = useCallback(() => {
    return performSave(blocks);
  }, [blocks, performSave]);

  // 저장 상태 컨텍스트 값
  const saveContextValue = {
    ...saveState,
    strategy,
    manualSave,
    hasUnsavedChanges: isDirty && generateDataHash(blocks) !== lastSavedHashRef.current
  };

  return (
    <SaveStateContext.Provider value={saveContextValue}>
      {children}
      <SaveStatusIndicator />
    </SaveStateContext.Provider>
  );
};

// 저장 상태 컨텍스트
const SaveStateContext = React.createContext<{
  isSaving: boolean;
  lastSavedAt: Date | null;
  saveCount: number;
  errors: Error[];
  retryCount: number;
  strategy: SaveStrategy;
  hasUnsavedChanges: boolean;
  manualSave: () => Promise<boolean>;
} | null>(null);

export const useSaveState = () => {
  const context = React.useContext(SaveStateContext);
  if (!context) {
    throw new Error('useSaveState must be used within AutoSaveManager');
  }
  return context;
};

// 저장 상태 표시 컴포넌트
const SaveStatusIndicator: React.FC = () => {
  const { isSaving, lastSavedAt, hasUnsavedChanges, errors, strategy } = useSaveState();

  if (strategy === 'manual') {
    return null; // 수동 저장에서는 상태 표시하지 않음
  }

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`px-4 py-2 rounded-lg shadow-lg border text-sm font-medium transition-all duration-300 ${
        errors.length > 0 
          ? 'bg-red-50 border-red-200 text-red-700'
          : isSaving 
          ? 'bg-blue-50 border-blue-200 text-blue-700'
          : hasUnsavedChanges
          ? 'bg-yellow-50 border-yellow-200 text-yellow-700'
          : 'bg-green-50 border-green-200 text-green-700'
      }`}>
        <div className="flex items-center space-x-2">
          {/* 상태 아이콘 */}
          <div className="w-3 h-3">
            {errors.length > 0 ? (
              <div className="w-full h-full bg-red-500 rounded-full animate-pulse" />
            ) : isSaving ? (
              <div className="w-full h-full border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
            ) : hasUnsavedChanges ? (
              <div className="w-full h-full bg-yellow-500 rounded-full" />
            ) : (
              <div className="w-full h-full bg-green-500 rounded-full" />
            )}
          </div>

          {/* 상태 텍스트 */}
          <span>
            {errors.length > 0 
              ? `저장 실패 (${errors.length}개 오류)`
              : isSaving 
              ? '저장 중...'
              : hasUnsavedChanges
              ? '변경사항 있음'
              : lastSavedAt
              ? `저장됨 (${formatTimeAgo(lastSavedAt)})`
              : '준비됨'
            }
          </span>
        </div>

        {/* 오류 상세 정보 */}
        {errors.length > 0 && (
          <div className="mt-2 text-xs opacity-75">
            마지막 오류: {errors[errors.length - 1].message}
          </div>
        )}
      </div>
    </div>
  );
};

// 충돌 감지 함수
const detectConflicts = (localBlocks: StoreBlock[], serverRowLayouts: any): any[] => {
  const conflicts: any[] = [];
  
  // 간단한 충돌 감지 로직
  localBlocks.forEach((localBlock, index) => {
    const serverBlock = serverRowLayouts?.[index.toString()];
    if (serverBlock) {
      const localData = JSON.stringify(localBlock.data);
      const serverData = JSON.stringify(serverBlock);
      
      if (localData !== serverData) {
        conflicts.push({
          blockId: localBlock.id,
          position: index,
          localVersion: localBlock.data,
          serverVersion: serverBlock
        });
      }
    }
  });

  return conflicts;
};

// 시간 포맷 유틸리티
const formatTimeAgo = (date: Date): string => {
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffSecs = Math.floor(diffMs / 1000);
  const diffMins = Math.floor(diffSecs / 60);

  if (diffSecs < 60) {
    return `${diffSecs}초 전`;
  } else if (diffMins < 60) {
    return `${diffMins}분 전`;
  } else {
    return date.toLocaleTimeString('ko-KR', { hour: '2-digit', minute: '2-digit' });
  }
}; 