import { 
  StoreBlock, 
  TextBlock, 
  ProductGridBlock, 
  FeaturedProductBlock, 
  BannerBlock, 
  MasonryBlock, 
  ListBlock 
} from '@/types/blockTypes';

// 기존 row_layouts 구조
export interface LegacyRowLayout {
  // === 공통 필드 ===
  layout_type: string;                     // 'grid' | 'featured' | 'text' | 'banner' | 'masonry' | 'list'
  
  // === 그리드/레이아웃 관련 ===
  columns?: number;                        // 컬럼 수
  spacing?: string;                        // 간격 ('tight' | 'normal' | 'loose')
  
  // === 피처드 제품 관련 ===
  featured_size?: string;                  // 'medium' | 'large' | 'hero'
  featured_image_url?: string;             // 피처드 배경 이미지
  show_text_overlay?: boolean;             // 텍스트 오버레이 표시
  overlay_position?: string;               // 오버레이 위치
  
  // === 배너 관련 ===
  banner_height?: string;                  // 'small' | 'medium' | 'large'
  banner_style?: string;                   // 'solid' | 'gradient' | 'image'
  call_to_action?: string;                 // CTA 버튼 텍스트
  
  // === 텍스트 관련 ===
  text_content?: string;                   // 텍스트 내용
  text_size?: string;                      // 텍스트 크기
  text_alignment?: string;                 // 텍스트 정렬
  
  // === 제품 표시 관련 ===
  show_price?: boolean;                    // 가격 표시
  show_description?: boolean;              // 설명 표시
  show_rating?: boolean;                   // 평점 표시
  
  // === 기타 확장 필드 ===
  [key: string]: any;
}

// =====================================================
// 각 블록 타입별 매핑 함수
// =====================================================

/**
 * TEXT BLOCK 매핑
 * 
 * 기존 필드 → 새 필드 매핑:
 * - text_content → data.text_content
 * - text_size → data.text_size  
 * - text_alignment → data.text_alignment
 * - spacing → data.padding (변환 필요)
 */
export function mapLegacyToTextBlock(
  legacy: LegacyRowLayout, 
  position: number
): TextBlock {
  return {
    id: `text-${position}-${Date.now()}`,
    type: 'text',
    position,
    data: {
      text_content: legacy.text_content || '',
      text_size: mapTextSize(legacy.text_size),
      text_alignment: mapTextAlignment(legacy.text_alignment),
      text_color: legacy.text_color || undefined,
      background_color: legacy.background_color || undefined,
      max_width: mapMaxWidth(legacy.max_width),
      padding: mapSpacingToPadding(legacy.spacing),
      font_weight: mapFontWeight(legacy.font_weight),
      line_height: mapLineHeight(legacy.line_height),
      enable_markdown: legacy.enable_markdown || false
    }
  };
}

/**
 * PRODUCT GRID BLOCK 매핑
 * 
 * 기존 필드 → 새 필드 매핑:
 * - columns → data.columns
 * - spacing → data.spacing
 * - show_price → data.show_price
 * - show_description → data.show_description
 * - show_rating → data.show_rating
 * - card_style → data.card_style (새로 추가)
 */
export function mapLegacyToGridBlock(
  legacy: LegacyRowLayout, 
  position: number
): ProductGridBlock {
  return {
    id: `grid-${position}-${Date.now()}`,
    type: 'grid',
    position,
    data: {
      columns: legacy.columns || 4,
      spacing: mapSpacing(legacy.spacing),
      card_style: mapCardStyle(legacy.card_style),
      height_ratio: mapHeightRatio(legacy.height_ratio),
      show_price: legacy.show_price !== false, // 기본값 true
      show_description: legacy.show_description !== false,
      show_rating: legacy.show_rating || false,
      max_products: legacy.max_products || undefined,
      product_filter: legacy.product_filter || undefined,
      sort_by: mapSortBy(legacy.sort_by)
    }
  };
}

/**
 * FEATURED PRODUCT BLOCK 매핑
 * 
 * 기존 필드 → 새 필드 매핑:
 * - featured_size → data.featured_size
 * - featured_image_url → data.background_image_url
 * - show_text_overlay → data.show_text_overlay
 * - overlay_position → data.overlay_position
 * - call_to_action → data.call_to_action
 */
