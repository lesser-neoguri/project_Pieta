'use client';

import React from 'react';
import Link from 'next/link';
import { useState } from 'react';

// 제품 데이터 타입 정의
export interface ProductCardData {
  id: string;
  store_id: string;
  product_name: string;
  product_description?: string;
  product_image_url: string | null;
  price: number;
  stock?: number;
  is_available: boolean;
  created_at?: string;
  total_sales?: number;
  average_rating?: number;
  material?: string;
  category?: string;
  discount_percentage?: number;
  discounted_price?: number | null;
  is_on_sale?: boolean;
  store_name?: string;
  stores?: {
    store_name: string;
  };
}

// 컴포넌트 Props 타입 정의
interface ProductCardProps {
  product: ProductCardData;
  variant?: 'default' | 'compact' | 'detailed' | 'grid';
  showStore?: boolean;
  showRating?: boolean;
  showFavorite?: boolean;
  showActions?: boolean;
  isOwner?: boolean;
  onFavoriteToggle?: (productId: string) => void;
  onEdit?: (productId: string) => void;
  onDelete?: (productId: string) => void;
  favoriteLoading?: boolean;
  isFavorite?: boolean;
  className?: string;
  customAspectRatio?: string;
  textAlignment?: 'left' | 'center' | 'right';
}

