'use client';

import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { 
  DragDropContext, 
  Droppable, 
  Draggable, 
  DropResult,
  DragStart,
  DragUpdate,
  DroppableProvided,
  DroppableStateSnapshot,
  DraggableProvided,
  DraggableStateSnapshot
} from '@hello-pangea/dnd';
import { supabase } from '@/lib/supabase';
import ProductCard from '@/components/ProductCard';
import { v4 as uuidv4 } from 'uuid';

// 타입 정의
export type BlockWidth = 'contained' | 'full-width';
export type Spacing = 'tight' | 'normal' | 'loose' | 'extra-loose';
export type TextAlignment = 'left' | 'center' | 'right';

// 기본값 상수 정의
export const DEFAULT_BLOCK_WIDTH: BlockWidth = 'contained';
export const DEFAULT_SPACING: Spacing = 'normal';
export const DEFAULT_TEXT_ALIGNMENT: TextAlignment = 'center';

/**
 * 블록 데이터에 기본값을 적용하는 헬퍼 함수
 * 누락된 필수 속성들을 기본값으로 채웁니다.
 * 
 * @param block - 기본값을 적용할 블록 데이터
 * @returns 기본값이 적용된 블록 데이터
 */
export const applyDefaultValues = (block: StoreBlock): StoreBlock => {
  return {
    ...block,
    spacing: block.spacing || DEFAULT_SPACING,
    text_alignment: block.text_alignment || DEFAULT_TEXT_ALIGNMENT,
    block_width: block.block_width || DEFAULT_BLOCK_WIDTH,
  };
};

/**
 * 블록 간격 설정에 따른 CSS 클래스를 반환하는 헬퍼 함수
 * 
 * @param spacing - 간격 설정값
 * @returns CSS 클래스 문자열
 */
export const getSpacingClass = (spacing?: Spacing): string => {
  switch (spacing) {
    case 'tight': return 'mt-2';
    case 'loose': return 'mt-8';
    case 'extra-loose': return 'mt-12';
    default: return 'mt-4';
  }
};

// 블록 타입 정의
export interface StoreBlockBase {
  id: string; // position-based id (for compatibility)
  stableId: string; // permanent unique identifier for React keys
  type: 'text' | 'grid' | 'featured' | 'banner' | 'list' | 'masonry';
  position: number;
  isEditing?: boolean;

  // 공통 필드
  spacing: Spacing;
  background_color?: string;
  text_alignment?: TextAlignment;
  block_width?: BlockWidth; // 블록 너비 설정
  height?: number; // 픽셀 단위 높이
  min_height?: number; // 최소 높이
  max_height?: number; // 최대 높이
}

export interface TextBlockData extends StoreBlockBase {
  type: 'text';
  text_content?: string;
  text_size?: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
  text_color?: string;
  text_weight?: 'normal' | 'medium' | 'semibold' | 'bold';
  text_style?: 'paragraph' | 'heading' | 'quote' | 'highlight';
  max_width?: 'narrow' | 'medium' | 'wide' | 'full';
  padding?: 'small' | 'medium' | 'large' | 'xl';
}

export interface GridBlockData extends StoreBlockBase {
  type: 'grid';
  columns?: number;
  card_style?: 'default' | 'compact' | 'detailed' | 'large';
  height_ratio?: 'square' | 'portrait' | 'landscape' | 'auto';
  max_products?: number;
}

export interface FeaturedBlockData extends StoreBlockBase {
  type: 'featured';
  featured_size?: 'hero' | 'large' | 'medium';
  show_text_overlay?: boolean;
  overlay_position?: 'center' | 'bottom' | 'top';
  featured_image_url?: string;
  linked_product_id?: string;
  featured_title?: string;
  featured_description?: string;
  featured_cta?: string;
}

export interface BannerBlockData extends StoreBlockBase {
  type: 'banner';
  banner_height?: 'small' | 'medium' | 'large' | 'full';
  banner_style?: 'image' | 'gradient' | 'solid';
  call_to_action?: string;
  banner_title?: string;
  banner_description?: string;
  banner_image_url?: string;
}

export interface ListBlockData extends StoreBlockBase {
  type: 'list';
  list_style?: 'horizontal' | 'vertical' | 'card';
  show_description?: boolean;
  show_price_prominent?: boolean;
}

export interface MasonryBlockData extends StoreBlockBase {
  type: 'masonry';
  masonry_columns?: number;
  masonry_min_height?: 'small' | 'medium' | 'large'; // 충돌 방지를 위해 이름 변경
}

export type StoreBlock = 
  | TextBlockData 
  | GridBlockData 
  | FeaturedBlockData 
  | BannerBlockData 
  | ListBlockData 
  | MasonryBlockData;

interface InlinePreviewAreaProps {
  storeId: string;
  design: any; // 기존 StoreDesign 타입
  onDesignUpdate: (updatedDesign: any) => void;
  onSelectedBlockChange?: (selectedBlock: StoreBlock | null) => void;
  onBlockDoubleClick?: (blockId: string) => void;
  products: any[];
  storeData?: any; // 상점 데이터 추가
  className?: string;
  readOnly?: boolean; // 읽기 전용 모드 추가
}

interface DragState {
  isDragging: boolean;
  draggedBlockStableId: string | null;
}

// 노션 스타일 블록 삽입 인터페이스
interface BlockInsertMenu {
  isVisible: boolean;
  position: number; // 삽입될 위치 (before: 해당 블록 앞, after: 해당 블록 뒤, -1: 맨 앞)
  insertType: 'before' | 'after' | 'start';
}

// 블록 변환 - 클라이언트 상태를 고려
/**
 * row_layouts 데이터를 StoreBlock 배열로 변환
 * 
 * @param rowLayouts - 변환할 row_layouts 데이터
 * @param isClient - 클라이언트 사이드 실행 여부
 * @returns 변환된 StoreBlock 배열
 */
export const convertRowLayoutsToStoreBlocks = (rowLayouts: any, isClient: boolean = true): StoreBlock[] => {
  if (!rowLayouts || typeof rowLayouts !== 'object') return [];
  
  return Object.entries(rowLayouts)
    .map(([index, layout]: [string, any]) => {
      const position = parseInt(index, 10);
      
      // SSR 호환성을 위한 안전한 stableId 생성
      let stableId = layout.stableId;
      if (!stableId) {
        if (isClient) {
          // 클라이언트에서만 UUID 생성
          stableId = uuidv4();
        } else {
          // 서버에서는 deterministic ID 사용
          stableId = `stable-${position}-${layout.layout_type}`;
        }
      }
      
      const baseBlock: StoreBlockBase = {
        id: `block-${position}`,
        stableId: stableId,
        type: layout.layout_type,
        position: position,
        spacing: layout.spacing || DEFAULT_SPACING,
        background_color: layout.background_color,
        text_alignment: layout.text_alignment || DEFAULT_TEXT_ALIGNMENT,
        block_width: layout.block_width || DEFAULT_BLOCK_WIDTH,
        height: layout.height,
        min_height: layout.min_height,
        max_height: layout.max_height,
      };

      // 타입별로 특화된 속성 추가
      switch (layout.layout_type) {
        case 'text':
          return {
            ...baseBlock,
            type: 'text',
            text_content: layout.text_content,
            text_size: layout.text_size,
            text_color: layout.text_color,
            text_weight: layout.text_weight,
            text_style: layout.text_style,
            max_width: layout.max_width,
            padding: layout.padding,
          } as TextBlockData;

        case 'grid':
          return {
            ...baseBlock,
            type: 'grid',
            columns: layout.columns,
            card_style: layout.card_style,
            height_ratio: layout.height_ratio,
            max_products: layout.max_products,
          } as GridBlockData;

        case 'featured':
          return {
            ...baseBlock,
            type: 'featured',
            featured_size: layout.featured_size,
            show_text_overlay: layout.show_text_overlay,
            overlay_position: layout.overlay_position,
            featured_image_url: layout.featured_image_url,
            linked_product_id: layout.linked_product_id,
            featured_title: layout.featured_title,
            featured_description: layout.featured_description,
            featured_cta: layout.featured_cta,
          } as FeaturedBlockData;

        case 'banner':
          return {
            ...baseBlock,
            type: 'banner',
            banner_height: layout.banner_height,
            banner_style: layout.banner_style,
            call_to_action: layout.call_to_action,
            banner_title: layout.banner_title,
            banner_description: layout.banner_description,
            banner_image_url: layout.banner_image_url,
          } as BannerBlockData;

        case 'list':
          return {
            ...baseBlock,
            type: 'list',
            list_style: layout.list_style,
            show_description: layout.show_description,
            show_price_prominent: layout.show_price_prominent,
          } as ListBlockData;

        case 'masonry':
          return {
            ...baseBlock,
            type: 'masonry',
            masonry_columns: layout.masonry_columns,
            masonry_min_height: layout.min_height || layout.masonry_min_height,
          } as MasonryBlockData;

        default:
          return {
            ...baseBlock,
            type: 'text',
            text_content: '알 수 없는 블록 타입',
          } as TextBlockData;
      }
    })
    .map(block => applyDefaultValues(block))
    .sort((a, b) => a.position - b.position);
};