export function mapLegacyToFeaturedBlock(
  legacy: LegacyRowLayout, 
  position: number
): FeaturedProductBlock {
  return {
    id: `featured-${position}-${Date.now()}`,
    type: 'featured',
    position,
    data: {
      featured_size: mapFeaturedSize(legacy.featured_size),
      featured_product_id: legacy.featured_product_id || undefined,
      layout_style: mapLayoutStyle(legacy.layout_style),
      show_text_overlay: legacy.show_text_overlay !== false,
      overlay_position: mapOverlayPosition(legacy.overlay_position),
      overlay_background: legacy.overlay_background || undefined,
      custom_title: legacy.custom_title || undefined,
      custom_description: legacy.custom_description || undefined,
      call_to_action: legacy.call_to_action || '자세히 보기',
      background_image_url: legacy.featured_image_url || undefined,
      enable_parallax: legacy.enable_parallax || false
    }
  };
}

/**
 * BANNER BLOCK 매핑
 * 
 * 기존 필드 → 새 필드 매핑:
 * - banner_height → data.banner_height
 * - banner_style → data.banner_style
 * - call_to_action → data.call_to_action
 * - text_alignment → data.text_alignment
 */
export function mapLegacyToBannerBlock(
  legacy: LegacyRowLayout, 
  position: number
): BannerBlock {
  return {
    id: `banner-${position}-${Date.now()}`,
    type: 'banner',
    position,
    data: {
      banner_height: mapBannerHeight(legacy.banner_height),
      banner_style: mapBannerStyle(legacy.banner_style),
      background_color: legacy.background_color || undefined,
      gradient_colors: parseGradientColors(legacy.gradient_colors),
      gradient_direction: mapGradientDirection(legacy.gradient_direction),
      background_image_url: legacy.background_image_url || undefined,
      title: legacy.title || undefined,
      description: legacy.description || undefined,
      call_to_action: legacy.call_to_action || undefined,
      cta_link: legacy.cta_link || undefined,
      text_color: legacy.text_color || '#FFFFFF',
      text_alignment: mapBannerTextAlignment(legacy.text_alignment),
      enable_animation: legacy.enable_animation || false
    }
  };
}

/**
 * MASONRY BLOCK 매핑 (기존 시스템에 없던 새로운 블록)
 */
export function mapLegacyToMasonryBlock(
  legacy: LegacyRowLayout, 
  position: number
): MasonryBlock {
  return {
    id: `masonry-${position}-${Date.now()}`,
    type: 'masonry',
    position,
    data: {
      columns: legacy.columns || 3,
      spacing: mapMasonrySpacing(legacy.spacing),
      min_height: mapMinHeight(legacy.min_height),
      max_height: mapMaxHeight(legacy.max_height),
      maintain_aspect_ratio: legacy.maintain_aspect_ratio || false,
      enable_lightbox: legacy.enable_lightbox !== false,
      show_product_info: legacy.show_product_info !== false,
      hover_effect: mapHoverEffect(legacy.hover_effect)
    }
  };
}

/**
 * LIST BLOCK 매핑
 */
export function mapLegacyToListBlock(
  legacy: LegacyRowLayout, 
  position: number
): ListBlock {
  return {
    id: `list-${position}-${Date.now()}`,
    type: 'list',
    position,
    data: {
      list_style: mapListStyle(legacy.list_style),
      item_layout: mapItemLayout(legacy.item_layout),
      show_images: legacy.show_images !== false,
      image_position: mapImagePosition(legacy.image_position),
      image_size: mapImageSize(legacy.image_size),
      show_description: legacy.show_description !== false,
      show_price: legacy.show_price !== false,
      show_rating: legacy.show_rating || false,
      enable_dividers: legacy.enable_dividers !== false,
      max_items: legacy.max_items || undefined
    }
  };
}

// =====================================================
// 역방향 매핑 (새 블록 → 기존 row_layouts)
// =====================================================

