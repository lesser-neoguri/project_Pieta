import React from 'react';
import { ProductGridBlockData } from '@/types/blockTypes';

interface ProductGridBlockProps {
  data: ProductGridBlockData;
  isEditing: boolean;
  isSelected: boolean;
  onUpdate: (updates: Partial<ProductGridBlockData>) => void;
  products?: Array<{
    id: string;
    name: string;
    price: number;
    image_url?: string;
    description?: string;
    rating?: number;
  }>;
}

export const ProductGridBlock: React.FC<ProductGridBlockProps> = ({
  data,
  isEditing,
  isSelected,
  onUpdate,
  products = []
}) => {
  // 그리드 스타일 계산
  const getGridStyles = (): React.CSSProperties => ({
    display: 'grid',
    gridTemplateColumns: `repeat(${data.columns}, 1fr)`,
    gap: data.spacing === 'tight' ? '0.5rem' :
         data.spacing === 'loose' ? '2rem' :
         data.spacing === 'extra-loose' ? '3rem' : '1rem'
  });

  // 카드 스타일 클래스
  const getCardClasses = (): string => {
    const baseClasses = 'bg-white rounded-lg border border-gray-200 overflow-hidden transition-all hover:shadow-md';
    
    const styleClasses = {
      compact: 'p-2',
      detailed: 'p-4',
      minimal: 'p-1 border-none shadow-none',
      default: 'p-3'
    };

    return `${baseClasses} ${styleClasses[data.card_style]}`;
  };

  // 이미지 비율 클래스
  const getImageAspectRatio = (): string => {
    switch (data.height_ratio) {
      case 'portrait': return 'aspect-[3/4]';
      case 'landscape': return 'aspect-[4/3]';
      case 'auto': return 'aspect-auto';
      default: return 'aspect-square';
    }
  };

  // 더미 제품 데이터 (실제 제품이 없을 때)
  const displayProducts = products.length > 0 
    ? products.slice(0, data.max_products || 12)
    : Array.from({ length: Math.min(data.columns * 2, 8) }, (_, i) => ({
        id: `dummy-${i}`,
        name: `제품 ${i + 1}`,
        price: (i + 1) * 10000,
        image_url: undefined,
        description: '제품 설명',
        rating: 4.5
      }));

  return (
    <div className="p-4">
      <div style={getGridStyles()}>
        {displayProducts.map((product) => (
          <div key={product.id} className={getCardClasses()}>
            {/* 제품 이미지 */}
            <div className={`${getImageAspectRatio()} bg-gray-100 rounded-lg flex items-center justify-center mb-2`}>
              {product.image_url ? (
                <img 
                  src={product.image_url} 
                  alt={product.name}
                  className="w-full h-full object-cover rounded-lg"
                />
              ) : (
                <div className="text-gray-400 text-center">
                  <svg className="w-8 h-8 mx-auto mb-1" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 3a2 2 0 00-2 2v10a2 2 0 002 2h12a2 2 0 002-2V5a2 2 0 00-2-2H4zm12 12H4l4-8 3 6 2-4 3 6z" clipRule="evenodd" />
                  </svg>
                  <span className="text-xs">이미지</span>
                </div>
              )}
            </div>

            {/* 제품 정보 */}
            <div className="space-y-1">
              <h3 className="font-medium text-sm text-gray-900 line-clamp-2">
                {product.name}
              </h3>
              
              {data.show_description && product.description && (
                <p className="text-xs text-gray-600 line-clamp-2">
                  {product.description}
                </p>
              )}
              
              {data.show_rating && product.rating && (
                <div className="flex items-center space-x-1">
                  <div className="flex text-yellow-400">
                    {Array.from({ length: 5 }, (_, i) => (
                      <svg key={i} className="w-3 h-3" fill={i < Math.floor(product.rating!) ? 'currentColor' : 'none'} stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    ))}
                  </div>
                  <span className="text-xs text-gray-500">
                    {product.rating.toFixed(1)}
                  </span>
                </div>
              )}
              
              {data.show_price && (
                <div className="font-bold text-sm text-gray-900">
                  ₩{product.price.toLocaleString()}
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {/* 편집 모드일 때 추가 안내 */}
      {isEditing && products.length === 0 && (
        <div className="mt-4 p-3 bg-blue-50 rounded-lg text-center">
          <p className="text-sm text-blue-700">
            실제 제품 데이터가 연결되면 여기에 표시됩니다
          </p>
        </div>
      )}
    </div>
  );
};

// 빠른 설정 컨트롤들
export const ProductGridBlockControls: React.FC<{
  data: ProductGridBlockData;
  onUpdate: (updates: Partial<ProductGridBlockData>) => void;
}> = ({ data, onUpdate }) => (
  <div className="space-y-4">
    {/* 컬럼 수 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">
        컬럼 수: {data.columns}개
      </label>
      <input
        type="range"
        min="1"
        max="6"
        value={data.columns}
        onChange={(e) => onUpdate({ columns: parseInt(e.target.value) })}
        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-1">
        <span>1</span>
        <span>6</span>
      </div>
    </div>

    {/* 카드 스타일 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">카드 스타일</label>
      <select
        value={data.card_style}
        onChange={(e) => onUpdate({ 
          card_style: e.target.value as ProductGridBlockData['card_style']
        })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="default">기본</option>
        <option value="compact">컴팩트</option>
        <option value="detailed">상세</option>
        <option value="minimal">미니멀</option>
      </select>
    </div>

    {/* 이미지 비율 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">이미지 비율</label>
      <div className="grid grid-cols-2 gap-1">
        {(['square', 'portrait', 'landscape', 'auto'] as const).map((ratio) => (
          <button
            key={ratio}
            onClick={() => onUpdate({ height_ratio: ratio })}
            className={`px-2 py-1 text-xs rounded ${
              data.height_ratio === ratio 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 hover:bg-gray-200'
            }`}
          >
            {ratio === 'square' ? '정사각형' :
             ratio === 'portrait' ? '세로형' :
             ratio === 'landscape' ? '가로형' : '자동'}
          </button>
        ))}
      </div>
    </div>

    {/* 간격 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">간격</label>
      <select
        value={data.spacing}
        onChange={(e) => onUpdate({ 
          spacing: e.target.value as ProductGridBlockData['spacing']
        })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="tight">좁게</option>
        <option value="normal">보통</option>
        <option value="loose">넓게</option>
        <option value="extra-loose">매우 넓게</option>
      </select>
    </div>

    {/* 표시 옵션들 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-2">표시 옵션</label>
      <div className="space-y-2">
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.show_price}
            onChange={(e) => onUpdate({ show_price: e.target.checked })}
            className="mr-2"
          />
          <span className="text-xs">가격 표시</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.show_description}
            onChange={(e) => onUpdate({ show_description: e.target.checked })}
            className="mr-2"
          />
          <span className="text-xs">설명 표시</span>
        </label>
        <label className="flex items-center">
          <input
            type="checkbox"
            checked={data.show_rating}
            onChange={(e) => onUpdate({ show_rating: e.target.checked })}
            className="mr-2"
          />
          <span className="text-xs">평점 표시</span>
        </label>
      </div>
    </div>

    {/* 최대 제품 수 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">최대 제품 수</label>
      <input
        type="number"
        min="1"
        max="50"
        value={data.max_products || 12}
        onChange={(e) => onUpdate({ max_products: parseInt(e.target.value) || 12 })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      />
    </div>

    {/* 정렬 */}
    <div>
      <label className="block text-xs font-medium text-gray-700 mb-1">정렬</label>
      <select
        value={data.sort_by}
        onChange={(e) => onUpdate({ 
          sort_by: e.target.value as ProductGridBlockData['sort_by']
        })}
        className="w-full text-xs border border-gray-300 rounded px-2 py-1"
      >
        <option value="newest">최신순</option>
        <option value="price_asc">가격 낮은순</option>
        <option value="price_desc">가격 높은순</option>
        <option value="rating">평점순</option>
        <option value="sales">판매량순</option>
      </select>
    </div>
  </div>
); 