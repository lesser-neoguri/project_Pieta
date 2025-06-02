import React, { useState } from 'react';
import { StoreBlock } from '@/types/blockTypes';

interface ConflictData {
  blockId: string;
  position: number;
  localVersion: any;
  serverVersion: any;
}

interface ConflictResolutionModalProps {
  isOpen: boolean;
  conflicts: ConflictData[];
  onResolve: (resolutions: Array<{ blockId: string; resolution: 'local' | 'server' | 'merge' }>) => void;
  onCancel: () => void;
}

type ResolutionChoice = 'local' | 'server' | 'merge';

export const ConflictResolutionModal: React.FC<ConflictResolutionModalProps> = ({
  isOpen,
  conflicts,
  onResolve,
  onCancel
}) => {
  const [resolutions, setResolutions] = useState<Record<string, ResolutionChoice>>({});

  if (!isOpen) return null;

  const handleResolutionChange = (blockId: string, resolution: ResolutionChoice) => {
    setResolutions(prev => ({
      ...prev,
      [blockId]: resolution
    }));
  };

  const handleResolveAll = () => {
    const resolvedConflicts = conflicts.map(conflict => ({
      blockId: conflict.blockId,
      resolution: resolutions[conflict.blockId] || 'local'
    }));
    
    onResolve(resolvedConflicts);
  };

  const canResolve = conflicts.length > 0 && conflicts.every(conflict => 
    resolutions[conflict.blockId] !== undefined
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-hidden">
        {/* 헤더 */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-xl font-semibold text-gray-900">
                충돌 해결 필요
              </h2>
              <p className="text-sm text-gray-600 mt-1">
                다른 곳에서 동시에 편집된 {conflicts.length}개의 블록에 대한 충돌을 해결해주세요
              </p>
            </div>
            <button
              onClick={onCancel}
              className="text-gray-400 hover:text-gray-600 transition-colors"
            >
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
          </div>
        </div>

        {/* 충돌 목록 */}
        <div className="px-6 py-4 overflow-y-auto max-h-96">
          <div className="space-y-6">
            {conflicts.map((conflict, index) => (
              <ConflictItem
                key={conflict.blockId}
                conflict={conflict}
                index={index}
                resolution={resolutions[conflict.blockId]}
                onResolutionChange={(resolution) => handleResolutionChange(conflict.blockId, resolution)}
              />
            ))}
          </div>
        </div>

        {/* 푸터 */}
        <div className="px-6 py-4 border-t border-gray-200 bg-gray-50">
          <div className="flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {Object.keys(resolutions).length}/{conflicts.length}개 충돌 해결됨
            </div>
            
            <div className="flex space-x-3">
              <button
                onClick={onCancel}
                className="px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              
              <button
                onClick={() => {
                  // 모든 충돌을 로컬 버전으로 해결
                  const allLocalResolutions = conflicts.reduce((acc, conflict) => ({
                    ...acc,
                    [conflict.blockId]: 'local' as ResolutionChoice
                  }), {});
                  setResolutions(allLocalResolutions);
                }}
                className="px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100 transition-colors"
              >
                모두 내 버전 사용
              </button>
              
              <button
                onClick={handleResolveAll}
                disabled={!canResolve}
                className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
                  canResolve
                    ? 'text-white bg-blue-600 hover:bg-blue-700'
                    : 'text-gray-400 bg-gray-200 cursor-not-allowed'
                }`}
              >
                충돌 해결
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// 개별 충돌 아이템 컴포넌트
const ConflictItem: React.FC<{
  conflict: ConflictData;
  index: number;
  resolution?: ResolutionChoice;
  onResolutionChange: (resolution: ResolutionChoice) => void;
}> = ({ conflict, index, resolution, onResolutionChange }) => {
  return (
    <div className="border border-gray-200 rounded-lg p-4">
      <div className="mb-3">
        <h3 className="text-sm font-medium text-gray-900">
          블록 #{index + 1} - {getBlockTypeLabel(conflict.localVersion.layout_type)}
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          위치: {conflict.position + 1}번째
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-4">
        {/* 로컬 버전 */}
        <div className="border border-blue-200 rounded-lg p-3 bg-blue-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-blue-900">내 버전</h4>
            <label className="flex items-center">
              <input
                type="radio"
                name={`resolution-${conflict.blockId}`}
                value="local"
                checked={resolution === 'local'}
                onChange={() => onResolutionChange('local')}
                className="w-4 h-4 text-blue-600 border-gray-300 focus:ring-blue-500"
              />
              <span className="ml-2 text-sm text-blue-700">사용</span>
            </label>
          </div>
          <ConflictPreview data={conflict.localVersion} />
        </div>

        {/* 서버 버전 */}
        <div className="border border-green-200 rounded-lg p-3 bg-green-50">
          <div className="flex items-center justify-between mb-2">
            <h4 className="text-sm font-medium text-green-900">서버 버전</h4>
            <label className="flex items-center">
              <input
                type="radio"
                name={`resolution-${conflict.blockId}`}
                value="server"
                checked={resolution === 'server'}
                onChange={() => onResolutionChange('server')}
                className="w-4 h-4 text-green-600 border-gray-300 focus:ring-green-500"
              />
              <span className="ml-2 text-sm text-green-700">사용</span>
            </label>
          </div>
          <ConflictPreview data={conflict.serverVersion} />
        </div>
      </div>

      {/* 병합 옵션 (필요한 경우) */}
      <div className="border border-yellow-200 rounded-lg p-3 bg-yellow-50">
        <label className="flex items-center">
          <input
            type="radio"
            name={`resolution-${conflict.blockId}`}
            value="merge"
            checked={resolution === 'merge'}
            onChange={() => onResolutionChange('merge')}
            className="w-4 h-4 text-yellow-600 border-gray-300 focus:ring-yellow-500"
          />
          <span className="ml-2 text-sm text-yellow-700 font-medium">
            수동으로 병합 (나중에 편집)
          </span>
        </label>
        <p className="text-xs text-yellow-600 mt-1 ml-6">
          서버 버전을 가져온 후 필요한 부분을 수동으로 수정하세요
        </p>
      </div>
    </div>
  );
};

// 충돌 미리보기 컴포넌트
const ConflictPreview: React.FC<{ data: any }> = ({ data }) => {
  const getPreviewContent = () => {
    switch (data.layout_type) {
      case 'text':
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">텍스트 내용:</div>
            <div className="text-sm bg-white p-2 rounded border max-h-20 overflow-y-auto">
              {data.text_content || '(내용 없음)'}
            </div>
            <div className="text-xs text-gray-500">
              크기: {data.text_size} | 정렬: {data.text_alignment}
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">그리드 설정:</div>
            <div className="text-sm space-y-1">
              <div>컬럼: {data.columns}개</div>
              <div>카드 스타일: {data.card_style}</div>
              <div>높이 비율: {data.height_ratio}</div>
              <div>간격: {data.spacing}</div>
            </div>
          </div>
        );

      case 'featured':
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">피처드 설정:</div>
            <div className="text-sm space-y-1">
              <div>크기: {data.featured_size}</div>
              <div>오버레이: {data.show_text_overlay ? '있음' : '없음'}</div>
              {data.featured_image_url && (
                <div className="text-xs text-blue-600">이미지 설정됨</div>
              )}
            </div>
          </div>
        );

      case 'banner':
        return (
          <div className="space-y-1">
            <div className="text-xs text-gray-600">배너 설정:</div>
            <div className="text-sm space-y-1">
              <div>높이: {data.banner_height}</div>
              <div>스타일: {data.banner_style}</div>
              {data.call_to_action && (
                <div>CTA: {data.call_to_action}</div>
              )}
            </div>
          </div>
        );

      default:
        return (
          <div className="text-sm text-gray-600">
            {JSON.stringify(data, null, 2).substring(0, 100)}...
          </div>
        );
    }
  };

  return <div className="text-xs">{getPreviewContent()}</div>;
};

// 블록 타입 레이블 변환
const getBlockTypeLabel = (layoutType: string): string => {
  const labels: Record<string, string> = {
    text: '텍스트 블록',
    grid: '제품 그리드',
    featured: '피처드 블록',
    banner: '배너 블록',
    list: '리스트 블록',
    masonry: '메이슨리 블록'
  };
  
  return labels[layoutType] || layoutType;
}; 