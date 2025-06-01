import React, { useState, useCallback } from 'react';
import { DndProvider, useDrag, useDrop } from 'react-dnd';
import { HTML5Backend } from 'react-dnd-html5-backend';

interface LayoutRow {
  id: string;
  layout_type: 'grid' | 'featured' | 'text' | 'banner' | 'masonry' | 'list';
  settings: Record<string, any>;
  preview: React.ReactNode;
}

interface VisualLayoutBuilderProps {
  rows: LayoutRow[];
  onRowsChange: (rows: LayoutRow[]) => void;
  onRowEdit: (rowId: string) => void;
}

const DraggableRow: React.FC<{
  row: LayoutRow;
  index: number;
  moveRow: (dragIndex: number, hoverIndex: number) => void;
  onEdit: () => void;
  onDelete: () => void;
}> = ({ row, index, moveRow, onEdit, onDelete }) => {
  const [{ isDragging }, drag] = useDrag({
    type: 'row',
    item: { index },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
  });

  const [, drop] = useDrop({
    accept: 'row',
    hover: (item: { index: number }) => {
      if (item.index !== index) {
        moveRow(item.index, index);
        item.index = index;
      }
    },
  });

  return (
    <div
      ref={(node) => drag(drop(node))}
      className={`
        border-2 border-dashed border-gray-300 rounded-lg p-4 mb-4 
        cursor-move transition-all duration-200
        ${isDragging ? 'opacity-50' : 'hover:border-gray-400'}
      `}
    >
      {/* 행 타입 표시 */}
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <span className="text-xs font-medium text-gray-500 uppercase tracking-wide">
            {row.layout_type}
          </span>
          <div className="w-4 h-4 text-gray-400">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16V4m0 0L3 8m4-4l4 4m6 0v12m0 0l4-4m-4 4l-4-4" />
            </svg>
          </div>
        </div>
        
        <div className="flex space-x-2">
          <button
            onClick={onEdit}
            className="px-2 py-1 text-xs text-blue-600 hover:bg-blue-50 rounded"
          >
            편집
          </button>
          <button
            onClick={onDelete}
            className="px-2 py-1 text-xs text-red-600 hover:bg-red-50 rounded"
          >
            삭제
          </button>
        </div>
      </div>

      {/* 미니 미리보기 */}
      <div className="bg-gray-50 rounded p-2 h-20 overflow-hidden">
        {row.preview}
      </div>
    </div>
  );
};

const LayoutTypePalette: React.FC<{
  onAddRow: (type: LayoutRow['layout_type']) => void;
}> = ({ onAddRow }) => {
  const layoutTypes = [
    { type: 'featured' as const, icon: '⭐', label: '피처드' },
    { type: 'grid' as const, icon: '🔲', label: '그리드' },
    { type: 'text' as const, icon: '📝', label: '텍스트' },
    { type: 'banner' as const, icon: '🎯', label: '배너' },
    { type: 'masonry' as const, icon: '🧱', label: '메이슨리' },
    { type: 'list' as const, icon: '📋', label: '리스트' },
  ];

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-4 mb-6">
      <h3 className="text-sm font-medium text-gray-900 mb-3">레이아웃 추가</h3>
      <div className="grid grid-cols-3 gap-2">
        {layoutTypes.map(({ type, icon, label }) => (
          <button
            key={type}
            onClick={() => onAddRow(type)}
            className="flex flex-col items-center p-3 border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors"
          >
            <span className="text-lg mb-1">{icon}</span>
            <span className="text-xs text-gray-600">{label}</span>
          </button>
        ))}
      </div>
    </div>
  );
};

export const VisualLayoutBuilder: React.FC<VisualLayoutBuilderProps> = ({
  rows,
  onRowsChange,
  onRowEdit,
}) => {
  const moveRow = useCallback((dragIndex: number, hoverIndex: number) => {
    const newRows = [...rows];
    const [draggedRow] = newRows.splice(dragIndex, 1);
    newRows.splice(hoverIndex, 0, draggedRow);
    onRowsChange(newRows);
  }, [rows, onRowsChange]);

  const addRow = useCallback((type: LayoutRow['layout_type']) => {
    const newRow: LayoutRow = {
      id: `row-${Date.now()}`,
      layout_type: type,
      settings: {}, // 기본 설정
      preview: <div className="text-xs text-gray-500">새 {type} 레이아웃</div>
    };
    onRowsChange([...rows, newRow]);
  }, [rows, onRowsChange]);

  const deleteRow = useCallback((index: number) => {
    const newRows = rows.filter((_, i) => i !== index);
    onRowsChange(newRows);
  }, [rows, onRowsChange]);

  return (
    <DndProvider backend={HTML5Backend}>
      <div className="space-y-4">
        <LayoutTypePalette onAddRow={addRow} />
        
        <div className="space-y-2">
          {rows.map((row, index) => (
            <DraggableRow
              key={row.id}
              row={row}
              index={index}
              moveRow={moveRow}
              onEdit={() => onRowEdit(row.id)}
              onDelete={() => deleteRow(index)}
            />
          ))}
        </div>

        {rows.length === 0 && (
          <div className="text-center py-12 text-gray-500">
            <p className="mb-4">레이아웃을 추가하여 시작하세요</p>
            <div className="text-4xl mb-2">🎨</div>
          </div>
        )}
      </div>
    </DndProvider>
  );
}; 