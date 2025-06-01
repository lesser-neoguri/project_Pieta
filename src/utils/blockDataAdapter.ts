interface StoreBlock {
  id: string;
  type: 'featured' | 'grid' | 'text' | 'banner' | 'masonry' | 'list';
  data: Record<string, any>;
  position: number;
  isEditing?: boolean;
}

interface LegacyRowLayout {
  layout_type: string;
  columns?: number;
  spacing?: string;
  featured_size?: string;
  featured_image_url?: string;
  show_text_overlay?: boolean;
  overlay_position?: string;
  banner_height?: string;
  banner_style?: string;
  call_to_action?: string;
  text_content?: string;
  text_size?: string;
  text_alignment?: string;
  [key: string]: any;
}

/**
 * 기존 row_layouts 데이터를 새로운 블록 시스템으로 변환
 */
export function convertRowLayoutsToBlocks(
  rowLayouts: Record<number, LegacyRowLayout> | null | undefined
): StoreBlock[] {
  if (!rowLayouts) return [];

  return Object.entries(rowLayouts)
    .map(([index, layout]) => {
      const position = parseInt(index);
      
      return {
        id: `block-${position}-${Date.now()}`,
        type: mapLegacyTypeToBlockType(layout.layout_type),
        data: extractBlockData(layout),
        position,
        isEditing: false
      };
    })
    .sort((a, b) => a.position - b.position);
}

/**
 * 새로운 블록 시스템을 기존 row_layouts 형태로 변환
 */
export function convertBlocksToRowLayouts(blocks: StoreBlock[]): Record<number, LegacyRowLayout> {
  const rowLayouts: Record<number, LegacyRowLayout> = {};

  blocks.forEach((block, index) => {
    rowLayouts[index] = {
      layout_type: mapBlockTypeToLegacyType(block.type),
      ...convertBlockDataToLegacyFormat(block)
    };
  });

  return rowLayouts;
}

/**
 * 레거시 타입을 새로운 블록 타입으로 매핑
 */
function mapLegacyTypeToBlockType(legacyType: string): StoreBlock['type'] {
  const typeMap: Record<string, StoreBlock['type']> = {
    'grid': 'grid',
    'featured': 'featured',
    'text': 'text',
    'banner': 'banner',
    'masonry': 'masonry',
    'list': 'list'
  };

  return typeMap[legacyType] || 'grid';
}

/**
 * 새로운 블록 타입을 레거시 타입으로 매핑
 */
function mapBlockTypeToLegacyType(blockType: StoreBlock['type']): string {
  return blockType; // 현재는 1:1 매핑
}

/**
 * 레거시 레이아웃 데이터에서 블록 데이터 추출
 */
function extractBlockData(layout: LegacyRowLayout): Record<string, any> {
  const data: Record<string, any> = {};

  // 공통 속성들
  if (layout.columns !== undefined) data.columns = layout.columns;
  if (layout.spacing !== undefined) data.spacing = layout.spacing;

  // 타입별 특수 속성들
  switch (layout.layout_type) {
    case 'featured':
      if (layout.featured_size) data.featured_size = layout.featured_size;
      if (layout.featured_image_url) data.featured_image_url = layout.featured_image_url;
      if (layout.show_text_overlay !== undefined) data.show_text_overlay = layout.show_text_overlay;
      if (layout.overlay_position) data.overlay_position = layout.overlay_position;
      break;

    case 'banner':
      if (layout.banner_height) data.banner_height = layout.banner_height;
      if (layout.banner_style) data.banner_style = layout.banner_style;
      if (layout.call_to_action) data.call_to_action = layout.call_to_action;
      break;

    case 'text':
      if (layout.text_content) data.text_content = layout.text_content;
      if (layout.text_size) data.text_size = layout.text_size;
      if (layout.text_alignment) data.text_alignment = layout.text_alignment;
      break;

    case 'grid':
    case 'masonry':
    case 'list':
      // 이미 공통 속성으로 처리됨
      break;
  }

  // 기타 모든 속성들을 포함
  Object.keys(layout).forEach(key => {
    if (!['layout_type'].includes(key) && data[key] === undefined) {
      data[key] = layout[key];
    }
  });

  return data;
}

