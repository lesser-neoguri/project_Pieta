import { StoreBlock } from '@/types/blockTypes';

/**
 * 충돌 해결 및 데이터 보호 서비스
 * 
 * 전략:
 * 1. 낙관적 업데이트 + 버전 관리
 * 2. 실시간 협업 감지
 * 3. 3-way 머지 알고리즘
 * 4. 백업 및 복구 시스템
 */

interface StoreVersion {
  version: number;
  timestamp: number;
  blocks: StoreBlock[];
  author: string;
  changeHash: string;
}

interface ConflictInfo {
  type: 'version_mismatch' | 'concurrent_edit' | 'data_corruption';
  localVersion: number;
  remoteVersion: number;
  conflictingBlocks: string[];
  resolution: ConflictResolution | null;
}

interface ConflictResolution {
  strategy: 'keep_local' | 'keep_remote' | 'merge' | 'manual';
  mergedBlocks?: StoreBlock[];
  userChoices?: Record<string, 'local' | 'remote'>;
}

interface BackupEntry {
  id: string;
  storeId: string;
  timestamp: number;
  blocks: StoreBlock[];
  reason: 'auto_backup' | 'before_merge' | 'user_backup';
  metadata: {
    userAgent: string;
    sessionId: string;
    conflictResolved?: boolean;
  };
}

export class ConflictResolutionService {
  private backupStorage: BackupEntry[] = [];
  private maxBackups = 10;
  private collaboratorCheckInterval = 30000; // 30초

  /**
   * 1. 버전 충돌 감지
   */
  detectVersionConflict(
    localVersion: number,
    localBlocks: StoreBlock[],
    remoteVersion: number,
    remoteBlocks: StoreBlock[]
  ): ConflictInfo | null {
    if (localVersion === remoteVersion) {
      return null; // 충돌 없음
    }

    // 충돌하는 블록들 식별
    const conflictingBlocks = this.findConflictingBlocks(localBlocks, remoteBlocks);
    
    if (conflictingBlocks.length === 0) {
      return null; // 다른 영역의 변경이므로 충돌 없음
    }

    return {
      type: 'version_mismatch',
      localVersion,
      remoteVersion,
      conflictingBlocks,
      resolution: null
    };
  }

  /**
   * 2. 충돌하는 블록 식별
   */
  private findConflictingBlocks(
    localBlocks: StoreBlock[],
    remoteBlocks: StoreBlock[]
  ): string[] {
    const conflicts: string[] = [];
    const localMap = new Map(localBlocks.map(b => [b.id, b]));
    const remoteMap = new Map(remoteBlocks.map(b => [b.id, b]));

    // 양쪽에 존재하는 블록들 중 내용이 다른 것들
    for (const [blockId, localBlock] of localMap) {
      const remoteBlock = remoteMap.get(blockId);
      if (remoteBlock && !this.areBlocksEqual(localBlock, remoteBlock)) {
        conflicts.push(blockId);
      }
    }

    return conflicts;
  }

  /**
   * 3. 블록 동등성 검사 (깊은 비교)
   */
  private areBlocksEqual(block1: StoreBlock, block2: StoreBlock): boolean {
    return JSON.stringify(this.normalizeBlock(block1)) === 
           JSON.stringify(this.normalizeBlock(block2));
  }

  private normalizeBlock(block: StoreBlock): Partial<StoreBlock> {
    // 타임스탬프 등 메타데이터 제외하고 비교
    const { id, type, position, data } = block;
    return { id, type, position, data };
  }

  /**
   * 4. 3-Way 머지 알고리즘
   */
  async performThreeWayMerge(
    baseBlocks: StoreBlock[],
    localBlocks: StoreBlock[],
    remoteBlocks: StoreBlock[]
  ): Promise<StoreBlock[]> {
    const mergedBlocks: StoreBlock[] = [];
    const baseMap = new Map(baseBlocks.map(b => [b.id, b]));
    const localMap = new Map(localBlocks.map(b => [b.id, b]));
    const remoteMap = new Map(remoteBlocks.map(b => [b.id, b]));

    // 모든 블록 ID 수집
    const allBlockIds = new Set([
      ...baseMap.keys(),
      ...localMap.keys(),
      ...remoteMap.keys()
    ]);

    for (const blockId of allBlockIds) {
      const baseBlock = baseMap.get(blockId);
      const localBlock = localMap.get(blockId);
      const remoteBlock = remoteMap.get(blockId);

      const mergedBlock = this.mergeBlock(baseBlock, localBlock, remoteBlock);
      if (mergedBlock) {
        mergedBlocks.push(mergedBlock);
      }
    }

    // position 기준으로 정렬
    return mergedBlocks.sort((a, b) => a.position - b.position);
  }

