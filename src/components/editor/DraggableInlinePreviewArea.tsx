import React, { useCallback } from 'react';
import { useDetailedEditorState } from '@/hooks/useDetailedEditorState';
import { DraggableBlockList, DraggableBlockWrapper } from './DraggableBlockList';

// 블록 타입 라벨 유틸리티 함수
const getBlockTypeLabel = (type: string): string => {
  switch (type) {
    case 'text': return '텍스트';
    case 'grid': return '제품 그리드';
    case 'featured': return '피처드';
    case 'banner': return '배너';
    case 'list': return '리스트';
    case 'masonry': return '메이슨리';
    default: return '블록';
  }
};

interface DraggableInlinePreviewAreaProps {
  storeId: string;
  products: any[];
  className?: string;
}

export const DraggableInlinePreviewArea: React.FC<DraggableInlinePreviewAreaProps> = ({
  storeId,
  products,
  className = ""
}) => {
  const { state, actions } = useDetailedEditorState();
  const { blocks, selectedBlockId, editingBlockId, dragState } = state;

  // 블록 선택 핸들러
  const handleBlockSelect = useCallback((blockId: string) => {
    actions.setSelected(blockId);
    actions.setEditing(null); // 선택 시 편집 모드 해제
  }, [actions]);

  // 블록 편집 모드 진입 핸들러  
  const handleBlockEdit = useCallback((blockId: string) => {
    actions.setEditing(blockId);
    actions.setSelected(blockId);
  }, [actions]);

  // 블록 업데이트 핸들러
  const handleBlockUpdate = useCallback((blockId: string, newData: any) => {
    actions.updateBlock(blockId, { data: newData });
  }, [actions]);

  // 빈 영역 클릭 시 선택 해제
  const handleBackgroundClick = useCallback(() => {
    if (!dragState.isDragging) {
      actions.setSelected(null);
      actions.setEditing(null);
    }
  }, [actions, dragState.isDragging]);

  return (
    <div 
      className={`${className} min-h-screen`}
      onClick={handleBackgroundClick}
      style={{
        background: 'linear-gradient(135deg, #f8fafc 0%, #f1f5f9 100%)',
        fontFamily: 'Inter, system-ui, -apple-system, sans-serif'
      }}
    >
      {/* 고급스러운 배경 패턴 */}
      <div 
        className="absolute inset-0 opacity-30"
        style={{
          backgroundImage: `radial-gradient(circle at 1px 1px, rgba(255,255,255,0.8) 1px, transparent 0)`,
          backgroundSize: '24px 24px'
        }}
      />
      
      <div className="relative z-10 max-w-5xl mx-auto px-6 py-12">
        {blocks.length === 0 && !dragState.isDragging && (
          <div className="text-center py-24">
            <div className="mb-6">
              <div className="mx-auto w-16 h-16 bg-gradient-to-br from-blue-100 to-indigo-100 rounded-2xl flex items-center justify-center mb-4">
                <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                </svg>
              </div>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">블록으로 레이아웃 만들기</h3>
            <p className="text-gray-600 max-w-md mx-auto">상단 툴바에서 블록을 추가하고 드래그하여 원하는 순서로 배치해보세요.</p>
          </div>
        )}

        <DraggableBlockList className="space-y-8">
          {(block, index, isDragging, isOverDragTarget) => (
            <DraggableBlockWrapper
              block={block}
              index={index}
              isDragging={isDragging}
              isOverDragTarget={isOverDragTarget}
            >
              <DraggableInlineEditableBlock
                block={block}
                isSelected={selectedBlockId === block.id}
                isEditing={editingBlockId === block.id}
                isDragging={isDragging}
                onSelect={handleBlockSelect}
                onEdit={handleBlockEdit}
                onUpdate={handleBlockUpdate}
                products={products}
              />
            </DraggableBlockWrapper>
          )}
        </DraggableBlockList>
      </div>
    </div>
  );
};

// 드래그 가능한 편집 가능 블록 컴포넌트
interface DraggableInlineEditableBlockProps {
  block: any; // StoreBlock 타입
  isSelected: boolean;
  isEditing: boolean;
  isDragging: boolean;
  onSelect: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onUpdate: (blockId: string, data: any) => void;
  products: any[];
}

