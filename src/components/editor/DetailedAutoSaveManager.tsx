import React, { useEffect, useRef, useCallback, useState } from 'react';
import { StoreBlock, ConflictInfo, AutoSaveState } from '@/types/editorTypes';
import { supabase } from '@/lib/supabase';

// convertBlocksToRowLayouts 함수를 로컬에서 정의
const convertBlocksToRowLayouts = (blocks: StoreBlock[]) => {
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

interface DetailedAutoSaveManagerProps {
  storeId: string;
  blocks: StoreBlock[];
  isDirty: boolean;
  lastSavedAt: Date | null;
  onSaveSuccess: () => void;
  onSaveError: (error: string) => void;
  onConflictDetected: (conflicts: ConflictInfo[]) => void;
  children: React.ReactNode;
}

export const DetailedAutoSaveManager: React.FC<DetailedAutoSaveManagerProps> = ({
  storeId,
  blocks,
  isDirty,
  lastSavedAt,
  onSaveSuccess,
  onSaveError,
  onConflictDetected,
  children
}) => {
  const [autoSaveState, setAutoSaveState] = useState<AutoSaveState>({
    isSaving: false,
    lastSaveAttempt: null,
    saveError: null,
    retryCount: 0,
    conflicts: []
  });

  // 타이머 참조
  const debounceTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const retryTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const lastSaveHashRef = useRef<string>('');

  // 데이터 해시 생성 (변경 감지용)
  const generateDataHash = useCallback((blocks: StoreBlock[]): string => {
    const rowLayouts = convertBlocksToRowLayouts(blocks);
    const jsonString = JSON.stringify(rowLayouts);
    
    // UTF-8 문자를 안전하게 Base64로 인코딩
    try {
      // encodeURIComponent로 UTF-8을 퍼센트 인코딩한 후 btoa 사용
      return btoa(encodeURIComponent(jsonString));
    } catch (error) {
      // btoa가 실패하는 경우 간단한 해시 함수 사용
      let hash = 0;
      for (let i = 0; i < jsonString.length; i++) {
        const char = jsonString.charCodeAt(i);
        hash = ((hash << 5) - hash) + char;
        hash = hash & hash; // 32비트 정수로 변환
      }
      return hash.toString(36);
    }
  }, []);

  // 서버 충돌 감지
  const detectServerConflicts = useCallback(async (): Promise<ConflictInfo[]> => {
    try {
      const { data: currentDesign, error } = await supabase
        .from('store_designs')
        .select('row_layouts, updated_at')
        .eq('store_id', storeId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // 데이터가 없는 경우 충돌 없음
          return [];
        }
        throw error;
      }

      // 서버 데이터가 더 최신인지 확인
      if (currentDesign && lastSavedAt) {
        const serverUpdatedAt = new Date(currentDesign.updated_at);
        if (serverUpdatedAt > lastSavedAt) {
          // 잠재적 충돌 감지
          const conflicts = compareBlocksWithServer(blocks, currentDesign.row_layouts);
          return conflicts;
        }
      }

      return [];
    } catch (error) {
      console.error('Conflict detection failed:', error);
      return [];
    }
  }, [storeId, blocks, lastSavedAt]);

  // 서버 데이터와 로컬 블록 비교
  const compareBlocksWithServer = (localBlocks: StoreBlock[], serverRowLayouts: any): ConflictInfo[] => {
    const conflicts: ConflictInfo[] = [];
    
    localBlocks.forEach((localBlock, index) => {
      const serverBlock = serverRowLayouts?.[index.toString()];
      if (serverBlock) {
        // 간단한 해시 비교
        const localHash = JSON.stringify(localBlock.data);
        const serverHash = JSON.stringify(serverBlock);
        
        if (localHash !== serverHash) {
          conflicts.push({
            blockId: localBlock.id,
            localVersion: localBlock,
            serverVersion: serverBlock,
            timestamp: new Date()
          });
        }
      }
    });
    
    return conflicts;
  };

  // 실제 저장 함수 (Mock 구현 - 실제 Supabase 연동)
  const performSave = useCallback(async (): Promise<boolean> => {
    const currentHash = generateDataHash(blocks);
    
    // 변경사항이 없으면 저장하지 않음
    if (currentHash === lastSaveHashRef.current && !isDirty) {
      return true;
    }

    setAutoSaveState(prev => ({ 
      ...prev, 
      isSaving: true, 
      lastSaveAttempt: new Date(),
      saveError: null 
    }));

    try {
      // 1. 충돌 감지
      const conflicts = await detectServerConflicts();
      if (conflicts.length > 0) {
        setAutoSaveState(prev => ({ ...prev, conflicts, isSaving: false }));
        onConflictDetected(conflicts);
        return false;
      }

      // 2. 데이터 변환
      const rowLayouts = convertBlocksToRowLayouts(blocks);

      // 3. Supabase에 저장
      // 먼저 기존 레코드가 있는지 확인
      const { data: existingDesign, error: fetchError } = await supabase
        .from('store_designs')
        .select('id')
        .eq('store_id', storeId)
        .single();

      if (fetchError && fetchError.code !== 'PGRST116') {
        // PGRST116 = 데이터 없음, 이 외의 에러는 실제 에러
        throw new Error(`데이터 조회 실패: ${fetchError.message}`);
      }

      let saveError;
      if (existingDesign) {
        // 기존 레코드가 있으면 UPDATE
        const { error } = await supabase
          .from('store_designs')
          .update({
            row_layouts: rowLayouts,
            updated_at: new Date().toISOString()
          })
          .eq('store_id', storeId);
        saveError = error;
      } else {
        // 기존 레코드가 없으면 INSERT
        const { error } = await supabase
          .from('store_designs')
          .insert({
            store_id: storeId,
            row_layouts: rowLayouts,
            updated_at: new Date().toISOString()
          });
        saveError = error;
      }

      if (saveError) {
        throw new Error(`저장 실패: ${saveError.message}`);
      }

      // 4. 성공 처리
      lastSaveHashRef.current = currentHash;
      setAutoSaveState(prev => ({
        ...prev,
        isSaving: false,
        retryCount: 0,
        saveError: null,
        conflicts: []
      }));

      onSaveSuccess();
      return true;

    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : '알 수 없는 오류';
      
      setAutoSaveState(prev => ({
        ...prev,
        isSaving: false,
        saveError: errorMessage,
        retryCount: prev.retryCount + 1
      }));

      onSaveError(errorMessage);

      // 자동 재시도 (최대 3회)
      if (autoSaveState.retryCount < 3) {
        const retryDelay = Math.min(1000 * Math.pow(2, autoSaveState.retryCount), 10000);
        retryTimeoutRef.current = setTimeout(() => {
          performSave();
        }, retryDelay);
      }

      return false;
    }
  }, [blocks, isDirty, generateDataHash, detectServerConflicts, storeId, onSaveSuccess, onSaveError, onConflictDetected, autoSaveState.retryCount]);

  // 디바운스된 자동 저장
  const debouncedSave = useCallback(() => {
    if (!isDirty) return;

    // 기존 타이머 클리어
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }

    // 2초 디바운스
    debounceTimeoutRef.current = setTimeout(() => {
      performSave();
    }, 2000);
  }, [isDirty, performSave]);

  // 변경사항 감지 시 자동 저장 트리거
  useEffect(() => {
    if (isDirty && blocks.length > 0) {
      debouncedSave();
    }
  }, [isDirty, blocks, debouncedSave]);

  // 컴포넌트 언마운트 시 정리
  useEffect(() => {
    return () => {
      if (debounceTimeoutRef.current) {
        clearTimeout(debounceTimeoutRef.current);
      }
      if (retryTimeoutRef.current) {
        clearTimeout(retryTimeoutRef.current);
      }
    };
  }, []);

  // 수동 저장 함수
  const manualSave = useCallback(async () => {
    if (debounceTimeoutRef.current) {
      clearTimeout(debounceTimeoutRef.current);
    }
    return await performSave();
  }, [performSave]);

  return (
    <>
      {children}
      <AutoSaveStatusIndicator 
        autoSaveState={autoSaveState}
        isDirty={isDirty}
        lastSavedAt={lastSavedAt}
        onManualSave={manualSave}
      />
    </>
  );
};

