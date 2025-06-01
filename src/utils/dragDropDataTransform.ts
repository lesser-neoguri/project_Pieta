import { StoreBlock } from '@/types/blockTypes';
import { LegacyRowLayout, mapBlockToLegacy } from './legacyDataMapping';

/**
 * 드래그 앤 드롭 후 row_layouts 데이터 구조 업데이트
 * 
 * 주요 변경사항:
 * 1. position 필드 재정렬
 * 2. 기존 시스템과의 호환성 유지
 * 3. 트랜잭션 로그 생성
 */

interface UpdateRowLayoutsParams {
  oldBlocks: StoreBlock[];
  newBlocks: StoreBlock[];
  sourceIndex: number;
  destinationIndex: number;
  storeId: string;
}

interface UpdateResult {
  updatedRowLayouts: LegacyRowLayout[];
  changeLog: ChangeLogEntry[];
  affectedPositions: number[];
}

interface ChangeLogEntry {
  blockId: string;
  blockType: string;
  action: 'moved' | 'position_updated';
  oldPosition: number;
  newPosition: number;
  timestamp: string;
}

/**
 * 블록 순서 변경 시 row_layouts 업데이트
 */
export function updateRowLayoutsAfterReorder(params: UpdateRowLayoutsParams): UpdateResult {
  const { oldBlocks, newBlocks, sourceIndex, destinationIndex, storeId } = params;
  
  // 변경 로그 초기화
  const changeLog: ChangeLogEntry[] = [];
  const affectedPositions: number[] = [];
  
  // 새로운 블록 배열을 legacy 형식으로 변환
  const updatedRowLayouts: LegacyRowLayout[] = newBlocks.map((block, index) => {
    const oldBlock = oldBlocks.find(old => old.id === block.id);
    const oldPosition = oldBlock?.position ?? -1;
    
    // 위치가 변경된 블록들 기록
    if (oldPosition !== index) {
      changeLog.push({
        blockId: block.id,
        blockType: block.type,
        action: oldPosition !== sourceIndex ? 'position_updated' : 'moved',
        oldPosition,
        newPosition: index,
        timestamp: new Date().toISOString()
      });
      
      affectedPositions.push(index);
    }
    
    // 기존 legacy 시스템 형식으로 변환
    const legacyLayout = mapBlockToLegacy(block);
    
    return {
      ...legacyLayout,
      position: index, // 명시적으로 position 설정
      store_id: storeId,
      updated_at: new Date().toISOString()
    };
  });
  
  return {
    updatedRowLayouts,
    changeLog,
    affectedPositions
  };
}

/**
 * 데이터베이스 업데이트를 위한 SQL 쿼리 생성
 */
export function generateUpdateQueries(
  storeId: string, 
  updatedLayouts: LegacyRowLayout[],
  changeLog: ChangeLogEntry[]
): {
  updateQueries: string[];
  logQuery: string;
} {
  // 각 블록의 position 업데이트 쿼리
  const updateQueries = updatedLayouts.map((layout, index) => {
    const setClause = Object.entries(layout)
      .filter(([key]) => key !== 'store_id') // store_id는 WHERE 조건에 사용
      .map(([key, value]) => {
        if (value === null || value === undefined) {
          return `${key} = NULL`;
        }
        if (typeof value === 'string') {
          return `${key} = '${value.replace(/'/g, "''")}'`; // SQL 이스케이프
        }
        if (typeof value === 'boolean') {
          return `${key} = ${value}`;
        }
        if (Array.isArray(value)) {
          return `${key} = '${JSON.stringify(value).replace(/'/g, "''")}'`;
        }
        return `${key} = ${value}`;
      })
      .join(', ');
    
    return `
      UPDATE store_row_layouts 
      SET ${setClause}
      WHERE store_id = '${storeId}' AND position = ${index};
    `;
  });
  
  // 변경 로그 삽입 쿼리
  const logQuery = `
    INSERT INTO store_block_change_logs (store_id, block_id, block_type, action, old_position, new_position, timestamp, created_at)
    VALUES ${changeLog.map(log => 
      `('${storeId}', '${log.blockId}', '${log.blockType}', '${log.action}', ${log.oldPosition}, ${log.newPosition}, '${log.timestamp}', NOW())`
    ).join(', ')};
  `;
  
  return {
    updateQueries,
    logQuery
  };
}

/**
 * 최적화된 배치 업데이트 (대용량 데이터 처리용)
 */
