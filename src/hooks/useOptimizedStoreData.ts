import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface StoreData {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
  vendor_id: string;
  store_phone?: string;
}

interface ProductData {
  id: string;
  store_id: string;
  product_name: string;
  product_description: string;
  product_image_url: string | null;
  price: number;
  stock: number;
  is_available: boolean;
  created_at: string;
  total_sales?: number;
  average_rating?: number;
  discount_percentage?: number;
  category?: string;
}

interface StoreDesign {
  id?: string;
  store_id: string;
  theme_color: string;
  accent_color: string;
  background_color: string;
  text_color: string;
  font_family: string;
  layout_style: 'grid' | 'list' | 'masonry';
  header_style: 'minimal' | 'classic' | 'modern';
  product_card_style: 'default' | 'compact' | 'detailed';
  show_store_description: boolean;
  show_contact_info: boolean;
  show_business_hours: boolean;
  banner_height: 'small' | 'medium' | 'large';
  logo_position: 'left' | 'center' | 'right';
  title_font_size: 'small' | 'medium' | 'large' | 'xl';
  description_font_size: 'small' | 'medium' | 'large';
  banner_image_url?: string;
  custom_css?: string;
  title_position_x?: number;
  title_position_y?: number;
  description_position_x?: number;
  description_position_y?: number;
  text_overlay_settings?: any;
  row_layouts?: Record<number, any>;
  products_per_row?: number;
  enable_custom_rows?: boolean;
  product_spacing?: 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose';
}

interface UseOptimizedStoreDataReturn {
  store: StoreData | null;
  products: ProductData[];
  design: StoreDesign | null;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
  updateDesign: (updates: Partial<StoreDesign>) => Promise<void>;
  addProduct: (product: Partial<ProductData>) => Promise<void>;
  removeProduct: (productId: string) => Promise<void>;
  sortedProducts: ProductData[];
  setSortBy: (sortBy: string) => void;
  isOwner: boolean;
}

// 캐시 관리
class StoreDataCache {
  private static cache = new Map<string, any>();
  private static timestamps = new Map<string, number>();
  private static readonly TTL = 5 * 60 * 1000; // 5분

  static get(key: string) {
    const timestamp = this.timestamps.get(key);
    if (timestamp && Date.now() - timestamp < this.TTL) {
      return this.cache.get(key);
    }
    return null;
  }

  static set(key: string, data: any) {
    this.cache.set(key, data);
    this.timestamps.set(key, Date.now());
  }

  static invalidate(key: string) {
    this.cache.delete(key);
    this.timestamps.delete(key);
  }

  static clear() {
    this.cache.clear();
    this.timestamps.clear();
  }
}

