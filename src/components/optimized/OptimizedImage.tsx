import React, { useState, useEffect, useRef } from 'react';

interface OptimizedImageProps {
  src: string;
  alt: string;
  width?: number;
  height?: number;
  className?: string;
  placeholder?: 'blur' | 'empty';
  priority?: boolean;
  quality?: number;
  sizes?: string;
  onLoad?: () => void;
  onError?: () => void;
}

// 이미지 CDN URL 생성 헬퍼 함수
const createOptimizedUrl = (
  src: string, 
  width?: number, 
  height?: number, 
  quality: number = 80,
  format: 'webp' | 'jpeg' | 'png' = 'webp'
) => {
  // Supabase Storage URL인 경우 변환 파라미터 추가
  if (src.includes('supabase') && src.includes('storage')) {
    const url = new URL(src);
    if (width) url.searchParams.set('width', width.toString());
    if (height) url.searchParams.set('height', height.toString());
    url.searchParams.set('quality', quality.toString());
    url.searchParams.set('format', format);
    return url.toString();
  }
  
  // 다른 CDN 서비스들 (ImageKit, Cloudinary 등)
  if (src.includes('imagekit.io')) {
    return `${src}?tr=w-${width || 'auto'},h-${height || 'auto'},q-${quality},f-${format}`;
  }
  
  // 기본적으로 원본 URL 반환
  return src;
};

// 반응형 이미지 사이즈 계산
const generateSrcSet = (src: string, quality: number = 80) => {
  const sizes = [400, 800, 1200, 1600, 2000];
  return sizes
    .map(size => `${createOptimizedUrl(src, size, undefined, quality)} ${size}w`)
    .join(', ');
};

export const OptimizedImage: React.FC<OptimizedImageProps> = ({
  src,
  alt,
  width,
  height,
  className = '',
  placeholder = 'blur',
  priority = false,
  quality = 80,
  sizes = '(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw',
  onLoad,
  onError
}) => {
  const [isLoaded, setIsLoaded] = useState(false);
  const [isInView, setIsInView] = useState(priority);
  const [hasError, setHasError] = useState(false);
  const imgRef = useRef<HTMLImageElement>(null);
  const [currentSrc, setCurrentSrc] = useState<string>('');

  // Intersection Observer for lazy loading
  useEffect(() => {
    if (priority || isInView) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsInView(true);
          observer.disconnect();
        }
      },
      {
        rootMargin: '50px' // 50px 전에 미리 로드
      }
    );

    if (imgRef.current) {
      observer.observe(imgRef.current);
    }

    return () => observer.disconnect();
  }, [priority, isInView]);

  // Progressive loading: 저품질 -> 고품질
  useEffect(() => {
    if (!isInView) return;

    // 1단계: 저품질 이미지 로드
    const lowQualityImg = new Image();
    lowQualityImg.src = createOptimizedUrl(src, width, height, 20, 'jpeg');
    
    lowQualityImg.onload = () => {
      setCurrentSrc(lowQualityImg.src);
      
      // 2단계: 고품질 이미지 로드
      const highQualityImg = new Image();
      highQualityImg.src = createOptimizedUrl(src, width, height, quality, 'webp');
      
      highQualityImg.onload = () => {
        setCurrentSrc(highQualityImg.src);
        setIsLoaded(true);
        onLoad?.();
      };
      
      highQualityImg.onerror = () => {
        // WebP 실패 시 JPEG로 fallback
        const fallbackImg = new Image();
        fallbackImg.src = createOptimizedUrl(src, width, height, quality, 'jpeg');
        
        fallbackImg.onload = () => {
          setCurrentSrc(fallbackImg.src);
          setIsLoaded(true);
          onLoad?.();
        };
        
        fallbackImg.onerror = () => {
          setHasError(true);
          onError?.();
        };
      };
    };

    lowQualityImg.onerror = () => {
      setHasError(true);
      onError?.();
    };
  }, [isInView, src, width, height, quality, onLoad, onError]);

  // 에러 상태 렌더링
  if (hasError) {
    return (
      <div 
        className={`bg-gray-200 flex items-center justify-center ${className}`}
        style={{ width, height }}
      >
        <svg className="w-8 h-8 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} 
            d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
        </svg>
      </div>
    );
  }

  return (
    <div 
      ref={imgRef}
      className={`relative overflow-hidden ${className}`}
      style={{ width, height }}
    >
      {/* 플레이스홀더 */}
      {placeholder === 'blur' && !isLoaded && (
        <div 
          className="absolute inset-0 bg-gradient-to-r from-gray-200 via-gray-100 to-gray-200 animate-pulse"
          style={{
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite'
          }}
        />
      )}

      {/* 실제 이미지 */}
      {isInView && currentSrc && (
        <img
          src={currentSrc}
          srcSet={generateSrcSet(src, quality)}
          sizes={sizes}
          alt={alt}
          className={`
            transition-opacity duration-300
            ${isLoaded ? 'opacity-100' : 'opacity-0'}
            w-full h-full object-cover
          `}
          loading={priority ? 'eager' : 'lazy'}
          decoding="async"
        />
      )}

      {/* 로딩 인디케이터 */}
      {isInView && !isLoaded && !hasError && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="w-6 h-6 border-2 border-gray-300 border-t-blue-500 rounded-full animate-spin" />
        </div>
      )}
    </div>
  );
};

// 이미지 프리로딩 유틸리티
export class ImagePreloader {
  private static cache = new Set<string>();
  
  static preload(urls: string[], priority: 'high' | 'low' = 'low') {
    urls.forEach(url => {
      if (this.cache.has(url)) return;
      
      const link = document.createElement('link');
      link.rel = 'preload';
      link.as = 'image';
      link.href = createOptimizedUrl(url, 400, 400, 60);
      
      if (priority === 'high') {
        link.setAttribute('importance', 'high');
      }
      
      document.head.appendChild(link);
      this.cache.add(url);
    });
  }
  
  static preloadCritical(urls: string[]) {
    this.preload(urls, 'high');
  }
}

// CSS for shimmer animation
const shimmerStyles = `
  @keyframes shimmer {
    0% {
      background-position: -200% 0;
    }
    100% {
      background-position: 200% 0;
    }
  }
`;

// Inject styles if not already present
if (typeof document !== 'undefined' && !document.getElementById('shimmer-styles')) {
  const style = document.createElement('style');
  style.id = 'shimmer-styles';
  style.textContent = shimmerStyles;
  document.head.appendChild(style);
} 