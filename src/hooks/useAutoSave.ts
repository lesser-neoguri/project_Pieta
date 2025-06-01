import { useEffect, useRef, useCallback } from 'react';
import { useStoreEditorStore } from '@/stores/storeEditorStore';

/**
 * 자동 저장 및 수동 저장 관리 훅
 * 
 * 저장 정책:
 * 1. 자동 저장: 변경 후 3초 디바운싱
 * 2. 수동 저장: 사용자 명시적 요청
 * 3. 세션 종료 시: 강제 저장
 * 4. 네트워크 오류 시: 재시도 로직
 */

interface AutoSaveOptions {
  debounceMs?: number;
  maxRetries?: number;
  retryDelayMs?: number;
  enableBeforeUnload?: boolean;
}

export function useAutoSave(options: AutoSaveOptions = {}) {
  const {
    debounceMs = 3000,
    maxRetries = 3,
    retryDelayMs = 1000,
    enableBeforeUnload = true
  } = options;

  const store = useStoreEditorStore();
  const autoSaveTimerRef = useRef<NodeJS.Timeout | null>(null);
  const retryCountRef = useRef(0);
  const lastSaveAttemptRef = useRef<number>(0);

  // === 저장 로직 ===
  const saveWithRetry = useCallback(async (attempt = 1): Promise<boolean> => {
    try {
      await store.actions.saveChanges();
      retryCountRef.current = 0;
      return true;
    } catch (error) {
      console.error(`Save attempt ${attempt} failed:`, error);
      
      if (attempt < maxRetries) {
        retryCountRef.current = attempt;
        setTimeout(() => {
          saveWithRetry(attempt + 1);
        }, retryDelayMs * attempt); // 지수적 백오프
        return false;
      } else {
        // 최대 재시도 횟수 초과
        console.error('Max save retries exceeded');
        return false;
      }
    }
  }, [store.actions, maxRetries, retryDelayMs]);

  // === 자동 저장 트리거 ===
  const triggerAutoSave = useCallback(() => {
    if (!store.savingState.autoSaveEnabled) return;
    if (store.savingState.pendingChanges === 0) return;
    if (store.savingState.isSaving) return;

    // 기존 타이머 취소
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
    }

    // 디바운싱된 저장
    autoSaveTimerRef.current = setTimeout(() => {
      lastSaveAttemptRef.current = Date.now();
      saveWithRetry();
    }, debounceMs);
  }, [debounceMs, saveWithRetry, store.savingState]);

  // === 수동 저장 ===
  const saveNow = useCallback(async () => {
    // 자동 저장 타이머 취소
    if (autoSaveTimerRef.current) {
      clearTimeout(autoSaveTimerRef.current);
      autoSaveTimerRef.current = null;
    }

    return await saveWithRetry();
  }, [saveWithRetry]);

  // === 변경사항 감지 및 자동 저장 트리거 ===
  useEffect(() => {
    if (store.savingState.pendingChanges > 0) {
      triggerAutoSave();
    }
  }, [store.savingState.pendingChanges, triggerAutoSave]);

  // === 브라우저 종료 시 저장 ===
  useEffect(() => {
    if (!enableBeforeUnload) return;

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      if (store.savingState.pendingChanges > 0) {
        // 동기적 저장 시도 (제한적)
        const message = '저장되지 않은 변경사항이 있습니다. 정말 나가시겠습니까?';
        event.returnValue = message;
        
        // 백그라운드에서 저장 시도
        store.actions.saveChanges().catch(console.error);
        
        return message;
      }
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [store.savingState.pendingChanges, store.actions.saveChanges, enableBeforeUnload]);

  // === 페이지 가시성 변경 시 저장 ===
  useEffect(() => {
    const handleVisibilityChange = () => {
      if (document.hidden && store.savingState.pendingChanges > 0) {
        // 페이지가 백그라운드로 갈 때 저장
        saveNow();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
  }, [saveNow, store.savingState.pendingChanges]);

  // === 정리 ===
  useEffect(() => {
    return () => {
      if (autoSaveTimerRef.current) {
        clearTimeout(autoSaveTimerRef.current);
      }
    };
  }, []);

  return {
    saveNow,
    isAutoSaveEnabled: store.savingState.autoSaveEnabled,
    isSaving: store.savingState.isSaving,
    lastSaved: store.savingState.lastSaved,
    pendingChanges: store.savingState.pendingChanges,
    lastError: store.savingState.lastError,
    retryCount: retryCountRef.current,
    timeSinceLastSave: store.savingState.lastSaved 
      ? Date.now() - store.savingState.lastSaved 
      : null,
    
    // 설정 제어
    enableAutoSave: store.actions.enableAutoSave,
    setAutoSaveInterval: store.actions.setAutoSaveInterval
  };
}

/**
 * 저장 상태 표시 컴포넌트를 위한 훅
 */
export function useSaveStatus() {
  const { savingState } = useStoreEditorStore();
  
  const getSaveStatusText = useCallback(() => {
    if (savingState.isSaving) {
      return '저장 중...';
    }
    
    if (savingState.lastError) {
      return `저장 실패: ${savingState.lastError}`;
    }
    
    if (savingState.pendingChanges > 0) {
      return `${savingState.pendingChanges}개 변경사항 대기 중`;
    }
    
    if (savingState.lastSaved) {
      const elapsed = Date.now() - savingState.lastSaved;
      if (elapsed < 60000) { // 1분 이내
        return '방금 저장됨';
      } else if (elapsed < 3600000) { // 1시간 이내
        const minutes = Math.floor(elapsed / 60000);
        return `${minutes}분 전 저장됨`;
      } else {
        const hours = Math.floor(elapsed / 3600000);
        return `${hours}시간 전 저장됨`;
      }
    }
    
    return '저장된 적 없음';
  }, [savingState]);
  
  const getSaveStatusIcon = useCallback(() => {
    if (savingState.isSaving) return '🔄';
    if (savingState.lastError) return '❌';
    if (savingState.pendingChanges > 0) return '⚠️';
    return '✅';
  }, [savingState]);
  
  const getSaveStatusColor = useCallback(() => {
    if (savingState.isSaving) return 'text-blue-600';
    if (savingState.lastError) return 'text-red-600';
    if (savingState.pendingChanges > 0) return 'text-orange-600';
    return 'text-green-600';
  }, [savingState]);
  
  return {
    statusText: getSaveStatusText(),
    statusIcon: getSaveStatusIcon(),
    statusColor: getSaveStatusColor(),
    showWarning: savingState.pendingChanges > 0 || !!savingState.lastError
  };
}

/**
 * 저장 단축키 관리 훅
 */
export function useSaveShortcuts() {
  const { saveNow } = useAutoSave();
  
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Ctrl+S 또는 Cmd+S
      if ((event.ctrlKey || event.metaKey) && event.key === 's') {
        event.preventDefault();
        saveNow();
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [saveNow]);
} 