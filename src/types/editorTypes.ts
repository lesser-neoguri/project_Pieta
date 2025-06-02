// Notion-style 블록 에디터를 위한 타입 정의
export type EditorBlockType = 'grid' | 'list' | 'masonry' | 'featured' | 'banner' | 'text';

// 기본 StoreBlock 타입 정의
export interface StoreBlock {
  id: string;
  type: 'text' | 'grid' | 'featured' | 'banner' | 'list' | 'masonry';
  position: number;
  data: StoreBlockData;
  spacing?: 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose';
  background_color?: string;
  text_alignment?: 'left' | 'center' | 'right';
  created_at: string;
  updated_at: string;
}

// 블록 타입별 데이터 정의
export interface TextBlockData {
  text_content: string;
  text_size?: 'small' | 'medium' | 'large';
  text_color?: string;
  text_weight?: 'normal' | 'medium' | 'bold';
  text_style?: 'paragraph' | 'heading';
  max_width?: 'small' | 'medium' | 'large' | 'full';
  padding?: 'none' | 'small' | 'medium' | 'large';
}

export interface ProductGridBlockData {
  columns: number;
  card_style?: 'default' | 'compact' | 'detailed';
  height_ratio?: 'square' | 'portrait' | 'landscape' | 'auto';
  spacing?: 'tight' | 'normal' | 'loose';
  show_prices?: boolean;
  show_ratings?: boolean;
}

export interface FeaturedProductBlockData {
  featured_size: 'small' | 'medium' | 'large';
  show_text_overlay: boolean;
  overlay_position: 'top' | 'center' | 'bottom';
  featured_product_ids?: string[];
}

export interface BannerBlockData {
  banner_height: 'small' | 'medium' | 'large' | 'full';
  banner_style: 'gradient' | 'image' | 'solid';
  banner_image_url?: string;
  call_to_action?: string;
  button_text?: string;
  button_link?: string;
}

export interface ListBlockData {
  list_style: 'horizontal' | 'vertical';
  show_description: boolean;
  show_price_prominent: boolean;
  max_items?: number;
}

export interface MasonryBlockData {
  masonry_columns: number;
  min_height?: 'small' | 'medium' | 'large';
  gap_size?: 'small' | 'medium' | 'large';
}

export type StoreBlockData = 
  | TextBlockData 
  | ProductGridBlockData 
  | FeaturedProductBlockData 
  | BannerBlockData 
  | ListBlockData 
  | MasonryBlockData;

// 에디터 상태 타입
export interface EditorState {
  blocks: StoreBlock[];
  editingBlockId: string | null;
  selectedBlockId: string | null;
  isDirty: boolean;
  lastSavedAt: Date | null;
  isLoading: boolean;
  optimisticUpdates: Map<string, Partial<StoreBlock>>;
  saveError: string | null;
  dragState: {
    isDragging: boolean;
    draggedBlockId: string | null;
    dragOverIndex: number | null;
  };
  clipboard?: StoreBlock | null;
}

// 에디터 액션 타입
export type EditorAction =
  | { type: 'LOAD_INITIAL_BLOCKS'; payload: StoreBlock[] }
  | { type: 'SET_EDITING'; payload: string | null }
  | { type: 'SET_SELECTED'; payload: string | null }
  | { type: 'UPDATE_BLOCK'; payload: { blockId: string; updates: Partial<StoreBlock>; isOptimistic?: boolean } }
  | { type: 'ADD_BLOCK'; payload: { block: StoreBlock; index?: number } }
  | { type: 'DELETE_BLOCK'; payload: string }
  | { type: 'REORDER_BLOCKS'; payload: { fromIndex: number; toIndex: number } }
  | { type: 'SET_DIRTY'; payload: boolean }
  | { type: 'SET_LAST_SAVED'; payload: Date }
  | { type: 'SET_LOADING'; payload: boolean }
  | { type: 'SET_SAVE_ERROR'; payload: string | null }
  | { type: 'CLEAR_OPTIMISTIC_UPDATES' }
  | { type: 'SET_DRAG_STATE'; payload: Partial<{ isDragging: boolean; draggedBlockId: string | null; dragOverIndex: number | null }> }
  | { type: 'START_DRAG'; payload: string }
  | { type: 'END_DRAG' }
  | { type: 'SET_DRAG_OVER'; payload: number | null };

// 충돌 정보 타입
export interface ConflictInfo {
  blockId: string;
  localVersion: Partial<StoreBlock>;
  serverVersion: Partial<StoreBlock>;
  timestamp: Date;
}

// 자동 저장 상태 타입
export interface AutoSaveState {
  isSaving: boolean;
  lastSaveAttempt: Date | null;
  saveError: string | null;
  retryCount: number;
  conflicts: ConflictInfo[];
}

// 블록 액션
export interface BlockAction {
  type: 'add' | 'update' | 'delete' | 'reorder' | 'duplicate';
  blockId: string;
  data?: any;
  position?: number;
}

// 기존 row_layouts을 새로운 블록 시스템으로 변환하는 유틸리티 타입
export interface LegacyRowLayout {
  [rowIndex: number]: {
    layout_type: EditorBlockType;
    [key: string]: any;
  };
} 