/**
 * 블록 데이터를 레거시 형태로 변환
 */
function convertBlockDataToLegacyFormat(block: StoreBlock): Omit<LegacyRowLayout, 'layout_type'> {
  const result: Omit<LegacyRowLayout, 'layout_type'> = {};

  // 블록 데이터의 모든 속성을 복사
  Object.entries(block.data).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      result[key] = value;
    }
  });

  return result;
}

/**
 * 블록 데이터 유효성 검증
 */
export function validateBlockData(block: StoreBlock): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // 기본 필드 검증
  if (!block.id) errors.push('블록 ID가 필요합니다');
  if (!block.type) errors.push('블록 타입이 필요합니다');
  if (typeof block.position !== 'number') errors.push('블록 위치가 유효하지 않습니다');

  // 타입별 특수 검증
  switch (block.type) {
    case 'grid':
      if (block.data.columns && (block.data.columns < 1 || block.data.columns > 8)) {
        errors.push('그리드 컬럼 수는 1-8 사이여야 합니다');
      }
      break;

    case 'text':
      if (!block.data.text_content || block.data.text_content.trim() === '') {
        errors.push('텍스트 블록에는 내용이 필요합니다');
      }
      break;

    case 'featured':
      // 피처드 블록은 제품 데이터에 의존하므로 별도 검증 불필요
      break;

    case 'banner':
      // 배너는 기본 설정으로도 동작 가능
      break;
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * 블록 배열의 위치 정규화
 */
export function normalizeBlockPositions(blocks: StoreBlock[]): StoreBlock[] {
  return blocks
    .sort((a, b) => a.position - b.position)
    .map((block, index) => ({
      ...block,
      position: index
    }));
}

/**
 * 블록 복제
 */
export function duplicateBlock(block: StoreBlock): StoreBlock {
  return {
    ...block,
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    data: { ...block.data },
    isEditing: false
  };
}

/**
 * 기본 블록 생성
 */
export function createDefaultBlock(type: StoreBlock['type'], position: number): StoreBlock {
  const defaultData = getDefaultBlockData(type);
  
  return {
    id: `block-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
    type,
    data: defaultData,
    position,
    isEditing: true
  };
}

function getDefaultBlockData(type: StoreBlock['type']): Record<string, any> {
  switch (type) {
    case 'featured':
      return {
        featured_size: 'large',
        show_text_overlay: true,
        overlay_position: 'center'
      };
    case 'grid':
      return {
        columns: 4,
        spacing: 'normal',
        card_style: 'default'
      };
    case 'text':
      return {
        text_content: '',
        text_size: 'medium',
        text_alignment: 'center',
        max_width: 'large'
      };
    case 'banner':
      return {
        banner_height: 'medium',
        banner_style: 'gradient',
        call_to_action: '지금 확인하기'
      };
    case 'masonry':
      return {
        columns: 3,
        spacing: 'normal'
      };
    case 'list':
      return {
        spacing: 'normal',
        show_description: true
      };
    default:
      return {};
  }
}

/**
 * 블록 병합 (두 블록을 하나로 합치기)
 */
export function mergeBlocks(block1: StoreBlock, block2: StoreBlock): StoreBlock | null {
  // 같은 타입의 블록만 병합 가능
  if (block1.type !== block2.type) return null;

  // 그리드 블록의 경우 설정을 병합
  if (block1.type === 'grid') {
    return {
      ...block1,
      data: {
        ...block1.data,
        ...block2.data,
        // 컬럼 수는 더 큰 값 사용
        columns: Math.max(block1.data.columns || 4, block2.data.columns || 4)
      }
    };
  }

  // 텍스트 블록의 경우 내용을 연결
  if (block1.type === 'text') {
    return {
      ...block1,
      data: {
        ...block1.data,
        text_content: `${block1.data.text_content || ''}\n\n${block2.data.text_content || ''}`
      }
    };
  }

  // 기타 블록은 첫 번째 블록 유지
  return block1;
} 