  /**
   * 5. 개별 블록 머지 로직
   */
  private mergeBlock(
    baseBlock: StoreBlock | undefined,
    localBlock: StoreBlock | undefined,
    remoteBlock: StoreBlock | undefined
  ): StoreBlock | null {
    // 케이스 1: 새로 추가된 블록
    if (!baseBlock) {
      if (localBlock && remoteBlock) {
        // 양쪽에서 동시에 추가됨 - 충돌
        return this.resolveAddConflict(localBlock, remoteBlock);
      }
      return localBlock || remoteBlock || null;
    }

    // 케이스 2: 삭제된 블록
    if (!localBlock && !remoteBlock) {
      return null; // 양쪽에서 삭제됨
    }
    if (!localBlock) {
      return remoteBlock && this.areBlocksEqual(baseBlock, remoteBlock) 
        ? null  // 로컬에서만 삭제됨
        : remoteBlock; // 리모트에서 수정됨
    }
    if (!remoteBlock) {
      return localBlock && this.areBlocksEqual(baseBlock, localBlock)
        ? null  // 리모트에서만 삭제됨
        : localBlock; // 로컬에서 수정됨
    }

    // 케이스 3: 양쪽에서 수정됨
    return this.resolveEditConflict(baseBlock, localBlock, remoteBlock);
  }

  /**
   * 6. 추가 충돌 해결
   */
  private resolveAddConflict(
    localBlock: StoreBlock,
    remoteBlock: StoreBlock
  ): StoreBlock {
    // 타임스탬프가 더 최근인 것을 우선
    if (localBlock.position !== remoteBlock.position) {
      return localBlock.position < remoteBlock.position ? localBlock : remoteBlock;
    }
    
    // 같은 위치라면 ID 기준으로 결정론적 선택
    return localBlock.id < remoteBlock.id ? localBlock : remoteBlock;
  }

  /**
   * 7. 편집 충돌 해결
   */
  private resolveEditConflict(
    baseBlock: StoreBlock,
    localBlock: StoreBlock,
    remoteBlock: StoreBlock
  ): StoreBlock {
    // 양쪽 모두 베이스와 동일하면 충돌 없음
    if (this.areBlocksEqual(baseBlock, localBlock)) return remoteBlock;
    if (this.areBlocksEqual(baseBlock, remoteBlock)) return localBlock;

    // 필드별 머지
    const mergedData = this.mergeBlockData(
      baseBlock.data,
      localBlock.data,
      remoteBlock.data
    );

    return {
      ...localBlock,
      data: mergedData,
      // 메타데이터는 더 최근 것 사용
      updated_at: Math.max(
        new Date(localBlock.updated_at || 0).getTime(),
        new Date(remoteBlock.updated_at || 0).getTime()
      ).toString()
    };
  }

  /**
   * 8. 블록 데이터 필드별 머지
   */
  private mergeBlockData(
    baseData: any,
    localData: any,
    remoteData: any
  ): any {
    const merged = { ...baseData };

    // 각 필드에 대해 3-way 머지 수행
    const allKeys = new Set([
      ...Object.keys(baseData || {}),
      ...Object.keys(localData || {}),
      ...Object.keys(remoteData || {})
    ]);

    for (const key of allKeys) {
      const baseValue = baseData?.[key];
      const localValue = localData?.[key];
      const remoteValue = remoteData?.[key];

      if (baseValue === localValue) {
        merged[key] = remoteValue; // 로컬 변경 없음, 리모트 사용
      } else if (baseValue === remoteValue) {
        merged[key] = localValue; // 리모트 변경 없음, 로컬 사용
      } else if (localValue === remoteValue) {
        merged[key] = localValue; // 양쪽이 같은 값으로 변경
      } else {
        // 실제 충돌 - 규칙 기반 해결
        merged[key] = this.resolveFieldConflict(key, baseValue, localValue, remoteValue);
      }
    }

    return merged;
  }

  /**
   * 9. 필드 수준 충돌 해결
   */
  private resolveFieldConflict(
    fieldName: string,
    baseValue: any,
    localValue: any,
    remoteValue: any
  ): any {
    // 문자열 필드: 더 긴 것 선택 (보통 더 많은 정보 포함)
    if (typeof localValue === 'string' && typeof remoteValue === 'string') {
      return localValue.length >= remoteValue.length ? localValue : remoteValue;
    }

    // 숫자 필드: 기본값이 아닌 것 우선
    if (typeof localValue === 'number' && typeof remoteValue === 'number') {
      if (localValue === baseValue) return remoteValue;
      if (remoteValue === baseValue) return localValue;
      return Math.max(localValue, remoteValue); // 더 큰 값 선택
    }

    // 배열 필드: 병합
    if (Array.isArray(localValue) && Array.isArray(remoteValue)) {
      return [...new Set([...localValue, ...remoteValue])];
    }

    // 객체 필드: 재귀적 머지
    if (typeof localValue === 'object' && typeof remoteValue === 'object') {
      return this.mergeBlockData(baseValue, localValue, remoteValue);
    }

    // 기본값: 더 최근 타임스탬프 기준 (여기서는 로컬 우선)
    return localValue;
  }

