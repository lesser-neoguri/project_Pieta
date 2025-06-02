// 통합된 블록 타입 시스템
export interface BaseBlock {
  id: string;
  position: number;
  isEditing?: boolean;
  
  // 공통 설정
  spacing?: 'tight' | 'normal' | 'loose' | 'extra-loose';
  background_color?: string;
  text_alignment?: 'left' | 'center' | 'right';
  
  // 메타데이터
  created_at?: string;
  updated_at?: string;
}

// ===========================================
// 1. TEXT BLOCK (텍스트 블록)
// ===========================================

export interface TextBlockData {
  text_content: string;
  text_size: 'small' | 'medium' | 'large' | 'xl' | 'xxl';
  text_alignment: 'left' | 'center' | 'right' | 'justify';
  text_color: string;                          // required로 변경
  background_color?: string;
  max_width: 'small' | 'medium' | 'large' | 'full';
  padding: 'none' | 'small' | 'medium' | 'large';
  font_weight: 'normal' | 'medium' | 'semibold' | 'bold';
  line_height: 'tight' | 'normal' | 'relaxed' | 'loose';
  text_weight: 'normal' | 'medium' | 'semibold' | 'bold'; // 추가
  text_style: 'paragraph' | 'heading' | 'quote' | 'highlight'; // 추가
  enable_markdown?: boolean;
}

export interface TextBlock extends BaseBlock {
  type: 'text';
  data: TextBlockData;
}

// 기본값
export const DEFAULT_TEXT_BLOCK: Omit<TextBlock, 'id' | 'position'> = {
  type: 'text',
  data: {
    text_content: '',
    text_size: 'medium',
    text_alignment: 'center',
    text_color: '#333333',
    max_width: 'large',
    padding: 'medium',
    font_weight: 'normal',
    line_height: 'normal',
    text_weight: 'normal',
    text_style: 'paragraph',
    enable_markdown: false
  }
};

// ===========================================
// 2. PRODUCT GRID BLOCK (제품 그리드 블록)
// ===========================================

export interface ProductGridBlockData {
  columns: number;
  spacing: 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose';
  card_style: 'default' | 'compact' | 'detailed' | 'minimal';
  height_ratio: 'square' | 'portrait' | 'landscape' | 'auto';
  show_price: boolean;
  show_description: boolean;
  show_rating: boolean;
  max_products?: number;
  product_filter?: {
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
  };
  sort_by: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales';
}

export interface ProductGridBlock extends BaseBlock {
  type: 'grid';
  data: ProductGridBlockData;
}

export const DEFAULT_GRID_BLOCK: Omit<ProductGridBlock, 'id' | 'position'> = {
  type: 'grid',
  data: {
    columns: 4,
    spacing: 'normal',
    card_style: 'default',
    height_ratio: 'square',
    show_price: true,
    show_description: true,
    show_rating: false,
    sort_by: 'newest'
  }
};

// ===========================================
// 3. FEATURED PRODUCT BLOCK (피처드 제품 블록)
// ===========================================

export interface FeaturedProductBlockData {
  featured_size: 'medium' | 'large' | 'hero';
  featured_product_id?: string;
  layout_style: 'overlay' | 'side-by-side' | 'bottom';
  show_text_overlay: boolean;
  overlay_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center';
  overlay_background?: string;
  custom_title?: string;
  custom_description?: string;
  call_to_action?: string;
  background_image_url?: string;
  enable_parallax?: boolean;
  featured_image_url?: string;
  linked_product_id?: string;
}

export interface FeaturedProductBlock extends BaseBlock {
  type: 'featured';
  data: FeaturedProductBlockData;
}

export const DEFAULT_FEATURED_BLOCK: Omit<FeaturedProductBlock, 'id' | 'position'> = {
  type: 'featured',
  data: {
    featured_size: 'large',
    layout_style: 'overlay',
    show_text_overlay: true,
    overlay_position: 'center',
    call_to_action: '자세히 보기',
    enable_parallax: false
  }
};

// ===========================================
// 4. BANNER BLOCK (배너 블록)
// ===========================================

export interface BannerBlockData {
  banner_height: 'small' | 'medium' | 'large' | 'hero';
  banner_style: 'solid' | 'gradient' | 'image';
  background_color?: string;
  gradient_colors?: [string, string];
  gradient_direction?: 'horizontal' | 'vertical' | 'diagonal';
  background_image_url?: string;
  title?: string;
  description?: string;
  call_to_action?: string;
  cta_link?: string;
  text_color?: string;
  text_alignment: 'left' | 'center' | 'right';
  enable_animation?: boolean;
  banner_image_url?: string;
}

export interface BannerBlock extends BaseBlock {
  type: 'banner';
  data: BannerBlockData;
}

export const DEFAULT_BANNER_BLOCK: Omit<BannerBlock, 'id' | 'position'> = {
  type: 'banner',
  data: {
    banner_height: 'medium',
    banner_style: 'gradient',
    gradient_colors: ['#3B82F6', '#8B5CF6'],
    gradient_direction: 'horizontal',
    title: '특별 프로모션',
    call_to_action: '지금 확인하기',
    text_color: '#FFFFFF',
    text_alignment: 'center',
    enable_animation: false
  }
};

