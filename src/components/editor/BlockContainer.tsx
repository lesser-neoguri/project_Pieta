import React, { useState, useRef } from 'react';
import { useDrag, useDrop } from 'react-dnd';

interface StoreBlock {
  id: string;
  type: 'featured' | 'grid' | 'text' | 'banner' | 'masonry' | 'list';
  data: Record<string, any>;
  position: number;
  isEditing?: boolean;
}

interface BlockContainerProps {
  block: StoreBlock;
  index: number;
  isEditing: boolean;
  isSelected: boolean;
  isHovered: boolean;
  products: any[];
  onSelect: () => void;
  onHover: () => void;
  onLeave: () => void;
  onUpdate: (updates: Partial<StoreBlock>) => void;
  onDelete: () => void;
  onMove: (fromIndex: number, toIndex: number) => void;
  onAddBelow: () => void;
}

export const BlockContainer: React.FC<BlockContainerProps> = ({
  block,
  index,
  isEditing,
  isSelected,
  isHovered,
  products,
  onSelect,
  onHover,
  onLeave,
  onUpdate,
  onDelete,
  onMove,
  onAddBelow
}) => {
  const [showInlineToolbar, setShowInlineToolbar] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // 드래그 앤 드롭
  const [{ isDragging }, drag] = useDrag({
    type: 'block',
    item: { index, id: block.id },
    collect: (monitor) => ({
      isDragging: monitor.isDragging(),
    }),
    canDrag: isEditing,
  });

  const [{ isOver }, drop] = useDrop({
    accept: 'block',
    collect: (monitor) => ({
      isOver: monitor.isOver(),
    }),
    hover: (item: { index: number; id: string }) => {
      if (item.index !== index) {
        onMove(item.index, index);
        item.index = index;
      }
    },
  });

  // 드래그 앤 드롭 ref 조합
  const dragDropRef = (node: HTMLDivElement) => {
    drag(drop(node));
    containerRef.current = node;
  };

  return (
    <div
      ref={dragDropRef}
      className={`
        relative group transition-all duration-200
        ${isEditing ? 'editing-block' : ''}
        ${isSelected ? 'ring-2 ring-blue-500 ring-opacity-50' : ''}
        ${isHovered && isEditing ? 'bg-blue-50 bg-opacity-30' : ''}
        ${isDragging ? 'opacity-50' : ''}
        ${isOver ? 'bg-blue-100 bg-opacity-20' : ''}
      `}
      onMouseEnter={isEditing ? onHover : undefined}
      onMouseLeave={isEditing ? onLeave : undefined}
      onClick={isEditing ? onSelect : undefined}
    >
      {/* 편집 모드에서만 보이는 드래그 핸들 */}
      {isEditing && (
        <div className="absolute left-0 top-0 -ml-8 flex flex-col items-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button className="p-2 text-gray-400 hover:text-gray-600 cursor-grab">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path d="M7 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM7 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 2a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 8a2 2 0 1 1-4 0 2 2 0 0 1 4 0zM17 14a2 2 0 1 1-4 0 2 2 0 0 1 4 0z" />
            </svg>
          </button>
        </div>
      )}

      {/* 블록 타입별 렌더러 */}
      <BlockRenderer
        block={block}
        products={products}
        isEditing={block.isEditing || false}
        onUpdate={onUpdate}
      />

      {/* 호버 시 나타나는 인라인 툴바 */}
      {isEditing && isHovered && (
        <InlineBlockToolbar
          block={block}
          onUpdate={onUpdate}
          onDelete={onDelete}
          onAddBelow={onAddBelow}
          onEdit={() => onUpdate({ isEditing: true })}
        />
      )}

      {/* 블록 사이 추가 버튼 */}
      {isEditing && (
        <div className="absolute inset-x-0 -bottom-2 flex justify-center opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            onClick={onAddBelow}
            className="w-6 h-6 bg-white border border-gray-300 rounded-full flex items-center justify-center text-gray-500 hover:text-gray-700 hover:border-gray-400 shadow-sm"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
            </svg>
          </button>
        </div>
      )}
    </div>
  );
};

// 인라인 툴바
const InlineBlockToolbar: React.FC<{
  block: StoreBlock;
  onUpdate: (updates: Partial<StoreBlock>) => void;
  onDelete: () => void;
  onAddBelow: () => void;
  onEdit: () => void;
}> = ({ block, onUpdate, onDelete, onAddBelow, onEdit }) => (
  <div className="absolute top-2 right-2 bg-white rounded-lg shadow-lg border border-gray-200 p-1 flex items-center space-x-1 z-10">
    {/* 블록 타입별 빠른 설정 */}
    {block.type === 'grid' && (
      <div className="flex items-center space-x-1">
        <button
          onClick={() => onUpdate({ 
            data: { ...block.data, columns: Math.max(2, (block.data.columns || 4) - 1) }
          })}
          className="p-1 text-gray-600 hover:text-gray-900 text-xs"
          title="컬럼 줄이기"
        >
          -
        </button>
        <span className="text-xs text-gray-500 min-w-[20px] text-center">
          {block.data.columns || 4}
        </span>
        <button
          onClick={() => onUpdate({ 
            data: { ...block.data, columns: Math.min(8, (block.data.columns || 4) + 1) }
          })}
          className="p-1 text-gray-600 hover:text-gray-900 text-xs"
          title="컬럼 늘리기"
        >
          +
        </button>
      </div>
    )}

    <div className="w-px h-4 bg-gray-300" />

    <button
      onClick={onEdit}
      className="p-1 text-gray-600 hover:text-gray-900"
      title="편집"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    </button>

    <button
      onClick={onAddBelow}
      className="p-1 text-gray-600 hover:text-gray-900"
      title="아래에 블록 추가"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
      </svg>
    </button>

    <button
      onClick={onDelete}
      className="p-1 text-red-600 hover:text-red-700"
      title="삭제"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
      </svg>
    </button>
  </div>
);