export function mapBlockToLegacy(block: StoreBlock): LegacyRowLayout {
  const base: LegacyRowLayout = {
    layout_type: block.type
  };

  switch (block.type) {
    case 'text':
      return {
        ...base,
        text_content: block.data.text_content,
        text_size: block.data.text_size,
        text_alignment: block.data.text_alignment,
        text_color: block.data.text_color,
        background_color: block.data.background_color,
        max_width: block.data.max_width,
        spacing: mapPaddingToSpacing(block.data.padding),
        font_weight: block.data.font_weight,
        line_height: block.data.line_height,
        enable_markdown: block.data.enable_markdown
      };

    case 'grid':
      return {
        ...base,
        columns: block.data.columns,
        spacing: block.data.spacing,
        card_style: block.data.card_style,
        height_ratio: block.data.height_ratio,
        show_price: block.data.show_price,
        show_description: block.data.show_description,
        show_rating: block.data.show_rating,
        max_products: block.data.max_products,
        product_filter: block.data.product_filter,
        sort_by: block.data.sort_by
      };

    case 'featured':
      return {
        ...base,
        featured_size: block.data.featured_size,
        featured_product_id: block.data.featured_product_id,
        layout_style: block.data.layout_style,
        show_text_overlay: block.data.show_text_overlay,
        overlay_position: block.data.overlay_position,
        overlay_background: block.data.overlay_background,
        custom_title: block.data.custom_title,
        custom_description: block.data.custom_description,
        call_to_action: block.data.call_to_action,
        featured_image_url: block.data.background_image_url,
        enable_parallax: block.data.enable_parallax
      };

    case 'banner':
      return {
        ...base,
        banner_height: block.data.banner_height,
        banner_style: block.data.banner_style,
        background_color: block.data.background_color,
        gradient_colors: block.data.gradient_colors,
        gradient_direction: block.data.gradient_direction,
        background_image_url: block.data.background_image_url,
        title: block.data.title,
        description: block.data.description,
        call_to_action: block.data.call_to_action,
        cta_link: block.data.cta_link,
        text_color: block.data.text_color,
        text_alignment: block.data.text_alignment,
        enable_animation: block.data.enable_animation
      };

    case 'masonry':
      return {
        ...base,
        columns: block.data.columns,
        spacing: block.data.spacing,
        min_height: block.data.min_height,
        max_height: block.data.max_height,
        maintain_aspect_ratio: block.data.maintain_aspect_ratio,
        enable_lightbox: block.data.enable_lightbox,
        show_product_info: block.data.show_product_info,
        hover_effect: block.data.hover_effect
      };

    case 'list':
      return {
        ...base,
        list_style: block.data.list_style,
        item_layout: block.data.item_layout,
        show_images: block.data.show_images,
        image_position: block.data.image_position,
        image_size: block.data.image_size,
        show_description: block.data.show_description,
        show_price: block.data.show_price,
        show_rating: block.data.show_rating,
        enable_dividers: block.data.enable_dividers,
        max_items: block.data.max_items
      };

    default:
      return base;
  }
}

// =====================================================
// 헬퍼 매핑 함수들
// =====================================================

function mapTextSize(size?: string): 'small' | 'medium' | 'large' | 'xl' | 'xxl' {
  const sizeMap: Record<string, 'small' | 'medium' | 'large' | 'xl' | 'xxl'> = {
    'small': 'small',
    'medium': 'medium', 
    'large': 'large',
    'xl': 'xl',
    'xxl': 'xxl'
  };
  return sizeMap[size || 'medium'] || 'medium';
}

function mapTextAlignment(alignment?: string): 'left' | 'center' | 'right' | 'justify' {
  const alignMap: Record<string, 'left' | 'center' | 'right' | 'justify'> = {
    'left': 'left',
    'center': 'center',
    'right': 'right',
    'justify': 'justify'
  };
  return alignMap[alignment || 'center'] || 'center';
}

function mapSpacing(spacing?: string): 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose' {
  const spacingMap: Record<string, 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose'> = {
    'none': 'none',
    'tight': 'tight',
    'normal': 'normal',
    'loose': 'loose',
    'extra-loose': 'extra-loose'
  };
  return spacingMap[spacing || 'normal'] || 'normal';
}

