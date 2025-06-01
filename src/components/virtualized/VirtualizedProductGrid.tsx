import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';

interface VirtualizedProductGridProps {
  products: any[];
  rowLayouts: Record<number, any>;
  itemHeight: number;
  containerHeight: number;
  overscan?: number;
}

interface VirtualItem {
  index: number;
  top: number;
  height: number;
  rowLayout: any;
  products: any[];
}

export const VirtualizedProductGrid: React.FC<VirtualizedProductGridProps> = ({
  products,
  rowLayouts,
  itemHeight,
  containerHeight,
  overscan = 3
}) => {
  const [scrollTop, setScrollTop] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // 가상 아이템 계산
  const virtualItems = useMemo(() => {
    const items: VirtualItem[] = [];
    let currentTop = 0;
    let productIndex = 0;

    Object.entries(rowLayouts).forEach(([rowIndex, layout]) => {
      const rowNumber = parseInt(rowIndex);
      
      // 행별 높이 계산
      let rowHeight = itemHeight;
      if (layout.layout_type === 'featured') {
        rowHeight = layout.featured_size === 'hero' ? 600 : 400;
      } else if (layout.layout_type === 'banner') {
        rowHeight = layout.banner_height === 'large' ? 300 : 200;
      }

      // 해당 행에 표시될 제품들
      const productsPerRow = layout.columns || 4;
      const rowProducts = products.slice(productIndex, productIndex + productsPerRow);
      
      items.push({
        index: rowNumber,
        top: currentTop,
        height: rowHeight,
        rowLayout: layout,
        products: rowProducts
      });

      currentTop += rowHeight;
      productIndex += productsPerRow;
    });

    return items;
  }, [products, rowLayouts, itemHeight]);

  // 총 높이 계산
  const totalHeight = useMemo(() => {
    return virtualItems.reduce((sum, item) => sum + item.height, 0);
  }, [virtualItems]);

  // 현재 보이는 아이템들 계산
  const visibleItems = useMemo(() => {
    const viewportTop = scrollTop;
    const viewportBottom = scrollTop + containerHeight;

    return virtualItems.filter(item => {
      const itemBottom = item.top + item.height;
      return itemBottom >= viewportTop - (overscan * itemHeight) && 
             item.top <= viewportBottom + (overscan * itemHeight);
    });
  }, [virtualItems, scrollTop, containerHeight, overscan, itemHeight]);

  // 스크롤 이벤트 핸들러
  const handleScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    setScrollTop(e.currentTarget.scrollTop);
  }, []);

  // Intersection Observer로 더 정확한 감지
  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          const element = entry.target as HTMLElement;
          const rowIndex = element.dataset.rowIndex;
          
          if (entry.isIntersecting) {
            // 해당 행이 보이기 시작할 때 필요한 작업
            console.log(`Row ${rowIndex} is visible`);
          }
        });
      },
      {
        root: container,
        threshold: 0.1
      }
    );

    return () => observer.disconnect();
  }, []);

  return (
    <div
      ref={containerRef}
      style={{ height: containerHeight, overflow: 'auto' }}
      onScroll={handleScroll}
      className="relative"
    >
      {/* 전체 높이를 위한 스페이서 */}
      <div style={{ height: totalHeight, position: 'relative' }}>
        {visibleItems.map(item => (
          <VirtualizedRow
            key={item.index}
            item={item}
            style={{
              position: 'absolute',
              top: item.top,
              left: 0,
              right: 0,
              height: item.height
            }}
          />
        ))}
      </div>
    </div>
  );
};

const VirtualizedRow: React.FC<{
  item: VirtualItem;
  style: React.CSSProperties;
}> = ({ item, style }) => {
  const { rowLayout, products } = item;

  return (
    <div style={style} data-row-index={item.index}>
      <RowRenderer layout={rowLayout} products={products} />
    </div>
  );
};

const RowRenderer: React.FC<{
  layout: any;
  products: any[];
}> = React.memo(({ layout, products }) => {
  // 각 레이아웃 타입별 렌더링 최적화
  switch (layout.layout_type) {
    case 'grid':
      return <GridRow layout={layout} products={products} />;
    case 'featured':
      return <FeaturedRow layout={layout} products={products} />;
    case 'text':
      return <TextRow layout={layout} />;
    case 'banner':
      return <BannerRow layout={layout} />;
    default:
      return null;
  }
});

// 개별 행 컴포넌트들을 메모이제이션
const GridRow = React.memo<{ layout: any; products: any[] }>(({ layout, products }) => {
  const gridStyle = useMemo(() => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${layout.columns || 4}, minmax(0, 1fr))`,
    gap: layout.spacing === 'tight' ? '0.5rem' : '1.5rem'
  }), [layout.columns, layout.spacing]);

  return (
    <div style={gridStyle} className="px-4">
      {products.map(product => (
        <LazyProductCard key={product.id} product={product} />
      ))}
    </div>
  );
});

const LazyProductCard: React.FC<{ product: any }> = ({ product }) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      { threshold: 0.1 }
    );

    if (ref.current) {
      observer.observe(ref.current);
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {isVisible ? (
        <>
          <div className="aspect-square bg-gray-100">
            <img
              src={product.product_image_url}
              alt={product.product_name}
              className="w-full h-full object-cover"
              loading="lazy"
            />
          </div>
          <div className="p-4">
            <h3 className="font-medium">{product.product_name}</h3>
            <p className="text-gray-600">{product.price.toLocaleString()}원</p>
          </div>
        </>
      ) : (
        <div className="aspect-square bg-gray-100 animate-pulse" />
      )}
    </div>
  );
};

const FeaturedRow = React.memo<{ layout: any; products: any[] }>(({ layout, products }) => {
  return (
    <div className="relative">
      {layout.featured_image_url && (
        <img
          src={layout.featured_image_url}
          alt="Featured"
          className="w-full h-full object-cover"
          loading="lazy"
        />
      )}
    </div>
  );
});

const TextRow = React.memo<{ layout: any }>(({ layout }) => {
  return (
    <div className="flex items-center justify-center p-8">
      <div className="max-w-4xl text-center">
        {layout.text_content}
      </div>
    </div>
  );
});

const BannerRow = React.memo<{ layout: any }>(({ layout }) => {
  return (
    <div className="bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center">
      <div className="text-white text-center">
        <h2 className="text-3xl font-bold mb-4">특별 프로모션</h2>
        {layout.call_to_action && (
          <button className="px-6 py-3 bg-white text-gray-900 rounded-lg">
            {layout.call_to_action}
          </button>
        )}
      </div>
    </div>
  );
}); 