export default function ProductCard({
  product,
  variant = 'default',
  showStore = false,
  showRating = false,
  showFavorite = false,
  showActions = false,
  isOwner = false,
  onFavoriteToggle,
  onEdit,
  onDelete,
  favoriteLoading = false,
  isFavorite = false,
  className = '',
  customAspectRatio,
  textAlignment = 'left'
}: ProductCardProps) {
  const [imageError, setImageError] = useState(false);

  // 상점명 추출
  const storeName = product.store_name || product.stores?.store_name || '';

  // 이미지 에러 핸들러
  const handleImageError = () => {
    setImageError(true);
  };

  // 좋아요 버튼 클릭 핸들러
  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onFavoriteToggle && !favoriteLoading) {
      onFavoriteToggle(product.id);
    }
  };

  // 액션 버튼 클릭 핸들러
  const handleActionClick = (e: React.MouseEvent, action: 'edit' | 'delete') => {
    e.preventDefault();
    e.stopPropagation();
    if (action === 'edit' && onEdit) {
      onEdit(product.id);
    } else if (action === 'delete' && onDelete) {
      onDelete(product.id);
    }
  };

  // 평점 렌더링
  const renderRating = () => {
    if (!showRating) return null;
    
    return (
      <div className="flex items-center space-x-1">
        {[...Array(5)].map((_, i) => (
          <svg 
            key={i} 
            className={`w-3 h-3 ${
              i < Math.floor(product.average_rating || 0) 
                ? 'text-yellow-400' 
                : 'text-gray-200'
            }`} 
            fill="currentColor" 
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-xs text-gray-500">
          {(product.average_rating || 0).toFixed(1)}
        </span>
      </div>
    );
  };

  // 가격 렌더링
  const renderPrice = () => {
    if (product.is_on_sale && product.discounted_price && product.discount_percentage) {
      return (
        <div className="space-y-1">
          {variant === 'detailed' ? (
            <>
              <div className="flex items-center space-x-2">
                <span className="text-sm text-gray-400 line-through font-light">
                  ₩{product.price.toLocaleString()}
                </span>
                <span className="text-xs text-gray-500 font-normal">
                  -{product.discount_percentage}%
                </span>
              </div>
              <p className="text-base font-medium text-gray-900">
                ₩{product.discounted_price.toLocaleString()}
              </p>
            </>
          ) : (
            <>
              <p className="text-xs text-gray-400 line-through font-light">
                ₩{product.price.toLocaleString()}
              </p>
              <div className="flex items-center space-x-2">
                <span className="text-xs text-gray-500 font-normal">
                  -{product.discount_percentage}%
                </span>
                <span className="text-sm font-medium">
                  ₩{product.discounted_price.toLocaleString()}
                </span>
              </div>
            </>
          )}
        </div>
      );
    }

    return (
      <p className={`font-medium ${
        variant === 'compact' ? 'text-sm' : 'text-base'
      } text-gray-900`}>
        ₩{product.price.toLocaleString()}
      </p>
    );
  };

  // 배지 렌더링 - 더 미묘하게
  const renderBadges = () => (
    <div className="absolute top-2 right-2 space-y-1 z-10">
      {!product.is_available && (
        <div className="px-2 py-1 text-xs font-medium text-white bg-gray-600/90 backdrop-blur-sm shadow-sm">
          품절
        </div>
      )}
      {product.is_on_sale && product.discount_percentage && (
        <div className="px-2 py-1 text-xs font-medium text-gray-700 bg-white/95 backdrop-blur-sm border border-gray-200 shadow-sm">
          -{product.discount_percentage}%
        </div>
      )}
    </div>
  );

  // 좋아요 버튼 렌더링
  const renderFavoriteButton = () => {
    if (!showFavorite) return null;

    return (
      <button
        onClick={handleFavoriteClick}
        className={`p-1 transition-all duration-200 ${
          favoriteLoading 
            ? 'cursor-not-allowed opacity-50' 
            : 'hover:opacity-70'
        }`}
        disabled={favoriteLoading}
      >
        <svg 
          className={`w-4 h-4 ${
            isFavorite ? 'text-red-500 fill-current' : 'text-gray-400'
          }`} 
          fill={isFavorite ? 'currentColor' : 'none'} 
          stroke="currentColor" 
          viewBox="0 0 24 24"
        >
          <path 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            strokeWidth={1.5} 
            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
          />
        </svg>
      </button>
    );
  };

  // 액션 버튼 렌더링
  const renderActionButtons = () => {
    if (!showActions || !isOwner) return null;

    return (
      <div className="mt-3 flex items-center space-x-2 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <button
          onClick={(e) => handleActionClick(e, 'edit')}
          className="flex-1 px-3 py-1 text-xs text-center text-gray-700 hover:bg-gray-50 transition-colors uppercase tracking-wider"
        >
          수정
        </button>
        <button
          onClick={(e) => handleActionClick(e, 'delete')}
          className="flex-1 px-3 py-1 text-xs text-center text-red-600 hover:bg-red-50 transition-colors uppercase tracking-wider"
        >
          삭제
        </button>
      </div>
    );
  };

  // 컴팩트 변형
  if (variant === 'compact') {
    return (
      <div className={`group ${className}`}>
        <Link href={`/store/${product.store_id}/product/${product.id}`} className="block">
          <div className={`relative mb-4 overflow-hidden ${customAspectRatio || 'aspect-square'}`}>
            {product.product_image_url && !imageError ? (
              <img 
                src={product.product_image_url} 
                alt={product.product_name} 
                className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                onError={handleImageError}
              />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-gray-400">
                <span className="text-3xl font-light">
                  {product.product_name.charAt(0)}
                </span>
              </div>
            )}
            {renderBadges()}
            <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
          </div>
          <div className={`space-y-2 ${
            textAlignment === 'center' ? 'text-center' : 
            textAlignment === 'right' ? 'text-right' : 'text-left'
          }`}>
            <h3 className="text-sm font-medium text-gray-900 line-clamp-2 leading-relaxed">
              {product.product_name}
            </h3>
            {renderPrice()}
          </div>
        </Link>
        {renderActionButtons()}
      </div>
    );
  }

  // 상세 변형 (ProductListPage용)
  if (variant === 'detailed') {
    return (
      <div className={`group ${className}`}>
        <Link href={`/store/${product.store_id}/product/${product.id}`} className="block">
          <div className={`overflow-hidden mb-6 relative ${customAspectRatio || 'aspect-square'}`}>
            {renderBadges()}
            
            {product.product_image_url && !imageError ? (
              <img
                src={product.product_image_url}
                alt={product.product_name}
                className="w-full h-full object-cover group-hover:scale-105 transition-all duration-300 ease-out"
                onError={handleImageError}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-gray-400">
                <span className="text-4xl font-light">
                  {product.product_name.charAt(0)}
                </span>
              </div>
            )}
          </div>
          
          <div className={`${
            textAlignment === 'center' ? 'text-center' : 
            textAlignment === 'right' ? 'text-right' : 'text-left'
          }`}>
            {showStore && storeName && (
              <p className="text-xs text-gray-400 mb-2 uppercase tracking-wider font-light">
                {storeName}
              </p>
            )}
            
            <div className={`flex items-center mb-3 ${
              textAlignment === 'center' ? 'justify-center' :
              textAlignment === 'right' ? 'justify-end' : 'justify-between'
            }`}>
              <h3 className="text-sm font-medium line-clamp-2 group-hover:text-gray-700 transition-colors flex-1 pr-2 leading-relaxed">
                {product.product_name}
              </h3>
              {textAlignment === 'left' && renderFavoriteButton()}
            </div>
            
            <div className="space-y-1">
              {renderPrice()}
            </div>
          </div>
        </Link>
        {renderActionButtons()}
      </div>
    );
  }

  // 기본 변형 (상점 페이지용)
  return (
    <div className={`group ${className}`}>
      <Link href={`/store/${product.store_id}/product/${product.id}`} className="block">
        {/* 제품 이미지 - 더 크게 */}
        <div className={`relative mb-5 overflow-hidden ${customAspectRatio || 'aspect-square'}`}>
          {product.product_image_url && !imageError ? (
            <img
              src={product.product_image_url}
              alt={product.product_name}
              className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
              onError={handleImageError}
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center">
              <span className="text-4xl font-light text-gray-300 tracking-wide">
                {product.product_name.charAt(0)}
              </span>
            </div>
          )}
          
          {renderBadges()}
          
          {/* 호버 오버레이 */}
          <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors duration-300"></div>
        </div>
        
        {/* 제품 정보 - 간소화 */}
        <div className={`space-y-3 ${
          textAlignment === 'center' ? 'text-center' : 
          textAlignment === 'right' ? 'text-right' : 'text-left'
        }`}>
          {showStore && storeName && (
            <p className="text-xs text-gray-400 uppercase tracking-wider font-light">
              {storeName}
            </p>
          )}
          
          <div className={`flex items-start ${
            textAlignment === 'center' ? 'justify-center' :
            textAlignment === 'right' ? 'justify-end' : 'justify-between'
          }`}>
            <h3 className="text-sm font-medium text-gray-900 group-hover:text-black transition-colors line-clamp-2 leading-relaxed flex-1 pr-2">
              {product.product_name}
            </h3>
            {textAlignment === 'left' && renderFavoriteButton()}
          </div>
          
          {/* 가격만 표시 */}
          <div className="space-y-1">
            {renderPrice()}
          </div>
        </div>
      </Link>

      {renderActionButtons()}
    </div>
  );
} 