function mapSpacingToPadding(spacing?: string): 'none' | 'small' | 'medium' | 'large' {
  const paddingMap: Record<string, 'none' | 'small' | 'medium' | 'large'> = {
    'none': 'none',
    'tight': 'small',
    'normal': 'medium',
    'loose': 'large'
  };
  return paddingMap[spacing || 'normal'] || 'medium';
}

function mapPaddingToSpacing(padding?: string): string {
  const spacingMap: Record<string, string> = {
    'none': 'none',
    'small': 'tight',
    'medium': 'normal',
    'large': 'loose'
  };
  return spacingMap[padding || 'medium'] || 'normal';
}

function mapMaxWidth(width?: string): 'small' | 'medium' | 'large' | 'full' {
  const widthMap: Record<string, 'small' | 'medium' | 'large' | 'full'> = {
    'small': 'small',
    'medium': 'medium',
    'large': 'large',
    'full': 'full'
  };
  return widthMap[width || 'large'] || 'large';
}

function mapFontWeight(weight?: string): 'normal' | 'medium' | 'semibold' | 'bold' {
  const weightMap: Record<string, 'normal' | 'medium' | 'semibold' | 'bold'> = {
    'normal': 'normal',
    'medium': 'medium',
    'semibold': 'semibold',
    'bold': 'bold'
  };
  return weightMap[weight || 'normal'] || 'normal';
}

function mapLineHeight(height?: string): 'tight' | 'normal' | 'relaxed' | 'loose' {
  const heightMap: Record<string, 'tight' | 'normal' | 'relaxed' | 'loose'> = {
    'tight': 'tight',
    'normal': 'normal',
    'relaxed': 'relaxed',
    'loose': 'loose'
  };
  return heightMap[height || 'normal'] || 'normal';
}

function mapCardStyle(style?: string): 'default' | 'compact' | 'detailed' | 'minimal' {
  const styleMap: Record<string, 'default' | 'compact' | 'detailed' | 'minimal'> = {
    'default': 'default',
    'compact': 'compact',
    'detailed': 'detailed',
    'minimal': 'minimal'
  };
  return styleMap[style || 'default'] || 'default';
}

function mapHeightRatio(ratio?: string): 'square' | 'portrait' | 'landscape' | 'auto' {
  const ratioMap: Record<string, 'square' | 'portrait' | 'landscape' | 'auto'> = {
    'square': 'square',
    'portrait': 'portrait',
    'landscape': 'landscape',
    'auto': 'auto'
  };
  return ratioMap[ratio || 'square'] || 'square';
}

function mapSortBy(sort?: string): 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales' {
  const sortMap: Record<string, 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales'> = {
    'newest': 'newest',
    'price_asc': 'price_asc',
    'price_desc': 'price_desc',
    'rating': 'rating',
    'sales': 'sales'
  };
  return sortMap[sort || 'newest'] || 'newest';
}

function mapFeaturedSize(size?: string): 'medium' | 'large' | 'hero' {
  const sizeMap: Record<string, 'medium' | 'large' | 'hero'> = {
    'medium': 'medium',
    'large': 'large',
    'hero': 'hero'
  };
  return sizeMap[size || 'large'] || 'large';
}

function mapLayoutStyle(style?: string): 'overlay' | 'side-by-side' | 'bottom' {
  const styleMap: Record<string, 'overlay' | 'side-by-side' | 'bottom'> = {
    'overlay': 'overlay',
    'side-by-side': 'side-by-side',
    'bottom': 'bottom'
  };
  return styleMap[style || 'overlay'] || 'overlay';
}

function mapOverlayPosition(pos?: string): 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center' {
  const posMap: Record<string, 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'> = {
    'top-left': 'top-left',
    'top-right': 'top-right',
    'bottom-left': 'bottom-left',
    'bottom-right': 'bottom-right',
    'center': 'center'
  };
  return posMap[pos || 'center'] || 'center';
}

