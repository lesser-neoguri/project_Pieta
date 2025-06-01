// 기본 블록 인터페이스
export interface BaseBlock {
  id: string;
  position: number;
  isEditing?: boolean;
}

// ===========================================
// 1. TEXT BLOCK (텍스트 블록)
// ===========================================

export interface TextBlockData {
  text_content: string;                    // 텍스트 내용
  text_size: 'small' | 'medium' | 'large' | 'xl' | 'xxl';  // 텍스트 크기
  text_alignment: 'left' | 'center' | 'right' | 'justify'; // 정렬
  text_color?: string;                     // 텍스트 색상
  background_color?: string;               // 배경 색상
  max_width: 'small' | 'medium' | 'large' | 'full';       // 최대 너비
  padding: 'none' | 'small' | 'medium' | 'large';         // 패딩
  font_weight: 'normal' | 'medium' | 'semibold' | 'bold'; // 글자 굵기
  line_height: 'tight' | 'normal' | 'relaxed' | 'loose';  // 줄 간격
  enable_markdown?: boolean;               // 마크다운 지원 여부
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
    max_width: 'large',
    padding: 'medium',
    font_weight: 'normal',
    line_height: 'normal',
    enable_markdown: false
  }
};

// ===========================================
// 2. PRODUCT GRID BLOCK (제품 그리드 블록)
// ===========================================

export interface ProductGridBlockData {
  columns: number;                         // 컬럼 수 (1-8)
  spacing: 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose'; // 간격
  card_style: 'default' | 'compact' | 'detailed' | 'minimal';     // 카드 스타일
  height_ratio: 'square' | 'portrait' | 'landscape' | 'auto';     // 높이 비율
  show_price: boolean;                     // 가격 표시 여부
  show_description: boolean;               // 설명 표시 여부
  show_rating: boolean;                    // 평점 표시 여부
  max_products?: number;                   // 최대 제품 수
  product_filter?: {                       // 제품 필터
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
  };
  sort_by: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales'; // 정렬
}

export interface ProductGridBlock extends BaseBlock {
  type: 'grid';
  data: ProductGridBlockData;
}

// 기본값
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
  featured_size: 'medium' | 'large' | 'hero';             // 크기
  featured_product_id?: string;           // 특정 제품 ID (선택적)
  layout_style: 'overlay' | 'side-by-side' | 'bottom';    // 레이아웃 스타일
  show_text_overlay: boolean;             // 텍스트 오버레이 표시
  overlay_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; // 오버레이 위치
  overlay_background?: string;            // 오버레이 배경색
  custom_title?: string;                  // 커스텀 제목
  custom_description?: string;            // 커스텀 설명
  call_to_action?: string;                // 행동 유도 텍스트
  background_image_url?: string;          // 배경 이미지
  enable_parallax?: boolean;              // 패럴랙스 효과
}

export interface FeaturedProductBlock extends BaseBlock {
  type: 'featured';
  data: FeaturedProductBlockData;
}

// 기본값
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
  banner_height: 'small' | 'medium' | 'large' | 'hero';   // 높이
  banner_style: 'solid' | 'gradient' | 'image';           // 스타일
  background_color?: string;              // 배경색
  gradient_colors?: [string, string];     // 그라데이션 색상 [시작, 끝]
  gradient_direction?: 'horizontal' | 'vertical' | 'diagonal'; // 그라데이션 방향
  background_image_url?: string;          // 배경 이미지
  title?: string;                         // 제목
  description?: string;                   // 설명
  call_to_action?: string;                // 행동 유도 버튼 텍스트
  cta_link?: string;                      // 버튼 링크
  text_color?: string;                    // 텍스트 색상
  text_alignment: 'left' | 'center' | 'right'; // 텍스트 정렬
  enable_animation?: boolean;             // 애니메이션 효과
}

export interface BannerBlock extends BaseBlock {
  type: 'banner';
  data: BannerBlockData;
}

// 기본값
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
  columns: number;                        // 컬럼 수 (2-6)
  spacing: 'tight' | 'normal' | 'loose'; // 간격
  min_height: 'small' | 'medium' | 'large'; // 최소 높이
  max_height?: 'medium' | 'large' | 'xl'; // 최대 높이
  maintain_aspect_ratio: boolean;         // 비율 유지 여부
  enable_lightbox: boolean;               // 라이트박스 기능
  show_product_info: boolean;             // 제품 정보 표시
  hover_effect: 'none' | 'zoom' | 'overlay' | 'lift'; // 호버 효과
}

export interface MasonryBlock extends BaseBlock {
  type: 'masonry';
  data: MasonryBlockData;
}

// 기본값
export const DEFAULT_MASONRY_BLOCK: Omit<MasonryBlock, 'id' | 'position'> = {
  type: 'masonry',
  data: {
    columns: 3,
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
  list_style: 'horizontal' | 'vertical';  // 리스트 방향
  item_layout: 'compact' | 'comfortable' | 'spacious'; // 아이템 레이아웃
  show_images: boolean;                   // 이미지 표시 여부
  image_position: 'left' | 'right' | 'top'; // 이미지 위치
  image_size: 'small' | 'medium' | 'large'; // 이미지 크기
  show_description: boolean;              // 설명 표시 여부
  show_price: boolean;                    // 가격 표시 여부
  show_rating: boolean;                   // 평점 표시 여부
  enable_dividers: boolean;               // 구분선 표시
  max_items?: number;                     // 최대 아이템 수
}

export interface ListBlock extends BaseBlock {
  type: 'list';
  data: ListBlockData;
}

// 기본값
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
    enable_dividers: true
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