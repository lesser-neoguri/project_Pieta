import React, { useState, useCallback, useEffect } from 'react';
import { StoreBlock, TextBlockData, ProductGridBlockData } from '@/types/blockTypes';
import { InlineEditableBlock } from './InlineEditableBlock';
import { TiptapTextBlock } from './TiptapTextBlock';
import { BlockInsertionMenu } from './BlockInsertionMenu';
import { AutoSaveManager } from './AutoSaveManager';
import { useEditorState } from '@/hooks/useEditorState';
import ProductCard, { ProductCardData } from '@/components/ProductCard';

interface InlinePreviewAreaProps {
  storeId: string;
  storeData: any;
  products: any[];
  design: any; // 기존 StoreDesign 타입
  onDesignUpdate: (updates: any) => void;
  sortBy: string;
  className?: string;
}

export const InlinePreviewArea: React.FC<InlinePreviewAreaProps> = ({
  storeId,
  storeData,
  products,
  design,
  onDesignUpdate,
  sortBy,
  className = ""
}) => {
  const { state, actions } = useEditorState(storeId);
  const [showInsertMenu, setShowInsertMenu] = useState(false);
  const [insertPosition, setInsertPosition] = useState(0);
  const [insertMenuSearch, setInsertMenuSearch] = useState('');

  // row_layouts를 StoreBlock 배열로 변환
  const convertRowLayoutsToBlocks = useCallback((rowLayouts: any): StoreBlock[] => {
    if (!rowLayouts) return [];
    
    return Object.entries(rowLayouts).map(([index, layout]: [string, any]) => ({
      id: `block-${index}`,
      type: layout.layout_type,
      position: parseInt(index),
      data: layout,
      spacing: layout.spacing || 'normal',
      background_color: layout.background_color,
      text_alignment: layout.text_alignment || 'left',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })) as StoreBlock[];
  }, []);

  // StoreBlock 배열을 row_layouts로 변환
  const convertBlocksToRowLayouts = useCallback((blocks: StoreBlock[]) => {
    const rowLayouts: any = {};
    blocks.forEach((block, index) => {
      rowLayouts[index.toString()] = {
        ...block.data,
        layout_type: block.type
      };
    });
    return rowLayouts;
  }, []);

  // 초기 블록 로드
  useEffect(() => {
    const initialBlocks = convertRowLayoutsToBlocks(design.row_layouts);
    actions.setBlocks(initialBlocks);
  }, [design.row_layouts, convertRowLayoutsToBlocks, actions]);

  // 블록 변경 시 design 업데이트
  useEffect(() => {
    if (state.blocks.length > 0) {
      const newRowLayouts = convertBlocksToRowLayouts(state.blocks);
      onDesignUpdate({
        ...design,
        row_layouts: newRowLayouts
      });
    }
  }, [state.blocks, convertBlocksToRowLayouts, onDesignUpdate]);

  // 블록 추가 핸들러
  const handleAddBlock = useCallback((blockType: StoreBlock['type'], position: number) => {
    const newBlock: StoreBlock = {
      id: `block-${Date.now()}`,
      type: blockType,
      position,
      data: getDefaultDataForType(blockType),
      spacing: 'normal',
      text_alignment: 'left',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    } as StoreBlock;

    actions.addBlock(newBlock, position);
    setShowInsertMenu(false);
    setInsertMenuSearch('');
  }, [actions]);

  // 블록 업데이트 핸들러
  const handleUpdateBlock = useCallback((blockId: string, updates: Partial<StoreBlock>) => {
    actions.updateBlock(blockId, { ...updates, updated_at: new Date().toISOString() });
  }, [actions]);

  // 블록 복제 핸들러
  const handleDuplicateBlock = useCallback((blockId: string) => {
    const blockToDuplicate = state.blocks.find(b => b.id === blockId);
    if (!blockToDuplicate) return;

    const newBlock: StoreBlock = {
      ...blockToDuplicate,
      id: `block-${Date.now()}`,
      position: blockToDuplicate.position + 1,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };

    actions.addBlock(newBlock, newBlock.position);
  }, [state.blocks, actions]);

  // 빈 영역 클릭 시 선택 해제
  const handleBackgroundClick = useCallback(() => {
    actions.selectBlock(null);
    actions.setEditing(null);
  }, [actions]);

  // 블록 간 삽입 영역 렌더링
  const renderInsertionArea = (position: number) => (
    <div
      key={`insert-${position}`}
      className="group relative py-2 -my-1"
      onMouseEnter={() => setInsertPosition(position)}
    >
      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
        <div className="flex items-center justify-center">
          <button
            onClick={() => {
              setInsertPosition(position);
              setShowInsertMenu(true);
            }}
            className="w-8 h-8 bg-blue-500 hover:bg-blue-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
            title="새 블록 추가"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  );

  // 개별 블록 렌더링
  const renderBlock = (block: StoreBlock) => {
    const isSelected = state.selectedBlockId === block.id;
    const isEditing = state.editingBlockId === block.id;

    return (
      <InlineEditableBlock
        key={block.id}
        block={block}
        isSelected={isSelected}
        isEditing={isEditing}
        onSelect={actions.selectBlock}
        onEdit={actions.setEditing}
        onUpdate={handleUpdateBlock}
        onDelete={actions.deleteBlock}
        onDuplicate={handleDuplicateBlock}
        className="mb-6"
      >
        {renderBlockContent(block, isEditing)}
      </InlineEditableBlock>
    );
  };

  // 블록 콘텐츠 렌더링
  const renderBlockContent = (block: StoreBlock, isEditing: boolean) => {
    switch (block.type) {
      case 'text':
        if (isEditing) {
          return (
            <TiptapTextBlock
              data={block.data as TextBlockData}
              isEditing={true}
              isSelected={true}
              onUpdate={(updates) => handleUpdateBlock(block.id, { data: updates })}
              onEditStart={() => actions.setEditing(block.id)}
              onEditEnd={() => actions.setEditing(null)}
              placeholder="텍스트를 입력하세요..."
            />
          );
        }
        return <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: block.data.text_content || '' }} />;

      case 'grid':
        return renderProductGrid(block);

      case 'featured':
        return renderFeaturedBlock(block);

      case 'banner':
        return renderBannerBlock(block);

      case 'list':
        return renderListBlock(block);

      case 'masonry':
        return renderMasonryBlock(block);

      default:
        return <div className="p-4 bg-gray-100 rounded">알 수 없는 블록 타입: {block.type}</div>;
    }
  };

  // 제품 그리드 렌더링
  const renderProductGrid = (block: StoreBlock) => {
    const gridData = block.data as ProductGridBlockData;
    const sortedProducts = sortProducts(products, sortBy);
    const columns = gridData.columns || 4;

    return (
      <div className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 4)} lg:grid-cols-${columns} gap-4`}>
        {/* 제품 등록 카드 */}
        <div className="group cursor-pointer">
          <div className="aspect-square bg-gray-100 border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center rounded-lg">
            <div className="text-center">
              <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
              </svg>
              <span className="text-xs text-gray-500 group-hover:text-gray-600 transition-colors font-medium">
                제품 등록
              </span>
            </div>
          </div>
        </div>

        {/* 실제 제품들 */}
        {sortedProducts.slice(0, Math.max(1, columns * 3 - 1)).map((product) => (
          <ProductCard
            key={product.id}
            product={product as ProductCardData}
            variant={gridData.card_style as any}
            showRating={true}
            showActions={true}
            isOwner={true}
            onEdit={() => {}}
            onDelete={() => {}}
            customAspectRatio={getAspectRatioClass(gridData.height_ratio)}
            textAlignment={block.text_alignment}
          />
        ))}

        {/* 샘플 제품들 */}
        {Array.from({ length: Math.max(0, columns * 2 - sortedProducts.length) }).map((_, i) => {
          const sampleProduct: ProductCardData = {
            id: `sample-${i}`,
            product_name: `Sample Product ${i + 1}`,
            price: 99000 + (i * 10000),
            discount_percentage: i % 3 === 0 ? 10 : undefined,
            product_image_url: null,
            store_id: storeId,
            category: 'jewelry',
            is_available: true,
            created_at: new Date().toISOString()
          };

          return (
            <ProductCard
              key={`sample-${i}`}
              product={sampleProduct}
              variant={gridData.card_style as any}
              showRating={false}
              showActions={false}
              isOwner={false}
              onEdit={() => {}}
              onDelete={() => {}}
              customAspectRatio={getAspectRatioClass(gridData.height_ratio)}
              textAlignment={block.text_alignment}
            />
          );
        })}
      </div>
    );
  };

  // 다른 블록 타입들의 기본 렌더링
  const renderFeaturedBlock = (block: StoreBlock) => (
    <div className="relative bg-gray-100 h-64 rounded-lg flex items-center justify-center">
      <span className="text-gray-500">피처드 블록 (클릭하여 편집)</span>
    </div>
  );

  const renderBannerBlock = (block: StoreBlock) => (
    <div className="relative bg-gradient-to-r from-blue-500 to-purple-600 h-32 rounded-lg flex items-center justify-center">
      <span className="text-white font-semibold">{block.data.call_to_action || '배너 블록'}</span>
    </div>
  );

  const renderListBlock = (block: StoreBlock) => (
    <div className="space-y-4">
      {products.slice(0, 3).map((product) => (
        <div key={product.id} className="flex items-center space-x-4 p-4 border rounded-lg">
          <div className="w-16 h-16 bg-gray-200 rounded"></div>
          <div>
            <h3 className="font-medium">{product.product_name}</h3>
            <p className="text-gray-600">₩{product.price?.toLocaleString()}</p>
          </div>
        </div>
      ))}
    </div>
  );

  const renderMasonryBlock = (block: StoreBlock) => (
    <div className="columns-2 md:columns-3 gap-4">
      {products.slice(0, 6).map((product) => (
        <div key={product.id} className="break-inside-avoid mb-4">
          <ProductCard
            product={product as ProductCardData}
            variant="default"
            showRating={true}
            showActions={true}
            isOwner={true}
            onEdit={() => {}}
            onDelete={() => {}}
          />
        </div>
      ))}
    </div>
  );

  return (
    <AutoSaveManager
      storeId={storeId}
      blocks={state.blocks}
      isDirty={state.isDirty}
      strategy="debounced"
    >
      <div
        className={`${className} min-h-screen`}
        onClick={handleBackgroundClick}
        style={{
          backgroundColor: design.background_color,
          color: design.text_color,
          fontFamily: design.font_family
        }}
      >
        {/* 스토어 헤더 */}
        <div className="relative">
          {renderStoreHeader()}
        </div>

        {/* 블록들 렌더링 */}
        <div className="max-w-7xl mx-auto px-4 py-8">
          {state.blocks.length === 0 && renderInsertionArea(0)}
          
          {state.blocks
            .sort((a, b) => a.position - b.position)
            .map((block, index) => (
              <React.Fragment key={block.id}>
                {index === 0 && renderInsertionArea(0)}
                {renderBlock(block)}
                {renderInsertionArea(index + 1)}
              </React.Fragment>
            ))}

          {/* 빈 상태 메시지 */}
          {state.blocks.length === 0 && (
            <div className="text-center py-16">
              <svg className="w-16 h-16 text-gray-300 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
              </svg>
              <h3 className="text-lg font-medium text-gray-600 mb-2">블록을 추가하여 시작하세요</h3>
              <p className="text-gray-500">위의 + 버튼을 클릭하여 첫 번째 블록을 추가할 수 있습니다.</p>
            </div>
          )}
        </div>

        {/* 블록 삽입 메뉴 */}
        {showInsertMenu && (
          <BlockInsertionMenu
            isOpen={showInsertMenu}
            position={{ x: 0, y: 0 }}
            searchQuery={insertMenuSearch}
            onClose={() => setShowInsertMenu(false)}
            onInsertBlock={handleAddBlock}
            insertPosition={insertPosition}
          />
        )}
      </div>
    </AutoSaveManager>
  );

  // 스토어 헤더 렌더링
  function renderStoreHeader() {
    return (
      <div className={`relative ${getBannerHeight()}`}>
        {design.banner_image_url && (
          <img
            src={design.banner_image_url}
            alt="Store Banner"
            className="w-full h-full object-cover"
          />
        )}
        <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center">
          <div className="text-center text-white">
            <h1 className={`font-bold mb-2 ${getTitleSize()}`}>
              {storeData?.store_name || '스토어 이름'}
            </h1>
            {design.show_store_description && storeData?.description && (
              <p className={`opacity-90 ${getDescriptionSize()}`}>
                {storeData.description}
              </p>
            )}
          </div>
        </div>
      </div>
    );
  }

  function getBannerHeight() {
    switch (design.banner_height) {
      case 'small': return 'h-32';
      case 'medium': return 'h-48';
      case 'large': return 'h-64';
      case 'full': return 'h-screen';
      default: return 'h-48';
    }
  }

  function getTitleSize() {
    switch (design.title_font_size) {
      case 'small': return 'text-lg';
      case 'medium': return 'text-xl';
      case 'large': return 'text-2xl md:text-3xl';
      case 'xl': return 'text-3xl md:text-4xl';
      default: return 'text-2xl md:text-3xl';
    }
  }

  function getDescriptionSize() {
    switch (design.description_font_size) {
      case 'small': return 'text-sm';
      case 'medium': return 'text-base';
      case 'large': return 'text-lg';
      default: return 'text-base';
    }
  }
};

// 유틸리티 함수들
const sortProducts = (products: any[], sortBy: string) => {
  const sorted = [...products];
  switch (sortBy) {
    case 'price_asc':
      return sorted.sort((a, b) => a.price - b.price);
    case 'price_desc':
      return sorted.sort((a, b) => b.price - a.price);
    case 'rating':
      return sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
    case 'newest':
    default:
      return sorted.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }
};

const getAspectRatioClass = (ratio?: string) => {
  switch (ratio) {
    case 'square': return 'aspect-square';
    case 'portrait': return 'aspect-[3/4]';
    case 'landscape': return 'aspect-[4/3]';
    case 'auto': return '';
    default: return 'aspect-square';
  }
};

const getDefaultDataForType = (type: StoreBlock['type']): any => {
  switch (type) {
    case 'text':
      return {
        text_content: '새 텍스트 블록입니다.',
        text_size: 'medium',
        text_color: '#333333',
        text_weight: 'normal',
        text_style: 'paragraph',
        max_width: 'medium',
        padding: 'medium'
      };
    case 'grid':
      return {
        columns: 4,
        card_style: 'default',
        height_ratio: 'square',
        spacing: 'normal'
      };
    case 'featured':
      return {
        featured_size: 'large',
        show_text_overlay: true,
        overlay_position: 'center'
      };
    case 'banner':
      return {
        banner_height: 'medium',
        banner_style: 'gradient',
        call_to_action: '지금 구매하기'
      };
    case 'list':
      return {
        list_style: 'horizontal',
        show_description: true,
        show_price_prominent: false
      };
    case 'masonry':
      return {
        masonry_columns: 3,
        min_height: 'medium'
      };
    default:
      return {};
  }
}; 