+'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import ProductCard, { ProductCardData } from '@/components/ProductCard';
import { 
  StoreBlock,
  isGridBlock,
  isListBlock,
  isTextBlock,
  isBannerBlock,
  isFeaturedBlock
} from '@/components/editor/BasicInlinePreviewArea';

interface StoreBlockRendererProps {
  block: StoreBlock;
  products: any[];
  productIndex: number;
  storeId: string;
  isOwner: boolean;
  onProductIndexUpdate: (newIndex: number) => void;
}

const StoreBlockRenderer: React.FC<StoreBlockRendererProps> = ({ 
  block, 
  products, 
  productIndex, 
  storeId, 
  isOwner,
  onProductIndexUpdate 
}) => {
  const router = useRouter();
  
  const renderTextBlock = () => {
    if (!isTextBlock(block)) return null;
    
    return (
      <div className="prose max-w-none">
        <div dangerouslySetInnerHTML={{ 
          __html: block.text_content || '텍스트를 입력하세요...'
        }} />
      </div>
    );
  };

  const renderBannerBlock = () => {
    if (!isBannerBlock(block)) return null;
    
    const bannerHeight = block.banner_height === 'small' ? 'h-32' :
                        block.banner_height === 'large' ? 'h-64' :
                        block.banner_height === 'full' ? 'h-screen' : 'h-48';

    return (
      <div 
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
        <div className="text-center text-white z-10">
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

  const renderFeaturedBlock = () => {
    if (!isFeaturedBlock(block)) return null;
    
    const featuredSize = block.featured_size === 'hero' ? 'h-96' :
                        block.featured_size === 'large' ? 'h-80' : 'h-64';

    return (
      <div 
        className={`${featuredSize} relative overflow-hidden flex items-center justify-center`}
        style={{ 
          backgroundColor: block.background_color || '#f3f4f6',
          backgroundImage: block.featured_image_url 
            ? `url("${block.featured_image_url}")` 
            : 'linear-gradient(135deg, #6b7280 0%, #374151 100%)',
          backgroundSize: 'cover',
          backgroundPosition: 'center'
        }}
      >
        {block.show_text_overlay && (
          <div className="absolute inset-0 bg-black bg-opacity-40"></div>
        )}
        <div className="text-center text-white z-10">
          <h3 className="text-2xl md:text-4xl font-bold mb-4">
            {block.featured_title || '특별 추천'}
          </h3>
          <p className="text-lg mb-6 opacity-90">
            {block.featured_description || '이번 시즌 가장 인기 있는 상품을 만나보세요'}
          </p>
          {block.featured_cta && (
            <button className="px-8 py-3 bg-white text-gray-900 font-semibold hover:bg-gray-100 transition-colors">
              {block.featured_cta}
            </button>
          )}
        </div>
      </div>
    );
  };

  const renderGridBlock = () => {
    if (!isGridBlock(block)) return null;
    
    const columns = block.columns || 4;
    const maxProducts = block.max_products || 8;
    
    // max_products가 0이면 모든 제품 표시
    const actualMaxProducts = maxProducts === 0 ? products.length - productIndex : maxProducts;
    const productsToShow = products.slice(productIndex, productIndex + actualMaxProducts);
    
    // 다음 블록을 위해 인덱스 업데이트
    onProductIndexUpdate(productIndex + productsToShow.length);
    
    const spacing = block.spacing === 'tight' ? 'gap-2' :
                   block.spacing === 'loose' ? 'gap-8' :
                   block.spacing === 'extra-loose' ? 'gap-12' : 'gap-6';
    
    const aspectClass = block.height_ratio === 'portrait' ? 'aspect-[3/4]' :
                       block.height_ratio === 'landscape' ? 'aspect-[4/3]' :
                       block.height_ratio === 'auto' ? '' : 'aspect-square';
    
    // 그리드 스타일 설정
    const gridStyle = columns > 4 ? {
      display: 'grid',
      gridTemplateColumns: `repeat(${columns}, minmax(0, 1fr))`,
      gap: block.spacing === 'tight' ? '0.5rem' :
           block.spacing === 'loose' ? '2rem' :
           block.spacing === 'extra-loose' ? '3rem' : '1.5rem'
    } : {};
    
    const gridCols = columns <= 4 ? `grid-cols-${columns}` : '';

    return (
      <div 
        className={`${gridCols} ${spacing}`}
        style={{ ...gridStyle, backgroundColor: block.background_color }}
      >
        {productsToShow.map((product: any) => {
          if (product.isAddCard) {
            return (
              <Link key="add-product" href={`/store/${storeId}/product/create`} className="group cursor-pointer">
                <div className={`bg-[#f8f8f8] border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center ${aspectClass || 'aspect-square'}`}>
                  <div className="text-center">
                    <svg className="w-12 h-12 text-gray-400 group-hover:text-gray-500 transition-colors mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                    </svg>
                    <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium uppercase tracking-wider">
                      제품 등록
                    </span>
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <ProductCard
              key={product.id}
              {...({
                product: product as ProductCardData,
                variant: (block.card_style as any) || "default",
                showRating: true,
                showActions: isOwner,
                isOwner: isOwner,
                onEdit: () => router.push(`/store/${storeId}/product/${product.id}/edit`),
                onDelete: () => {
                  // 삭제 핸들러는 부모 컴포넌트에서 관리
                  if (window.confirm('이 제품을 삭제하시겠습니까?')) {
                    // 여기서는 임시로 alert 사용
                    alert('제품 삭제는 부모 컴포넌트에서 처리됩니다.');
                  }
                },
                customAspectRatio: aspectClass,
                textAlignment: block.text_alignment
              } as any)}
            />
          );
        })}
      </div>
    );
  };

  const renderListBlock = () => {
    if (!isListBlock(block)) return null;
    
    const maxProducts = 4; // 리스트는 기본적으로 4개
    const productsToShow = products.slice(productIndex, productIndex + maxProducts);
    
    // 다음 블록을 위해 인덱스 업데이트
    onProductIndexUpdate(productIndex + productsToShow.length);

    return (
      <div className="space-y-4">
        {productsToShow.map((product: any) => {
          if (product.isAddCard) {
            return (
              <Link key="add-product" href={`/store/${storeId}/product/create`} className="group cursor-pointer">
                <div className="flex items-center space-x-4 p-4 border border-gray-200 hover:shadow-lg transition-shadow">
                  <div className="w-24 h-24 bg-[#f8f8f8] border-2 border-dashed border-gray-300 hover:border-gray-400 transition-colors duration-300 flex items-center justify-center">
                    <svg className="w-8 h-8 text-gray-400 group-hover:text-gray-500 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M12 4v16m8-8H4" />
                    </svg>
                  </div>
                  <div className="flex-1">
                    <span className="text-sm text-gray-500 group-hover:text-gray-600 transition-colors font-medium uppercase tracking-wider">
                      제품 등록
                    </span>
                  </div>
                </div>
              </Link>
            );
          }

          return (
            <Link key={product.id} href={`/store/${storeId}/product/${product.id}`} className="flex items-center space-x-4 p-4 border border-gray-200 hover:shadow-lg transition-shadow">
              <div className="w-24 h-24 bg-gray-100 flex-shrink-0">
                {product.product_image_url ? (
                  <img src={product.product_image_url} alt={product.product_name} className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full bg-gray-200 flex items-center justify-center">
                    <span className="text-gray-400 text-xs">No Image</span>
                  </div>
                )}
              </div>
              <div className="flex-1">
                <h3 className="font-medium text-gray-900 mb-1">{product.product_name}</h3>
                <p className="text-lg font-light text-gray-900">₩{product.price.toLocaleString()}</p>
              </div>
            </Link>
          );
        })}
      </div>
    );
  };

  const renderBlockContent = () => {
    switch (block.type) {
      case 'text':
        return renderTextBlock();
      case 'banner':
        return renderBannerBlock();
      case 'featured':
        return renderFeaturedBlock();
      case 'grid':
        return renderGridBlock();
      case 'list':
        return renderListBlock();
      default:
        return (
          <div className="bg-gray-50 p-8 text-center text-gray-500">
            {block.type} 블록
          </div>
        );
    }
  };

  return (
    <div className="mb-8">
      {renderBlockContent()}
    </div>
  );
};

export default StoreBlockRenderer; 