// 저장 상태 표시 컴포넌트
interface AutoSaveStatusIndicatorProps {
  autoSaveState: AutoSaveState;
  isDirty: boolean;
  lastSavedAt: Date | null;
  onManualSave: () => Promise<boolean>;
}

const AutoSaveStatusIndicator: React.FC<AutoSaveStatusIndicatorProps> = ({
  autoSaveState,
  isDirty,
  lastSavedAt,
  onManualSave
}) => {
  const { isSaving, saveError, retryCount, conflicts } = autoSaveState;

  const getStatusInfo = () => {
    if (conflicts.length > 0) {
      return {
        color: 'red',
        icon: '⚠️',
        message: `충돌 감지 (${conflicts.length}개)`,
        description: '다른 사용자가 동시에 편집했습니다'
      };
    }
    
    if (saveError) {
      return {
        color: 'red',
        icon: '❌',
        message: `저장 실패${retryCount > 0 ? ` (${retryCount}회 재시도)` : ''}`,
        description: saveError
      };
    }
    
    if (isSaving) {
      return {
        color: 'blue',
        icon: '💾',
        message: '저장 중...',
        description: '변경사항을 저장하고 있습니다'
      };
    }
    
    if (isDirty) {
      return {
        color: 'yellow',
        icon: '●',
        message: '저장되지 않음',
        description: '2초 후 자동 저장됩니다'
      };
    }
    
    return {
      color: 'green',
      icon: '✓',
      message: '저장됨',
      description: lastSavedAt ? `${formatTimeAgo(lastSavedAt)}에 저장` : '저장 완료'
    };
  };

  const statusInfo = getStatusInfo();

  return (
    <div className="fixed bottom-4 right-4 z-50">
      <div className={`
        px-4 py-3 rounded-lg shadow-lg border max-w-xs
        ${statusInfo.color === 'red' ? 'bg-red-50 border-red-200 text-red-700' : ''}
        ${statusInfo.color === 'blue' ? 'bg-blue-50 border-blue-200 text-blue-700' : ''}
        ${statusInfo.color === 'yellow' ? 'bg-yellow-50 border-yellow-200 text-yellow-700' : ''}
        ${statusInfo.color === 'green' ? 'bg-green-50 border-green-200 text-green-700' : ''}
        transition-all duration-300
      `}>
        <div className="flex items-center space-x-2">
          <span className="text-lg">{statusInfo.icon}</span>
          <div className="flex-1">
            <div className="font-medium text-sm">{statusInfo.message}</div>
            <div className="text-xs opacity-75">{statusInfo.description}</div>
          </div>
          
          {/* 수동 저장 버튼 */}
          {(isDirty || saveError) && (
            <button
              onClick={onManualSave}
              disabled={isSaving}
              className="ml-2 px-2 py-1 text-xs bg-white border rounded hover:bg-gray-50 disabled:opacity-50"
            >
              저장
            </button>
          )}
        </div>
      </div>
    </div>
  );
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