const DraggableInlineEditableBlock: React.FC<DraggableInlineEditableBlockProps> = ({
  block,
  isSelected,
  isEditing,
  isDragging,
  onSelect,
  onEdit,
  onUpdate,
  products
}) => {
  // 클릭 핸들러 (선택)
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onSelect(block.id);
    }
  }, [block.id, onSelect, isDragging]);

  // 더블클릭 핸들러 (편집 모드 진입)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging) {
      onEdit(block.id);
    }
  }, [block.id, onEdit, isDragging]);

  // 블록 콘텐츠 렌더링
  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        if (isEditing && !isDragging) {
          return (
            <div className="p-6 border-2 border-emerald-200/60 rounded-2xl bg-gradient-to-br from-emerald-50/80 to-teal-50/80 backdrop-blur-sm">
              <div className="mb-3 flex items-center space-x-2">
                <div className="w-2 h-2 bg-emerald-500 rounded-full"></div>
                <span className="text-sm font-medium text-emerald-700">텍스트 편집 중</span>
              </div>
              <textarea
                defaultValue={block.data.text_content || ''}
                className="w-full h-32 p-4 border border-emerald-200/60 rounded-xl resize-none bg-white/60 backdrop-blur-sm focus:outline-none focus:ring-2 focus:ring-emerald-300/50 transition-all duration-200"
                placeholder="텍스트를 입력하세요..."
                onBlur={(e) => onUpdate(block.id, { text_content: e.target.value })}
              />
            </div>
          );
        }
        return (
          <div className="p-8 bg-white/80 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300">
            <div className="prose prose-lg max-w-none">
              <div dangerouslySetInnerHTML={{ 
                __html: block.data.text_content || '<p class="text-gray-400 italic">텍스트를 입력하세요...</p>' 
              }} />
            </div>
          </div>
        );

      case 'grid':
        return (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100/80">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">제품 그리드</h3>
                <span className="px-2 py-1 text-xs font-medium bg-blue-100 text-blue-700 rounded-full">4열</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-4 gap-4">
                {[1, 2, 3, 4, 5, 6, 7, 8].map((item) => (
                  <div key={item} className="group bg-gray-50/80 hover:bg-white rounded-xl p-3 text-center transition-all duration-200 hover:shadow-md">
                    <div className="w-full h-20 bg-gradient-to-br from-gray-200 to-gray-300 rounded-lg mb-3 group-hover:from-blue-100 group-hover:to-indigo-200 transition-all duration-200"></div>
                    <p className="text-sm font-medium text-gray-800">제품 {item}</p>
                    <p className="text-xs text-gray-500 font-semibold">₩50,000</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      case 'featured':
        return (
          <div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 group">
            <div className="h-80 bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 relative">
              {/* 배경 패턴 */}
              <div 
                className="absolute inset-0 opacity-20"
                style={{
                  backgroundImage: `radial-gradient(circle at 2px 2px, rgba(255,255,255,0.6) 1px, transparent 0)`,
                  backgroundSize: '20px 20px'
                }}
              />
              
              <div className="relative z-10 flex items-center justify-center h-full text-white">
                <div className="text-center transform group-hover:scale-105 transition-transform duration-300">
                  <div className="mb-4">
                    <div className="w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center mx-auto mb-4">
                      <svg className="w-8 h-8" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    </div>
                  </div>
                  <h3 className="text-3xl font-bold mb-3">피처드 제품</h3>
                  <p className="text-indigo-100 text-lg">특별한 제품을 강조해보세요</p>
                </div>
              </div>
            </div>
          </div>
        );

      case 'banner':
        return (
          <div className="relative overflow-hidden rounded-2xl shadow-xl hover:shadow-2xl transition-all duration-500 group">
            <div className="h-64 bg-gradient-to-r from-emerald-400 via-cyan-500 to-blue-500 relative">
              {/* 배경 애니메이션 효과 */}
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/10 to-transparent transform -skew-x-12 -translate-x-full group-hover:translate-x-full transition-transform duration-1000 ease-out"></div>
              
              <div className="relative z-10 flex items-center justify-center h-full text-white">
                <div className="text-center transform group-hover:scale-105 transition-transform duration-300">
                  <h3 className="text-2xl font-bold mb-3">배너 블록</h3>
                  <p className="text-cyan-100 text-lg mb-4">{block.data.call_to_action || '클릭하여 편집하세요'}</p>
                  <div className="inline-flex items-center px-6 py-3 bg-white/20 backdrop-blur-sm rounded-xl border border-white/30 hover:bg-white/30 transition-all duration-200">
                    <span className="font-medium">자세히 보기</span>
                    <svg className="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </div>
              </div>
            </div>
          </div>
        );

      case 'list':
        return (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100/80">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-br from-orange-500 to-red-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">제품 리스트</h3>
                <span className="px-2 py-1 text-xs font-medium bg-orange-100 text-orange-700 rounded-full">수직형</span>
              </div>
            </div>
            <div className="p-6 space-y-3">
              {[1, 2, 3].map((item) => (
                <div key={item} className="flex items-center space-x-4 p-4 bg-gradient-to-r from-gray-50/80 to-white rounded-xl border border-gray-100/60 hover:shadow-md transition-all duration-200 group">
                  <div className="w-14 h-14 bg-gradient-to-br from-orange-100 to-pink-100 rounded-xl group-hover:from-orange-200 group-hover:to-pink-200 transition-all duration-200"></div>
                  <div className="flex-1">
                    <p className="font-semibold text-gray-900">제품 {item}</p>
                    <p className="text-sm text-gray-500">고품질 상품 설명</p>
                  </div>
                  <div className="text-right">
                    <p className="font-bold text-gray-900">₩50,000</p>
                    <p className="text-xs text-green-600">재고 있음</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        );

      case 'masonry':
        return (
          <div className="bg-white/90 backdrop-blur-sm border border-gray-200/60 rounded-2xl shadow-lg hover:shadow-xl transition-all duration-300 overflow-hidden">
            <div className="p-6 border-b border-gray-100/80">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-gradient-to-br from-purple-500 to-indigo-600 rounded-full"></div>
                <h3 className="text-lg font-semibold text-gray-900">메이슨리 레이아웃</h3>
                <span className="px-2 py-1 text-xs font-medium bg-purple-100 text-purple-700 rounded-full">3열</span>
              </div>
            </div>
            <div className="p-6">
              <div className="grid grid-cols-3 gap-4">
                {[1, 2, 3, 4, 5, 6].map((item) => (
                  <div 
                    key={item} 
                    className={`group bg-gradient-to-br from-gray-50/80 to-white rounded-xl p-4 border border-gray-100/60 hover:shadow-md transition-all duration-200 ${
                      item % 3 === 0 ? 'h-32' : item % 2 === 0 ? 'h-28' : 'h-24'
                    }`}
                  >
                    <div className="w-full h-12 bg-gradient-to-br from-purple-100 to-indigo-200 rounded-lg mb-3 group-hover:from-purple-200 group-hover:to-indigo-300 transition-all duration-200"></div>
                    <p className="text-sm font-medium text-gray-800">아이템 {item}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        );

      default:
        return (
          <div className="bg-gradient-to-br from-gray-50/80 to-white p-12 rounded-2xl text-center border-2 border-dashed border-gray-300/60 hover:border-gray-400/60 transition-all duration-300 group">
            <div className="mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-gray-100 to-gray-200 rounded-2xl flex items-center justify-center mx-auto mb-4 group-hover:from-blue-100 group-hover:to-indigo-200 transition-all duration-300">
                <svg className="w-8 h-8 text-gray-500 group-hover:text-blue-600 transition-colors duration-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
            </div>
            <h4 className="text-lg font-semibold text-gray-800 mb-2">{getBlockTypeLabel(block.type)} 블록</h4>
            <p className="text-sm text-gray-500">더블클릭하여 편집하세요</p>
          </div>
        );
    }
  };

  return (
    <div
      className={`
        relative transition-all duration-300 ease-out cursor-pointer rounded-2xl overflow-hidden
        ${isSelected && !isDragging ? 'ring-2 ring-blue-400/60 ring-offset-4 ring-offset-transparent shadow-lg shadow-blue-500/20' : ''}
        ${isEditing && !isDragging ? 'ring-2 ring-emerald-400/60 ring-offset-4 ring-offset-transparent shadow-lg shadow-emerald-500/20' : ''}
        ${!isSelected && !isEditing && !isDragging ? 'hover:ring-1 hover:ring-gray-300/60 hover:ring-offset-2 hover:ring-offset-transparent hover:shadow-md' : ''}
        ${isDragging ? 'ring-2 ring-blue-500/80 ring-offset-2 ring-offset-white shadow-2xl shadow-blue-500/30 scale-[1.01]' : ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 선택 상태 고급 라벨 */}
      {isSelected && !isDragging && (
        <div className="absolute -top-3 left-4 z-30">
          <div className="flex items-center space-x-2">
            <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-100 to-indigo-100 text-blue-800 rounded-full border border-blue-200/60 shadow-sm backdrop-blur-sm">
              <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
              {getBlockTypeLabel(block.type)} 선택됨
            </span>
          </div>
        </div>
      )}

      {/* 편집 중 고급 표시 */}
      {isEditing && !isDragging && (
        <div className="absolute -top-3 right-4 z-30">
          <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-800 rounded-full border border-emerald-200/60 shadow-sm backdrop-blur-sm animate-pulse">
            <div className="w-2 h-2 bg-emerald-500 rounded-full mr-2 animate-ping"></div>
            <svg className="w-3 h-3 mr-1.5" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            편집 중
          </span>
        </div>
      )}

      {/* 드래그 중 고급 표시 */}
      {isDragging && (
        <div className="absolute -top-3 left-1/2 transform -translate-x-1/2 z-30">
          <span className="inline-flex items-center px-3 py-1.5 text-xs font-semibold bg-gradient-to-r from-blue-500 to-indigo-600 text-white rounded-full shadow-lg backdrop-blur-sm">
            <svg className="w-3 h-3 mr-1.5 animate-bounce" fill="currentColor" viewBox="0 0 20 20">
              <path d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            드래그 중
          </span>
        </div>
      )}

      {/* 블록 콘텐츠 */}
      <div className={`
        relative
        ${isDragging ? 'pointer-events-none' : ''}
        ${isEditing ? 'ring-1 ring-emerald-200/40 ring-inset' : ''}
      `}>
        {renderBlockContent()}
      </div>

      {/* 선택 시 미세한 글로우 효과 */}
      {isSelected && !isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-blue-500/5 via-transparent to-indigo-500/5 pointer-events-none" />
      )}

      {/* 편집 시 미세한 글로우 효과 */}
      {isEditing && !isDragging && (
        <div className="absolute inset-0 rounded-2xl bg-gradient-to-br from-emerald-500/5 via-transparent to-teal-500/5 pointer-events-none" />
      )}
    </div>
  );
}; 