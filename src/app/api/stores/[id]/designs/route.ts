import { NextRequest, NextResponse } from 'next/server';
import { StoreBlock } from '@/types/blockTypes';
import { mapBlockToLegacy, mapLegacyToBlock } from '@/utils/legacyDataMapping';

/**
 * 스토어 디자인 데이터 관리 API
 * 
 * GET: 현재 디자인 로드
 * PUT: 디자인 저장 (자동/수동 저장)
 * POST: 새 버전 생성
 */

interface SaveRequest {
  blocks: StoreBlock[];
  changes?: Array<{
    id: string;
    blockId: string;
    action: 'create' | 'update' | 'delete' | 'reorder';
    timestamp: number;
    oldValue?: any;
    newValue?: any;
  }>;
  timestamp: number;
  source?: 'auto-save' | 'manual-save' | 'drag-drop' | 'inline-edit';
  sessionId?: string;
  conflictResolution?: 'auto-merge' | 'manual';
}

interface LoadResponse {
  blocks: StoreBlock[];
  version: number;
  lastModified: string;
  metadata: {
    totalBlocks: number;
    hasUnsavedChanges: boolean;
    collaborators: Array<{
      userId: string;
      lastActivity: string;
      isActive: boolean;
    }>;
  };
}

// GET /api/stores/[id]/designs - 디자인 데이터 로드
export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  
  try {
    // 1. row_layouts에서 기존 데이터 로드
    const { data: rowLayouts, error: layoutError } = await supabase
      .from('store_row_layouts')
      .select('*')
      .eq('store_id', storeId)
      .order('position');
    
    if (layoutError) {
      throw new Error(`Failed to load layouts: ${layoutError.message}`);
    }
    
    // 2. legacy 형식을 새 블록 형식으로 변환
    const blocks: StoreBlock[] = rowLayouts?.map(layout => 
      mapLegacyToBlock(layout)
    ) || [];
    
    // 3. 현재 편집 중인 사용자들 조회
    const { data: activeSessions } = await supabase
      .from('store_editing_sessions')
      .select('user_id, last_activity, session_id')
      .eq('store_id', storeId)
      .eq('is_active', true)
      .gt('last_activity', new Date(Date.now() - 5 * 60 * 1000).toISOString()); // 5분 이내
    
    // 4. 버전 정보 조회
    const { data: versionInfo } = await supabase
      .from('store_designs')
      .select('version, updated_at')
      .eq('id', storeId)
      .single();
    
    const response: LoadResponse = {
      blocks,
      version: versionInfo?.version || Date.now(),
      lastModified: versionInfo?.updated_at || new Date().toISOString(),
      metadata: {
        totalBlocks: blocks.length,
        hasUnsavedChanges: false,
        collaborators: activeSessions?.map(session => ({
          userId: session.user_id,
          lastActivity: session.last_activity,
          isActive: true
        })) || []
      }
    };
    
    return NextResponse.json(response);
    
  } catch (error) {
    console.error('GET /api/stores/[id]/designs error:', error);
    return NextResponse.json(
      { error: 'Failed to load store design' },
      { status: 500 }
    );
  }
}

// PUT /api/stores/[id]/designs - 디자인 저장
export async function PUT(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  
  try {
    const body: SaveRequest = await request.json();
    const { 
      blocks, 
      changes = [], 
      timestamp, 
      source = 'manual-save',
      sessionId,
      conflictResolution = 'auto-merge'
    } = body;
    
    // 1. 데이터 무결성 검증
    const validation = validateBlocks(blocks);
    if (!validation.isValid) {
      return NextResponse.json(
        { error: 'Invalid block data', details: validation.errors },
        { status: 400 }
      );
    }
    
    // 2. 낙관적 동시성 제어 - 현재 버전 확인
    const { data: currentVersion } = await supabase
      .from('store_designs')
      .select('version, updated_at')
      .eq('id', storeId)
      .single();
    
    // 3. 트랜잭션으로 저장 처리
    const { error: transactionError } = await supabase.rpc('save_store_design', {
      p_store_id: storeId,
      p_blocks: JSON.stringify(blocks),
      p_changes: JSON.stringify(changes),
      p_source: source,
      p_session_id: sessionId,
      p_current_version: currentVersion?.version,
      p_conflict_resolution: conflictResolution
    });
    
    if (transactionError) {
      // 버전 충돌 감지
      if (transactionError.code === 'VERSION_CONFLICT') {
        return NextResponse.json(
          { 
            error: 'Version conflict detected',
            currentVersion: currentVersion?.version,
            requiresResolution: true
          },
          { status: 409 }
        );
      }
      
      throw new Error(`Transaction failed: ${transactionError.message}`);
    }
    
    // 4. 성공 응답
    const newVersion = Date.now();
    
    // 5. 실시간 동기화를 위한 브로드캐스트
    await broadcastToCollaborators(storeId, {
      type: 'DESIGN_UPDATED',
      version: newVersion,
      changes: changes.length,
      source,
      timestamp
    });
    
    return NextResponse.json({
      success: true,
      version: newVersion,
      blocksCount: blocks.length,
      changesApplied: changes.length,
      source
    });
    
  } catch (error) {
    console.error('PUT /api/stores/[id]/designs error:', error);
    return NextResponse.json(
      { error: 'Failed to save store design' },
      { status: 500 }
    );
  }
}

