import React, { useState } from 'react';
import { useAutoSave, useSaveStatus, useSaveShortcuts } from '@/hooks/useAutoSave';
import { useStoreEditorStore } from '@/stores/storeEditorStore';

/**
 * 저장 상태 표시 및 제어 바
 * 
 * 기능:
 * 1. 실시간 저장 상태 표시
 * 2. 수동 저장 버튼
 * 3. 자동 저장 설정
 * 4. 충돌 경고 및 해결
 * 5. 백업 복구 인터페이스
 */

interface SaveStatusBarProps {
  className?: string;
  position?: 'top' | 'bottom' | 'floating';
  showAdvancedControls?: boolean;
}

export const SaveStatusBar: React.FC<SaveStatusBarProps> = ({
  className = '',
  position = 'bottom',
  showAdvancedControls = false
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showConflictDialog, setShowConflictDialog] = useState(false);
  
  const {
    saveNow,
    isAutoSaveEnabled,
    isSaving,
    lastSaved,
    pendingChanges,
    lastError,
    retryCount,
    timeSinceLastSave,
    enableAutoSave,
    setAutoSaveInterval
  } = useAutoSave();
  
  const {
    statusText,
    statusIcon,
    statusColor,
    showWarning
  } = useSaveStatus();
  
  // 저장 단축키 활성화
  useSaveShortcuts();
  
  const store = useStoreEditorStore();

  const getPositionClasses = () => {
    switch (position) {
      case 'top':
        return 'fixed top-0 left-0 right-0 z-40';
      case 'floating':
        return 'fixed bottom-4 right-4 z-40 rounded-lg shadow-lg max-w-sm';
      default:
        return 'fixed bottom-0 left-0 right-0 z-40';
    }
  };

  const handleManualSave = async () => {
    try {
      await saveNow();
    } catch (error) {
      console.error('Manual save failed:', error);
    }
  };

  const handleToggleAutoSave = () => {
    enableAutoSave(!isAutoSaveEnabled);
  };

  const formatLastSaved = () => {
    if (!lastSaved) return '저장된 적 없음';
    
    const now = Date.now();
    const diff = now - lastSaved;
    
    if (diff < 60000) return '방금 전';
    if (diff < 3600000) return `${Math.floor(diff / 60000)}분 전`;
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}시간 전`;
    return new Date(lastSaved).toLocaleDateString();
  };

  return (
    <>
      <div className={`
        ${getPositionClasses()}
        bg-white border-t border-gray-200 px-4 py-2
        ${position === 'floating' ? 'border border-gray-200 bg-white/95 backdrop-blur-sm' : ''}
        ${className}
      `}>
        <div className="flex items-center justify-between max-w-7xl mx-auto">
          {/* 저장 상태 표시 */}
          <div className="flex items-center space-x-3">
            <div className={`flex items-center space-x-2 ${statusColor}`}>
              <span className="text-lg">{statusIcon}</span>
              <span className="text-sm font-medium">{statusText}</span>
            </div>
            
            {/* 재시도 표시 */}
            {retryCount > 0 && (
              <div className="text-xs text-orange-600 bg-orange-50 px-2 py-1 rounded">
                재시도 중 ({retryCount}/3)
              </div>
            )}
            
            {/* 충돌 경고 */}
            {store.otherEditors.length > 0 && (
              <button
                onClick={() => setShowConflictDialog(true)}
                className="text-xs text-red-600 bg-red-50 px-2 py-1 rounded hover:bg-red-100"
              >
                ⚠️ 다른 사용자가 편집 중
              </button>
            )}
          </div>

          {/* 컨트롤 버튼들 */}
          <div className="flex items-center space-x-2">
            {/* 수동 저장 버튼 */}
            <button
              onClick={handleManualSave}
              disabled={isSaving || pendingChanges === 0}
              className={`
                px-3 py-1 text-sm font-medium rounded transition-colors
                ${isSaving 
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed' 
                  : pendingChanges > 0
                    ? 'bg-blue-500 text-white hover:bg-blue-600'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }
              `}
              title="Ctrl+S"
            >
              {isSaving ? '저장 중...' : '저장'}
            </button>

            {/* 자동 저장 토글 */}
            <button
              onClick={handleToggleAutoSave}
              className={`
                px-2 py-1 text-xs rounded transition-colors
                ${isAutoSaveEnabled 
                  ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }
              `}
              title={`자동 저장 ${isAutoSaveEnabled ? '켜짐' : '꺼짐'}`}
            >
              {isAutoSaveEnabled ? '🟢' : '⭕'} 자동
            </button>

            {/* 고급 컨트롤 토글 */}
            {showAdvancedControls && (
              <button
                onClick={() => setIsExpanded(!isExpanded)}
                className="p-1 text-gray-400 hover:text-gray-600"
                title="상세 정보"
              >
                {isExpanded ? '🔽' : '🔼'}
              </button>
            )}
          </div>
        </div>

        {/* 확장된 상세 정보 */}
        {isExpanded && (
          <div className="mt-3 pt-3 border-t border-gray-100">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-xs text-gray-600">
              <div>
                <div className="font-medium text-gray-800">마지막 저장</div>
                <div>{formatLastSaved()}</div>
              </div>
              
              <div>
                <div className="font-medium text-gray-800">대기 중 변경</div>
                <div>{pendingChanges}개</div>
              </div>
              
              <div>
                <div className="font-medium text-gray-800">세션 시간</div>
                <div>
                  {store.editingSession 
                    ? Math.floor((Date.now() - store.editingSession.startTime) / 60000) + '분'
                    : '-'
                  }
                </div>
              </div>
              
              <div>
                <div className="font-medium text-gray-800">현재 버전</div>
                <div>#{store.currentVersion}</div>
              </div>
            </div>
            
            {/* 고급 컨트롤들 */}
            <div className="flex items-center justify-between mt-3">
              <div className="flex items-center space-x-4">
                {/* 자동 저장 간격 설정 */}
                <div className="flex items-center space-x-2">
                  <label className="text-xs text-gray-600">저장 간격:</label>
                  <select
                    value={store.savingState.saveInterval}
                    onChange={(e) => setAutoSaveInterval(Number(e.target.value))}
                    className="text-xs border border-gray-300 rounded px-1 py-0.5"
                  >
                    <option value={1000}>1초</option>
                    <option value={3000}>3초</option>
                    <option value={5000}>5초</option>
                    <option value={10000}>10초</option>
                  </select>
                </div>
                
                {/* 실행취소/다시실행 상태 */}
                <div className="flex items-center space-x-1">
                  <button
                    onClick={store.actions.undo}
                    disabled={!store.canUndo}
                    className="text-xs px-2 py-0.5 bg-gray-100 rounded disabled:opacity-50"
                    title="Ctrl+Z"
                  >
                    ↶ 실행취소
                  </button>
                  <button
                    onClick={store.actions.redo}
                    disabled={!store.canRedo}
                    className="text-xs px-2 py-0.5 bg-gray-100 rounded disabled:opacity-50"
                    title="Ctrl+Y"
                  >
                    ↷ 다시실행
                  </button>
                </div>
              </div>
              
              {/* 백업 관련 */}
              <div className="flex items-center space-x-2">
                <BackupControls />
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 충돌 해결 다이얼로그 */}
      {showConflictDialog && (
        <ConflictResolutionDialog
          onClose={() => setShowConflictDialog(false)}
        />
      )}
    </>
  );
};

// 백업 컨트롤 컴포넌트
const BackupControls: React.FC = () => {
  const [showBackupMenu, setShowBackupMenu] = useState(false);
  
  return (
    <div className="relative">
      <button
        onClick={() => setShowBackupMenu(!showBackupMenu)}
        className="text-xs px-2 py-0.5 bg-gray-100 rounded hover:bg-gray-200"
      >
        💾 백업
      </button>
      
      {showBackupMenu && (
        <div className="absolute right-0 bottom-full mb-2 bg-white border border-gray-200 rounded shadow-lg p-2 min-w-48">
          <div className="text-xs text-gray-600 mb-2">백업 관리</div>
          
          <button
            className="block w-full text-left text-xs px-2 py-1 hover:bg-gray-50 rounded"
            onClick={() => {
              // 수동 백업 생성
              console.log('Manual backup created');
              setShowBackupMenu(false);
            }}
          >
            💾 지금 백업 생성
          </button>
          
          <button
            className="block w-full text-left text-xs px-2 py-1 hover:bg-gray-50 rounded"
            onClick={() => {
              // 백업 히스토리 보기
              console.log('Show backup history');
              setShowBackupMenu(false);
            }}
          >
            📋 백업 히스토리
          </button>
          
          <hr className="my-1" />
          
          <button
            className="block w-full text-left text-xs px-2 py-1 text-red-600 hover:bg-red-50 rounded"
            onClick={() => {
              // 응급 복구
              console.log('Emergency recovery');
              setShowBackupMenu(false);
            }}
          >
            🚨 응급 복구
          </button>
        </div>
      )}
    </div>
  );
};

// 충돌 해결 다이얼로그
const ConflictResolutionDialog: React.FC<{
  onClose: () => void;
}> = ({ onClose }) => {
  const store = useStoreEditorStore();
  
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold">편집 충돌 감지</h3>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600"
          >
            ✕
          </button>
        </div>
        
        <div className="mb-4">
          <p className="text-sm text-gray-600 mb-2">
            다른 사용자가 현재 이 스토어를 편집하고 있습니다:
          </p>
          
          <div className="space-y-2">
            {store.otherEditors.map(editor => (
              <div key={editor.sessionId} className="flex items-center space-x-2 p-2 bg-gray-50 rounded">
                <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                <span className="text-sm font-medium">{editor.userId}</span>
                <span className="text-xs text-gray-500">
                  {Math.floor((Date.now() - editor.lastActivity) / 1000)}초 전 활동
                </span>
              </div>
            ))}
          </div>
        </div>
        
        <div className="space-y-3">
          <button
            onClick={() => {
              store.actions.resolveConflict('keep-local');
              onClose();
            }}
            className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50"
          >
            <div className="font-medium text-sm">내 변경사항 유지</div>
            <div className="text-xs text-gray-600">다른 사용자의 변경사항을 무시합니다</div>
          </button>
          
          <button
            onClick={() => {
              store.actions.resolveConflict('keep-remote');
              onClose();
            }}
            className="w-full text-left p-3 border border-gray-200 rounded hover:bg-gray-50"
          >
            <div className="font-medium text-sm">다른 사용자 변경사항 수용</div>
            <div className="text-xs text-gray-600">내 변경사항을 포기하고 최신 버전을 가져옵니다</div>
          </button>
          
          <button
            onClick={() => {
              store.actions.resolveConflict('merge');
              onClose();
            }}
            className="w-full text-left p-3 border border-blue-200 bg-blue-50 rounded hover:bg-blue-100"
          >
            <div className="font-medium text-sm text-blue-800">자동 병합 시도</div>
            <div className="text-xs text-blue-600">가능한 경우 변경사항을 자동으로 병합합니다</div>
          </button>
        </div>
        
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex items-center justify-between text-xs text-gray-500">
            <span>충돌 해결 전략: {store.conflictResolution}</span>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              나중에 결정
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SaveStatusBar; 