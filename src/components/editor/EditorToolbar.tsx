import React from 'react';

interface EditorToolbarProps {
  isEditMode: boolean;
  canUndo: boolean;
  canRedo: boolean;
  onEditModeToggle: () => void;
  onUndo: () => void;
  onRedo: () => void;
  onSave: () => void;
}

export const EditorToolbar: React.FC<EditorToolbarProps> = ({
  isEditMode,
  canUndo,
  canRedo,
  onEditModeToggle,
  onUndo,
  onRedo,
  onSave
}) => {
  return (
    <div className="sticky top-0 z-40 bg-white border-b border-gray-200 px-4 py-2 flex items-center justify-between">
      <div className="flex items-center space-x-2">
        <button
          onClick={onEditModeToggle}
          className={`
            px-3 py-1 rounded text-sm font-medium transition-colors
            ${isEditMode 
              ? 'bg-blue-100 text-blue-700 hover:bg-blue-200' 
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }
          `}
        >
          {isEditMode ? '편집 중' : '읽기 모드'}
        </button>

        {isEditMode && (
          <>
            <div className="h-4 w-px bg-gray-300" />
            
            <button
              onClick={onUndo}
              disabled={!canUndo}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="실행취소 (Ctrl+Z)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h10a8 8 0 018 8v2M3 10l6 6m-6-6l6-6" />
              </svg>
            </button>
            
            <button
              onClick={onRedo}
              disabled={!canRedo}
              className="p-1 rounded hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed"
              title="다시실행 (Ctrl+Y)"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 10H11a8 8 0 00-8 8v2m18-10l-6-6m6 6l-6 6" />
              </svg>
            </button>
          </>
        )}
      </div>

      {isEditMode && (
        <div className="flex items-center space-x-2">
          <span className="text-xs text-gray-500">
            변경사항이 자동으로 저장됩니다
          </span>
          
          <button
            onClick={onSave}
            className="bg-blue-600 text-white px-3 py-1 rounded text-sm font-medium hover:bg-blue-700 transition-colors"
          >
            저장
          </button>
        </div>
      )}
    </div>
  );
}; 