// 블록 렌더러
const BlockRenderer: React.FC<{
  block: StoreBlock;
  products: any[];
  isEditing: boolean;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, products, isEditing, onUpdate }) => {
  switch (block.type) {
    case 'grid':
      return <GridBlockRenderer block={block} products={products} isEditing={isEditing} onUpdate={onUpdate} />;
    case 'featured':
      return <FeaturedBlockRenderer block={block} products={products} isEditing={isEditing} onUpdate={onUpdate} />;
    case 'text':
      return <TextBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
    case 'banner':
      return <BannerBlockRenderer block={block} isEditing={isEditing} onUpdate={onUpdate} />;
    default:
      return <div className="p-4 text-gray-500">알 수 없는 블록 타입: {block.type}</div>;
  }
};

// 그리드 블록 렌더러
const GridBlockRenderer: React.FC<{
  block: StoreBlock;
  products: any[];
  isEditing: boolean;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, products, isEditing, onUpdate }) => {
  const columns = block.data.columns || 4;
  const spacing = block.data.spacing || 'normal';
  
  const spacingClass = {
    tight: 'gap-2',
    normal: 'gap-4',
    loose: 'gap-6'
  }[spacing];

  return (
    <div className="p-4">
      <div 
        className={`grid ${spacingClass}`}
        style={{ gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))` }}
      >
        {products.slice(0, columns * 2).map(product => (
          <div key={product.id} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
            <div className="aspect-square bg-gray-100">
              {product.product_image_url && (
                <img
                  src={product.product_image_url}
                  alt={product.product_name}
                  className="w-full h-full object-cover"
                />
              )}
            </div>
            <div className="p-3">
              <h3 className="font-medium text-sm">{product.product_name}</h3>
              <p className="text-gray-600 text-sm">{product.price?.toLocaleString()}원</p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

// 피처드 블록 렌더러
const FeaturedBlockRenderer: React.FC<{
  block: StoreBlock;
  products: any[];
  isEditing: boolean;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, products }) => {
  const featuredProduct = products[0];
  
  if (!featuredProduct) {
    return (
      <div className="h-64 bg-gray-100 flex items-center justify-center">
        <p className="text-gray-500">피처드할 제품이 없습니다</p>
      </div>
    );
  }

  return (
    <div className="relative h-96 bg-gray-900 overflow-hidden">
      {featuredProduct.product_image_url && (
        <img
          src={featuredProduct.product_image_url}
          alt={featuredProduct.product_name}
          className="w-full h-full object-cover"
        />
      )}
      <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
        <div className="text-center text-white">
          <h2 className="text-3xl font-bold mb-4">{featuredProduct.product_name}</h2>
          <p className="text-xl">{featuredProduct.price?.toLocaleString()}원</p>
        </div>
      </div>
    </div>
  );
};

// 텍스트 블록 렌더러
const TextBlockRenderer: React.FC<{
  block: StoreBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block, isEditing, onUpdate }) => {
  const handleTextChange = (newText: string) => {
    onUpdate({
      data: { ...block.data, text_content: newText }
    });
  };

  if (isEditing && block.isEditing) {
    return (
      <div className="p-8">
        <textarea
          value={block.data.text_content || ''}
          onChange={(e) => handleTextChange(e.target.value)}
          className="w-full p-4 border border-gray-300 rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          rows={4}
          placeholder="텍스트를 입력하세요..."
          autoFocus
        />
      </div>
    );
  }

  return (
    <div className="p-8">
      <div className="max-w-4xl mx-auto text-center">
        <p className="text-lg">{block.data.text_content || '텍스트 블록'}</p>
      </div>
    </div>
  );
};

// 배너 블록 렌더러
const BannerBlockRenderer: React.FC<{
  block: StoreBlock;
  isEditing: boolean;
  onUpdate: (updates: Partial<StoreBlock>) => void;
}> = ({ block }) => {
  const height = block.data.banner_height === 'large' ? 'h-64' : 'h-48';
  
  return (
    <div className={`${height} bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center`}>
      <div className="text-white text-center">
        <h2 className="text-3xl font-bold mb-4">특별 프로모션</h2>
        {block.data.call_to_action && (
          <button className="px-6 py-3 bg-white text-gray-900 rounded-lg font-medium">
            {block.data.call_to_action}
          </button>
        )}
      </div>
    </div>
  );
}; 