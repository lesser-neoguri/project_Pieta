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
export type ContainerMaxWidth = 'narrow' | 'medium' | 'wide' | 'full';
export type ContainerPadding = 'small' | 'medium' | 'large';

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

/**
 * 컨테이너 설정에 따른 CSS 클래스와 인라인 스타일을 반환하는 헬퍼 함수
 */
export const getContainerClasses = (design: any): string => {
  const maxWidth = design?.container_max_width ?? 1280;
  const padding = design?.container_padding ?? 32;
  
  return `mx-auto`;
};

/**
 * 컨테이너 설정에 따른 인라인 스타일을 반환하는 헬퍼 함수
 * 실제 사용 가능한 컨텐츠 영역 기준으로 퍼센트 적용
 */
export const getContainerStyles = (design: any, sidebarOpen: boolean = false): React.CSSProperties => {
  const maxWidthPercent = design?.container_max_width ?? 85;
  const paddingPercent = design?.container_padding ?? 4;
  
  // 사이드바 너비 (24rem = 384px)
  const sidebarWidth = sidebarOpen ? 384 : 0;
  
  // 실제 사용 가능한 컨텐츠 영역의 너비 (사이드바 제외)
  const availableWidth = `calc(100vw - ${sidebarWidth}px)`;
  
  // 컨텐츠 영역 기준 퍼센트 계산
  const containerWidth = `calc(${availableWidth} * ${maxWidthPercent} / 100)`;
  const containerPadding = `calc(${availableWidth} * ${paddingPercent} / 100)`;
  
  return {
    width: containerWidth,
    maxWidth: containerWidth,
    paddingLeft: containerPadding,
    paddingRight: containerPadding,
    position: 'relative',
    left: '50%',
    transform: 'translateX(-50%)',
    marginLeft: 0,
    marginRight: 0,
    transition: 'width 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94), padding 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)',
  };
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
  height?: number; // 높이 값
  min_height?: number; // 최소 높이
  max_height?: number; // 최대 높이
  height_unit?: 'px' | 'vh' | 'visible'; // 높이 단위 선택
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
  show_store_header?: boolean; // 상점 헤더 표시 여부
}

export interface ListBlockData extends StoreBlockBase {
  type: 'list';
  list_style?: 'horizontal' | 'vertical' | 'card';
  show_description?: boolean;
  show_price_prominent?: boolean;
  max_products?: number;
}