// ===========================================
// 5. MASONRY BLOCK (메이슨리 블록)
// ===========================================

export interface MasonryBlockData {
  columns: number;
  masonry_columns: number; // 추가
  spacing: 'tight' | 'normal' | 'loose';
  min_height: 'small' | 'medium' | 'large';
  max_height?: 'medium' | 'large' | 'xl';
  maintain_aspect_ratio: boolean;
  enable_lightbox: boolean;
  show_product_info: boolean;
  hover_effect: 'none' | 'zoom' | 'overlay' | 'lift';
}

export interface MasonryBlock extends BaseBlock {
  type: 'masonry';
  data: MasonryBlockData;
}

export const DEFAULT_MASONRY_BLOCK: Omit<MasonryBlock, 'id' | 'position'> = {
  type: 'masonry',
  data: {
    columns: 3,
    masonry_columns: 3,
    spacing: 'normal',
    min_height: 'medium',
    maintain_aspect_ratio: false,
    enable_lightbox: true,
    show_product_info: true,
    hover_effect: 'overlay'
  }
};

// ===========================================
// 6. LIST BLOCK (리스트 블록)
// ===========================================

export interface ListBlockData {
  list_style: 'horizontal' | 'vertical';
  item_layout: 'compact' | 'comfortable' | 'spacious';
  show_images: boolean;
  image_position: 'left' | 'right' | 'top';
  image_size: 'small' | 'medium' | 'large';
  show_description: boolean;
  show_price: boolean;
  show_rating: boolean;
  enable_dividers: boolean;
  max_items?: number;
  show_price_prominent: boolean; // 추가
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  data: ListBlockData;
}

export const DEFAULT_LIST_BLOCK: Omit<ListBlock, 'id' | 'position'> = {
  type: 'list',
  data: {
    list_style: 'vertical',
    item_layout: 'comfortable',
    show_images: true,
    image_position: 'left',
    image_size: 'medium',
    show_description: true,
    show_price: true,
    show_rating: false,
    enable_dividers: true,
    show_price_prominent: false
  }
};

// ===========================================
// 통합 블록 타입
// ===========================================

export type StoreBlock = 
  | TextBlock 
  | ProductGridBlock 
  | FeaturedProductBlock 
  | BannerBlock 
  | MasonryBlock 
  | ListBlock;

export type BlockType = StoreBlock['type'];
export type BlockData = StoreBlock['data'];

// 블록 타입별 기본값 매핑
export const DEFAULT_BLOCK_DATA: Record<BlockType, any> = {
  text: DEFAULT_TEXT_BLOCK,
  grid: DEFAULT_GRID_BLOCK,
  featured: DEFAULT_FEATURED_BLOCK,
  banner: DEFAULT_BANNER_BLOCK,
  masonry: DEFAULT_MASONRY_BLOCK,
  list: DEFAULT_LIST_BLOCK
};

// 블록 메타데이터
export interface BlockTypeMetadata {
  label: string;
  description: string;
  icon: string;
  category: 'content' | 'product' | 'layout';
  preview: string;
}

export const BLOCK_TYPE_METADATA: Record<BlockType, BlockTypeMetadata> = {
  text: {
    label: '텍스트',
    description: '제목, 설명, 공지사항 등 텍스트 콘텐츠',
    icon: '📝',
    category: 'content',
    preview: '텍스트 콘텐츠'
  },
  grid: {
    label: '제품 그리드',
    description: '제품들을 격자 형태로 깔끔하게 정렬',
    icon: '▦',
    category: 'product',
    preview: '2x2 제품 격자'
  },
  featured: {
    label: '피처드 제품',
    description: '주요 제품을 크게 강조하여 표시',
    icon: '⭐',
    category: 'product',
    preview: '대형 제품 쇼케이스'
  },
  banner: {
    label: '배너',
    description: '프로모션, 이벤트, 브랜드 메시지 전달',
    icon: '🎯',
    category: 'content',
    preview: '홍보 배너'
  },
  masonry: {
    label: '메이슨리',
    description: '다양한 크기의 이미지를 자연스럽게 배치',
    icon: '🧱',
    category: 'layout',
    preview: '불규칙 타일'
  },
  list: {
    label: '제품 리스트',
    description: '제품을 목록 형태로 상세하게 표시',
    icon: '📋',
    category: 'product',
    preview: '세로 목록'
  }
};

// 편집 상태 관리
export interface EditorState {
  selectedBlockId: string | null;
  editingBlockId: string | null;
  dragState: {
    isDragging: boolean;
    draggedBlockId: string | null;
    dropZone: number | null;
  };
  clipboard: StoreBlock | null;
}

// 블록 액션
export interface BlockAction {
  type: 'add' | 'update' | 'delete' | 'reorder' | 'duplicate';
  blockId: string;
  data?: any;
  position?: number;
} 