// POST /api/stores/[id]/designs/backup - 백업 생성
export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const storeId = params.id;
  
  try {
    const { reason = 'manual', sessionId } = await request.json();
    
    // 현재 상태를 백업으로 저장
    const { data: currentBlocks } = await supabase
      .from('store_row_layouts')
      .select('*')
      .eq('store_id', storeId)
      .order('position');
    
    const backupId = `backup-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    
    const { error } = await supabase
      .from('store_design_backups')
      .insert({
        id: backupId,
        store_id: storeId,
        backup_data: JSON.stringify(currentBlocks),
        reason,
        session_id: sessionId,
        created_at: new Date().toISOString()
      });
    
    if (error) throw error;
    
    return NextResponse.json({
      backupId,
      timestamp: Date.now(),
      blocksCount: currentBlocks?.length || 0
    });
    
  } catch (error) {
    console.error('POST /api/stores/[id]/designs/backup error:', error);
    return NextResponse.json(
      { error: 'Failed to create backup' },
      { status: 500 }
    );
  }
}

// === 헬퍼 함수들 ===

function validateBlocks(blocks: StoreBlock[]): {
  isValid: boolean;
  errors: string[];
} {
  const errors: string[] = [];
  
  // 위치 중복 검사
  const positions = blocks.map(b => b.position);
  const duplicatePositions = positions.filter((pos, index) => 
    positions.indexOf(pos) !== index
  );
  
  if (duplicatePositions.length > 0) {
    errors.push(`Duplicate positions: ${duplicatePositions.join(', ')}`);
  }
  
  // ID 유효성 검사
  const invalidIds = blocks.filter(b => !b.id || typeof b.id !== 'string');
  if (invalidIds.length > 0) {
    errors.push(`Invalid block IDs found`);
  }
  
  // 타입 유효성 검사
  const validTypes = ['text', 'grid', 'featured', 'banner', 'masonry', 'list'];
  const invalidTypes = blocks.filter(b => !validTypes.includes(b.type));
  if (invalidTypes.length > 0) {
    errors.push(`Invalid block types found`);
  }
  
  return {
    isValid: errors.length === 0,
    errors
  };
}

async function broadcastToCollaborators(
  storeId: string, 
  message: any
) {
  try {
    // WebSocket이나 Server-Sent Events로 실시간 동기화
    // 현재는 로깅만 수행
    console.log(`Broadcasting to store ${storeId}:`, message);
    
    // 실제 구현에서는 WebSocket 서버나 Pusher 등 사용
    /*
    await pusher.trigger(`store-${storeId}`, 'design-update', message);
    */
    
  } catch (error) {
    console.error('Failed to broadcast message:', error);
  }
}

// Supabase 클라이언트 (실제 구현에서는 적절한 설정 필요)
const supabase = {
  from: (table: string) => ({
    select: (columns: string) => ({
      eq: (column: string, value: any) => ({
        order: (column: string) => ({
          then: () => Promise.resolve({ data: [], error: null })
        }),
        single: () => Promise.resolve({ data: null, error: null }),
        gt: (column: string, value: any) => Promise.resolve({ data: [], error: null })
      }),
      single: () => Promise.resolve({ data: null, error: null })
    }),
    insert: (data: any) => Promise.resolve({ error: null }),
    update: (data: any) => ({
      eq: (column: string, value: any) => Promise.resolve({ error: null })
    })
  }),
  rpc: (functionName: string, params: any) => Promise.resolve({ error: null })
}; 