function mapBannerHeight(height?: string): 'small' | 'medium' | 'large' | 'hero' {
  const heightMap: Record<string, 'small' | 'medium' | 'large' | 'hero'> = {
    'small': 'small',
    'medium': 'medium',
    'large': 'large',
    'hero': 'hero'
  };
  return heightMap[height || 'medium'] || 'medium';
}

function mapBannerStyle(style?: string): 'solid' | 'gradient' | 'image' {
  const styleMap: Record<string, 'solid' | 'gradient' | 'image'> = {
    'solid': 'solid',
    'gradient': 'gradient',
    'image': 'image'
  };
  return styleMap[style || 'gradient'] || 'gradient';
}

function parseGradientColors(colors?: any): [string, string] | undefined {
  if (Array.isArray(colors) && colors.length === 2) {
    return [colors[0], colors[1]];
  }
  return undefined;
}

function mapGradientDirection(direction?: string): 'horizontal' | 'vertical' | 'diagonal' {
  const dirMap: Record<string, 'horizontal' | 'vertical' | 'diagonal'> = {
    'horizontal': 'horizontal',
    'vertical': 'vertical', 
    'diagonal': 'diagonal'
  };
  return dirMap[direction || 'horizontal'] || 'horizontal';
}

function mapMinHeight(height?: string): 'small' | 'medium' | 'large' {
  const heightMap: Record<string, 'small' | 'medium' | 'large'> = {
    'small': 'small',
    'medium': 'medium',
    'large': 'large'
  };
  return heightMap[height || 'medium'] || 'medium';
}

function mapMaxHeight(height?: string): 'medium' | 'large' | 'xl' | undefined {
  const heightMap: Record<string, 'medium' | 'large' | 'xl'> = {
    'medium': 'medium',
    'large': 'large',
    'xl': 'xl'
  };
  return height ? heightMap[height] : undefined;
}

function mapHoverEffect(effect?: string): 'none' | 'zoom' | 'overlay' | 'lift' {
  const effectMap: Record<string, 'none' | 'zoom' | 'overlay' | 'lift'> = {
    'none': 'none',
    'zoom': 'zoom',
    'overlay': 'overlay',
    'lift': 'lift'
  };
  return effectMap[effect || 'overlay'] || 'overlay';
}

function mapListStyle(style?: string): 'horizontal' | 'vertical' {
  const styleMap: Record<string, 'horizontal' | 'vertical'> = {
    'horizontal': 'horizontal',
    'vertical': 'vertical'
  };
  return styleMap[style || 'vertical'] || 'vertical';
}

function mapItemLayout(layout?: string): 'compact' | 'comfortable' | 'spacious' {
  const layoutMap: Record<string, 'compact' | 'comfortable' | 'spacious'> = {
    'compact': 'compact',
    'comfortable': 'comfortable',
    'spacious': 'spacious'
  };
  return layoutMap[layout || 'comfortable'] || 'comfortable';
}

function mapImagePosition(position?: string): 'left' | 'right' | 'top' {
  const posMap: Record<string, 'left' | 'right' | 'top'> = {
    'left': 'left',
    'right': 'right',
    'top': 'top'
  };
  return posMap[position || 'left'] || 'left';
}

function mapImageSize(size?: string): 'small' | 'medium' | 'large' {
  const sizeMap: Record<string, 'small' | 'medium' | 'large'> = {
    'small': 'small',
    'medium': 'medium',
    'large': 'large'
  };
  return sizeMap[size || 'medium'] || 'medium';
}

// Masonry와 Banner 블록을 위한 특별한 spacing 매핑 함수들
function mapMasonrySpacing(spacing?: string): 'tight' | 'normal' | 'loose' {
  const spacingMap: Record<string, 'tight' | 'normal' | 'loose'> = {
    'tight': 'tight',
    'normal': 'normal',
    'loose': 'loose'
  };
  return spacingMap[spacing || 'normal'] || 'normal';
}

function mapBannerTextAlignment(alignment?: string): 'left' | 'center' | 'right' {
  const alignMap: Record<string, 'left' | 'center' | 'right'> = {
    'left': 'left',
    'center': 'center',
    'right': 'right'
  };
  return alignMap[alignment || 'center'] || 'center';
} 