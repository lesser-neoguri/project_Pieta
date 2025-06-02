import { StoreBlock, BlockType } from '@/types/blockTypes';
import { EditorBlockType } from '@/types/editorTypes';

// 기존 row_layouts 구조 (any 타입으로 유연하게 처리)
export interface LegacyRowLayout {
  [rowIndex: number]: {
    layout_type: 'grid' | 'list' | 'masonry' | 'featured' | 'banner' | 'text';
    [key: string]: any;
  };
}

/**
 * 기존 row_layouts을 새로운 StoreBlock 배열로 변환
 */
export function mapLegacyToBlocks(rowLayouts: any): StoreBlock[] {
  const blocks: StoreBlock[] = [];
  
  Object.entries(rowLayouts).forEach(([indexStr, layout]: [string, any]) => {
    const position = parseInt(indexStr);
    const blockId = `block-${Date.now()}-${position}`;
    
    const block: StoreBlock = {
      id: blockId,
      type: layout.layout_type,
      position,
      spacing: layout.spacing || 'normal',
      background_color: layout.background_color,
      text_alignment: layout.text_alignment || 'left',
      data: mapLegacyDataByType(layout),
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    };
    
    blocks.push(block);
  });
  
  return blocks.sort((a, b) => a.position - b.position);
}

/**
 * StoreBlock 배열을 기존 row_layouts 형태로 변환 (하위 호환성)
 */
export function mapBlocksToLegacy(blocks: StoreBlock[]): any {
  const rowLayouts: any = {};
  
  blocks.forEach((block) => {
    rowLayouts[block.position] = {
      layout_type: block.type,
      spacing: block.spacing,
      background_color: block.background_color,
      text_alignment: block.text_alignment,
      ...flattenBlockData(block.type, block.data)
    };
  });
  
  return rowLayouts;
}

/**
 * 기존 레거시 블록을 새로운 블록으로 변환
 */
export function mapLegacyToBlock(legacyLayout: any): StoreBlock {
  const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: blockId,
    type: legacyLayout.layout_type,
    position: legacyLayout.position || 0,
    spacing: legacyLayout.spacing || 'normal',
    background_color: legacyLayout.background_color,
    text_alignment: legacyLayout.text_alignment || 'left',
    data: mapLegacyDataByType(legacyLayout),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * 새로운 블록을 레거시 형태로 변환
 */
export function mapBlockToLegacy(block: StoreBlock): any {
  return {
    layout_type: block.type,
    spacing: block.spacing,
    background_color: block.background_color,
    text_alignment: block.text_alignment,
    position: block.position,
    ...flattenBlockData(block.type, block.data)
  };
}

/**
 * 레거시 데이터를 블록 타입별로 변환
 */
function mapLegacyDataByType(layout: any): any {
  switch (layout.layout_type) {
    case 'grid':
      return {
        columns: layout.columns || 4,
        card_style: layout.card_style || 'default',
        height_ratio: layout.height_ratio || 'square'
      };
      
    case 'list':
      return {
        list_style: layout.list_style || 'vertical',
        show_description: layout.show_description ?? true,
        show_price_prominent: layout.show_price_prominent ?? false
      };
      
    case 'masonry':
      return {
        masonry_columns: layout.masonry_columns || layout.columns || 3,
        min_height: layout.min_height || 'medium'
      };
      
    case 'featured':
      return {
        featured_size: layout.featured_size || 'large',
        show_text_overlay: layout.show_text_overlay ?? true,
        overlay_position: layout.overlay_position || 'center',
        featured_image_url: layout.featured_image_url,
        linked_product_id: layout.linked_product_id
      };
      
    case 'banner':
      return {
        banner_height: layout.banner_height || 'medium',
        banner_style: layout.banner_style || 'image',
        call_to_action: layout.call_to_action,
        banner_image_url: layout.banner_image_url
      };
      
    case 'text':
      return {
        text_content: layout.text_content || '',
        text_size: layout.text_size || 'medium',
        text_color: layout.text_color || '#333333',
        text_weight: layout.text_weight || 'normal',
        text_style: layout.text_style || 'paragraph',
        max_width: layout.max_width || 'medium',
        padding: layout.padding || 'medium'
      };
      
    default:
      return {};
  }
}

/**
 * 블록 데이터를 레거시 평면 구조로 변환
 */
function flattenBlockData(type: EditorBlockType, data: any): any {
  // 블록 타입별 데이터를 평면 객체로 변환
  return { ...data };
}

/**
 * 새로운 빈 블록 생성
 */
export function createNewBlock(
  type: EditorBlockType, 
  position: number
): StoreBlock {
  const blockId = `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  
  return {
    id: blockId,
    type,
    position,
    spacing: 'normal',
    text_alignment: 'left',
    data: getDefaultDataForType(type),
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString()
  };
}

/**
 * 블록 타입별 기본 데이터
 */
function getDefaultDataForType(type: EditorBlockType): any {
  switch (type) {
    case 'grid':
      return {
        columns: 4,
        card_style: 'default',
        height_ratio: 'square'
      };
      
    case 'list':
      return {
        list_style: 'vertical',
        show_description: true,
        show_price_prominent: false
      };
      
    case 'masonry':
      return {
        masonry_columns: 3,
        min_height: 'medium'
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
        banner_style: 'image',
        call_to_action: 'Click here'
      };
      
    case 'text':
      return {
        text_content: '여기에 텍스트를 입력하세요...',
        text_size: 'medium',
        text_color: '#333333',
        text_weight: 'normal',
        text_style: 'paragraph',
        max_width: 'medium',
        padding: 'medium'
      };
      
    default:
      return {};
  }
} 