export function generateBatchUpdateQuery(
  storeId: string,
  affectedPositions: number[],
  updatedLayouts: LegacyRowLayout[]
): string {
  if (affectedPositions.length === 0) return '';
  
  // CASE WHEN을 사용한 배치 업데이트
  const positionUpdates = affectedPositions.map(pos => {
    const layout = updatedLayouts[pos];
    return `WHEN position = ${pos} THEN ${JSON.stringify(layout)}`;
  }).join(' ');
  
  return `
    UPDATE store_row_layouts 
    SET 
      layout_data = CASE position ${positionUpdates} ELSE layout_data END,
      updated_at = NOW()
    WHERE store_id = '${storeId}' 
      AND position IN (${affectedPositions.join(', ')});
  `;
}

/**
 * 실시간 동기화를 위한 이벤트 생성
 */
export function createReorderEvent(params: {
  storeId: string;
  userId: string;
  sourceIndex: number;
  destinationIndex: number;
  affectedBlocks: string[];
  timestamp: string;
}) {
  return {
    type: 'STORE_BLOCKS_REORDERED',
    payload: {
      storeId: params.storeId,
      userId: params.userId,
      reorderOperation: {
        sourceIndex: params.sourceIndex,
        destinationIndex: params.destinationIndex,
        affectedBlockIds: params.affectedBlocks,
        timestamp: params.timestamp
      }
    },
    metadata: {
      version: '1.0',
      source: 'inline-editor',
      requiresRefresh: false // 클라이언트 상태만 업데이트
    }
  };
}

/**
 * 드래그 앤 드롭 성능 최적화를 위한 디바운싱
 */
export class DragDropPersistence {
  private updateQueue: Array<{
    storeId: string;
    blocks: StoreBlock[];
    timestamp: number;
  }> = [];
  
  private isProcessing = false;
  private readonly DEBOUNCE_MS = 1000; // 1초 디바운싱
  
  /**
   * 변경사항을 큐에 추가 (즉시 저장하지 않음)
   */
  queueUpdate(storeId: string, blocks: StoreBlock[]) {
    // 같은 스토어의 기존 업데이트는 덮어쓰기
    const existingIndex = this.updateQueue.findIndex(item => item.storeId === storeId);
    
    const updateItem = {
      storeId,
      blocks: [...blocks], // 깊은 복사로 불변성 보장
      timestamp: Date.now()
    };
    
    if (existingIndex >= 0) {
      this.updateQueue[existingIndex] = updateItem;
    } else {
      this.updateQueue.push(updateItem);
    }
    
    // 디바운싱된 저장 트리거
    this.scheduleFlush();
  }
  
  /**
   * 디바운싱된 저장 실행
   */
  private scheduleFlush() {
    if (this.isProcessing) return;
    
    setTimeout(() => {
      this.flushUpdates();
    }, this.DEBOUNCE_MS);
  }
  
  /**
   * 큐에 있는 모든 업데이트를 처리
   */
  private async flushUpdates() {
    if (this.updateQueue.length === 0 || this.isProcessing) return;
    
    this.isProcessing = true;
    const updates = [...this.updateQueue];
    this.updateQueue = [];
    
    try {
      // 병렬로 모든 업데이트 처리
      await Promise.allSettled(
        updates.map(update => this.persistUpdate(update))
      );
    } catch (error) {
      console.error('Failed to persist drag-drop updates:', error);
      
      // 실패한 업데이트를 큐에 다시 추가
      this.updateQueue.unshift(...updates);
    } finally {
      this.isProcessing = false;
      
      // 큐에 새로운 업데이트가 있으면 다시 스케줄링
      if (this.updateQueue.length > 0) {
        this.scheduleFlush();
      }
    }
  }
  
  /**
   * 개별 업데이트 저장
   */
  private async persistUpdate(update: { storeId: string; blocks: StoreBlock[]; timestamp: number }) {
    // 실제 API 호출 로직
    const response = await fetch(`/api/stores/${update.storeId}/layouts`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        blocks: update.blocks,
        timestamp: update.timestamp,
        source: 'drag-drop'
      })
    });
    
    if (!response.ok) {
      throw new Error(`Failed to update store ${update.storeId}: ${response.statusText}`);
    }
    
    return response.json();
  }
  
  /**
   * 즉시 모든 변경사항 저장 (컴포넌트 언마운트 시 사용)
   */
  async forceFlush() {
    if (this.updateQueue.length === 0) return;
    
    await this.flushUpdates();
  }
}

// 싱글톤 인스턴스
export const dragDropPersistence = new DragDropPersistence(); 