export interface MasonryBlockData extends StoreBlockBase {
  type: 'masonry';
  masonry_columns?: number;
  masonry_min_height?: 'small' | 'medium' | 'large'; // 충돌 방지를 위해 이름 변경
  max_products?: number;
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
  sidebarOpen?: boolean; // 사이드바 열림 상태
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
        height_unit: layout.height_unit || 'px'
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
  readOnly = false,
  sidebarOpen = false
}) => {
  const [isClient, setIsClient] = useState(false);
  const [selectedBlockId, setSelectedBlockId] = useState<string | null>(null);
  const [dragState, setDragState] = useState<DragState>({ isDragging: false, draggedBlockStableId: null });
  const [insertMenu, setInsertMenu] = useState<BlockInsertMenu>({ isVisible: false, position: -1, insertType: 'start' });
  const [showDeleteZone, setShowDeleteZone] = useState(false);
  const [draggedBlockId, setDraggedBlockId] = useState<string | null>(null);
  const [hoveredButton, setHoveredButton] = useState<{blockId: string, type: 'drag' | 'resize' | 'moveUp' | 'moveDown'} | null>(null);
  
  // 클라이언트 마운트 감지
  useEffect(() => {
    setIsClient(true);
  }, []);

  // 전역 마우스 이벤트로 드래그 상태 관리
  useEffect(() => {
    const handleGlobalMouseUp = () => {
      setShowDeleteZone(false);
      setDraggedBlockId(null);
    };

    document.addEventListener('mouseup', handleGlobalMouseUp);
    return () => {
      document.removeEventListener('mouseup', handleGlobalMouseUp);
    };
  }, []);

  // 블록 변환 - 클라이언트 상태를 고려하고 기본값 적용
  const blocks = useMemo(() => {
    const convertedBlocks = convertRowLayoutsToStoreBlocks(design.row_layouts, isClient);
    // 각 블록에 기본값 적용하여 block_width 등이 항상 설정되도록 보장
    return convertedBlocks.map(applyDefaultValues);
  }, [design.row_layouts, isClient]);

  // 기존 블록들의 기본값 적용 함수
  const updateAllBlocksDefaults = useCallback(() => {
    const updatedBlocks = blocks.map(block => ({
      ...block,
      text_alignment: block.text_alignment || DEFAULT_TEXT_ALIGNMENT,
      block_width: block.block_width || DEFAULT_BLOCK_WIDTH,
      spacing: block.spacing || DEFAULT_SPACING
    }));
    
    const newRowLayouts = convertStoreBlocksToRowLayouts(updatedBlocks);
    onDesignUpdate({
      ...design,
      row_layouts: newRowLayouts
    });
  }, [blocks, design, onDesignUpdate]);

  // 컴포넌트 마운트 시 기본값 자동 적용
  useEffect(() => {
    if (isClient && blocks.length > 0) {
      // 기본값이 설정되지 않은 블록이 있는지 확인
      const needsUpdate = blocks.some(block => 
        !block.text_alignment || 
        block.text_alignment === 'left' ||
        !block.block_width ||
        !block.spacing
      );
      
      if (needsUpdate) {
        // 0.5초 지연 후 자동 업데이트 (사용자가 눈치채지 못하도록)
        setTimeout(() => {
          updateAllBlocksDefaults();
        }, 500);
      }
    }
  }, [isClient, blocks, updateAllBlocksDefaults]);

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
    // 삭제 영역 숨기기
    setShowDeleteZone(false);
    setDraggedBlockId(null);
    
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
  const handleAddBlock = useCallback((type: StoreBlock['type'], position?: number, customData?: any) => {
    if (!isClient) return;

    const defaultBlockData = getDefaultBlockData(type, isClient);
    const newBlockData = customData ? { ...defaultBlockData, ...customData } : defaultBlockData;
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

  // 네비게이션 바 마진 계산
  const getNavbarMargin = () => {
    if (!design.navbar_margin_mode || design.navbar_margin_mode === 'navbar-height') {
      return 64; // 기본 네비게이션 바 높이
    }
    if (design.navbar_margin_mode === 'none') {
      return 0;
    }
    if (design.navbar_margin_mode === 'custom') {
      return design.custom_navbar_margin || 64;
    }
    return 64;
  };

  return (
    <div 
      className={`${className} min-h-screen`}
      onClick={handleBackgroundClick}
      style={{
        backgroundColor: design.background_color || '#ffffff',
        fontFamily: design.font_family || 'Inter',
        // 마진 없음 모드일 때 상단 패딩도 제거
        paddingTop: design.navbar_margin_mode === 'none' ? '0px' : `${getNavbarMargin()}px`
      }}
    >

      <div 
        className={design.navbar_margin_mode === 'none' ? 'w-full' : 'max-w-6xl mx-auto px-8'}
        style={{
          // 마진 없음 모드가 아닐 때만 컨테이너 패딩 적용
          ...(design.navbar_margin_mode !== 'none' && {
            paddingBottom: '32px'
          })
        }}
      >
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
                  {/* 상점 헤더 배너 (첫 번째 블록으로만 추가 가능) */}
                  {(insertMenu.insertType === 'start' || (insertMenu.insertType === 'before' && insertMenu.position === 0)) && (
                    <button
                      onClick={() => {
                        const newBlockData = getDefaultBlockData('banner', isClient);
                        const storeHeaderBanner = {
                          ...newBlockData,
                          banner_height: 'large',
                          banner_style: 'gradient',
                          background_color: design.theme_color || '#000000',
                          show_store_header: true,
                          block_width: 'full-width'
                        };
                        handleAddBlock('banner', 0, storeHeaderBanner);
                      }}
                      className="w-full p-3 text-left hover:bg-blue-50 transition-colors duration-200 border border-transparent hover:border-blue-200 group bg-blue-50"
                    >
                      <div className="flex items-start space-x-3">
                        <div className="w-8 h-8 flex items-center justify-center bg-blue-100 group-hover:bg-blue-200 transition-colors text-sm font-medium text-blue-600">
                          🏪
                        </div>
                        <div className="flex-1">
                          <h4 className="text-sm font-medium text-blue-900">상점 헤더 배너</h4>
                          <p className="text-xs text-blue-600 mt-1">상점명과 영업 상태를 표시하는 메인 배너</p>
                        </div>
                      </div>
                    </button>
                  )}
                  
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
                  ${
                    blocks.length > 0 ? (
                      // 마진 없음 모드에서 첫 번째 블록이 배너인 경우 상단 패딩 제거
                      design.navbar_margin_mode === 'none' && blocks[0]?.type === 'banner' ? 'pb-20' : 'py-20'
                    ) : ''
                  }
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
                    {!readOnly && !(design.navbar_margin_mode === 'none' && blocks[0]?.type === 'banner') && (
                      <div
                        className="relative flex items-center justify-center h-8 group"
                      >
                                                      <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
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
                          className={
                            // 마진 없음 모드의 배너 블록인 경우 spacing 제거
                            design.navbar_margin_mode === 'none' && block.type === 'banner' ? '' :
                            // 기본 spacing 적용 (첫 번째 블록 제외)
                            index > 0 ? getSpacingClass(block.spacing) : ''
                          }
                        >
                          {readOnly ? (
                            // 읽기 전용 모드: 일반 div로 렌더링 (드래그 없음)
                            <div className="relative">
                                                      {/* 모든 블록 타입에 대해 full-width 처리 */}
                        {block.block_width === 'full-width' || (design.navbar_margin_mode === 'none' && block.type === 'banner' && !block.block_width) ? (
                          <div 
                            className="relative w-screen left-1/2 -translate-x-1/2"
                          >
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
                              design={design}
                              sidebarOpen={sidebarOpen}
                            />
                          </div>
                        ) : (
                          <div className={getContainerClasses(design)} style={getContainerStyles(design, sidebarOpen)}>
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
                              design={design}
                              sidebarOpen={sidebarOpen}
                            />
                          </div>
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
                                        relative transition-all duration-300 ease-out mb-6
                                        ${isDragging ? 'z-50' : ''}
                                        ${!isDropAnimating && dragState.isDragging && dragState.draggedBlockStableId === block.stableId ? 'transform translate-y-4' : ''}
                                        ${selectedBlockId === block.id ? 'ring-2 ring-blue-500 ring-opacity-50 bg-blue-50/30' : 'bg-white hover:bg-gray-50/50'}
                                        border border-gray-200 hover:border-gray-300 rounded-lg shadow-sm hover:shadow-md p-4
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

                                      {/* 개선된 드래그 핸들 - 오른쪽 끝 */}
                                      <div 
                                        {...provided.dragHandleProps}
                                        className="absolute bottom-2 right-2 w-8 h-8 opacity-80 hover:opacity-100 transition-all duration-300 cursor-move z-30"
                                        onMouseDown={() => {
                                          setShowDeleteZone(true);
                                          setDraggedBlockId(block.id);
                                        }}
                                        onMouseUp={() => {
                                          setShowDeleteZone(false);
                                          setDraggedBlockId(null);
                                        }}
                                        onMouseEnter={() => setHoveredButton({blockId: block.id, type: 'drag'})}
                                        onMouseLeave={() => setHoveredButton(null)}
                                      >
                                        <div className="w-full h-full bg-gray-900 hover:bg-black shadow-lg flex items-center justify-center border border-gray-300 hover:border-gray-100 transition-all duration-300 transform hover:scale-105">
                                          <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 8h16M4 16h16" />
                                          </svg>
                                        </div>
                                        {/* 개별 툴팁 */}
                                        {hoveredButton?.blockId === block.id && hoveredButton?.type === 'drag' && (
                                          <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-[200] shadow-lg">
                                            드래그하여 이동
                                          </div>
                                        )}
                                      </div>

                                      {/* 위로 올리기 버튼 */}
                                      {!readOnly && !dragState.isDragging && (
                                        <div 
                                          className={`absolute bottom-2 right-11 w-8 h-8 opacity-80 hover:opacity-100 transition-all duration-300 z-30 ${
                                            block.position > 0 ? 'cursor-pointer' : 'cursor-not-allowed'
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (block.position > 0) {
                                              handleMoveBlock(block.id, 'up');
                                            }
                                          }}
                                          onMouseEnter={() => setHoveredButton({blockId: block.id, type: 'moveUp'})}
                                          onMouseLeave={() => setHoveredButton(null)}
                                        >
                                          <div className={`w-full h-full shadow-lg flex items-center justify-center border transition-all duration-300 transform hover:scale-105 ${
                                            block.position > 0 
                                              ? 'bg-gray-900 hover:bg-black border-gray-300 hover:border-gray-100' 
                                              : 'bg-gray-500 border-gray-400 cursor-not-allowed'
                                          }`}>
                                            <svg className={`w-4 h-4 ${block.position > 0 ? 'text-white' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 15l7-7 7 7" />
                                            </svg>
                                          </div>
                                          {/* 개별 툴팁 */}
                                          {hoveredButton?.blockId === block.id && hoveredButton?.type === 'moveUp' && (
                                            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-[200] shadow-lg">
                                              {block.position > 0 ? '위로 올리기' : '최상단 블록'}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* 아래로 내리기 버튼 */}
                                      {!readOnly && !dragState.isDragging && (
                                        <div 
                                          className={`absolute bottom-2 right-20 w-8 h-8 opacity-80 hover:opacity-100 transition-all duration-300 z-30 ${
                                            block.position < blocks.length - 1 ? 'cursor-pointer' : 'cursor-not-allowed'
                                          }`}
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            if (block.position < blocks.length - 1) {
                                              handleMoveBlock(block.id, 'down');
                                            }
                                          }}
                                          onMouseEnter={() => setHoveredButton({blockId: block.id, type: 'moveDown'})}
                                          onMouseLeave={() => setHoveredButton(null)}
                                        >
                                          <div className={`w-full h-full shadow-lg flex items-center justify-center border transition-all duration-300 transform hover:scale-105 ${
                                            block.position < blocks.length - 1 
                                              ? 'bg-gray-900 hover:bg-black border-gray-300 hover:border-gray-100' 
                                              : 'bg-gray-500 border-gray-400 cursor-not-allowed'
                                          }`}>
                                            <svg className={`w-4 h-4 ${block.position < blocks.length - 1 ? 'text-white' : 'text-gray-300'}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                            </svg>
                                          </div>
                                          {/* 개별 툴팁 */}
                                          {hoveredButton?.blockId === block.id && hoveredButton?.type === 'moveDown' && (
                                            <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-[200] shadow-lg">
                                              {block.position < blocks.length - 1 ? '아래로 내리기' : '최하단 블록'}
                                            </div>
                                          )}
                                        </div>
                                      )}

                                      {/* 블록 콘텐츠 */}
                                      <div className={`
                                        transition-all duration-300 ease-out -m-4
                                        ${dragState.isDragging && !isDragging ? 'opacity-60' : ''}
                                      `}>
                                        {/* 모든 블록 타입에 대해 full-width 처리 */}
                                        {block.block_width === 'full-width' || (design.navbar_margin_mode === 'none' && block.type === 'banner' && !block.block_width) ? (
                                          <div 
                                            className="relative w-screen left-1/2 -translate-x-1/2"
                                          >
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
                                              storeData={storeData}
                                              readOnly={readOnly}
                                              design={design}
                                              sidebarOpen={sidebarOpen}
                                            />
                                          </div>
                                        ) : (
                                          <div className={getContainerClasses(design)} style={getContainerStyles(design, sidebarOpen)}>
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
                                              storeData={storeData}
                                              readOnly={readOnly}
                                              design={design}
                                              sidebarOpen={sidebarOpen}
                                            />
                                          </div>
                                        )}
                                      </div>
                                    </div>
                                  );
                                }}
                              </Draggable>
                              
                                            {/* 개선된 높이 조절 핸들 - 리스트와 Masonry 블록 제외, 드래그 중이 아닐 때만 표시 */}
              {!readOnly && !dragState.isDragging && !['list', 'masonry'].includes(block.type) && (
                <div
                  className="absolute bottom-2 right-29 opacity-80 hover:opacity-100 transition-all duration-300 z-50"
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
                      const maxHeight = block.max_height || 9999;
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
                  onMouseEnter={() => setHoveredButton({blockId: block.id, type: 'resize'})}
                  onMouseLeave={() => setHoveredButton(null)}
                >
                  <div className="w-8 h-8 bg-gray-900 hover:bg-black shadow-lg flex items-center justify-center cursor-row-resize transition-all duration-300 border border-gray-300 hover:border-gray-100 transform hover:scale-105">
                    <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                    </svg>
                  </div>
                  {/* 개별 툴팁 */}
                  {hoveredButton?.blockId === block.id && hoveredButton?.type === 'resize' && (
                    <div className="absolute bottom-full right-0 mb-2 px-2 py-1 bg-gray-900 text-white text-xs rounded whitespace-nowrap pointer-events-none z-[200] shadow-lg">
                      높이 조절
                    </div>
                  )}
                </div>
              )}
                            </div>
                          )}
                          
                          {/* 블록 사이 삽입 영역 - 읽기 전용 모드에서는 숨김 */}
                          {!readOnly && (
                            <div
                              className="relative flex items-center justify-center h-8 group"
                            >
                              <div className="absolute inset-0 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-all duration-300">
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
                      
                      {/* 마지막 블록 다음 추가 버튼 - 읽기 전용 모드에서는 숨김 */}
                      {!readOnly && (
                        <div className="relative flex items-center justify-center py-8">
                          <div className="flex items-center justify-center">
                            <button
                              onClick={() => openBlockInsertMenu(blocks.length, 'after')}
                              className="
                                w-12 h-12 bg-white border-2 border-gray-300 hover:border-gray-500 
                                flex items-center justify-center text-gray-400 hover:text-gray-600
                                transition-all duration-200 shadow-lg hover:shadow-xl z-10 relative
                                rounded-lg hover:bg-gray-50
                              "
                              title="새 레이아웃 블록 추가"
                            >
                              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                              </svg>
                            </button>
                          </div>
                          <div className="absolute top-1/2 left-0 right-0 flex items-center">
                            <div className="w-full h-px bg-gray-200"></div>
                          </div>
                        </div>
                      )}
                    </div>
                  </>
                )}
                {provided.placeholder}
              </div>
            )}
          </Droppable>
        </DragDropContext>

        {/* 드래그 삭제 영역 */}
        {showDeleteZone && draggedBlockId && (
          <div className="fixed inset-0 z-50 pointer-events-none">
            {/* 고급스러운 삭제 영역 - 화면 하단 중앙 */}
            <div 
              className="absolute bottom-8 left-1/2 transform -translate-x-1/2 pointer-events-auto"
              onMouseEnter={() => {
                // 드래그된 블록이 삭제 영역에 들어왔을 때
              }}
              onMouseUp={() => {
                // 삭제 실행
                if (draggedBlockId) {
                  const updatedBlocks = blocks
                    .filter(block => block.id !== draggedBlockId)
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
                  
                  setShowDeleteZone(false);
                  setDraggedBlockId(null);
                }
              }}
            >
              {/* 메인 삭제 영역 */}
              <div className="relative">
                {/* 외부 링 효과 */}
                <div className="absolute inset-0 w-24 h-24 border-2 border-red-500 opacity-30 animate-ping"></div>
                <div className="absolute inset-0 w-24 h-24 border border-red-400 opacity-40"></div>
                
                {/* 메인 삭제 버튼 */}
                <div className="relative w-24 h-24 bg-gradient-to-br from-red-500 to-red-700 hover:from-red-600 hover:to-red-800 flex items-center justify-center shadow-2xl transform hover:scale-105 transition-all duration-300 border border-red-400 backdrop-blur-sm">
                  {/* 내부 그림자 효과 */}
                  <div className="absolute inset-1 bg-gradient-to-br from-red-400 to-transparent opacity-30"></div>
                  
                  {/* 쓰레기통 아이콘 */}
                  <svg className="w-12 h-12 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                  
                  {/* 하이라이트 효과 */}
                  <div className="absolute top-2 left-2 right-2 h-1 bg-white opacity-20 blur-sm"></div>
                </div>
              </div>
              
              {/* 고급스러운 안내 텍스트 */}
              <div className="absolute top-full left-1/2 transform -translate-x-1/2 mt-6 text-center">
                <div className="bg-gray-900 bg-opacity-95 backdrop-blur-md text-white px-6 py-3 border border-gray-700 shadow-xl">
                  <div className="text-sm font-medium tracking-wide">DROP TO DELETE</div>
                  <div className="text-xs opacity-75 mt-1 font-light">블록이 영구적으로 제거됩니다</div>
                </div>
                {/* 화살표 */}
                <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 w-0 h-0 border-l-4 border-r-4 border-b-4 border-transparent border-b-gray-900"></div>
              </div>
            </div>
            
            {/* 고급스러운 취소 안내 */}
            <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
              <div className="bg-gray-900 bg-opacity-95 backdrop-blur-md text-white px-6 py-3 border border-gray-700 shadow-xl">
                <div className="flex items-center space-x-2">
                  <svg className="w-4 h-4 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div className="text-sm font-light tracking-wide">드래그를 중단하면 취소됩니다</div>
                </div>
              </div>
            </div>
          </div>
        )}
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
  storeData?: any;
  readOnly?: boolean;
  design?: any; // design 정보 추가
  sidebarOpen?: boolean; // 사이드바 열림 상태
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
  storeData,
  readOnly = false,
  design,
  sidebarOpen = false
}) => {
  // 높이 조절 핸들러
  const handleResize = useCallback((deltaY: number) => {
    const isVhOrVisible = block.height_unit === 'vh' || block.height_unit === 'visible';
    const currentHeight = block.height || (isVhOrVisible ? 50 : 300); // 기본 높이
    const minHeight = isVhOrVisible ? 10 : (block.min_height || 100); // 최소 높이
    const maxHeight = isVhOrVisible ? 100 : (block.max_height || 9999); // 최대 높이
    
    // vh나 visible 모드에서는 더 작은 단위로 조절
    const adjustedDelta = isVhOrVisible ? Math.round(deltaY / 10) : deltaY;
    const newHeight = Math.max(minHeight, Math.min(maxHeight, currentHeight + adjustedDelta));
    
    onUpdate(block.id, { height: newHeight });
  }, [block.height, block.height_unit, block.min_height, block.max_height, block.id, onUpdate]);

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
        // 텍스트 블록 렌더러
        return <BasicTextRenderer block={block} />;

      case 'grid':
        // 그리드는 항상 그리드만 표시
        return <BasicProductGrid block={block} products={products} />;

      case 'banner':
        // 배너는 항상 렌더러만 표시
        return <BasicBannerRenderer block={block} storeData={storeData} />;

      case 'featured':
        // 피처드는 항상 렌더러만 표시
        return <BasicFeaturedRenderer block={block} />;

      case 'list':
        return <BasicListRenderer block={block} products={products} />;

      case 'masonry':
        return <BasicMasonryRenderer block={block} products={products} />;

      default:
        return (
          <div className="bg-gray-50 p-8 text-center text-gray-500">
            알 수 없는 블록
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
      {/* 블록 조작 툴바 제거됨 */}



      {/* 드래그 중 표시 - 읽기 전용이 아닐 때만 표시 */}
      {!readOnly && isDragging && (
        <div className="absolute top-2 left-1/2 transform -translate-x-1/2 px-4 py-1 bg-gray-900 text-white text-xs z-30 shadow-lg transition-all duration-300 rounded">
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
          ${
            // 배너 블록 전용 처리
            block.type === 'banner' ? (
              // 마진 없음 모드: 패딩 완전 제거
              design?.navbar_margin_mode === 'none' ? '' : 
              // 일반 모드: 배너 블록도 기본 spacing 적용
              block.spacing === 'tight' ? 'py-2' : 
              block.spacing === 'loose' ? 'py-8' : 
              block.spacing === 'extra-loose' ? 'py-12' : 'py-4'
            ) : (
              // 다른 블록들: 기본 spacing 적용
              block.spacing === 'tight' ? 'py-2' : 
              block.spacing === 'loose' ? 'py-8' : 
              block.spacing === 'extra-loose' ? 'py-12' : 'py-4'
            )
          }
        `}
        style={{
          // 텍스트 블록만 부모에서 높이 적용, 다른 블록은 자체 렌더러에서 처리
          height: (block.type === 'text' && block.height) ? 
            block.height_unit === 'visible' ? 
              `calc((100vh - 64px) * ${block.height} / 100)` : // 네비게이션 바(64px)를 제외한 보이는 영역의 퍼센트
              `${block.height}${block.height_unit || 'px'}` : undefined,
          minHeight: (block.type === 'text' && block.height) ? 
            block.height_unit === 'visible' ? 
              `calc((100vh - 64px) * ${block.height} / 100)` :
              `${block.height}${block.height_unit || 'px'}` : undefined,
          maxHeight: (block.type === 'text' && block.height) ? 
            block.height_unit === 'visible' ? 
              `calc((100vh - 64px) * ${block.height} / 100)` :
              `${block.height}${block.height_unit || 'px'}` : undefined
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

// 텍스트 블록 렌더러
const BasicTextRenderer: React.FC<{
  block: StoreBlock;
}> = ({ block }) => {
  if (!isTextBlock(block)) return null;
  
  // 텍스트 스타일 클래스 계산
  const getSizeClass = () => {
    switch (block.text_size) {
      case 'small': return 'text-sm';
      case 'large': return 'text-lg';
      case 'xl': return 'text-xl';
      case 'xxl': return 'text-2xl';
      default: return 'text-base';
    }
  };
  
  const getWeightClass = () => {
    switch (block.text_weight) {
      case 'medium': return 'font-medium';
      case 'semibold': return 'font-semibold';
      case 'bold': return 'font-bold';
      default: return 'font-normal';
    }
  };
  
  const getStyleClass = () => {
    switch (block.text_style) {
      case 'heading': return 'text-2xl font-bold mb-4';
      case 'quote': return 'italic text-gray-600 border-l-4 border-gray-300 pl-4';
      case 'highlight': return 'bg-yellow-100 px-2 py-1 rounded';
      default: return '';
    }
  };
  
  const getMaxWidthClass = () => {
    switch (block.max_width) {
      case 'narrow': return 'max-w-md mx-auto';
      case 'medium': return 'max-w-2xl mx-auto';
      case 'wide': return 'max-w-4xl mx-auto';
      case 'full': return 'max-w-none';
      default: return 'max-w-2xl mx-auto';
    }
  };
  
  const getPaddingClass = () => {
    switch (block.padding) {
      case 'small': return 'p-2';
      case 'large': return 'p-8';
      case 'xl': return 'p-12';
      default: return 'p-4';
    }
  };
  
  const combinedClasses = `
    ${getSizeClass()} 
    ${getWeightClass()} 
    ${getStyleClass()} 
    ${getMaxWidthClass()} 
    ${getPaddingClass()}
  `.trim();
  
  return (
    <div 
      className={combinedClasses}
      style={{ 
        color: block.text_color || '#000000',
        backgroundColor: block.background_color
      }}
    >
      <div dangerouslySetInnerHTML={{ 
        __html: block.text_content || '텍스트를 입력하세요...'
      }} />
    </div>
  );
};

// 향상된 텍스트 에디터
const BasicTextEditor: React.FC<{
  block: StoreBlock;
  onUpdate: (blockId: string, data: any) => void;
}> = ({ block, onUpdate }) => {
  if (!isTextBlock(block)) return null;
  
  return (
    <div className="border border-gray-200 p-8 bg-white">
      <div className="space-y-8">
        <div className="text-center border-b border-gray-100 pb-6">
          <h4 className="text-lg font-light text-gray-900 tracking-wider uppercase mb-2">Text Editor</h4>
          <p className="text-xs text-gray-500 font-light">Craft your content with precision</p>
        </div>
        
        {/* 텍스트 내용 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
            Content
          </label>
          <textarea
            value={block.text_content || ''}
            onChange={(e) => onUpdate(block.id, { text_content: e.target.value })}
            placeholder="Enter your text content..."
            rows={6}
            className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light resize-none"
          />
        </div>

        {/* 스타일 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Text Style
            </label>
            <select
              value={block.text_style || 'paragraph'}
              onChange={(e) => onUpdate(block.id, { text_style: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="paragraph">Paragraph</option>
              <option value="heading">Heading</option>
              <option value="quote">Quote</option>
              <option value="highlight">Highlight</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Text Size
            </label>
            <select
              value={block.text_size || 'medium'}
              onChange={(e) => onUpdate(block.id, { text_size: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="xl">Extra Large</option>
              <option value="xxl">Double XL</option>
            </select>
          </div>
        </div>

        {/* 글꼴 및 색상 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Font Weight
            </label>
            <select
              value={block.text_weight || 'normal'}
              onChange={(e) => onUpdate(block.id, { text_weight: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="normal">Normal</option>
              <option value="medium">Medium</option>
              <option value="semibold">Semibold</option>
              <option value="bold">Bold</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Text Color
            </label>
            <div className="flex space-x-2">
              <input
                type="color"
                value={block.text_color || '#000000'}
                onChange={(e) => onUpdate(block.id, { text_color: e.target.value })}
                className="w-12 h-12 border border-gray-200 cursor-pointer"
              />
              <input
                type="text"
                value={block.text_color || '#000000'}
                onChange={(e) => onUpdate(block.id, { text_color: e.target.value })}
                placeholder="#000000"
                className="flex-1 px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
              />
            </div>
          </div>
        </div>

        {/* 레이아웃 설정 */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Max Width
            </label>
            <select
              value={block.max_width || 'medium'}
              onChange={(e) => onUpdate(block.id, { max_width: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="narrow">Narrow</option>
              <option value="medium">Medium</option>
              <option value="wide">Wide</option>
              <option value="full">Full Width</option>
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
              Padding
            </label>
            <select
              value={block.padding || 'medium'}
              onChange={(e) => onUpdate(block.id, { padding: e.target.value })}
              className="w-full px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            >
              <option value="small">Small</option>
              <option value="medium">Medium</option>
              <option value="large">Large</option>
              <option value="xl">Extra Large</option>
            </select>
          </div>
        </div>

        {/* 배경색 설정 */}
        <div>
          <label className="block text-sm font-medium text-gray-900 uppercase tracking-wide mb-3">
            Background Color
          </label>
          <div className="flex space-x-2">
            <input
              type="color"
              value={block.background_color || '#ffffff'}
              onChange={(e) => onUpdate(block.id, { background_color: e.target.value })}
              className="w-12 h-12 border border-gray-200 cursor-pointer"
            />
            <input
              type="text"
              value={block.background_color || ''}
              onChange={(e) => onUpdate(block.id, { background_color: e.target.value })}
              placeholder="Transparent"
              className="flex-1 px-4 py-3 border border-gray-200 focus:outline-none focus:border-gray-900 transition-colors font-light"
            />
            <button
              onClick={() => onUpdate(block.id, { background_color: undefined })}
              className="px-4 py-3 border border-gray-200 hover:border-gray-900 transition-colors font-light"
            >
              Clear
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

// 기본 리스트 렌더러
const BasicListRenderer: React.FC<{
  block: StoreBlock;
  products: any[];
}> = ({ block, products }) => {
  if (!isListBlock(block)) return null;
  
  const listRef = useRef<HTMLDivElement>(null);
  const maxProducts = block.max_products || 5;
  
  // max_products가 0이면 모든 제품 표시
  const actualMaxProducts = maxProducts === 0 ? products.length + 1 : maxProducts;
  
  // 높이가 설정된 경우 DOM에 직접 적용
  useEffect(() => {
    if (listRef.current && block.height) {
      const heightValue = block.height_unit === 'visible' ? 
        `calc((100vh - 64px) * ${block.height} / 100)` : // 네비게이션 바를 제외한 보이는 영역의 퍼센트
        `${block.height}${block.height_unit || 'px'}`;
      listRef.current.style.height = heightValue;
      listRef.current.style.minHeight = heightValue;
      listRef.current.style.maxHeight = heightValue;
    }
  }, [block.height, block.height_unit]);
  
  return (
    <div 
      ref={listRef}
      className="space-y-4"
      style={{
        overflow: block.height ? 'hidden' : 'visible'
      }}
    >
      {/* 제품 등록 플레이스홀더 */}
      <div className="flex items-center p-4 bg-gray-100 rounded-lg">
        <div className="w-16 h-16 bg-gray-200 rounded mr-4 flex items-center justify-center">
          <span className="text-xs text-gray-500">+</span>
        </div>
        <div>
          <h3 className="text-sm font-medium text-gray-500">제품 추가</h3>
          <p className="text-xs text-gray-400">새 제품을 등록하세요</p>
        </div>
      </div>
      
      {/* 실제 제품들 */}
      {products.slice(0, Math.min(actualMaxProducts - 1, products.length)).map((product, index) => (
        <div key={product.id || index} className="flex items-center p-4 bg-white border rounded-lg">
          <div className="w-16 h-16 bg-gray-200 rounded mr-4"></div>
          <div className="flex-1">
            <h3 className="text-sm font-medium truncate">{product.product_name}</h3>
            <p className="text-xs text-gray-600">₩{product.price?.toLocaleString()}</p>
            {block.show_description && product.description && (
              <p className="text-xs text-gray-500 mt-1 truncate">{product.description}</p>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

// 기본 메이슨리 렌더러
const BasicMasonryRenderer: React.FC<{
  block: StoreBlock;
  products: any[];
}> = ({ block, products }) => {
  if (!isMasonryBlock(block)) return null;
  
  const masonryRef = useRef<HTMLDivElement>(null);
  const columns = block.masonry_columns || 3;
  const maxProducts = block.max_products || 9;
  
  // max_products가 0이면 모든 제품 표시
  const actualMaxProducts = maxProducts === 0 ? products.length + 1 : maxProducts;
  
  // 높이가 설정된 경우 DOM에 직접 적용
  useEffect(() => {
    if (masonryRef.current && block.height) {
      const heightValue = block.height_unit === 'visible' ? 
        `calc((100vh - 64px) * ${block.height} / 100)` : // 네비게이션 바를 제외한 보이는 영역의 퍼센트
        `${block.height}${block.height_unit || 'px'}`;
      masonryRef.current.style.height = heightValue;
      masonryRef.current.style.minHeight = heightValue;
      masonryRef.current.style.maxHeight = heightValue;
    }
  }, [block.height, block.height_unit]);
  
  return (
    <div 
      ref={masonryRef}
      className={`columns-1 sm:columns-2 md:columns-${Math.min(columns, 4)} gap-4`}
      style={{
        overflow: block.height ? 'hidden' : 'visible'
      }}
    >
      {/* 제품 등록 플레이스홀더 */}
      <div className="break-inside-avoid mb-4 bg-gray-100 p-4 rounded-lg">
        <div className="aspect-square bg-gray-200 rounded mb-2 flex items-center justify-center">
          <span className="text-gray-500 text-sm">+ 제품 추가</span>
        </div>
      </div>
      
      {/* 실제 제품들 */}
      {products.slice(0, Math.min(actualMaxProducts - 1, products.length)).map((product, index) => (
        <div key={product.id || index} className="break-inside-avoid mb-4 bg-white border rounded-lg p-4">
          <div className={`${index % 3 === 0 ? 'aspect-square' : index % 3 === 1 ? 'aspect-[4/5]' : 'aspect-[3/4]'} bg-gray-200 rounded mb-2`}></div>
          <h3 className="text-sm font-medium truncate">{product.product_name}</h3>
          <p className="text-xs text-gray-600">₩{product.price?.toLocaleString()}</p>
        </div>
      ))}
    </div>
  );
};

// 기본 제품 그리드
const BasicProductGrid: React.FC<{
  block: StoreBlock;
  products: any[];
}> = ({ block, products }) => {
  if (!isGridBlock(block)) return null;
  
  const gridRef = useRef<HTMLDivElement>(null);
  const columns = block.columns || 4;
  const maxProducts = block.max_products || 8;
  
  // max_products가 0이면 모든 제품 표시
  const actualMaxProducts = maxProducts === 0 ? products.length + 1 : maxProducts;
  
  // 그리드 자체는 정렬보다는 justify 속성으로 처리
  const justifyClass = block.text_alignment === 'center' ? 'justify-center' :
                      block.text_alignment === 'right' ? 'justify-end' :
                      'justify-start';
  
  // 높이가 설정된 경우 DOM에 직접 적용
  useEffect(() => {
    if (gridRef.current && block.height) {
      const heightValue = block.height_unit === 'visible' ? 
        `calc((100vh - 64px) * ${block.height} / 100)` : // 네비게이션 바를 제외한 보이는 영역의 퍼센트
        `${block.height}${block.height_unit || 'px'}`;
      gridRef.current.style.height = heightValue;
      gridRef.current.style.minHeight = heightValue;
      gridRef.current.style.maxHeight = heightValue;
    }
  }, [block.height, block.height_unit]);
  
  return (
    <div 
      ref={gridRef}
      className={`grid grid-cols-1 sm:grid-cols-2 md:grid-cols-${Math.min(columns, 4)} gap-4 ${justifyClass}`}
      style={{
        overflow: block.height ? 'hidden' : 'visible'
      }}
    >
      {/* 제품 등록 플레이스홀더 */}
      <div className={`${block.height ? 'h-full' : 'aspect-square'} bg-gray-100 flex items-center justify-center`}>
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
  storeData?: any;
}> = ({ block, storeData }) => {
  if (!isBannerBlock(block)) return null;
  
  const bannerRef = useRef<HTMLDivElement>(null);
  
  // 높이가 설정된 경우 DOM에 직접 적용
  useEffect(() => {
    if (bannerRef.current && block.height) {
      const heightValue = block.height_unit === 'visible' ? 
        `calc((100vh - 64px) * ${block.height} / 100)` : // 네비게이션 바를 제외한 보이는 영역의 퍼센트
        `${block.height}${block.height_unit || 'px'}`;
      bannerRef.current.style.height = heightValue;
      bannerRef.current.style.minHeight = heightValue;
      bannerRef.current.style.maxHeight = heightValue;
    }
  }, [block.height, block.height_unit]);
  
  // 높이가 명시적으로 설정된 경우 모든 높이 관련 클래스 제거
  const bannerHeight = block.height ? '' : (
    block.banner_height === 'small' ? 'h-32' :
    block.banner_height === 'large' ? 'h-64' :
    block.banner_height === 'full' ? 'h-screen' : 'h-48'
  );

  return (
    <div 
      ref={bannerRef}
      className={`${bannerHeight} relative overflow-hidden flex items-center justify-center`}
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
      {/* 상점 헤더 오버레이 */}
      {block.show_store_header && storeData && (
        <div className="absolute inset-0 bg-black/40">
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center text-white">
              <div className="flex items-center justify-center space-x-4 mb-4">
                <h1 className="text-4xl md:text-5xl font-light tracking-wide">
                  {storeData.store_name || '상점 이름'}
                </h1>
                <span className={`px-3 py-1 text-xs uppercase tracking-wider font-medium border ${
                  storeData.is_open 
                    ? 'bg-green-500/20 text-green-100 border-green-400/30'
                    : 'bg-red-500/20 text-red-100 border-red-400/30'
                }`}>
                  {storeData.is_open ? '영업중' : '휴무중'}
                </span>
              </div>
              {storeData.description && (
                <p className="text-lg text-gray-200 max-w-2xl mx-auto leading-relaxed">
                  {storeData.description}
                </p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* 일반 배너 내용 (상점 헤더가 아닌 경우) */}
      {!block.show_store_header && !block.banner_image_url && (
        <div className="text-gray-400 text-center">
          <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
          <p className="text-sm font-light">배너 이미지</p>
        </div>
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

        {/* 상점 헤더 옵션 */}
        <div>
          <label className="flex items-center space-x-3">
            <input
              type="checkbox"
              checked={block.show_store_header || false}
              onChange={(e) => onUpdate(block.id, { show_store_header: e.target.checked })}
              className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-500 focus:ring-2"
            />
            <span className="text-sm font-medium text-gray-900 uppercase tracking-wide">
              Show Store Header
            </span>
          </label>
          <p className="text-xs text-gray-500 font-light mt-2">
            Display store name, status, and description as header overlay
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
      const heightValue = block.height_unit === 'visible' ? 
        `calc((100vh - 64px) * ${block.height} / 100)` : // 네비게이션 바를 제외한 보이는 영역의 퍼센트
        `${block.height}${block.height_unit || 'px'}`;
      featuredRef.current.style.height = heightValue;
      featuredRef.current.style.minHeight = heightValue;
      featuredRef.current.style.maxHeight = heightValue;
    }
  }, [block.height, block.height_unit]);
  
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
        background_color: '#4b5563',
        show_store_header: false
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