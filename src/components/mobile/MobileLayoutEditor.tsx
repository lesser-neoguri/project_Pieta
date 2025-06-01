import React, { useState } from 'react';

interface MobileLayoutEditorProps {
  design: any;
  onDesignChange: (field: string, value: any) => void;
}

export const MobileLayoutEditor: React.FC<MobileLayoutEditorProps> = ({
  design,
  onDesignChange
}) => {
  const [activePanel, setActivePanel] = useState<'overview' | 'edit' | null>(null);
  const [selectedRowIndex, setSelectedRowIndex] = useState<number | null>(null);

  const QuickActions = () => (
    <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 p-4 safe-area-pb">
      <div className="flex justify-around">
        <button
          onClick={() => setActivePanel('overview')}
          className={`flex flex-col items-center p-2 rounded-lg ${
            activePanel === 'overview' ? 'bg-blue-100 text-blue-600' : 'text-gray-600'
          }`}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
          </svg>
          <span className="text-xs">전체보기</span>
        </button>
        
        <button
          className="flex flex-col items-center p-2 rounded-lg text-gray-600"
          onClick={() => {
            // 새 레이아웃 추가 로직
          }}
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
          </svg>
          <span className="text-xs">추가</span>
        </button>
        
        <button
          className="flex flex-col items-center p-2 rounded-lg text-gray-600"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
          </svg>
          <span className="text-xs">미리보기</span>
        </button>
        
        <button
          className="flex flex-col items-center p-2 rounded-lg text-gray-600"
        >
          <svg className="w-6 h-6 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          <span className="text-xs">저장</span>
        </button>
      </div>
    </div>
  );

  const OverviewPanel = () => (
    <div className="fixed inset-0 bg-white z-50">
      <div className="flex items-center justify-between p-4 border-b border-gray-200">
        <h2 className="text-lg font-medium">레이아웃 관리</h2>
        <button
          onClick={() => setActivePanel(null)}
          className="text-gray-500 hover:text-gray-700"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
      
      <div className="p-4 pb-20 overflow-y-auto">
        {Object.entries(design.row_layouts || {}).map(([index, layout]) => (
          <div
            key={index}
            className="border border-gray-200 rounded-lg p-4 mb-4"
            onClick={() => {
              setSelectedRowIndex(parseInt(index));
              setActivePanel('edit');
            }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium">
                Row {parseInt(index) + 1}: {(layout as any).layout_type}
              </span>
              <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
              </svg>
            </div>
            
            {/* 레이아웃 미니 프리뷰 */}
            <div className="bg-gray-50 rounded p-2 h-16">
              <div className="text-xs text-gray-500">
                {(layout as any).layout_type} 레이아웃
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const EditPanel = () => {
    if (selectedRowIndex === null || !design.row_layouts?.[selectedRowIndex]) {
      return null;
    }

    const rowLayout = design.row_layouts[selectedRowIndex];

    return (
      <div className="fixed inset-0 bg-white z-50">
        <div className="flex items-center justify-between p-4 border-b border-gray-200">
          <button
            onClick={() => setActivePanel('overview')}
            className="text-gray-500 hover:text-gray-700"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <h2 className="text-lg font-medium">Row {selectedRowIndex + 1} 편집</h2>
          <button
            onClick={() => setActivePanel(null)}
            className="text-gray-500 hover:text-gray-700"
          >
            완료
          </button>
        </div>
        
        <div className="p-4 pb-20 overflow-y-auto space-y-6">
          {/* 레이아웃 타입 선택 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              레이아웃 타입
            </label>
            <div className="grid grid-cols-2 gap-3">
              {[
                { value: 'grid', label: '그리드', icon: '🔲' },
                { value: 'featured', label: '피처드', icon: '⭐' },
                { value: 'text', label: '텍스트', icon: '📝' },
                { value: 'banner', label: '배너', icon: '🎯' },
              ].map(({ value, label, icon }) => (
                <button
                  key={value}
                  onClick={() => {
                    const newLayouts = { ...design.row_layouts };
                    newLayouts[selectedRowIndex] = {
                      ...rowLayout,
                      layout_type: value
                    };
                    onDesignChange('row_layouts', newLayouts);
                  }}
                  className={`
                    flex flex-col items-center p-4 rounded-lg border-2 transition-colors
                    ${rowLayout.layout_type === value 
                      ? 'border-blue-500 bg-blue-50' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  <span className="text-2xl mb-2">{icon}</span>
                  <span className="text-sm font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* 타입별 상세 설정 */}
          {rowLayout.layout_type === 'grid' && (
            <div>
              <label className="block text-sm font-medium text-gray-900 mb-3">
                컬럼 수
              </label>
              <div className="grid grid-cols-5 gap-2">
                {[2, 3, 4, 5, 6].map(num => (
                  <button
                    key={num}
                    onClick={() => {
                      const newLayouts = { ...design.row_layouts };
                      newLayouts[selectedRowIndex] = {
                        ...rowLayout,
                        columns: num
                      };
                      onDesignChange('row_layouts', newLayouts);
                    }}
                    className={`
                      py-3 px-2 text-center rounded border
                      ${(rowLayout as any).columns === num 
                        ? 'border-blue-500 bg-blue-50 text-blue-700' 
                        : 'border-gray-200 hover:border-gray-300'
                      }
                    `}
                  >
                    {num}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* 간격 설정 */}
          <div>
            <label className="block text-sm font-medium text-gray-900 mb-3">
              간격
            </label>
            <div className="space-y-2">
              {[
                { value: 'tight', label: '좁게' },
                { value: 'normal', label: '보통' },
                { value: 'loose', label: '넓게' },
              ].map(({ value, label }) => (
                <button
                  key={value}
                  onClick={() => {
                    const newLayouts = { ...design.row_layouts };
                    newLayouts[selectedRowIndex] = {
                      ...rowLayout,
                      spacing: value
                    };
                    onDesignChange('row_layouts', newLayouts);
                  }}
                  className={`
                    w-full py-3 px-4 text-left rounded border
                    ${(rowLayout as any).spacing === value 
                      ? 'border-blue-500 bg-blue-50 text-blue-700' 
                      : 'border-gray-200 hover:border-gray-300'
                    }
                  `}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <>
      <QuickActions />
      {activePanel === 'overview' && <OverviewPanel />}
      {activePanel === 'edit' && <EditPanel />}
    </>
  );
}; 