// 블록 변환 - row_layouts -> StoreBlock[] 변환
/**
 * StoreBlock 배열을 row_layouts 형태로 변환
 * 
 * @param blocks - 변환할 StoreBlock 배열
 * @returns row_layouts 형태의 데이터
 */
export const convertStoreBlocksToRowLayouts = (blocks: StoreBlock[]) => {
  const rowLayouts: any = {};
  blocks.forEach((block, index) => {
    const { id, stableId, type, position, isEditing, ...layoutData } = block;
    rowLayouts[index.toString()] = {
      ...layoutData,
      layout_type: type,
      stableId: stableId, // 고유 ID 보존
    };
  });
  return rowLayouts;
};

export const BasicInlinePreviewArea: React.FC<InlinePreviewAreaProps> = ({
  storeId,
  design,
  onDesignUpdate,
  onSelectedBlockChange,
  onBlockDoubleClick,
  products,
  storeData,
  className = "",
  readOnly = false
}) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, draggedBlockStableId: null });
  const [insertMenu, setInsertMenu] = useState<BlockInsertMenu>({ isVisible: false, position: -1, insertType: 'start' });
  
  // 클라이언트 마운트 감지
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 블록 변환 - 클라이언트 상태를 고려
  const blocks = useMemo(() => {
    return convertRowLayoutsToStoreBlocks(design.row_layouts, isClient);
  }, [design.row_layouts, isClient]);

  // 기존 블록들의 중앙정렬 강제 적용 함수
  const updateAllBlocksAlignment = useCallback(() => {
    const updatedBlocks = blocks.map(block => ({
      ...block,
      text_alignment: DEFAULT_TEXT_ALIGNMENT
    }));
    
    const newRowLayouts = convertStoreBlocksToRowLayouts(updatedBlocks);
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });
  }, [blocks, design, onDesignUpdate]);

  // 컴포넌트 마운트 시 중앙정렬 자동 적용
  useEffect(() => {
    if (isClient && blocks.length > 0) {
      // 중앙정렬이 설정되지 않은 블록이 있는지 확인
      const needsUpdate = blocks.some(block => !block.text_alignment || block.text_alignment === 'left');
      
      if (needsUpdate) {
        // 0.5초 지연 후 자동 업데이트 (사용자가 눈치채지 못하도록)
        setTimeout(() => {
          updateAllBlocksAlignment();
        }, 500);
      }
    }
  }, [isClient, blocks, updateAllBlocksAlignment]);

  // 드래그 시작 핸들러
  const handleDragStart = useCallback((start: DragStart) => {
    setDragState({
      isDragging: true,
      draggedBlockStableId: start.draggableId
    });
  }, []);

  // 드래그 업데이트 핸들러
  const handleDragUpdate = useCallback((update: DragUpdate) => {
    if (!update.destination) {
      setDragState(prev => ({ ...prev, draggedBlockStableId: null }));
      return;
    }

    const draggedIndex = blocks.findIndex(b => b.stableId === dragState.draggedBlockStableId);
    const destinationIndex = update.destination.index;
    
    // 노션 스타일: 드래그한 블록의 위치에 따라 삽입 위치 계산
    let insertIndex = destinationIndex;
    
    // 드래그한 블록이 목적지보다 앞에 있으면 삽입 위치를 조정
    if (draggedIndex !== -1 && draggedIndex < destinationIndex) {
      insertIndex = destinationIndex + 1;
    }
    
    setDragState(prev => ({
      ...prev,
      draggedBlockStableId: blocks[insertIndex]?.stableId || null
    }));
  }, [blocks, dragState.draggedBlockStableId]);

  // 드래그 종료 핸들러 - 애니메이션 최적화
  const handleDragEnd = useCallback((result: DropResult) => {
    // 드롭 실패 시 drag state만 리셋
    if (!result.destination) {
      setDragState({
        isDragging: false,
        draggedBlockStableId: null
      });
      return;
    }

    const sourceIndex = result.source.index;
    const destinationIndex = result.destination.index;

    // 같은 위치면 drag state만 리셋
    if (sourceIndex === destinationIndex) {
      setDragState({
        isDragging: false,
        draggedBlockStableId: null
      });
      return;
    }

    // 블록 재정렬 (stable ID 유지)
    const updatedBlocks = Array.from(blocks);
    const [reorderedItem] = updatedBlocks.splice(sourceIndex, 1);
    updatedBlocks.splice(destinationIndex, 0, reorderedItem);

    // 위치 기반 ID만 업데이트 (stableId는 유지)
    updatedBlocks.forEach((block, index) => {
      block.id = `block-${index}`;
      block.position = index;
    });

    // row_layouts로 변환하여 업데이트
    const newRowLayouts = convertStoreBlocksToRowLayouts(updatedBlocks);
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });

    // 애니메이션 완료 후 drag state 리셋 (지연)
    setTimeout(() => {
      setDragState({
        isDragging: false,
        draggedBlockStableId: null
      });
    }, 100); // 100ms 지연으로 애니메이션과 충돌 방지
  }, [blocks, design, onDesignUpdate]);

  // 블록 선택 핸들러
  const handleBlockSelect = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    
    // 선택된 블록 정보를 상위 컴포넌트로 전달
    const selectedBlock = blocks.find(block => block.id === blockId);
    onSelectedBlockChange?.(selectedBlock || null);
  }, [blocks, onSelectedBlockChange]);

  // 블록 편집 모드 진입 핸들러
  const handleBlockEdit = useCallback((blockId: string) => {
    setSelectedBlockId(blockId);
    // 부모 컴포넌트에 더블클릭 이벤트 알림
    onBlockDoubleClick?.(blockId);
  }, [onBlockDoubleClick]);

  // 블록 업데이트 핸들러
  const handleBlockUpdate = useCallback((blockId: string, newData: any) => {
    const updatedBlocks = blocks.map(block => 
      block.id === blockId 
        ? { ...block, ...newData }
        : block
    );
    
    const newRowLayouts = convertStoreBlocksToRowLayouts(updatedBlocks);
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });
  }, [blocks, design, onDesignUpdate]);

  // 새 블록 추가 핸들러 (위치 지정 가능)
  const handleAddBlock = useCallback((type: StoreBlock['type'], position?: number) => {
    if (!isClient) return;

    const newBlockData = getDefaultBlockData(type, isClient);
    const targetPosition = position !== undefined ? position : blocks.length;
    
    // 기존 블록들의 position 업데이트
    const updatedBlocks = blocks.map(block => 
      block.position >= targetPosition 
        ? { ...block, position: block.position + 1 }
        : block
    );

    const newBlock: StoreBlock = {
      ...newBlockData,
      id: `block-${targetPosition}`,
      position: targetPosition
    } as StoreBlock;

    const allBlocks = [...updatedBlocks, newBlock].sort((a, b) => a.position - b.position);
    
    // position 재정렬
    const reorderedBlocks = allBlocks.map((block, index) => ({
      ...block,
      id: `block-${index}`,
      position: index
    }));

    const newRowLayouts = convertStoreBlocksToRowLayouts(reorderedBlocks);
    
    const updatedDesign = {
      ...design,
      row_layouts: newRowLayouts
    };

    onDesignUpdate(updatedDesign);
    
    // 블록 삽입 메뉴 닫기
    setInsertMenu({
      isVisible: false,
      position: -1,
      insertType: 'start'
    });

    // 새로 추가된 블록 선택
    setSelectedBlockId(`block-${targetPosition}`);
    
    setTimeout(() => {
      if (onSelectedBlockChange) {
        const selectedBlock = reorderedBlocks.find(b => b.position === targetPosition);
        if (selectedBlock) {
          onSelectedBlockChange(selectedBlock);
        }
      }
    }, 100);
  }, [blocks, design, onDesignUpdate, onSelectedBlockChange, isClient]);

  // 블록 삽입 메뉴 열기
  const openBlockInsertMenu = useCallback((position: number, insertType: 'before' | 'after' | 'start') => {
    setInsertMenu({
      isVisible: true,
      position,
      insertType
    });
  }, []);

  // 블록 삽입 메뉴 닫기
  const closeBlockInsertMenu = useCallback(() => {
    setInsertMenu({
      isVisible: false,
      position: -1,
      insertType: 'start'
    });
  }, []);

  // 블록 타입 선택 핸들러
  const handleBlockTypeSelect = useCallback((type: StoreBlock['type']) => {
    let insertPosition: number;
    
    if (insertMenu.insertType === 'start') {
      insertPosition = 0;
    } else if (insertMenu.insertType === 'after') {
      insertPosition = insertMenu.position + 1;
    } else { // before
      insertPosition = insertMenu.position;
    }
    
    handleAddBlock(type, insertPosition);
  }, [insertMenu, handleAddBlock]);

  // 블록 삭제 핸들러
  const handleDeleteBlock = useCallback((blockId: string) => {
    const updatedBlocks = blocks
      .filter(block => block.id !== blockId)
      .map((block, index) => ({
        ...block,
        id: `block-${index}`,
        position: index
      }));
    
    const newRowLayouts = convertStoreBlocksToRowLayouts(updatedBlocks);
    
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });

    setSelectedBlockId(null);
  }, [blocks, design, onDesignUpdate]);

  // 블록 이동 핸들러 (위/아래 버튼용)
  const handleMoveBlock = useCallback((blockId: string, direction: 'up' | 'down') => {
    const blockIndex = blocks.findIndex(block => block.id === blockId);
    if (blockIndex === -1) return;

    const newIndex = direction === 'up' ? blockIndex - 1 : blockIndex + 1;
    if (newIndex < 0 || newIndex >= blocks.length) return;

    const updatedBlocks = [...blocks];
    [updatedBlocks[blockIndex], updatedBlocks[newIndex]] = [updatedBlocks[newIndex], updatedBlocks[blockIndex]];
    
    // 위치와 ID 재정렬
    updatedBlocks.forEach((block, index) => {
      block.id = `block-${index}`;
      block.position = index;
    });

    const newRowLayouts = convertStoreBlocksToRowLayouts(updatedBlocks);
    
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });
  }, [blocks, design, onDesignUpdate]);

  // 빈 영역 클릭 시 선택 해제
  const handleBackgroundClick = useCallback(() => {
    setSelectedBlockId(null);
    
    // 선택 해제를 상위 컴포넌트로 전달
    onSelectedBlockChange?.(null);
  }, [onSelectedBlockChange]);

  // SSR로 인한 hydration mismatch를 방지하기 위해 클라이언트에서만 드래그 기능 활성화
  if (!isClient) {
    return (
      <div 
        className={`${className} min-h-screen`}
        style={{
          backgroundColor: design.background_color || '#ffffff',
          fontFamily: design.font_family || 'Inter'
        }}
      >
        {/* 상점 헤더 배너 (SSR 버전) */}
        <div 
          className={`relative overflow-hidden ${
            design.banner_height === 'small' ? 'h-64 md:h-80' :
            design.banner_height === 'large' ? 'h-96 md:h-[32rem]' :
            design.banner_height === 'full' ? 'h-screen' :
            'h-80 md:h-96'
          }`}
          style={{ 
            backgroundColor: design.theme_color || '#000000',
            backgroundImage: design.banner_image_url 
              ? `linear-gradient(to bottom right, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${design.banner_image_url})`
              : `linear-gradient(to bottom right, ${design.theme_color || '#000000'}, #1f2937)`,
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            backgroundRepeat: 'no-repeat'
          }}
        >
          {/* 배경 패턴 (이미지가 없을 때만) */}
          {!design.banner_image_url && (
            <div className="absolute inset-0 opacity-10">
              <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-y-12"></div>
            </div>
          )}

          {/* 상점 정보 오버레이 */}
          <div className="absolute inset-0">
            {/* 상점명 */}
            <div 
              className="absolute text-white"
              style={{
                left: `${design.title_position_x || 50}%`,
                top: `${design.title_position_y || 40}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <div className="flex items-center space-x-4">
                <h1 className={`
                  ${design.title_font_size === 'small' ? 'text-2xl md:text-3xl' :
                    design.title_font_size === 'medium' ? 'text-3xl md:text-4xl' :
                    design.title_font_size === 'xl' ? 'text-5xl md:text-6xl' :
                    'text-4xl md:text-5xl'
                  } font-light tracking-wide
                `}>
                  {storeData?.store_name || '상점 이름'}
                </h1>
                <span className={`px-3 py-1 text-xs uppercase tracking-wider font-medium border ${
                  storeData?.is_open 
                    ? 'bg-green-500/20 text-green-100 border-green-400/30'
                    : 'bg-red-500/20 text-red-100 border-red-400/30'
                }`}>
                  {storeData?.is_open ? '영업중' : '휴무중'}
                </span>
              </div>
            </div>
            
            {/* 상점 설명 */}
            {design.show_store_description && (
              <div 
                className="absolute text-white"
                style={{
                  left: `${design.description_position_x || 50}%`,
                  top: `${design.description_position_y || 60}%`,
                  transform: 'translate(-50%, -50%)'
                }}
              >
                <p className={`
                  text-center text-gray-200 max-w-2xl leading-relaxed
                  ${design.description_font_size === 'small' ? 'text-xs md:text-sm' :
                    design.description_font_size === 'large' ? 'text-base md:text-lg' :
                    'text-sm md:text-base'
                  }
                `}>
                  {storeData?.description || '상점 설명이 여기에 표시됩니다'}
                </p>
              </div>
            )}
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-8 py-8">
          {/* 로딩 상태 표시 */}
          <div className="flex flex-col items-center justify-center h-96 space-y-4">
            <div className="h-8 bg-gray-200 w-64 mx-auto mb-4"></div>
            <div className="h-4 bg-gray-200 w-96 mx-auto"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div 
      className={`${className} min-h-screen`}
      onClick={handleBackgroundClick}
      style={{
        backgroundColor: design.background_color || '#ffffff',
        fontFamily: design.font_family || 'Inter'
      }}
    >
      {/* 상점 헤더 배너 추가 */}
      <div 
        className={`relative overflow-hidden ${
          design.banner_height === 'small' ? 'h-64 md:h-80' :
          design.banner_height === 'large' ? 'h-96 md:h-[32rem]' :
          design.banner_height === 'full' ? 'h-screen' :
          'h-80 md:h-96'
        }`}
        style={{ 
          backgroundColor: design.theme_color || '#000000',
          backgroundImage: design.banner_image_url 
            ? `linear-gradient(to bottom right, rgba(0,0,0,0.4), rgba(0,0,0,0.6)), url(${design.banner_image_url})`
            : `linear-gradient(to bottom right, ${design.theme_color || '#000000'}, #1f2937)`,
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat'
        }}
      >
        {/* 배경 패턴 (이미지가 없을 때만) */}
        {!design.banner_image_url && (
          <div className="absolute inset-0 opacity-10">
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white to-transparent transform -skew-y-12"></div>
          </div>
        )}

        {/* 상점 정보 오버레이 */}
        <div className="absolute inset-0">
          {/* 상점명 */}
          <div 
            className="absolute text-white"
            style={{
              left: `${design.title_position_x || 50}%`,
              top: `${design.title_position_y || 40}%`,
              transform: 'translate(-50%, -50%)'
            }}
          >
            <div className="flex items-center space-x-4">
              <h1 className={`
                ${design.title_font_size === 'small' ? 'text-2xl md:text-3xl' :
                  design.title_font_size === 'medium' ? 'text-3xl md:text-4xl' :
                  design.title_font_size === 'xl' ? 'text-5xl md:text-6xl' :
                  'text-4xl md:text-5xl'
                } font-light tracking-wide
              `}>
                {storeData?.store_name || '상점 이름'}
              </h1>
              <span className={`px-3 py-1 text-xs uppercase tracking-wider font-medium border ${
                storeData?.is_open 
                  ? 'bg-green-500/20 text-green-100 border-green-400/30'
                  : 'bg-red-500/20 text-red-100 border-red-400/30'
              }`}>
                {storeData?.is_open ? '영업중' : '휴무중'}
              </span>
            </div>
          </div>
          
          {/* 상점 설명 */}
          {design.show_store_description && (
            <div 
              className="absolute text-white"
              style={{
                left: `${design.description_position_x || 50}%`,
                top: `${design.description_position_y || 60}%`,
                transform: 'translate(-50%, -50%)'
              }}
            >
              <p className={`
                text-center text-gray-200 max-w-2xl leading-relaxed
                ${design.description_font_size === 'small' ? 'text-xs md:text-sm' :
                  design.description_font_size === 'large' ? 'text-base md:text-lg' :
                  'text-sm md:text-base'
                }
              `}>
                {storeData?.description || '상점 설명이 여기에 표시됩니다'}
              </p>
            </div>
          )}
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-8 py-8">
        {/* 노션 스타일 블록 타입 선택 메뉴 - 읽기 전용 모드에서는 숨김 */}
        {!readOnly && insertMenu.isVisible && (
          <div className="fixed inset-0 z-50" onClick={closeBlockInsertMenu}>
            <div 
              className="absolute left-1/2 top-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white border border-gray-200 shadow-2xl w-80 max-h-96 overflow-y-auto"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-4">
                <h3 className="text-sm font-medium text-gray-900 mb-3 uppercase tracking-wide">
                  블록 타입 선택
                </h3>
                
                <div className="space-y-1">
                  {[
                    { type: 'text' as const, name: '텍스트', icon: 'T', description: '일반 텍스트나 제목 추가' },
                    { type: 'banner' as const, name: '배너', icon: '█', description: '이미지 배너와 CTA 버튼' },
                    { type: 'grid' as const, name: '그리드', icon: '⊞', description: '제품을 격자 형태로 표시' },
                    { type: 'featured' as const, name: '피처드', icon: '★', description: '특별한 제품이나 컬렉션 강조' },
                    { type: 'list' as const, name: '리스트', icon: '≡', description: '제품을 목록 형태로 표시' },
                    { type: 'masonry' as const, name: '메이슨리', icon: '⧈', description: '다양한 크기의 이미지 레이아웃' }
                  ].map((blockType) => (
                    <button
                      key={blockType.type}
                      onClick={() => handleBlockTypeSelect(blockType.type)}
                      className="w-full p-3 text-left hover:bg-gray-50 transition-colors duration-200 border border-transparent hover:border-gray-200 group"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-gray-100 group-hover:bg-gray-200 transition-colors text-sm font-medium">
                          {blockType.icon}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="text-sm font-medium text-gray-900 mb-1">
                            {blockType.name}
                          </div>
                          <div className="text-xs text-gray-500 leading-relaxed">
                            {blockType.description}
                          </div>
                        </div>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 드래그 앤 드롭 컨텍스트 */}
        <DragDropContext
          onDragStart={handleDragStart}
          onDragUpdate={handleDragUpdate}
          onDragEnd={handleDragEnd}
        >
          <Droppable droppableId="store-blocks">
            {(provided: DroppableProvided, snapshot: DroppableStateSnapshot) => (
              <div
                ref={provided.innerRef}
                {...provided.droppableProps}
                className={`
                  transition-all duration-200
                  ${snapshot.isDraggingOver ? 'bg-gray-50' : ''}
                  ${blocks.length > 0 ? 'py-8' : ''}
                `}
              >
                {blocks.length === 0 ? (
                  <div className="text-center py-32">
                    <div className="max-w-md mx-auto">
                      {!readOnly ? (
                        <>
                          <div className="mb-6">
                            <svg className="mx-auto h-16 w-16 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-light text-gray-900 mb-2 tracking-wide">
                            Start Building Your Store
                          </h3>
                          <p className="text-sm text-gray-500 font-light mb-8 leading-relaxed">
                            Click the + button below to add your first content block
                          </p>
                          
                          {/* 첫 번째 블록 추가를 위한 노션 스타일 divider */}
                          <div className="flex items-center justify-center">
                            <div className="relative">
                              <button
                                onClick={() => openBlockInsertMenu(0, 'start')}
                                className="
                                  w-12 h-12 bg-white border-2 border-gray-300 hover:border-gray-500 
                                  flex items-center justify-center text-gray-400 hover:text-gray-600
                                  transition-all duration-200 shadow-sm hover:shadow-md
                                "
                              >
                                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        </>
                      ) : (
                        <div className="py-16">
                          <p className="text-gray-500 text-center">아직 콘텐츠가 없습니다.</p>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <>
                    {/* 첫 번째 블록 앞 삽입 영역 - 읽기 전용 모드에서는 숨김 */}
                    {!readOnly && (
                      <div
                        className="relative flex items-center justify-center h-8 group"
                      >
                        <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                          <button
                            onClick={() => openBlockInsertMenu(0, 'before')}
                            className="
                              w-8 h-8 bg-white border-2 border-gray-300 hover:border-gray-500 
                              flex items-center justify-center text-gray-400 hover:text-gray-600
                              transition-all duration-200 shadow-sm hover:shadow-md z-10 relative
                            "
                          >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                          </button>
                          <div className="absolute inset-0 flex items-center">
                            <div className="w-full h-px bg-gray-200"></div>
                          </div>
                        </div>
                      </div>
                    )}
                    
                    <div>
                      {blocks.map((block, index) => (
                        <div 
                          key={block.stableId}
                          className={index > 0 ? getSpacingClass(block.spacing) : ''}
                        >
                          {readOnly ? (
                            // 읽기 전용 모드: 일반 div로 렌더링 (드래그 없음)
                            <div className="relative">
                              {/* 모든 블록 타입에 대해 full-width 처리 */}
                              {block.block_width === 'full-width' ? (
                                <div className="relative -mx-8" style={{ width: 'calc(100% + 4rem)' }}>
                                  <BasicInlineEditableBlock
                                    block={block}
                                    isSelected={selectedBlockId === block.id}
                                    isDragging={false}
                                    onSelect={handleBlockSelect}
                                    onEdit={handleBlockEdit}
                                    onUpdate={handleBlockUpdate}
                                    onDelete={handleDeleteBlock}
                                    onMove={handleMoveBlock}
                                    onAddBelow={() => openBlockInsertMenu(block.position, 'after')}
                                    canMoveUp={block.position > 0}
                                    canMoveDown={block.position < blocks.length - 1}
                                    products={products}
                                    readOnly={readOnly}
                                  />
                                </div>
                              ) : (
                                <BasicInlineEditableBlock
                                  block={block}
                                  isSelected={selectedBlockId === block.id}
                                  isDragging={false}
                                  onSelect={handleBlockSelect}
                                  onEdit={handleBlockEdit}
                                  onUpdate={handleBlockUpdate}
                                  onDelete={handleDeleteBlock}
                                  onMove={handleMoveBlock}
                                  onAddBelow={() => openBlockInsertMenu(block.position, 'after')}
                                  canMoveUp={block.position > 0}
                                  canMoveDown={block.position < blocks.length - 1}
                                  products={products}
                                  readOnly={readOnly}
                                />
                              )}
                            </div>
                          ) : (
                            // 편집 모드: Draggable 컴포넌트와 높이 조절 핸들 분리
                            <div className="relative group">
                              <Draggable draggableId={block.stableId} index={index}>
                                {(provided: DraggableProvided, snapshot: DraggableStateSnapshot) => {
                                  const isDragging = snapshot.isDragging;
                                  const isDropAnimating = snapshot.isDropAnimating;
                                  
                                  return (
                                    <div
                                      ref={provided.innerRef}
                                      {...provided.draggableProps}
                                      className={`
                                        relative transition-all duration-300 ease-out
                                        ${isDragging ? 'z-50' : ''}
                                        ${!isDropAnimating && dragState.isDragging && dragState.draggedBlockStableId === block.stableId ? 'transform translate-y-4' : ''}
                                      `}
                                      style={{
                                        ...provided.draggableProps.style,
                                        ...(isDragging && !isDropAnimating && {
                                          filter: 'drop-shadow(0 25px 50px rgb(0 0 0 / 0.15))',
                                          transform: `${provided.draggableProps.style?.transform || ''} rotate(1deg)`,
                                        }),
                                        ...(isDropAnimating && {
                                          transition: 'all 200ms cubic-bezier(0.2, 0, 0, 1)'
                                        })
                                      }}
                                    >

                                      {/* 드래그 핸들 */}
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="absolute top-2 left-2 w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity duration-200 cursor-move z-30"
                                      >
                                        <div className="w-full h-full bg-gray-400 hover:bg-gray-600 rounded-sm flex items-center justify-center">
                                          <svg className="w-3 h-3 text-white" fill="currentColor" viewBox="0 0 20 20">
                                            <path d="M10 6a2 2 0 110-4 2 2 0 010 4zM10 12a2 2 0 110-4 2 2 0 010 4zM10 18a2 2 0 110-4 2 2 0 010 4z"></path>
                                          </svg>
                                        </div>
                                      </div>

                                      {/* 블록 콘텐츠 */}
                                      <div className={`
                                        transition-all duration-300 ease-out
                                        ${dragState.isDragging && !isDragging ? 'opacity-60' : ''}
                                      `}>
                                        {/* 모든 블록 타입에 대해 full-width 처리 */}
                                        {block.block_width === 'full-width' ? (
                                          <div className="relative -mx-8" style={{ width: 'calc(100% + 4rem)' }}>
                                            <BasicInlineEditableBlock
                                              block={block}
                                              isSelected={selectedBlockId === block.id}
                                              isDragging={isDragging}
                                              onSelect={handleBlockSelect}
                                              onEdit={handleBlockEdit}
                                              onUpdate={handleBlockUpdate}
                                              onDelete={handleDeleteBlock}
                                              onMove={handleMoveBlock}
                                              onAddBelow={() => openBlockInsertMenu(block.position, 'after')}
                                              canMoveUp={block.position > 0}
                                              canMoveDown={block.position < blocks.length - 1}
                                              products={products}
                                              readOnly={readOnly}
                                            />
                                          </div>
                                        ) : (
                                          <BasicInlineEditableBlock
                                            block={block}
                                            isSelected={selectedBlockId === block.id}
                                            isDragging={isDragging}
                                            onSelect={handleBlockSelect}
                                            onEdit={handleBlockEdit}
                                            onUpdate={handleBlockUpdate}
                                            onDelete={handleDeleteBlock}
                                            onMove={handleMoveBlock}
                                            onAddBelow={() => openBlockInsertMenu(block.position, 'after')}
                                            canMoveUp={block.position > 0}
                                            canMoveDown={block.position < blocks.length - 1}
                                            products={products}
                                            readOnly={readOnly}
                                          />
                                        )}
                                      </div>
                                    </div>
                                  );
                                }}
                              </Draggable>
                              
                              {/* 높이 조절 핸들 - 리스트와 Masonry 블록 제외 */}
                              {!readOnly && !['list', 'masonry'].includes(block.type) && (
                                <div
                                  className="absolute bottom-2 right-4 opacity-100 hover:opacity-100 transition-all duration-200 z-50"
                                  style={{ pointerEvents: 'auto' }}
                                  onMouseDown={(e) => {
                                    e.preventDefault();
                                    e.stopPropagation();
                                    
                                    const startY = e.clientY;
                                    const startHeight = block.height || 300;
                                    
                                    const handleMouseMove = (moveEvent: MouseEvent) => {
                                      moveEvent.preventDefault();
                                      moveEvent.stopPropagation();
                                      
                                      const deltaY = moveEvent.clientY - startY;
                                      const minHeight = block.min_height || 100;
                                      const maxHeight = block.max_height || 800;
                                      const newHeight = Math.max(minHeight, Math.min(maxHeight, startHeight + deltaY));
                                      
                                      handleBlockUpdate(block.id, { height: newHeight });
                                    };
                                    
                                    const handleMouseUp = () => {
                                      document.removeEventListener('mousemove', handleMouseMove);
                                      document.removeEventListener('mouseup', handleMouseUp);
                                    };
                                    
                                    document.addEventListener('mousemove', handleMouseMove);
                                    document.addEventListener('mouseup', handleMouseUp);
                                  }}
                                >
                                  <div className="w-6 h-4 bg-black hover:bg-gray-800 flex items-center justify-center cursor-row-resize transition-all duration-200 border border-black hover:border-gray-800">
                                    <div className="flex space-x-0.5">
                                      <div className="w-0.5 h-0.5 bg-white"></div>
                                      <div className="w-0.5 h-0.5 bg-white"></div>
                                      <div className="w-0.5 h-0.5 bg-white"></div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          )}
                          
                          {/* 블록 사이 삽입 영역 - 읽기 전용 모드에서는 숨김 */}
                          {!readOnly && (
                            <div
                              className="relative flex items-center justify-center h-8 group"
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-200">
                                <button
                                  onClick={() => openBlockInsertMenu(index, 'after')}
                                  className="
                                    w-8 h-8 bg-white border-2 border-gray-300 hover:border-gray-500 
                                    flex items-center justify-center text-gray-400 hover:text-gray-600
                                    transition-all duration-200 shadow-sm hover:shadow-md z-10 relative
                                  "
                                >
                                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                  </svg>
                                </button>
                                <div className="absolute inset-0 flex items-center">
                                  <div className="w-full h-px bg-gray-200"></div>
                                </div>
                              </div>
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  </>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>
      </div>
    </div>
  );
};

// 기본 InlineEditableBlock 컴포넌트
interface BasicInlineEditableBlockProps {
  block: StoreBlock;
  isSelected: boolean;
  isDragging: boolean;
  onSelect: (blockId: string) => void;
  onEdit: (blockId: string) => void;
  onUpdate: (blockId: string, data: any) => void;
  onDelete: (blockId: string) => void;
  onMove: (blockId: string, direction: 'up' | 'down') => void;
  onAddBelow: () => void;
  canMoveUp: boolean;
  canMoveDown: boolean;
  products: any[];
  readOnly?: boolean;
}

const BasicInlineEditableBlock: React.FC<BasicInlineEditableBlockProps> = ({
  block,
  isSelected,
  isDragging,
  onSelect,
  onEdit,
  onUpdate,
  onDelete,
  onMove,
  onAddBelow,
  canMoveUp,
  canMoveDown,
  products,
  readOnly = false
}) => {
  // 높이 조절 핸들러
  const handleResize = useCallback((deltaY: number) => {
    const currentHeight = block.height || 300; // 기본 높이
    const minHeight = block.min_height || 100; // 최소 높이
    const maxHeight = block.max_height || 800; // 최대 높이
    
    const newHeight = Math.max(minHeight, Math.min(maxHeight, currentHeight + deltaY));
    
    onUpdate(block.id, { height: newHeight });
  }, [block.height, block.min_height, block.max_height, block.id, onUpdate]);

  // 높이 조절이 가능한 블록 타입인지 확인 - 모든 블록 타입에 적용
  const isResizable = true;
  // 클릭 핸들러 (선택) - 읽기 전용 모드에서는 비활성화
  const handleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !readOnly) { // 드래그 중이 아니고 읽기 전용이 아닐 때만 선택 처리
      onSelect(block.id);
    }
  }, [block.id, onSelect, isDragging, readOnly]);

  // 더블클릭 핸들러 (편집 모드 진입) - 그리드는 제외, 읽기 전용 모드에서는 비활성화
  const handleDoubleClick = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isDragging && !readOnly) { 
      // 더블클릭 시에는 편집 모드 진입 대신 블록을 선택하고 부모에게 알림
      onSelect(block.id);
      // 부모 컴포넌트에게 더블클릭 이벤트를 알림 (툴바 표시용)
      if (onEdit) {
        onEdit(block.id);
      }
    }
  }, [block.id, onSelect, onEdit, isDragging, readOnly]);

  // 블록 삭제 핸들러
  const handleDelete = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    if (confirm('이 블록을 삭제하시겠습니까?')) {
      onDelete(block.id);
    }
  }, [block.id, onDelete]);

  // 블록 이동 핸들러
  const handleMoveUp = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMove(block.id, 'up');
  }, [block.id, onMove]);

  const handleMoveDown = useCallback((e: React.MouseEvent) => {
    e.stopPropagation();
    onMove(block.id, 'down');
  }, [block.id, onMove]);

  // 블록 콘텐츠 렌더링
  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        // 텍스트 블록은 항상 읽기 전용으로 표시
        return (
          <div className="prose max-w-none">
            <div dangerouslySetInnerHTML={{ 
              __html: isTextBlock(block) ? (block.text_content || '텍스트를 입력하세요...') : '텍스트를 입력하세요...'
            }} />
          </div>
        );

      case 'grid':
        // 그리드는 항상 그리드만 표시
        return <BasicProductGrid block={block} products={products} />;

      case 'banner':
        // 배너는 항상 렌더러만 표시
        return <BasicBannerRenderer block={block} />;

      case 'featured':
        // 피처드는 항상 렌더러만 표시
        return <BasicFeaturedRenderer block={block} />;

      case 'list':
        return (
          <div className="bg-gray-100 h-64 flex items-center justify-center">
            <span className="text-gray-500">리스트 블록</span>
          </div>
        );

      default:
        return (
          <div className="bg-gray-50 p-8 text-center text-gray-500">
            {block.type} 블록
          </div>
        );
    }
  };

  return (
    <div
      className={`
        relative transition-all duration-200 ${readOnly ? 'cursor-default' : 'cursor-pointer'} group
        ${!readOnly && isSelected && !isDragging ? 'ring-1 ring-gray-900 ring-offset-4' : ''}
        ${!readOnly && isDragging ? 'ring-1 ring-gray-400 ring-offset-4' : ''}
        ${!readOnly && !isDragging ? 'hover:ring-1 hover:ring-gray-300 hover:ring-offset-2' : ''}
      `}
      onClick={handleClick}
      onDoubleClick={handleDoubleClick}
    >
      {/* 블록 조작 툴바 - 읽기 전용 모드가 아니고 드래그 중이 아닐 때만 표시 */}
      {!readOnly && isSelected && !isDragging && (
        <div className="absolute -top-16 left-0 flex items-center space-x-1 bg-gray-900 text-white px-4 py-2 z-20 shadow-xl">
          <span className="text-xs font-light tracking-wider uppercase mr-4">
            {getBlockTypeLabel(block.type)} #{block.position + 1}
          </span>
          
          {/* 위로 이동 */}
          <button
            onClick={handleMoveUp}
            disabled={!canMoveUp}
            className="p-2 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move Up"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
            </svg>
          </button>
          
          {/* 아래로 이동 */}
          <button
            onClick={handleMoveDown}
            disabled={!canMoveDown}
            className="p-2 hover:bg-gray-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            title="Move Down"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
            </svg>
          </button>
          
          {/* 삭제 */}
          <button
            onClick={handleDelete}
            className="p-2 hover:bg-red-900 transition-colors"
            title="Delete"
          >
            <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
            </svg>
          </button>
        </div>
      )}

      {/* 마우스 오버 힌트 - 읽기 전용이 아니고 드래그 중이 아니고 선택되지 않았을 때만 표시 */}
      {!readOnly && !isSelected && !isDragging && (
        <div className="absolute -top-8 left-0 px-3 py-1 bg-gray-900 text-white text-xs opacity-0 group-hover:opacity-100 transition-opacity z-10">
          <span className="font-light tracking-wide">
            {block.type === 'grid' 
              ? 'Drag to reorder • Click to select • Edit in Design Studio' 
              : 'Drag to reorder • Click to select • Double-click to edit'
            }
          </span>
        </div>
      )}

      {/* 드래그 중 표시 - 읽기 전용이 아닐 때만 표시 */}
      {!readOnly && isDragging && (
        <div className="absolute -top-8 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gray-900 text-white text-xs z-30 shadow-lg">
          <div className="flex items-center space-x-2">
            <svg className="w-3 h-3 animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 7.5L7.5 3m0 0L12 7.5M7.5 3v13.5m13.5 0L16.5 21m0 0L12 16.5m4.5 4.5V7.5" />
            </svg>
            <span className="font-light tracking-wide">Moving...</span>
          </div>
        </div>
      )}

      {/* 블록 콘텐츠 */}
      <div 
        className={`
          relative
          ${isDragging ? 'pointer-events-none' : 'pointer-events-auto'}
          ${block.text_alignment === 'center' ? 'text-center' : ''}
          ${block.text_alignment === 'right' ? 'text-right' : ''}
          ${block.text_alignment === 'left' || !block.text_alignment ? 'text-left' : ''}
          ${block.spacing === 'tight' ? 'py-2' : 
            block.spacing === 'loose' ? 'py-8' : 
            block.spacing === 'extra-loose' ? 'py-12' : 'py-4'}
        `}
        style={{
          // 텍스트 블록만 부모에서 높이 적용, 다른 블록은 자체 렌더러에서 처리
          height: (block.type === 'text' && block.height) ? `${block.height}px` : undefined,
          minHeight: (block.type === 'text' && block.height) ? `${block.height}px` : undefined,
          maxHeight: (block.type === 'text' && block.height) ? `${block.height}px` : undefined
        }}
      >
        {renderBlockContent()}
        

      </div>


    </div>
  );
};

// --- 타입 가드 함수들 ---
export const isTextBlock = (block: StoreBlock): block is TextBlockData => {
  return block.type === 'text';
};

export const isGridBlock = (block: StoreBlock): block is GridBlockData => {
  return block.type === 'grid';
};

export const isBannerBlock = (block: StoreBlock): block is BannerBlockData => {
  return block.type === 'banner';
};

export const isFeaturedBlock = (block: StoreBlock): block is FeaturedBlockData => {
  return block.type === 'featured';
};

export const isListBlock = (block: StoreBlock): block is ListBlockData => {
  return block.type === 'list';
};

export const isMasonryBlock = (block: StoreBlock): block is MasonryBlockData => {
  return block.type === 'masonry';
};

// 기본 Tiptap 텍스트 에디터
const BasicTiptapTextEditor: React.FC<{
  block: StoreBlock;
  onUpdate: (blockId: string, data: any) => void;
}> = ({ block, onUpdate }) => {
  if (!isTextBlock(block)) return null;
  
  return (
    <div className="border-2 border-dashed border-green-300 p-4">
      <p className="text-green-700 text-sm mb-2">Tiptap 에디터 (구현 예정)</p>
      <textarea
        className="w-full p-2 border"
        defaultValue={block.text_content || ''}
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
  if (!isGridBlock(block)) return null;
  
  const columns = block.columns || 4;
  const maxProducts = block.max_products || 8;
  
  // max_products가 0이면 모든 제품 표시
  const actualMaxProducts = maxProducts === 0 ? products.length + 1 : maxProducts;
  
  // 그리드 자체는 정렬보다는 justify 속성으로 처리
  const justifyClass = block.text_alignment === 'center' ? 'justify-center' :
                      block.text_alignment === 'right' ? 'justify-end' :
                      'justify-start';
  
  return (
    <div 
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 4)} gap-4 ${justifyClass}`}
      style={{
        height: block.height ? `${block.height}px` : undefined,
        minHeight: block.height ? `${block.height}px` : undefined,
        maxHeight: block.height ? `${block.height}px` : undefined,
        overflow: block.height ? 'hidden' : 'visible'
      }}
    >
      {/* 제품 등록 플레이스홀더 */}
      <div className={`${block.height ? 'h-full' : 'aspect-square'} bg-gray-100 border-2 border-dashed border-gray-300 flex items-center justify-center`}>
        <span className="text-gray-500 text-sm">+ 제품 추가</span>
      </div>
      
      {/* 실제 제품들 */}
      {products.slice(0, Math.min(actualMaxProducts - 1, products.length)).map((product, index) => (
        <div key={product.id || index} className={`${block.height ? 'h-full' : 'aspect-square'} bg-white border p-4`}>
          <div className="h-2/3 bg-gray-200 mb-2"></div>
          <h3 className="text-sm font-medium truncate">{product.product_name}</h3>
          <p className="text-xs text-gray-600">₩{product.price?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

// 배너 렌더러 컴포넌트
const BasicBannerRenderer: React.FC<{
  block: StoreBlock;
}> = ({ block }) => {
  if (!isBannerBlock(block)) return null;
  
  const bannerRef = useRef<HTMLDivElement>(null);
  
  // 높이가 설정된 경우 DOM에 직접 적용
  useEffect(() => {
    if (bannerRef.current && block.height) {
      bannerRef.current.style.height = `${block.height}px`;
      bannerRef.current.style.minHeight = `${block.height}px`;
      bannerRef.current.style.maxHeight = `${block.height}px`;
    }
  }, [block.height]);
  
  // 높이가 명시적으로 설정된 경우 모든 높이 관련 클래스 제거
  const bannerHeight = block.height ? '' : (
    block.banner_height === 'small' ? 'h-32' :
    block.banner_height === 'large' ? 'h-64' :
    block.banner_height === 'full' ? 'h-screen' : 'h-48'
  );

  // 텍스트 정렬 클래스 계산
  const alignmentClass = block.text_alignment === 'center' ? 'text-center' :
                        block.text_alignment === 'right' ? 'text-right' :
                        'text-left';
  
  // justify 클래스 계산 (전체 배너의 정렬)
  const justifyClass = block.text_alignment === 'center' ? 'justify-center' :
                      block.text_alignment === 'right' ? 'justify-end' :
                      'justify-start';

  return (
    <div 
      ref={bannerRef}
      className={`${bannerHeight} relative overflow-hidden flex items-center ${justifyClass}`}
      style={{ 
        backgroundColor: block.background_color || '#f3f4f6',
        backgroundImage: block.banner_image_url 
          ? `url("${block.banner_image_url}")` 
          : block.banner_style === 'gradient' 
          ? 'linear-gradient(135deg, #6b7280 0%, #374151 100%)'
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      <div className={`${alignmentClass} text-white z-10 ${block.text_alignment !== 'center' ? 'mx-8' : ''}`}>
        <h3 className="text-2xl md:text-4xl font-bold mb-4">
          {block.banner_title || '특별 프로모션'}
        </h3>
        <p className="text-lg mb-6 opacity-90">
          {block.banner_description || '지금 구매하시면 특별 할인 혜택을 받으실 수 있습니다'}
        </p>
        {block.call_to_action && (
          <button className="px-8 py-3 bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors">
            {block.call_to_action}
          </button>
        )}
      </div>
      {block.banner_image_url && (
        <div className="absolute inset-0 bg-black bg-opacity-30"></div>
      )}
    </div>
  );
};

// 배너 에디터 컴포넌트
const BasicBannerEditor: React.FC<{
  block: StoreBlock;
  onUpdate: (blockId: string, data: any) => void;
}> = ({ block, onUpdate }) => {
  if (!isBannerBlock(block)) return null;
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('파일 크기는 10MB 이하여야 합니다.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setUploadError('이미지 파일만 업로드 가능합니다.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 파일 이름 생성 (timestamp + 원본 파일명)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `banners/${fileName}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // 블록 데이터 업데이트
      onUpdate(block.id, {
        banner_image_url: publicUrl,
        banner_style: 'image'
      });

    } catch (error: any) {
      console.error('이미지 업로드 실패:', error);
      setUploadError(error.message || '이미지 업로드에 실패했습니다.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate(block.id, {
      banner_image_url: undefined
    });
  };

  return (
    <div className="border border-gray-200 p-8 bg-white">
      <div className="space-y-8">
        <div className="text-center border-b border-gray-100 pb-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wider uppercase mb-2">Banner Editor</h4>
          <p className="text-xs text-gray-500 font-light">Craft your promotional message with elegance</p>
        </div>
        
        {/* 배너 이미지 업로드 섹션 */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide">
            Banner Image
          </label>
          
          {block.banner_image_url ? (
            <div className="relative">
              <img
                src={block.banner_image_url}
                alt="Banner Image"
                className="w-full h-40 object-cover border border-gray-200"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 bg-white border border-gray-200 text-gray-900 p-2 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 p-12 text-center bg-gray-50">
              <svg className="mx-auto h-12 w-12 text-gray-300 mb-4" stroke="currentColor" fill="none" viewBox="0 0 48 48" strokeWidth={1}>
                <path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 100 4m0-4v2m0-6V4" />
              </svg>
              <p className="text-sm text-gray-500 font-light">
                Upload your banner image
              </p>
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 font-light
              file:mr-4 file:py-2 file:px-4
              file:border file:border-gray-200
              file:text-sm file:font-medium file:tracking-wide
              file:bg-white file:text-gray-900
              hover:file:bg-gray-50 file:transition-colors"
          />
          
          {uploading && (
            <p className="text-sm text-gray-600 font-light">Uploading...</p>
          )}
          
          {uploadError && (
            <p className="text-sm text-red-600 font-light">{uploadError}</p>
          )}
        </div>

        {/* 배너 텍스트 편집 */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Banner Title
            </label>
            <input
              type="text"
              value={block.banner_title || ''}
              onChange={(e) => onUpdate(block.id, { banner_title: e.target.value })}
              placeholder="Premium Collection"
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Banner Description
            </label>
            <textarea
              value={block.banner_description || ''}
              onChange={(e) => onUpdate(block.id, { banner_description: e.target.value })}
              placeholder="Discover our carefully curated selection of timeless pieces"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Call to Action
            </label>
            <input
              type="text"
              value={block.call_to_action || ''}
              onChange={(e) => onUpdate(block.id, { call_to_action: e.target.value })}
              placeholder="Explore Collection"
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            />
          </div>
        </div>

        {/* 배너 높이 설정 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
            Banner Height
          </label>
          <select
            value={block.banner_height || 'medium'}
            onChange={(e) => onUpdate(block.id, { banner_height: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
          >
            <option value="small">Compact (128px)</option>
            <option value="medium">Standard (192px)</option>
            <option value="large">Large (256px)</option>
            <option value="full">Full Screen</option>
          </select>
        </div>

        {/* 배너 너비 설정 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
            Banner Width
          </label>
          <select
            value={block.block_width || DEFAULT_BLOCK_WIDTH}
            onChange={(e) => onUpdate(block.id, { block_width: e.target.value })}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
          >
            <option value="contained">Contained (with margins)</option>
            <option value="full-width">Full Width (edge to edge)</option>
          </select>
          <p className="text-xs text-gray-500 font-light mt-2">
            Full width banners extend to the screen edges, like the store header.
          </p>
        </div>
      </div>
    </div>
  );
};

// 피처드 렌더러 컴포넌트
const BasicFeaturedRenderer: React.FC<{
  block: StoreBlock;
}> = ({ block }) => {
  if (!isFeaturedBlock(block)) return null;
  
  const featuredRef = useRef<HTMLDivElement>(null);
  
  // 높이가 설정된 경우 DOM에 직접 적용
  useEffect(() => {
    if (featuredRef.current && block.height) {
      featuredRef.current.style.height = `${block.height}px`;
      featuredRef.current.style.minHeight = `${block.height}px`;
      featuredRef.current.style.maxHeight = `${block.height}px`;
    }
  }, [block.height]);
  
  // 높이가 명시적으로 설정된 경우 Tailwind 클래스 대신 인라인 스타일 사용
  const featuredSize = block.height ? '' : (
    block.featured_size === 'hero' ? 'h-96' :
    block.featured_size === 'large' ? 'h-80' : 'h-64'
  );

  // 텍스트 정렬 클래스 계산
  const alignmentClass = block.text_alignment === 'center' ? 'text-center' :
                        block.text_alignment === 'right' ? 'text-right' :
                        'text-left';
  
  // justify 클래스 계산 (전체 피처드 블록의 정렬)
  const justifyClass = block.text_alignment === 'center' ? 'justify-center' :
                      block.text_alignment === 'right' ? 'justify-end' :
                      'justify-start';

  return (
    <div 
      ref={featuredRef}
      className={`${featuredSize} relative overflow-hidden flex items-center ${justifyClass} bg-gray-100 border border-gray-200`}
      style={{ 
        backgroundImage: block.featured_image_url 
          ? `url("${block.featured_image_url}")` 
          : 'none',
        backgroundSize: 'cover',
        backgroundPosition: 'center'
      }}
    >
      {block.show_text_overlay && (
        <div className={`
          absolute inset-0 flex items-center ${justifyClass} z-10
          ${block.overlay_position === 'top' ? 'items-start pt-12' : 
            block.overlay_position === 'bottom' ? 'items-end pb-12' : 'items-center'}
        `}>
          <div className={`${alignmentClass} text-white max-w-lg ${block.text_alignment !== 'center' ? 'mx-8' : 'mx-auto'} px-8`}>
            <h3 className="text-3xl md:text-5xl font-light mb-4 tracking-wide">
              {block.featured_title || 'Featured Collection'}
            </h3>
            <p className="text-lg font-light opacity-90 mb-8 leading-relaxed">
              {block.featured_description || 'Discover our signature pieces crafted with exceptional attention to detail'}
            </p>
            {block.featured_cta && (
              <button className="px-8 py-3 bg-white text-gray-900 font-medium tracking-wider uppercase hover:bg-gray-100 transition-colors border border-white">
                {block.featured_cta}
              </button>
            )}
          </div>
        </div>
      )}
      
      {!block.featured_image_url && (
        <div className={`${alignmentClass} text-gray-400 ${block.text_alignment !== 'center' ? 'mx-8' : ''}`}>
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-light">Featured Image</p>
        </div>
      )}
      
      {block.featured_image_url && block.show_text_overlay && (
        <div className="absolute inset-0 bg-black bg-opacity-40"></div>
      )}
    </div>
  );
};

// 피처드 에디터 컴포넌트
const BasicFeaturedEditor: React.FC<{
  block: StoreBlock;
  onUpdate: (blockId: string, data: any) => void;
}> = ({ block, onUpdate }) => {
  if (!isFeaturedBlock(block)) return null;
  
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // 파일 크기 체크 (10MB 제한)
    if (file.size > 10 * 1024 * 1024) {
      setUploadError('File size must be under 10MB.');
      return;
    }

    // 이미지 파일 타입 체크
    if (!file.type.startsWith('image/')) {
      setUploadError('Only image files are allowed.');
      return;
    }

    setUploading(true);
    setUploadError(null);

    try {
      // 파일 이름 생성 (timestamp + 원본 파일명)
      const fileExt = file.name.split('.').pop();
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`;
      const filePath = `featured/${fileName}`;

      // Supabase Storage에 업로드
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('images')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 공개 URL 가져오기
      const { data: { publicUrl } } = supabase.storage
        .from('images')
        .getPublicUrl(filePath);

      // 블록 데이터 업데이트
      onUpdate(block.id, {
        featured_image_url: publicUrl
      });

    } catch (error: any) {
      console.error('이미지 업로드 실패:', error);
      setUploadError(error.message || 'Failed to upload image.');
    } finally {
      setUploading(false);
    }
  };

  const handleRemoveImage = () => {
    onUpdate(block.id, {
      featured_image_url: undefined
    });
  };

  return (
    <div className="border border-gray-200 p-8 bg-white">
      <div className="space-y-8">
        <div className="text-center border-b border-gray-100 pb-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wider uppercase mb-2">Featured Editor</h4>
          <p className="text-xs text-gray-500 font-light">Showcase your signature piece with elegance</p>
        </div>
        
        {/* 피처드 이미지 업로드 섹션 */}
        <div className="space-y-4">
          <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide">
            Featured Image
          </label>
          
          {block.featured_image_url ? (
            <div className="relative">
              <img
                src={block.featured_image_url}
                alt="Featured Image"
                className="w-full h-64 object-cover border border-gray-200"
              />
              <button
                onClick={handleRemoveImage}
                className="absolute top-3 right-3 bg-white border border-gray-200 text-gray-900 p-2 hover:bg-gray-50 transition-colors"
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ) : (
            <div className="border border-gray-200 p-16 text-center bg-gray-50">
              <svg className="mx-auto h-16 w-16 text-gray-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
              <p className="text-sm text-gray-500 font-light mb-2">
                Upload your featured image
              </p>
              <p className="text-xs text-gray-400 font-light">
                Best results with high-quality product photography
              </p>
            </div>
          )}
          
          <input
            type="file"
            accept="image/*"
            onChange={handleImageUpload}
            disabled={uploading}
            className="block w-full text-sm text-gray-500 font-light
              file:mr-4 file:py-2 file:px-4
              file:border file:border-gray-200
              file:text-sm file:font-medium file:tracking-wide
              file:bg-white file:text-gray-900
              hover:file:bg-gray-50 file:transition-colors"
          />
          
          {uploading && (
            <p className="text-sm text-gray-600 font-light">Uploading...</p>
          )}
          
          {uploadError && (
            <p className="text-sm text-red-600 font-light">{uploadError}</p>
          )}
        </div>

        {/* 피처드 텍스트 편집 */}
        <div className="grid grid-cols-1 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Featured Title
            </label>
            <input
              type="text"
              value={block.featured_title || ''}
              onChange={(e) => onUpdate(block.id, { featured_title: e.target.value })}
              placeholder="Signature Collection"
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Featured Description
            </label>
            <textarea
              value={block.featured_description || ''}
              onChange={(e) => onUpdate(block.id, { featured_description: e.target.value })}
              placeholder="Discover our signature pieces crafted with exceptional attention to detail"
              rows={3}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light resize-none"
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Call to Action
            </label>
            <input
              type="text"
              value={block.featured_cta || ''}
              onChange={(e) => onUpdate(block.id, { featured_cta: e.target.value })}
              placeholder="Shop Now"
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            />
          </div>
        </div>

        {/* 피처드 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Featured Size
            </label>
            <select
              value={block.featured_size || 'large'}
              onChange={(e) => onUpdate(block.id, { featured_size: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="medium">Medium (256px)</option>
              <option value="large">Large (320px)</option>
              <option value="hero">Hero (384px)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Overlay Position
            </label>
            <select
              value={block.overlay_position || 'center'}
              onChange={(e) => onUpdate(block.id, { overlay_position: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
              disabled={!block.show_text_overlay}
            >
              <option value="top">Top</option>
              <option value="center">Center</option>
              <option value="bottom">Bottom</option>
            </select>
          </div>
        </div>

        {/* 텍스트 오버레이 토글 */}
        <div className="flex items-center space-x-3">
          <input
            type="checkbox"
            id="show-overlay"
            checked={block.show_text_overlay || false}
            onChange={(e) => onUpdate(block.id, { show_text_overlay: e.target.checked })}
            className="w-4 h-4 border border-gray-300 focus:ring-gray-900"
          />
          <label htmlFor="show-overlay" className="text-sm font-medium text-gray-900 uppercase tracking-wide">
            Show Text Overlay
          </label>
        </div>
      </div>
    </div>
  );
};

// 그리드 에디터 컴포넌트
const BasicGridEditor: React.FC<{
  block: StoreBlock;
  onUpdate: (blockId: string, data: any) => void;
  products: any[];
}> = ({ block, onUpdate, products }) => {
  if (!isGridBlock(block)) return null;
  
  const [showAllProducts, setShowAllProducts] = useState(block.max_products === 0);
  const [customMaxProducts, setCustomMaxProducts] = useState(
    block.max_products && block.max_products > 0 ? block.max_products : 8
  );
  
  const handleShowAllProductsChange = (checked: boolean) => {
    setShowAllProducts(checked);
    if (checked) {
      onUpdate(block.id, { max_products: 0 });
    } else {
      onUpdate(block.id, { max_products: customMaxProducts });
    }
  };
  
  const handleCustomMaxProductsChange = (value: number) => {
    const validValue = Math.max(1, Math.min(value, 100)); // 1-100 범위로 제한
    setCustomMaxProducts(validValue);
    if (!showAllProducts) {
      onUpdate(block.id, { max_products: validValue });
    }
  };
  
  return (
    <div className="border border-gray-200 p-8 bg-white">
      <div className="space-y-8">
        <div className="text-center border-b border-gray-100 pb-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wider uppercase mb-2">Grid Editor</h4>
          <p className="text-xs text-gray-500 font-light">Configure your product grid layout</p>
        </div>
        
        {/* 그리드 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Columns
            </label>
            <select
              value={block.columns || 4}
              onChange={(e) => onUpdate(block.id, { columns: parseInt(e.target.value) })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value={2}>2 Columns</option>
              <option value={3}>3 Columns</option>
              <option value={4}>4 Columns</option>
              <option value={5}>5 Columns</option>
              <option value={6}>6 Columns</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Max Products
            </label>
            
            {/* 모든 제품 표시 체크박스 */}
            <div className="mb-3">
              <label className="flex items-center space-x-2 text-sm text-gray-700">
                <input
                  type="checkbox"
                  checked={showAllProducts}
                  onChange={(e) => handleShowAllProductsChange(e.target.checked)}
                  className="rounded border-gray-300 text-gray-900 focus:ring-gray-500"
                />
                <span>모든 제품 표시 ({products.length}개)</span>
              </label>
            </div>
            
            {/* 커스텀 개수 입력 */}
            {!showAllProducts && (
              <div className="space-y-2">
                <input
                  type="number"
                  min="1"
                  max="100"
                  value={customMaxProducts}
                  onChange={(e) => handleCustomMaxProductsChange(parseInt(e.target.value) || 1)}
                  className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
                  placeholder="최대 제품 개수"
                />
                <p className="text-xs text-gray-500">1개부터 100개까지 설정 가능</p>
              </div>
            )}
            
            {showAllProducts && (
              <div className="px-4 py-3 bg-gray-50 border border-gray-200 text-sm text-gray-600">
                모든 제품이 표시됩니다
              </div>
            )}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Card Style
            </label>
            <select
              value={block.card_style || 'default'}
              onChange={(e) => onUpdate(block.id, { card_style: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="default">Default</option>
              <option value="compact">Compact</option>
              <option value="detailed">Detailed</option>
              <option value="large">Large</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Height Ratio
            </label>
            <select
              value={block.height_ratio || 'square'}
              onChange={(e) => onUpdate(block.id, { height_ratio: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="square">Square (1:1)</option>
              <option value="portrait">Portrait (3:4)</option>
              <option value="landscape">Landscape (4:3)</option>
              <option value="auto">Auto Height</option>
            </select>
          </div>
        </div>
      </div>
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

// 기본 블록 데이터 생성 함수
const getDefaultBlockData = (type: StoreBlock['type'], isClient: boolean = true): Omit<StoreBlock, 'id' | 'position'> => {
  // SSR 호환성을 위한 stableId 생성
  const stableId = isClient 
    ? uuidv4()
    : `stable-new-${type}`;
    
  const baseData = {
    type,
    stableId,
          spacing: DEFAULT_SPACING,
      text_alignment: DEFAULT_TEXT_ALIGNMENT,
          block_width: DEFAULT_BLOCK_WIDTH,
  };

  switch (type) {
    case 'text':
      return {
        ...baseData,
        type: 'text',
        text_content: '새로운 텍스트 블록입니다. 더블클릭하여 편집하세요.',
        text_size: 'medium',
        text_color: '#000000',
        text_weight: 'normal',
        text_style: 'paragraph',
        max_width: 'medium',
        padding: 'medium'
      } as Omit<TextBlockData, 'id' | 'position'>;

    case 'banner':
      return {
        ...baseData,
        type: 'banner',
        banner_height: 'medium',
        banner_style: 'solid',
  
        banner_title: '새로운 배너',
        banner_description: '배너 설명을 입력하세요',
        call_to_action: '자세히 보기',
        text_alignment: 'center',
        background_color: '#4b5563'
      } as Omit<BannerBlockData, 'id' | 'position'>;

    case 'grid':
      return {
        ...baseData,
        type: 'grid',
        columns: 4,
        card_style: 'default',
        height_ratio: 'square',
        max_products: 8
      } as Omit<GridBlockData, 'id' | 'position'>;

    case 'featured':
      return {
        ...baseData,
        type: 'featured',
        featured_size: 'large',
        show_text_overlay: true,
        overlay_position: 'center',
        featured_title: 'Featured Collection',
        featured_description: 'Discover our signature pieces crafted with exceptional attention to detail',
        featured_cta: 'Shop Now',
        text_alignment: 'center'
      } as Omit<FeaturedBlockData, 'id' | 'position'>;

    case 'list':
      return {
        ...baseData,
        type: 'list',
        list_style: 'vertical',
        show_description: true,
        show_price_prominent: true
      } as Omit<ListBlockData, 'id' | 'position'>;

    case 'masonry':
      return {
        ...baseData,
        type: 'masonry',
        masonry_columns: 3,
        masonry_min_height: 'medium'
      } as Omit<MasonryBlockData, 'id' | 'position'>;

    default:
      return {
        ...baseData,
        type: 'text',
        text_content: '새로운 텍스트 블록'
      } as Omit<TextBlockData, 'id' | 'position'>;
  }
}; 

// 높이 조절 핸들 컴포넌트
interface ResizeHandleProps {
  onResize: (deltaY: number) => void;
  disabled?: boolean;
}

const ResizeHandle: React.FC<ResizeHandleProps> = ({ onResize, disabled = false }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [startY, setStartY] = useState(0);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (disabled) return;
    
    e.preventDefault();
    e.stopPropagation();
    
    setIsDragging(true);
    setStartY(e.clientY);
    
    const handleMouseMove = (moveEvent: MouseEvent) => {
      if (!isDragging) return;
      
      const deltaY = moveEvent.clientY - startY;
      onResize(deltaY);
      setStartY(moveEvent.clientY);
    };
    
    const handleMouseUp = () => {
      setIsDragging(false);
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
    
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
  }, [isDragging, startY, onResize, disabled]);

  return (
    <div
      className={`
        absolute bottom-4 left-1/2 transform -translate-x-1/2 translate-x-6
        w-12 h-3 bg-gray-900 hover:bg-gray-700 transition-all duration-200
        flex items-center justify-center cursor-row-resize z-30
        opacity-0 group-hover:opacity-100
        ${isDragging ? 'opacity-100 bg-blue-600' : ''}
        ${disabled ? 'cursor-not-allowed opacity-30' : ''}
      `}
      onMouseDown={handleMouseDown}
    >
      <div className="flex space-x-0.5">
        <div className="w-0.5 h-1 bg-white rounded-full"></div>
        <div className="w-0.5 h-1 bg-white rounded-full"></div>
        <div className="w-0.5 h-1 bg-white rounded-full"></div>
      </div>
    </div>
  );
};

export default BasicInlinePreviewArea;