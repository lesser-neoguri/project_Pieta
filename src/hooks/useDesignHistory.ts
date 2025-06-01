import { useState, useCallback, useRef } from 'react';

interface HistoryState<T> {
  past: T[];
  present: T;
  future: T[];
}

interface UseDesignHistoryReturn<T> {
  state: T;
  setState: (newState: T) => void;
  undo: () => void;
  redo: () => void;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
  saveCheckpoint: (label?: string) => void;
  getHistorySize: () => number;
}

export function useDesignHistory<T>(
  initialState: T,
  maxHistorySize: number = 50
): UseDesignHistoryReturn<T> {
  const [history, setHistory] = useState<HistoryState<T>>({
    past: [],
    present: initialState,
    future: []
  });

  const checkpointLabels = useRef<Map<number, string>>(new Map());

  const setState = useCallback((newState: T) => {
    setHistory(current => {
      const newPast = [...current.past, current.present];
      
      // 히스토리 크기 제한
      if (newPast.length > maxHistorySize) {
        newPast.shift();
      }

      return {
        past: newPast,
        present: newState,
        future: [] // 새로운 변경이 있으면 future 초기화
      };
    });
  }, [maxHistorySize]);

  const undo = useCallback(() => {
    setHistory(current => {
      if (current.past.length === 0) return current;

      const previous = current.past[current.past.length - 1];
      const newPast = current.past.slice(0, current.past.length - 1);

      return {
        past: newPast,
        present: previous,
        future: [current.present, ...current.future]
      };
    });
  }, []);

  const redo = useCallback(() => {
    setHistory(current => {
      if (current.future.length === 0) return current;

      const next = current.future[0];
      const newFuture = current.future.slice(1);

      return {
        past: [...current.past, current.present],
        present: next,
        future: newFuture
      };
    });
  }, []);

  const clearHistory = useCallback(() => {
    setHistory(current => ({
      past: [],
      present: current.present,
      future: []
    }));
    checkpointLabels.current.clear();
  }, []);

  const saveCheckpoint = useCallback((label?: string) => {
    if (label) {
      checkpointLabels.current.set(history.past.length, label);
    }
  }, [history.past.length]);

  const getHistorySize = useCallback(() => {
    return history.past.length + history.future.length + 1;
  }, [history.past.length, history.future.length]);

  return {
    state: history.present,
    setState,
    undo,
    redo,
    canUndo: history.past.length > 0,
    canRedo: history.future.length > 0,
    clearHistory,
    saveCheckpoint,
    getHistorySize
  };
}

// 키보드 단축키 지원을 위한 훅
export function useDesignHistoryKeyboard<T>(
  historyHook: UseDesignHistoryReturn<T>
) {
  const { undo, redo, canUndo, canRedo } = historyHook;

  const handleKeyDown = useCallback((event: KeyboardEvent) => {
    if ((event.ctrlKey || event.metaKey) && event.key === 'z') {
      event.preventDefault();
      if (event.shiftKey && canRedo) {
        redo();
      } else if (canUndo) {
        undo();
      }
    }
  }, [undo, redo, canUndo, canRedo]);

  // 컴포넌트에서 사용할 때 useEffect로 이벤트 리스너 등록
  return { handleKeyDown };
} 