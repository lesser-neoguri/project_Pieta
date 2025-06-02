import React, { useState, useCallback } from 'react';

// 기본 블록 타입 정의
export interface StoreBlock {
  id: string;
  type: 'text' | 'grid' | 'featured' | 'banner' | 'list' | 'masonry';
  position: number;
  data: any; // 각 블록 타입별 데이터
}

interface InlinePreviewAreaProps {
  storeId: string;
  design: any; // 기존 StoreDesign 타입
  onDesignUpdate: (updatedDesign: any) => void;
  products: any[];
  className?: string;
}

export const BasicInlinePreviewArea: React.FC<InlinePreviewAreaProps> = ({
  storeId,
  design,
  onDesignUpdate,
  products,
  className = ""
}) => {
  // 선택된 블록과 편집 중인 블록 상태
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [editingBlockId, setEditingBlockId] = useState<string | null>(null);

  // row_layouts를 StoreBlock 배열로 변환
  const convertToBlocks = useCallback((): StoreBlock[] => {
    if (!design.row_layouts) return [];
    
    return Object.entries(design.row_layouts).map(([index, layout]: [string, any]) => ({
      id: `block-${index}`,
      type: layout.layout_type,
      position: parseInt(index),
      data: layout
    }));
  }, [design.row_layouts]);

  // 블록 배열을 row_layouts로 변환
  const convertToRowLayouts = useCallback((blocks: StoreBlock[]) => {
    const rowLayouts: any = {};
    blocks.forEach((block, index) => {
      rowLayouts[index.toString()] = {
        ...block.data,
        layout_type: block.type
      };
    });
    return rowLayouts;
  }, []);

  const blocks = convertToBlocks();

  // 블록 선택 핸들러
  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    setEditingBlockId(null); // 선택 시 편집 모드 해제
  }, []);

  // 블록 편집 모드 진입 핸들러
  const handleBlockEdit = useCallback((blockId: string) => {
    setEditingBlockId(blockId);
    setSelectedBlockId(blockId);
  }, []);

  // 블록 업데이트 핸들러
  const handleBlockUpdate = useCallback((blockId: string, newData: any) => {
    const updatedBlocks = blocks.map(block => 
      block.id === blockId 
        ? { ...block, data: { ...block.data, ...newData } }
        : block
    );
    
    const newRowLayouts = convertToRowLayouts(updatedBlocks);
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });
  }, [blocks, convertToRowLayouts, design, onDesignUpdate]);

  // 빈 영역 클릭 시 선택 해제
  const handleBackgroundClick = useCallback(() => {
    setSelectedBlockId(null);
    setEditingBlockId(null);
  }, []);

  return (
    <div 
      className={`${className} min-h-screen p-4`}
      onClick={handleBackgroundClick}
      style={{
        backgroundColor: design.background_color || '#ffffff',
        fontFamily: design.font_family || 'Inter'
      }}
    >
      <div className="max-w-4xl mx-auto space-y-6">
        {blocks.length === 0 && (
          <div className="text-center py-16 text-gray-500">
            <p>블록을 추가하여 레이아웃을 만들어보세요.</p>
          </div>
        )}

        {blocks.map((block) => (
          <BasicInlineEditableBlock
            key={block.id}
            block={block}
            isSelected={selectedBlockId === block.id}
            isEditing={editingBlockId === block.id}
            onSelect={handleBlockSelect}
            onEdit={handleBlockEdit}
            onUpdate={handleBlockUpdate}
            products={products}
          />
        ))}
      </div>
    </div>
  );
};

// 기본 InlineEditableBlock 컴포넌트
interface BasicInlineEditableBlockProps {
  block: StoreBlock;
  isSelected: boolean;
  isEditing: boolean;
  onSelect: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onUpdate: (blockId: string, data: any) => void;
  products: any[];
}