  /**
   * 10. 백업 생성
   */
  createBackup(
    storeId: string,
    blocks: StoreBlock[],
    reason: BackupEntry['reason'],
    sessionId: string
  ): string {
    const backup: BackupEntry = {
      id: `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
      storeId,
      timestamp: Date.now(),
      blocks: JSON.parse(JSON.stringify(blocks)), // 깊은 복사
      reason,
      metadata: {
        userAgent: navigator.userAgent,
        sessionId
      }
    };

    this.backupStorage.push(backup);

    // 백업 개수 제한
    if (this.backupStorage.length > this.maxBackups) {
      this.backupStorage.shift();
    }

    return backup.id;
  }

  /**
   * 11. 백업에서 복구
   */
  restoreFromBackup(backupId: string): StoreBlock[] | null {
    const backup = this.backupStorage.find(b => b.id === backupId);
    return backup ? JSON.parse(JSON.stringify(backup.blocks)) : null;
  }

  /**
   * 12. 백업 목록 조회
   */
  getBackupHistory(storeId: string): BackupEntry[] {
    return this.backupStorage
      .filter(b => b.storeId === storeId)
      .sort((a, b) => b.timestamp - a.timestamp);
  }

  /**
   * 13. 협업자 활동 감지
   */
  async detectConcurrentEditing(
    storeId: string,
    currentUserId: string
  ): Promise<boolean> {
    try {
      const response = await fetch(`/api/stores/${storeId}/active-editors`);
      const { activeEditors } = await response.json();
      
      return activeEditors.some((editor: any) => 
        editor.userId !== currentUserId && 
        Date.now() - new Date(editor.lastActivity).getTime() < 60000 // 1분 이내 활동
      );
    } catch (error) {
      console.error('Failed to check concurrent editing:', error);
      return false;
    }
  }

  /**
   * 14. 데이터 무결성 검증
   */
  validateDataIntegrity(blocks: StoreBlock[]): {
    isValid: boolean;
    errors: string[];
    warnings: string[];
  } {
    const errors: string[] = [];
    const warnings: string[] = [];

    // 위치 중복 검사
    const positions = blocks.map(b => b.position);
    const duplicatePositions = positions.filter((pos, index) => 
      positions.indexOf(pos) !== index
    );
    
    if (duplicatePositions.length > 0) {
      errors.push(`중복된 position 값: ${duplicatePositions.join(', ')}`);
    }

    // ID 중복 검사
    const ids = blocks.map(b => b.id);
    const duplicateIds = ids.filter((id, index) => ids.indexOf(id) !== index);
    
    if (duplicateIds.length > 0) {
      errors.push(`중복된 블록 ID: ${duplicateIds.join(', ')}`);
    }

    // 위치 연속성 검사
    const sortedPositions = [...positions].sort((a, b) => a - b);
    for (let i = 0; i < sortedPositions.length; i++) {
      if (sortedPositions[i] !== i) {
        warnings.push(`위치 값이 연속적이지 않음: ${sortedPositions.join(', ')}`);
        break;
      }
    }

    // 블록 타입 검증
    for (const block of blocks) {
      if (!block.type || !block.id) {
        errors.push(`필수 필드 누락: 블록 ${block.id || 'unknown'}`);
      }
    }

    return {
      isValid: errors.length === 0,
      errors,
      warnings
    };
  }

  /**
   * 15. 응급 복구 모드
   */
  emergencyRecovery(corruptedBlocks: StoreBlock[]): StoreBlock[] {
    console.warn('Emergency recovery mode activated');
    
    // 기본 데이터 구조 복구
    const recoveredBlocks = corruptedBlocks
      .filter(block => block && block.id) // null/undefined 제거
      .map((block, index) => ({
        ...block,
        position: index, // 위치 재정렬
        updated_at: block.updated_at || new Date().toISOString()
      }));

    // 무결성 재검증
    const validation = this.validateDataIntegrity(recoveredBlocks);
    if (!validation.isValid) {
      console.error('Recovery failed:', validation.errors);
      return []; // 완전 실패 시 빈 배열 반환
    }

    return recoveredBlocks;
  }
}

// 싱글톤 인스턴스
export const conflictResolutionService = new ConflictResolutionService(); 