export function useOptimizedStoreData(
  storeId: string,
  userId?: string
): UseOptimizedStoreDataReturn {
  const [store, setStore] = useState<StoreData | null>(null);
  const [products, setProducts] = useState<ProductData[]>([]);
  const [design, setDesign] = useState<StoreDesign | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [sortBy, setSortBy] = useState('newest');
  
  const abortControllerRef = useRef<AbortController | null>(null);
  const fetchTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // 메모이제이션된 정렬된 제품 목록
  const sortedProducts = useMemo(() => {
    const sorted = [...products];
    switch (sortBy) {
      case 'price_asc':
        return sorted.sort((a, b) => a.price - b.price);
      case 'price_desc':
        return sorted.sort((a, b) => b.price - a.price);
      case 'rating':
        return sorted.sort((a, b) => (b.average_rating || 0) - (a.average_rating || 0));
      case 'sales':
        return sorted.sort((a, b) => (b.total_sales || 0) - (a.total_sales || 0));
      case 'newest':
      default:
        return sorted.sort((a, b) => 
          new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
        );
    }
  }, [products, sortBy]);

  // 소유자 여부 확인
  const isOwner = useMemo(() => {
    return userId && store ? userId === store.vendor_id : false;
  }, [userId, store]);

  // 병렬 데이터 페칭 함수
  const fetchStoreData = useCallback(async (signal: AbortSignal) => {
    if (!storeId) return;

    // 캐시 확인
    const cacheKey = `store-${storeId}`;
    const cachedData = StoreDataCache.get(cacheKey);
    if (cachedData) {
      setStore(cachedData.store);
      setProducts(cachedData.products);
      setDesign(cachedData.design);
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // 병렬로 모든 데이터 페칭
      const [storeResult, designResult, productsResult] = await Promise.allSettled([
        supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single()
          .abortSignal(signal),
        
        supabase
          .from('store_designs')
          .select('*')
          .eq('store_id', storeId)
          .single()
          .abortSignal(signal),
        
        supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .eq('is_available', true) // 사용 가능한 제품만
          .order('created_at', { ascending: false })
          .abortSignal(signal)
      ]);

      // 스토어 데이터 처리
      if (storeResult.status === 'fulfilled' && storeResult.value.data) {
        setStore(storeResult.value.data);
      } else {
        throw new Error('스토어를 찾을 수 없습니다.');
      }

      // 디자인 데이터 처리
      if (designResult.status === 'fulfilled' && designResult.value.data) {
        const designData = designResult.value.data;
        
        // JSON 필드 파싱
        const processedDesign: StoreDesign = {
          ...designData,
          text_overlay_settings: typeof designData.text_overlay_settings === 'string'
            ? JSON.parse(designData.text_overlay_settings)
            : designData.text_overlay_settings,
          row_layouts: typeof designData.row_layouts === 'string'
            ? JSON.parse(designData.row_layouts)
            : designData.row_layouts,
        };
        
        setDesign(processedDesign);
      }

      // 제품 데이터 처리
      if (productsResult.status === 'fulfilled' && productsResult.value.data) {
        setProducts(productsResult.value.data);
      }

      // 성공적으로 로드된 데이터 캐시에 저장
      if (storeResult.status === 'fulfilled' && storeResult.value.data) {
        StoreDataCache.set(cacheKey, {
          store: storeResult.value.data,
          products: productsResult.status === 'fulfilled' ? productsResult.value.data : [],
          design: designResult.status === 'fulfilled' ? designResult.value.data : null
        });
      }

    } catch (error: any) {
      if (error.name !== 'AbortError') {
        console.error('스토어 데이터 로딩 오류:', error);
        setError('데이터를 불러오는 중 오류가 발생했습니다.');
      }
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  // 리페치 함수
  const refetch = useCallback(async () => {
    StoreDataCache.invalidate(`store-${storeId}`);
    
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    
    abortControllerRef.current = new AbortController();
    await fetchStoreData(abortControllerRef.current.signal);
  }, [fetchStoreData, storeId]);

  // 디자인 업데이트 함수
  const updateDesign = useCallback(async (updates: Partial<StoreDesign>) => {
    if (!design) return;

    const updatedDesign = { ...design, ...updates };
    
    // 낙관적 업데이트
    setDesign(updatedDesign);
    
    try {
      const { error } = await supabase
        .from('store_designs')
        .upsert({
          store_id: storeId,
          ...updatedDesign,
          text_overlay_settings: JSON.stringify(updatedDesign.text_overlay_settings),
          row_layouts: JSON.stringify(updatedDesign.row_layouts)
        });

      if (error) throw error;
      
      // 캐시 무효화
      StoreDataCache.invalidate(`store-${storeId}`);
      
    } catch (error) {
      console.error('디자인 업데이트 오류:', error);
      // 실패 시 롤백
      setDesign(design);
      throw error;
    }
  }, [design, storeId]);

  // 제품 추가 함수
  const addProduct = useCallback(async (product: Partial<ProductData>) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .insert({ ...product, store_id: storeId })
        .select()
        .single();

      if (error) throw error;
      
      // 낙관적 업데이트
      setProducts(prev => [data, ...prev]);
      
      // 캐시 무효화
      StoreDataCache.invalidate(`store-${storeId}`);
      
    } catch (error) {
      console.error('제품 추가 오류:', error);
      throw error;
    }
  }, [storeId]);

  // 제품 삭제 함수
  const removeProduct = useCallback(async (productId: string) => {
    // 낙관적 업데이트
    const originalProducts = products;
    setProducts(prev => prev.filter(p => p.id !== productId));
    
    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', storeId);

      if (error) throw error;
      
      // 캐시 무효화
      StoreDataCache.invalidate(`store-${storeId}`);
      
    } catch (error) {
      console.error('제품 삭제 오류:', error);
      // 실패 시 롤백
      setProducts(originalProducts);
      throw error;
    }
  }, [products, storeId]);

  // 초기 데이터 로딩
  useEffect(() => {
    if (!storeId) return;

    // 이전 요청 취소
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }

    // 디바운스 적용
    if (fetchTimeoutRef.current) {
      clearTimeout(fetchTimeoutRef.current);
    }

    fetchTimeoutRef.current = setTimeout(() => {
      abortControllerRef.current = new AbortController();
      fetchStoreData(abortControllerRef.current.signal);
    }, 100);

    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
      if (fetchTimeoutRef.current) {
        clearTimeout(fetchTimeoutRef.current);
      }
    };
  }, [storeId, fetchStoreData]);

  return {
    store,
    products,
    design,
    loading,
    error,
    refetch,
    updateDesign,
    addProduct,
    removeProduct,
    sortedProducts,
    setSortBy,
    isOwner
  };
} 