const BasicInlineEditableBlock: React.FC<BasicInlineEditableBlockProps> = ({
  block,
  isSelected,
  isEditing,
  onSelect,
  onEdit,
  onUpdate,
  products
}) => {
  // 클릭 핸들러 (선택)
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onSelect(block.id);
  }, [block.id, onSelect]);

  // 더블클릭 핸들러 (편집 모드 진입)
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onEdit(block.id);
  }, [block.id, onEdit]);

  // 블록 콘텐츠 렌더링
  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        if (isEditing) {
          return <BasicTiptapTextEditor block={block} onUpdate={onUpdate} />;
        }
        return (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: block.data.text_content || '텍스트를 입력하세요...' 
            }} />
          </div>
        );

      case 'grid':
        return <BasicProductGrid block={block} products={products} />;

      case 'featured':
        return (
          <div className="bg-gray-100 h-64 rounded-lg flex items-center justify-center">
            <span className="text-gray-500">피처드 블록</span>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 p-8 rounded-lg text-center text-gray-500">
            {block.type} 블록
          </div>
        );
    }
  };

  return (
    <div
      className={`
        relative transition-all duration-200 cursor-pointer
        ${isSelected ? 'ring-2 ring-blue-500 ring-offset-2' : ''}
        ${isEditing ? 'ring-2 ring-green-500 ring-offset-2' : ''}
        hover:ring-1 hover:ring-gray-300 hover:ring-offset-1
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 선택 상태 표시 */}
      {isSelected && (
        <div className="absolute -top-6 left-0 px-2 py-1 bg-blue-500 text-white text-xs rounded-t z-10">
          {getBlockTypeLabel(block.type)} - 블록 #{block.position + 1}
        </div>
      )}

      {/* 편집 중 표시 */}
      {isEditing && (
        <div className="absolute -top-6 right-0 px-2 py-1 bg-green-500 text-white text-xs rounded-t z-10">
          편집 중
        </div>
      )}

      {/* 블록 콘텐츠 */}
      <div className={isEditing ? 'pointer-events-auto' : 'pointer-events-none'}>
        {renderBlockContent()}
      </div>
    </div>
  );
};

// 기본 Tiptap 텍스트 에디터 (다음 섹션에서 구현)
const BasicTiptapTextEditor: React.FC<{
  block: StoreBlock;
  onUpdate: (blockId: string, data: any) => void;
}> = ({ block, onUpdate }) => {
  return (
    <div className="border-2 border-dashed border-green-300 p-4 rounded">
      <p className="text-green-700 text-sm mb-2">Tiptap 에디터 (구현 예정)</p>
      <textarea
        className="w-full p-2 border rounded"
        defaultValue={block.data.text_content || ''}
        onChange={(e) => {
          onUpdate(block.id, { text_content: e.target.value });
        }}
        placeholder="텍스트를 입력하세요..."
        rows={4}
      />
    </div>
  );
};

// 기본 제품 그리드
const BasicProductGrid: React.FC<{
  block: StoreBlock;
  products: any[];
}> = ({ block, products }) => {
  const columns = block.data.columns || 4;
  
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 4)} gap-4`}>
      {/* 제품 등록 플레이스홀더 */}
      <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 rounded-lg flex items-center justify-center">
        <span className="text-gray-500 text-sm">+ 제품 추가</span>
      </div>
      
      {/* 실제 제품들 (최대 8개) */}
      {products.slice(0, Math.min(columns * 2 - 1, 8)).map((product, index) => (
        <div key={product.id || index} className="aspect-square bg-white border rounded-lg p-4">
          <div className="h-2/3 bg-gray-200 rounded mb-2"></div>
          <h3 className="text-sm font-medium truncate">{product.product_name}</h3>
          <p className="text-xs text-gray-600">₩{product.price?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

// 유틸리티 함수
const getBlockTypeLabel = (type: string): string => {
  const labels: Record<string, string> = {
    text: '텍스트',
    grid: '제품 그리드',
    featured: '피처드',
    banner: '배너',
    list: '리스트',
    masonry: '메이슨리'
  };
  return labels[type] || type;
}; 