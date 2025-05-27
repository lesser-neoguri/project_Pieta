'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';
import { extractPathFromUrl } from '@/lib/migration';
import { toast } from 'react-hot-toast';
import { useScroll } from '@/hooks/useScroll';

// 네비게이션 바 컨트롤을 위한 사용자 정의 이벤트 추가
const emitNavbarEvent = (hide: boolean) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('navbarControl', { detail: { hide } });
    window.dispatchEvent(event);
  }
};

// 스크롤 처리를 위한 이전 스크롤 위치 저장 변수
let prevScrollPos = 0;

type StoreData = {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
  vendor_id: string;
  store_phone?: string;
  store_email?: string;
  store_website?: string;
};

type ProductData = {
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
  material?: string;
  weight?: number;
  purity?: string;
  dimensions?: string;
  origin?: string;
  warranty?: string;
  shipping_info?: string;
  return_policy?: string;
  discount_percentage?: number;
  discounted_price?: number | null;
  is_on_sale?: boolean;
};

type ProductFavorite = {
  id: string;
  product_id: string;
  user_id: string;
  created_at: string;
};

type ProductReview = {
  id: string;
  product_id: string;
  user_id: string;
  user_name?: string;
  rating: number;
  review_text: string;
  review_image_url: string | null;
  is_verified_purchase: boolean;
  created_at: string;
};

export default function ProductDetailPage() {
  const { user } = useAuth();
  const params = useParams();
  const router = useRouter();
  const storeId = params.id as string;
  const productId = params.productId as string;
  
  const [loading, setLoading] = useState(true);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [store, setStore] = useState<StoreData | null>(null);
  const [product, setProduct] = useState<ProductData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isOwner, setIsOwner] = useState(false);
  const [quantity, setQuantity] = useState(1);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [isFavorite, setIsFavorite] = useState(false);
  const [favoriteCount, setFavoriteCount] = useState(0);
  const [reviews, setReviews] = useState<ProductReview[]>([]);
  const [reviewLoading, setReviewLoading] = useState(true);
  const [reviewForm, setReviewForm] = useState({
    rating: 5,
    review_text: '',
  });
  const [reviewImageFile, setReviewImageFile] = useState<File | null>(null);
  const [reviewImagePreview, setReviewImagePreview] = useState<string | null>(null);
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [userHasReviewed, setUserHasReviewed] = useState(false);
  const [userReview, setUserReview] = useState<ProductReview | null>(null);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  
  // 추가 이미지 관련 상태
  const [productImages, setProductImages] = useState<{ id: string; url: string; is_primary: boolean }[]>([]);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);

  // 탭 관련 상태 추가
  const [activeTab, setActiveTab] = useState('details');

  // 추가 제품 배너 섹션을 위한 상태 추가
  const [storeProducts, setStoreProducts] = useState<ProductData[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductData[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<ProductData[]>([]);
  const [additionalProductsLoading, setAdditionalProductsLoading] = useState(true);

  // useScroll 훅 사용
  const { scrollY, direction } = useScroll({
    detectDirection: true,
    throttleDelay: 50
  });
  
  // 스크롤 방향에 따라 네비게이션 표시/숨김 처리
  useEffect(() => {
    if (direction === 'down') {
      emitNavbarEvent(true); // 아래로 스크롤 시 네비게이션 숨김
    } else if (direction === 'up') {
      emitNavbarEvent(false); // 위로 스크롤 시 네비게이션 표시
    }
  }, [direction]);
  
  // 관심 수 증감 함수 최적화
  const incrementFavoriteCount = useCallback(() => {
    setFavoriteCount(prev => Math.max(0, prev + 1));
  }, []);
  
  const decrementFavoriteCount = useCallback(() => {
    setFavoriteCount(prev => Math.max(0, prev - 1));
  }, []);
  
  // 리뷰 새로고침 함수 추가
  const refreshReviews = useCallback(async () => {
    try {
      setReviewLoading(true);
      
      // 리뷰 정보 가져오기
      const { data: reviewData, error: reviewError } = await supabase
        .from('product_reviews')
        .select('*')
        .eq('product_id', productId)
        .order('created_at', { ascending: false });

      if (reviewError) {
        console.error('리뷰 정보 조회 오류:', reviewError);
        setReviews([]);
        return;
      }
      
      if (reviewData && reviewData.length > 0) {
        // 리뷰 작성자 정보 가져오기
        const reviewsWithUserNames = await Promise.all(
          reviewData.map(async (review: any) => {
            try {
              // 사용자 정보 가져오기
              const { data: userData, error: userError } = await supabase
                .from('regular_users')
                .select('name')
                .eq('user_id', review.user_id)
                .maybeSingle();
              
              return {
                ...review,
                user_name: userData?.name || '익명 사용자'
              };
            } catch (error) {
              console.error('사용자 정보 로딩 중 오류:', error);
              return {
                ...review,
                user_name: '익명 사용자'
              };
            }
          })
        );
        
        setReviews(reviewsWithUserNames);
        
        // 현재 사용자가 이미 리뷰를 작성했는지 확인
        if (user) {
          const userReviewData = reviewsWithUserNames.find(
            (review: ProductReview) => review.user_id === user.id
          );
          
          setUserHasReviewed(!!userReviewData);
          setUserReview(userReviewData || null);
        } else {
          setUserHasReviewed(false);
          setUserReview(null);
        }
      } else {
        // 리뷰가 없는 경우
        setReviews([]);
        setUserHasReviewed(false);
        setUserReview(null);
      }
      
      // 제품 정보 다시 가져오기 (평균 평점 업데이트를 위해)
      const { data: updatedProduct, error: productError } = await supabase
        .from('products')
        .select('*')
        .eq('id', productId)
        .single();
        
      if (!productError && updatedProduct) {
        setProduct(updatedProduct);
      }
    } catch (error) {
      console.error('리뷰 새로고침 중 오류:', error);
    } finally {
      setReviewLoading(false);
    }
  }, [productId, user]);
  
  // 리뷰 제출 함수 추가
  const handleSubmitReview = useCallback(async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (reviewForm.review_text.trim() === '') {
      alert('리뷰 내용을 입력해주세요.');
      return;
    }

    setReviewSubmitting(true);

    try {
      let reviewImageUrl = null;

      // 이미지 업로드 처리
      if (reviewImageFile) {
        const fileExt = reviewImageFile.name.split('.').pop();
        const fileName = `${Math.random().toString(36).substring(2, 15)}.${fileExt}`;
        const filePath = `reviews/${productId}/${fileName}`;

        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(filePath, reviewImageFile);

        if (uploadError) {
          throw uploadError;
        }

        // 업로드된 이미지 URL 생성
        const { data } = supabase.storage
          .from('images')
          .getPublicUrl(filePath);

        reviewImageUrl = data.publicUrl;
      } else if (userReview?.review_image_url && reviewImagePreview) {
        // 기존 이미지 유지
        reviewImageUrl = userReview.review_image_url;
      }

      if (userHasReviewed) {
        // 리뷰 업데이트
        const { error } = await supabase
          .from('product_reviews')
          .update({
            rating: reviewForm.rating,
            review_text: reviewForm.review_text,
            review_image_url: reviewImageUrl,
            updated_at: new Date().toISOString()
          })
          .eq('id', userReview!.id);

        if (error) throw error;
      } else {
        // 새 리뷰 추가
        const { error } = await supabase
          .from('product_reviews')
          .insert([
            {
              product_id: productId,
              user_id: user.id,
              rating: reviewForm.rating,
              review_text: reviewForm.review_text,
              review_image_url: reviewImageUrl,
              is_verified_purchase: false // 구매 여부 확인 로직 추가 필요
            }
          ]);

        if (error) throw error;
      }

      // 상태 업데이트를 위해 리뷰 다시 로드
      await refreshReviews();

      // 리뷰 폼 초기화
      setReviewForm({
        rating: 5,
        review_text: '',
      });
      setReviewImageFile(null);
      setReviewImagePreview(null);
      setShowReviewForm(false);
      
      toast.success(userHasReviewed ? '리뷰가 수정되었습니다.' : '리뷰가 등록되었습니다.');
    } catch (error: any) {
      console.error('리뷰 저장 중 오류 발생:', error);
      toast.error('리뷰를 저장하는 중 오류가 발생했습니다.');
    } finally {
      setReviewSubmitting(false);
    }
  }, [user, productId, reviewForm, reviewImageFile, userHasReviewed, userReview, refreshReviews]);
  
  // 리뷰 삭제 함수 추가
  const handleDeleteReview = useCallback(async () => {
    if (!user || !userReview) return;
    
    if (!confirm('정말로 이 리뷰를 삭제하시겠습니까?')) return;
    
    try {
      // 리뷰 이미지가 있으면 삭제
      if (userReview.review_image_url) {
        try {
          const imagePath = extractPathFromUrl(userReview.review_image_url);
          if (imagePath) {
            await supabase.storage
              .from('images')
              .remove([imagePath]);
          }
        } catch (error) {
          console.error('리뷰 이미지 삭제 중 오류:', error);
          // 이미지 삭제에 실패해도 리뷰는 삭제 진행
        }
      }
      
      // 리뷰 삭제
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', userReview.id);
        
      if (error) throw error;
      
      // 상태 업데이트를 위해 리뷰 다시 로드
      await refreshReviews();
      
      toast.success('리뷰가 삭제되었습니다.');
    } catch (error: any) {
      console.error('리뷰 삭제 중 오류 발생:', error);
      toast.error('리뷰를 삭제하는 중 오류가 발생했습니다.');
    }
  }, [user, userReview, refreshReviews]);
  
  // 리뷰 상태 관리 함수 메모이제이션
  const handleReviewChange = useCallback((e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReviewForm(prev => ({
      ...prev,
      [name]: name === 'rating' ? parseInt(value) : value
    }));
  }, []);
  
  // 이미지 선택 함수 메모이제이션
  const handleImageSelect = useCallback((imageUrl: string) => {
    setSelectedImage(imageUrl);
  }, []);
  
  // 이미지 모달 토글 함수
  const toggleImageModal = useCallback((show: boolean, image?: string) => {
    if (image) {
      setSelectedImage(image);
    }
    setShowImageModal(show);
  }, []);
  
  // 수량 변경 함수 최적화
  const handleQuantityChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      // 재고보다 많이 선택하지 못하도록 제한
      const maxQuantity = product?.stock || 1;
      setQuantity(Math.min(value, maxQuantity));
    }
  }, [product?.stock]);
  
  // 장바구니 추가 함수 최적화
  const handleAddToCart = useCallback(async () => {
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    if (!product || !product.is_available || product.stock <= 0) {
      alert('품절된 상품은 장바구니에 담을 수 없습니다.');
      return;
    }

    try {
      // 이미 장바구니에 있는지 확인
      const { data: existingCartItem, error: checkError } = await supabase
        .from('cart_items')
        .select('*')
        .eq('user_id', user.id)
        .eq('product_id', productId)
        .maybeSingle();

      if (checkError) throw checkError;

      if (existingCartItem) {
        // 이미 장바구니에 있으면 수량 업데이트
        const newQuantity = Math.min(existingCartItem.quantity + quantity, product.stock);
        
        const { error: updateError } = await supabase
          .from('cart_items')
          .update({ quantity: newQuantity })
          .eq('id', existingCartItem.id);

        if (updateError) throw updateError;
        
        alert(`${product.product_name} 상품이 장바구니에 추가되었습니다. (총 ${newQuantity}개)`);
      } else {
        // 새 상품 추가
        const { error: insertError } = await supabase
          .from('cart_items')
          .insert([
            {
              user_id: user.id,
              product_id: productId,
              quantity: quantity
            }
          ]);

        if (insertError) throw insertError;
        
        alert(`${product.product_name} ${quantity}개를 장바구니에 추가했습니다.`);
      }
    } catch (error: any) {
      console.error('장바구니에 추가하는 중 오류가 발생했습니다:', error);
      alert('장바구니에 추가하는 중 오류가 발생했습니다.');
    }
  }, [user, product, productId, quantity]);
  
  // 관심 상품 토글 함수 최적화
  const toggleFavorite = useCallback(async () => {
    if (!user) {
      alert('로그인이 필요한 기능입니다.');
      return;
    }

    try {
      if (isFavorite) {
        // 관심 상품 삭제 - 오류가 발생해도 UI는 업데이트
        try {
          const { error } = await supabase
            .from('product_favorites')
            .delete()
            .eq('product_id', productId)
            .eq('user_id', user.id);

          if (error) {
            console.error('관심 상품 삭제 오류:', error);
            // 오류 발생해도 UI 업데이트는 진행
          }
        } catch (error) {
          console.error('관심 상품 삭제 중 예외 발생:', error);
        }
        
        // UI 업데이트
        setIsFavorite(false);
        decrementFavoriteCount();
      } else {
        // 관심 상품 추가 - 오류가 발생해도 UI는 업데이트
        try {
          const { error } = await supabase
            .from('product_favorites')
            .insert([
              { product_id: productId, user_id: user.id }
            ]);

          if (error) {
            console.error('관심 상품 추가 오류:', error);
            // 오류 발생해도 UI 업데이트는 진행
          }
        } catch (error) {
          console.error('관심 상품 추가 중 예외 발생:', error);
        }
        
        // UI 업데이트
        setIsFavorite(true);
        incrementFavoriteCount();
      }
    } catch (error: any) {
      console.error('관심 상품 처리 중 오류 발생:', error);
    }
  }, [user, isFavorite, productId, decrementFavoriteCount, incrementFavoriteCount]);
  
  // 리뷰 이미지 변경 처리 함수 최적화
  const handleReviewImageChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReviewImageFile(file);
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.addEventListener('load', function() {
        const result = reader.result;
        if (result && typeof result === 'string') {
          setReviewImagePreview(result);
        }
      });
      reader.readAsDataURL(file);
    }
  }, []);
  
  // 리뷰 이미지 제거 함수 최적화
  const handleRemoveReviewImage = useCallback(() => {
    setReviewImageFile(null);
    setReviewImagePreview(null);
  }, []);

  // 리뷰 폼 표시/숨김 처리 최적화
  const toggleReviewForm = useCallback((show: boolean) => {
    setShowReviewForm(show);
  }, []);
  
  // 내 리뷰 편집 시작 함수
  const startEditMyReview = useCallback(() => {
    if (userReview) {
      setReviewForm({
        rating: userReview.rating,
        review_text: userReview.review_text,
      });
      
      if (userReview.review_image_url) {
        setReviewImagePreview(userReview.review_image_url);
      }
      
      toggleReviewForm(true);
    }
  }, [userReview, toggleReviewForm]);
  
  // useEffect 의존성 배열 정리
  useEffect(() => {
    // 최근 본 상품 목록을 로컬 스토리지에서 가져오거나 초기화
    const getRecentlyViewedFromLocalStorage = () => {
      if (typeof window !== 'undefined') {
        const recentlyViewed = localStorage.getItem('recentlyViewedProducts');
        return recentlyViewed ? JSON.parse(recentlyViewed) : [];
      }
      return [];
    };

    // 현재 제품을 최근 본 상품 목록에 추가
    const addToRecentlyViewed = (product: string) => {
      if (typeof window !== 'undefined') {
        const recentlyViewed = getRecentlyViewedFromLocalStorage();
        
        // 이미 목록에 있으면 제거 (중복 방지)
        const filteredList = recentlyViewed.filter((id: string) => id !== product);
        
        // 목록 맨 앞에 추가
        const updatedList = [product, ...filteredList].slice(0, 10); // 최대 10개 유지
        
        localStorage.setItem('recentlyViewedProducts', JSON.stringify(updatedList));
        return updatedList;
      }
      return [];
    };

    const fetchStoreAndProduct = async () => {
      setLoading(true);
      
      try {
        // 상점 정보 가져오기
        const { data: storeData, error: storeError } = await supabase
          .from('stores')
          .select('*')
          .eq('id', storeId)
          .single();

        if (storeError) throw storeError;
        
        if (!storeData) {
          setError('존재하지 않는 상점입니다.');
          setLoading(false);
          return;
        }

        setStore(storeData);
        
        // 현재 사용자가 상점 소유자인지 확인
        if (user && user.id === storeData.vendor_id) {
          setIsOwner(true);
        }

        // 제품 정보 가져오기
        const { data: productData, error: productError } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .eq('store_id', storeId)
          .single();

        if (productError) throw productError;
        
        if (!productData) {
          setError('존재하지 않는 제품입니다.');
          setLoading(false);
          return;
        }

        setProduct(productData);
        setSelectedImage(productData.product_image_url);

        // 현재 제품을 최근 본 상품 목록에 추가
        addToRecentlyViewed(productId);

        // 추가 이미지 가져오기
        const { data: productImagesData, error: productImagesError } = await supabase
          .from('product_images')
          .select('*')
          .eq('product_id', productId)
          .order('display_order', { ascending: true });
          
        if (productImagesError) {
          console.error('추가 이미지 조회 오류:', productImagesError);
        } else if (productImagesData && productImagesData.length > 0) {
          // 추가 이미지 데이터 설정
          setProductImages(productImagesData.map((img: any) => ({
            id: img.id,
            url: img.image_url,
            is_primary: img.is_primary
          })));
        }

        // 관심 정보 가져오기
        if (user) {
          try {
            const { data: favoriteData, error: favoriteError } = await supabase
              .from('product_favorites')
              .select('*')
              .eq('product_id', productId)
              .eq('user_id', user.id)
              .maybeSingle();

            if (favoriteError) {
              console.error('관심 상품 정보 조회 오류:', favoriteError);
              // 오류 발생 시 기능 비활성화하지 않고 기본값 유지
            } else if (favoriteData) {
              setIsFavorite(true);
            }
          } catch (error) {
            console.error('관심 상품 정보 조회 중 예외 발생:', error);
          }
        }

        // 관심 수는 기본값 사용
        setFavoriteCount(0);

        // 리뷰 정보 가져오기
        const { data: reviewData, error: reviewError } = await supabase
          .from('product_reviews')
          .select('*')
          .eq('product_id', productId)
          .order('created_at', { ascending: false });

        if (reviewError) {
          console.error('리뷰 정보 조회 오류:', reviewError);
          setReviews([]);
        } else if (reviewData && reviewData.length > 0) {
          // 리뷰 작성자 정보 가져오기
          const reviewsWithUserNames = await Promise.all(
            reviewData.map(async (review: any) => {
              try {
                // 사용자 정보 가져오기
                const { data: userData, error: userError } = await supabase
                  .from('regular_users')
                  .select('name')
                  .eq('user_id', review.user_id)
                  .maybeSingle(); // single() 대신 maybeSingle() 사용
                
                return {
                  ...review,
                  user_name: userData?.name || '익명 사용자'
                };
              } catch (error) {
                console.error('사용자 정보 로딩 중 오류:', error);
                return {
                  ...review,
                  user_name: '익명 사용자'
                };
              }
            })
          );
          
          setReviews(reviewsWithUserNames);
          
          // 현재 사용자가 이미 리뷰를 작성했는지 확인
          if (user) {
            const userReviewData = reviewsWithUserNames.find(
              (review: ProductReview) => review.user_id === user.id
            );
            if (userReviewData) {
              setUserHasReviewed(true);
              setUserReview(userReviewData);
            }
          }
        } else {
          // 리뷰가 없는 경우
          setReviews([]);
        }
        
        setReviewLoading(false);
      } catch (error: any) {
        console.error('데이터 로딩 중 오류 발생:', error);
        setError('제품 정보를 불러오는 중 오류가 발생했습니다.');
        setReviewLoading(false);
      } finally {
        setLoading(false);
      }
    };

    if (storeId && productId) {
      fetchStoreAndProduct();
    }
  }, [storeId, productId, user]);

  // 같은 상점의 다른 제품, 추천 상품, 최근 본 상품을 가져오는 함수
  useEffect(() => {
    const fetchAdditionalProducts = async () => {
      if (!storeId || !productId || !product) return;
      
      setAdditionalProductsLoading(true);
      
      try {
        // 1. 같은 상점의 다른 제품 (최대 4개, 현재 제품 제외)
        const { data: otherStoreProducts, error: storeProductsError } = await supabase
          .from('products')
          .select('*')
          .eq('store_id', storeId)
          .neq('id', productId) // 현재 제품 제외
          .eq('is_available', true) // 구매 가능한 제품만
          .order('created_at', { ascending: false }) // 최신순
          .limit(4);
          
        if (storeProductsError) {
          console.error('같은 상점 제품 로딩 오류:', storeProductsError);
        } else {
          setStoreProducts(otherStoreProducts || []);
        }
        
        // 2. 추천 제품 (현재 제품과 같은 카테고리 기준, 최대 4개)
        // 만약 category 필드가 있다면 아래처럼 사용할 수 있습니다
        let recommendedProductsQuery = supabase
          .from('products')
          .select('*')
          .neq('id', productId)
          .eq('is_available', true);
          
        // 카테고리나 태그 기반 추천 로직 (가정: product에 category 필드가 있다고 가정)
        if (product.material) {
          recommendedProductsQuery = recommendedProductsQuery.eq('material', product.material);
        }
        
        const { data: recommendedProductsData, error: recommendedError } = await recommendedProductsQuery
          .limit(4);
          
        if (recommendedError) {
          console.error('추천 제품 로딩 오류:', recommendedError);
        } else {
          setRecommendedProducts(recommendedProductsData || []);
        }
        
        // 3. 최근 본 상품 (로컬 스토리지에서 ID 가져와 데이터베이스에서 조회)
        const recentlyViewedIds = localStorage.getItem('recentlyViewedProducts');
        
        if (recentlyViewedIds) {
          const parsedIds = JSON.parse(recentlyViewedIds);
          
          // 현재 제품 ID 제외하고 최대 4개 ID만 사용
          const filteredIds = parsedIds
            .filter((id: string) => id !== productId)
            .slice(0, 4);
            
          if (filteredIds.length > 0) {
            const { data: recentProducts, error: recentError } = await supabase
              .from('products')
              .select('*')
              .in('id', filteredIds)
              .eq('is_available', true);
              
            if (recentError) {
              console.error('최근 본 상품 로딩 오류:', recentError);
            } else {
              // filteredIds의 순서대로 정렬
              const sortedRecentProducts = filteredIds
                .map((id: string) => recentProducts?.find(product => product.id === id))
                .filter(Boolean) as ProductData[];
                
              setRecentlyViewedProducts(sortedRecentProducts || []);
            }
          }
        }
      } catch (error) {
        console.error('추가 제품 데이터 로딩 중 오류:', error);
      } finally {
        setAdditionalProductsLoading(false);
      }
    };
    
    if (product) {
      fetchAdditionalProducts();
    }
  }, [storeId, productId, product]);

  const handleDeleteImage = async (imageUrl: string) => {
    try {
      const filePath = extractPathFromUrl(imageUrl);
      if (!filePath) {
        toast.error('이미지 경로를 추출할 수 없습니다.');
        return;
      }
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        console.error('이미지 삭제 오류:', error);
        toast.error('이미지 삭제 중 오류가 발생했습니다.');
        return;
      }
      
      toast.success('이미지가 삭제되었습니다.');
      // 이미지 삭제 후 UI 업데이트
      setProductImages(prevImages => 
        prevImages.filter(img => img.url !== imageUrl)
      );
    } catch (error) {
      console.error('이미지 삭제 처리 중 오류:', error);
      toast.error('오류가 발생했습니다.');
    }
  };

  const handleDeleteProduct = async () => {
    if (!product || !isOwner) return;
    
    setDeleteLoading(true);
    
    try {
      // 제품 삭제
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId)
        .eq('store_id', storeId);
        
      if (error) throw error;
      
      // 제품 이미지 삭제
      if (product.product_image_url) {
        await handleDeleteImage(product.product_image_url);
      }
      
      // 삭제 성공 후 상점 페이지로 이동
      alert('제품이 성공적으로 삭제되었습니다.');
      router.push(`/store/${storeId}`);
    } catch (error: any) {
      console.error('제품 삭제 중 오류 발생:', error);
      alert(`제품 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // 이미지 스크롤 핸들러 수정 (기존 onScroll 이벤트 핸들러를 대체)
  const handleImageScroll = useCallback((e: React.UIEvent<HTMLDivElement>) => {
    const container = e.currentTarget;
    const maxScrollLeft = container.scrollWidth - container.clientWidth;
    
    // 스크롤 위치에 따라 버튼 표시/숨김 처리
    if (container.scrollLeft <= 10) {
      // 왼쪽 끝에 도달
    } else if (container.scrollLeft >= maxScrollLeft - 10) {
      // 오른쪽 끝에 도달
    }
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (error || !store || !product) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="p-4 mb-6 rounded bg-red-100 text-red-700">
              {error || '제품 정보를 불러올 수 없습니다.'}
            </div>
            <div className="flex justify-center mt-4">
              <Link
                href={`/store/${storeId}`}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                상점으로 돌아가기
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white mt-0 md:mt-0 pt-16 sm:pt-20 md:pt-0">
      {/* Rich Editor 스타일 */}
      <style>
        {`
        .rich-editor h2 {
          font-size: 1.5rem;
          font-weight: 600;
          margin: 1rem 0;
          color: #111;
        }
        .rich-editor h3 {
          font-size: 1.25rem;
          font-weight: 600;
          margin: 0.8rem 0;
          color: #333;
        }
        .rich-editor h4 {
          font-size: 1.125rem;
          font-weight: 600;
          margin: 0.6rem 0;
          color: #444;
        }
        .rich-editor .paragraph {
          margin: 0.5rem 0;
          line-height: 1.6;
        }
        .rich-editor .small-text {
          font-size: 0.875rem;
          color: #666;
          line-height: 1.4;
        }
        .rich-editor strong {
          font-weight: 700;
        }
        .rich-editor em {
          font-style: italic;
        }
        .rich-editor u {
          text-decoration: underline;
        }
        .rich-editor ul, .rich-editor ol {
          margin-left: 1.5rem;
          margin-bottom: 1rem;
        }
        .rich-editor ul li {
          list-style-type: disc;
        }
        .rich-editor ol li {
          list-style-type: decimal;
        }
        .hide-scrollbar {
          -ms-overflow-style: none;  /* IE and Edge */
          scrollbar-width: none;  /* Firefox */
        }
        .hide-scrollbar::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        .product-image {
          transition: transform 0.4s ease;
          will-change: transform;
        }
        .product-image-container:hover .product-image {
          transform: scale(1.08);
        }
        .accordion-content {
          height: 0;
          overflow: hidden;
          transition: height 0.35s ease;
          padding-left: 0;
          padding-right: 0;
        }
        .accordion-content.open {
          height: auto;
          padding-top: 0.75rem;
          padding-bottom: 1rem;
        }
        .accordion-inner {
          opacity: 0;
          transform: translateY(-10px);
          transition: opacity 0.25s ease, transform 0.3s ease;
        }
        .accordion-content.open .accordion-inner {
          opacity: 1;
          transform: translateY(0);
        }
        .accordion-arrow {
          transition: transform 0.3s ease;
        }
        .accordion-header.open .accordion-arrow {
          transform: rotate(180deg);
        }
        `}
      </style>
      
      {/* 메인 컨텐츠 */}
      <div className="w-full">
        {!loading && product && store && (
          <div className="flex flex-col md:flex-row">
            {/* 왼쪽: 제품 이미지 섹션 */}
            <div 
              className="md:w-1/2 md:sticky md:top-16 md:self-start md:max-h-[calc(100vh-120px)] md:overflow-y-auto md:hide-scrollbar" 
              style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
              onScroll={handleImageScroll}
            >
              {/* 모바일 뷰 수평 슬라이드 */}
              <div className="md:hidden w-full overflow-x-auto hide-scrollbar py-4" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                <div className="flex flex-row space-x-2 px-4">
                  {/* 메인 이미지 */}
                  {product.product_image_url && (
                    <div className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group product-image-container">
                      <img
                        src={product.product_image_url}
                        alt={product.product_name}
                        className="w-full h-full object-contain p-4 product-image"
                      />
                      <button
                        onClick={() => toggleImageModal(true, product.product_image_url || undefined)}
                        className="absolute inset-0 flex items-center justify-center bg-transparent"
                        aria-label="이미지 확대"
                      />
                      {!product.is_available && (
                        <div className="absolute top-4 right-4 px-4 py-2 text-xs font-medium text-white bg-black/70 backdrop-blur-sm">
                          품절
                        </div>
                      )}
                    </div>
                  )}
                  
                  {/* 추가 이미지들 */}
                  {productImages.map(image => (
                    <div 
                      key={image.id}
                      className="flex-shrink-0 w-[85vw] h-[85vw] bg-[#f8f8f8] overflow-hidden relative group product-image-container"
                    >
                      <img 
                        src={image.url} 
                        alt={`${product.product_name} 추가 이미지`}
                        className="w-full h-full object-contain p-4 product-image"
                      />
                      <button
                        onClick={() => toggleImageModal(true, image.url)}
                        className="absolute inset-0 flex items-center justify-center bg-transparent"
                        aria-label="이미지 확대"
                      />
                    </div>
                  ))}
                </div>
                
                {/* 페이지 인디케이터 (바) */}
                <div className="flex justify-center space-x-1 mt-6">
                  {[product.product_image_url, ...productImages.map(img => img.url)].map((_, index) => (
                    <div 
                      key={index} 
                      className={`h-0.5 ${
                        index === 0 ? 'w-6 bg-black' : 'w-3 bg-gray-300'
                      } transition-all duration-300`}
                    ></div>
                  ))}
                </div>
              </div>
              
              {/* 데스크톱 뷰 수직 레이아웃 */}
              <div className="hidden md:block space-y-4 pr-8" style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}>
                {/* 메인 제품 이미지 */}
                {product.product_image_url && (
                  <div className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative group product-image-container">
                    <img
                      src={product.product_image_url}
                      alt={product.product_name}
                      className="w-full h-full object-contain p-4 product-image"
                    />
                    <button
                      onClick={() => toggleImageModal(true, product.product_image_url || undefined)}
                      className="absolute inset-0 flex items-center justify-center bg-transparent"
                      aria-label="이미지 확대"
                    />
                    {!product.is_available && (
                      <div className="absolute top-4 right-4 px-4 py-2 text-xs font-medium text-white bg-black/70 backdrop-blur-sm">
                        품절
                      </div>
                    )}
                  </div>
                )}
                
                {/* 추가 이미지들 - 수직으로 나열 */}
                {productImages.map(image => (
                  <div 
                    key={image.id}
                    className="w-full aspect-square bg-[#f8f8f8] overflow-hidden relative group product-image-container"
                  >
                    <img 
                      src={image.url} 
                      alt={`${product.product_name} 추가 이미지`}
                      className="w-full h-full object-contain p-4 product-image"
                    />
                    <button
                      onClick={() => toggleImageModal(true, image.url)}
                      className="absolute inset-0 flex items-center justify-center bg-transparent"
                      aria-label="이미지 확대"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* 오른쪽: 제품 정보 섹션 */}
            <div className="w-full md:w-1/2 px-4 sm:px-6 md:px-0 md:pl-8 lg:pl-12">
              <div className="h-full flex flex-col max-w-full md:max-w-lg md:ml-12 lg:ml-20">
                {/* 상단 여백 - 데스크톱에서만 적용 */}
                <div className="hidden md:block md:h-32 lg:h-40 xl:h-48"></div>
                
                {/* 모바일 상단 여백 */}
                <div className="block md:hidden h-4"></div>
                
                {/* 제품 정보 콘텐츠 */}
                <div className="space-y-4 md:space-y-6">
                  {/* 제품 기본 정보 */}
                  <div className="space-y-3 md:space-y-4">
                    {/* 제품명 - 모바일 반응형 */}
                    <h1 className="text-2xl sm:text-3xl md:text-4xl font-normal text-gray-900 leading-tight">
                      {product.product_name}
                    </h1>
                    
                    {/* 브랜드명 - 더 작고 세련되게 */}
                    <Link href={`/store/${storeId}`} className="inline-block">
                      <p className="text-sm text-gray-500 font-normal tracking-wide">
                        {store?.store_name || '상점명'}
                      </p>
                    </Link>

                    {/* 상품번호 - Dior 스타일 */}
                    <p className="text-xs text-gray-400 tracking-wider font-normal">
                      상품번호: {productId.slice(-8).toUpperCase()}
                    </p>
                    
                    {/* 제품 설명 - 모바일에서 더 간결하게 */}
                    <div className="prose prose-sm max-w-none">
                      <div 
                        dangerouslySetInnerHTML={{ 
                          __html: product.product_description ? DOMPurify.sanitize(product.product_description) : '' 
                        }}
                        className="text-gray-600 leading-relaxed text-sm font-normal line-clamp-3 md:line-clamp-none"
                      />
                    </div>
                  </div>

                  {/* 색상 선택 - Dior 스타일 */}
                  <div className="space-y-3">
                    <h3 className="text-sm font-medium text-gray-900">다른 색상</h3>
                    <div className="flex space-x-3">
                      {/* 색상 샘플들 - 작은 원형 */}
                      <button className="w-8 h-8 rounded-full bg-black border-2 border-gray-300 hover:border-gray-400 transition-colors"></button>
                    </div>
                  </div>

                  {/* Dior 스타일 구매 섹션 - 모바일 최적화 */}
                  <div className="space-y-3 md:space-y-4">
                    {/* 가격 표시 */}
                    <div className="mb-4">
                      {product.is_on_sale && product.discounted_price && product.discount_percentage ? (
                        <div className="space-y-2">
                          {/* 할인율 표시 */}
                          <div className="inline-block bg-black text-white text-xs px-3 py-1 font-medium">
                            -{product.discount_percentage}% 할인
                          </div>
                          {/* 원래 가격 (취소선) */}
                          <p className="text-sm text-gray-400 line-through">
                            ₩{product.price.toLocaleString()}
                          </p>
                          {/* 할인가 */}
                          <p className="text-xl font-medium text-red-600">
                            ₩{Math.round(product.discounted_price).toLocaleString()}
                          </p>
                        </div>
                      ) : (
                        <p className="text-xl font-medium text-black">
                          ₩{product.price.toLocaleString()}
                        </p>
                      )}
                    </div>

                    {/* 장바구니 버튼 - 모바일 반응형 */}
                    <button
                      onClick={handleAddToCart}
                      disabled={!product.is_available}
                      className={`w-full flex items-center justify-center py-3 md:py-4 px-4 md:px-6 text-sm font-medium ${
                        product.is_available
                          ? 'bg-black text-white hover:bg-gray-900'
                          : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      } transition-colors`}
                    >
                      <span>장바구니에 추가</span>
                    </button>

                    {/* 빠른 구매 버튼 - 모바일 반응형 */}
                    <button
                      onClick={() => {/* 구매하기 기능 */}}
                      disabled={!product.is_available}
                      className={`w-full py-3 md:py-4 text-sm font-medium border ${
                        product.is_available
                          ? 'border-black text-black hover:bg-gray-50'
                          : 'border-gray-300 text-gray-500 cursor-not-allowed'
                      } transition-colors flex items-center justify-center`}
                    >
                      <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                      </svg>
                      빠른 구매
                    </button>

                    {/* 배송 안내 */}
                    <div className="text-xs text-gray-500 text-center py-1">
                      <p>발송일 기준 1-2일 내 배송 예정</p>
                    </div>

                    {/* 관심상품 버튼 - 모바일 최적화 */}
                    <div className="flex justify-center pt-1 md:pt-2">
                      <button
                        onClick={toggleFavorite}
                        className="flex items-center text-xs md:text-sm font-medium text-gray-600 hover:text-black transition-colors py-2"
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-4 md:h-5 w-4 md:w-5 mr-2 ${isFavorite ? 'text-black fill-black' : 'text-gray-400'}`} 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          fill={isFavorite ? 'currentColor' : 'none'}
                          strokeWidth={1}
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                        {isFavorite ? '관심 상품 해제' : '관심 상품 등록'}
                      </button>
                    </div>
                  </div>

                  {/* 탭 메뉴 - 모바일 반응형 */}
                  <div className="border-b border-gray-200 mt-6 md:mt-8">
                    <div className="flex space-x-4 md:space-x-8 overflow-x-auto hide-scrollbar">
                      <button 
                        onClick={() => setActiveTab('details')}
                        className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'details' 
                            ? 'text-gray-900 border-b-2 border-black' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        상세 설명
                      </button>
                      <button 
                        onClick={() => setActiveTab('size')}
                        className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'size' 
                            ? 'text-gray-900 border-b-2 border-black' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        사이즈 가이드
                      </button>
                      <button 
                        onClick={() => setActiveTab('shipping')}
                        className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'shipping' 
                            ? 'text-gray-900 border-b-2 border-black' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        문의 및 배송
                      </button>
                      <button 
                        onClick={() => setActiveTab('returns')}
                        className={`py-3 text-xs md:text-sm font-medium transition-colors whitespace-nowrap ${
                          activeTab === 'returns' 
                            ? 'text-gray-900 border-b-2 border-black' 
                            : 'text-gray-500 hover:text-gray-900'
                        }`}
                      >
                        배송 및 반품
                      </button>
                    </div>
                  </div>

                  {/* 탭 컨텐츠 - 모바일 최적화 */}
                  <div className="py-2 md:py-3">
                    {activeTab === 'details' && (
                      <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-2">
                        <p className="leading-relaxed">2025년 가을에 새롭게 선보이는 소프트 {product.product_name}은 모던함과 유행을 타지 않는 우아함을 결합한 유명한 구조가 특징입니다. 고급스러운 소재와 정교한 마감으로 제작된 이 제품은 구조적으로 복잡하지만 우아한 CD 시그니처 클래스프가 특징적인 훌륭한 액세서리 라인을 완성하여 일상에서 제이아 스타일링 경험을 선사합니다.</p>
                        {product.material && <p><strong>소재:</strong> {product.material}</p>}
                        {product.weight && <p><strong>무게:</strong> {product.weight}g</p>}
                        {product.dimensions && <p><strong>크기:</strong> {product.dimensions}</p>}
                        {product.origin && <p><strong>원산지:</strong> {product.origin}</p>}
                        <button className="text-xs md:text-sm font-medium text-gray-900 underline hover:no-underline transition-all mt-2 md:mt-3">
                          자세히 보기
                        </button>
                      </div>
                    )}
                    
                    {activeTab === 'size' && (
                      <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-2">
                        <p>정확한 사이즈 선택을 위한 가이드입니다.</p>
                        <p>측정 방법에 따라 1-2cm 오차가 있을 수 있습니다.</p>
                        <p>사이즈 문의는 고객센터로 연락주시기 바랍니다.</p>
                      </div>
                    )}
                    
                    {activeTab === 'shipping' && (
                      <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-2">
                        {product && product.shipping_info ? (
                          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.shipping_info.replace(/\n/g, '<br/>')) }} />
                        ) : (
                          <>
                            <p>• 평일 오후 2시 이전 주문 시 당일 출고</p>
                            <p>• 주문 후 평균 2-3일 이내 수령</p>
                            <p>• 전국 무료 배송</p>
                            <p>• 제주도 및 도서산간 지역 추가 배송비 발생</p>
                          </>
                        )}
                      </div>
                    )}
                    
                    {activeTab === 'returns' && (
                      <div className="text-xs md:text-sm font-normal text-gray-600 leading-snug space-y-2">
                        {product && product.return_policy ? (
                          <div dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(product.return_policy.replace(/\n/g, '<br/>')) }} />
                        ) : (
                          <>
                            <p>• 상품 수령 후 7일 이내 교환/반품 가능</p>
                            <p>• 고객 변심에 의한 교환/반품 시 왕복 배송비 고객 부담</p>
                            <p>• 상품 불량/오배송의 경우 전액 판매자 부담</p>
                            <p>• 착용, 사용 흔적이 있는 상품은 교환/반품 불가</p>
                          </>
                        )}
                      </div>
                    )}
                  </div>

                  {/* 관리 버튼 (소유자만) - 모바일 최적화 */}
                  {user && isOwner && (
                    <div className="flex justify-center space-x-6 md:space-x-8 pt-6 md:pt-8 mt-6 md:mt-8 border-t border-gray-100">
                      <Link
                        href={`/store/${storeId}/product/edit/${productId}`}
                        className="text-xs font-medium text-gray-500 hover:text-black transition-colors underline hover:no-underline py-2"
                      >
                        편집
                      </Link>
                      <button
                        onClick={() => setShowDeleteConfirm(true)}
                        className="text-xs font-medium text-gray-500 hover:text-red-600 transition-colors underline hover:no-underline py-2"
                      >
                        삭제
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 상세보기 모달 */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-white z-50 p-4 md:p-8 overflow-auto">
          <button
            className="absolute top-6 right-6 p-2 text-gray-900 hover:text-gray-600 z-10"
            onClick={() => toggleImageModal(false)}
          >
            <X className="w-6 h-6" />
          </button>
          <div className="flex items-center justify-center min-h-full">
            <img
              src={selectedImage}
              alt={product?.product_name}
              className="max-w-full max-h-[85vh] object-contain p-4 md:p-8"
            />
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 max-w-md w-full">
            <h3 className="text-base font-medium text-black mb-4">제품 삭제</h3>
            <p className="text-sm text-gray-600 mb-6">
              <strong>{product.product_name}</strong> 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-4 py-2 border border-gray-300 text-xs uppercase tracking-wider font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-4 py-2 bg-red-600 text-white hover:bg-red-700 transition-colors text-xs uppercase tracking-wider font-medium disabled:opacity-50"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 추가 제품 배너 섹션 */}
      {!loading && product && store && (
        <div className="w-full bg-white py-10 mt-12 border-t border-gray-100">
          {/* 리뷰 섹션 추가 */}
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-16">
            <div className="border-b border-gray-200 pb-4 mb-8">
                              <h2 className="text-lg uppercase tracking-widest text-gray-900 font-medium">
                  고객 리뷰
                </h2>
            </div>
            
            {reviewLoading ? (
              <div className="py-8 flex justify-center">
                <p className="text-gray-500">리뷰 로딩 중...</p>
              </div>
            ) : (
              <div>
                {/* 리뷰 요약 */}
                <div className="mb-8">
                  <div className="flex items-center mb-4">
                    <div className="flex items-center">
                      {Array.from({ length: 5 }).map((_, index) => (
                        <svg 
                          key={index}
                          className={`w-5 h-5 ${index < Math.round(product.average_rating || 0) ? 'text-yellow-400' : 'text-gray-300'}`}
                          fill="currentColor"
                          viewBox="0 0 20 20"
                        >
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      ))}
                      <span className="ml-2 text-gray-900 font-medium">
                        {product.average_rating?.toFixed(1) || '0.0'}
                      </span>
                    </div>
                    <span className="mx-2 text-gray-500">•</span>
                    <span className="text-gray-500">{reviews.length}개 리뷰</span>
                  </div>
                </div>
                
                {/* 리뷰 작성 버튼 */}
                {user && !userHasReviewed && (
                  <div className="mb-8">
                    <button 
                      onClick={() => toggleReviewForm(true)}
                      className="px-4 py-2 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-md"
                    >
                      리뷰 작성하기
                    </button>
                  </div>
                )}
                
                {/* 리뷰 폼 */}
                {user && showReviewForm && (
                  <div className="mb-12 p-6 border border-gray-200 rounded-md">
                    <h3 className="text-base font-medium mb-4">
                      {userHasReviewed ? '리뷰 수정하기' : '리뷰 작성하기'}
                    </h3>
                    
                    <form onSubmit={handleSubmitReview} className="space-y-6">
                      {/* 별점 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">별점</label>
                        <div className="flex items-center space-x-1">
                          {[1, 2, 3, 4, 5].map((star) => (
                            <label key={star} className="cursor-pointer">
                              <input
                                type="radio"
                                name="rating"
                                value={star}
                                checked={reviewForm.rating === star}
                                onChange={handleReviewChange}
                                className="sr-only"
                              />
                              <svg 
                                className={`w-8 h-8 ${reviewForm.rating >= star ? 'text-yellow-400' : 'text-gray-300'} hover:text-yellow-400 transition-colors`}
                                fill="currentColor"
                                viewBox="0 0 20 20"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            </label>
                          ))}
                        </div>
                      </div>
                      
                      {/* 리뷰 내용 */}
                      <div>
                        <label htmlFor="review_text" className="block text-sm font-medium text-gray-700 mb-2">
                          리뷰 내용
                        </label>
                        <textarea
                          id="review_text"
                          name="review_text"
                          rows={4}
                          value={reviewForm.review_text}
                          onChange={handleReviewChange}
                          placeholder="제품에 대한 평가를 작성해주세요"
                          className="w-full border border-gray-300 rounded-md py-2 px-3 text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                          required
                        ></textarea>
                      </div>
                      
                      {/* 이미지 업로드 */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">이미지 추가 (선택사항)</label>
                        <div className="flex items-center space-x-4">
                          <label className="cursor-pointer px-4 py-2 border border-gray-300 text-sm text-gray-700 hover:bg-gray-50 transition-colors rounded-md">
                            {reviewImagePreview ? '이미지 변경' : '이미지 선택'}
                            <input
                              type="file"
                              accept="image/*"
                              onChange={handleReviewImageChange}
                              className="hidden"
                            />
                          </label>
                          
                          {reviewImagePreview && (
                            <button
                              type="button"
                              onClick={handleRemoveReviewImage}
                              className="text-red-600 text-sm hover:text-red-700"
                            >
                              이미지 삭제
                            </button>
                          )}
                        </div>
                        
                        {reviewImagePreview && (
                          <div className="mt-3 relative w-24 h-24 border border-gray-200 rounded overflow-hidden">
                            <img
                              src={reviewImagePreview}
                              alt="리뷰 이미지 미리보기"
                              className="w-full h-full object-cover"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* 버튼 그룹 */}
                      <div className="flex justify-end space-x-3">
                        <button
                          type="button"
                          onClick={() => toggleReviewForm(false)}
                          className="px-4 py-2 text-sm text-gray-700 hover:text-gray-900 transition-colors"
                        >
                          취소
                        </button>
                        <button
                          type="submit"
                          disabled={reviewSubmitting}
                          className="px-4 py-2 bg-black text-white text-sm hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          {reviewSubmitting ? '처리 중...' : (userHasReviewed ? '수정하기' : '등록하기')}
                        </button>
                      </div>
                    </form>
                  </div>
                )}
                
                {/* 리뷰 목록 */}
                <div className="space-y-8">
                  {reviews.length === 0 ? (
                    <p className="text-gray-500 text-center py-8">아직 작성된 리뷰가 없습니다.</p>
                  ) : (
                    reviews.map((review) => (
                      <div key={review.id} className="pb-8 border-b border-gray-100">
                        <div className="flex justify-between mb-2">
                          <div className="font-medium">{review.user_name || '익명 사용자'}</div>
                          <div className="text-sm text-gray-500">
                            {new Date(review.created_at).toLocaleDateString('ko-KR')}
                          </div>
                        </div>
                        
                        <div className="flex items-center mb-3">
                          {Array.from({ length: 5 }).map((_, index) => (
                            <svg 
                              key={index}
                              className={`w-4 h-4 ${index < review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                              fill="currentColor"
                              viewBox="0 0 20 20"
                            >
                              <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                            </svg>
                          ))}
                        </div>
                        
                        <div className="text-gray-700 mb-4 whitespace-pre-line">{review.review_text}</div>
                        
                        {review.review_image_url && (
                          <div className="mb-4">
                            <img
                              src={review.review_image_url}
                              alt="리뷰 이미지"
                              className="max-w-xs max-h-48 object-contain border border-gray-100 rounded"
                              onClick={() => review.review_image_url && toggleImageModal(true, review.review_image_url)}
                            />
                          </div>
                        )}
                        
                        {/* 리뷰 작성자만 수정/삭제 가능 */}
                        {user && user.id === review.user_id && (
                          <div className="flex space-x-4 mt-2">
                            <button
                              onClick={startEditMyReview}
                              className="text-sm text-gray-500 hover:text-black transition-colors"
                            >
                              수정
                            </button>
                            <button
                              onClick={handleDeleteReview}
                              className="text-sm text-red-500 hover:text-red-600 transition-colors"
                            >
                              삭제
                            </button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}
          </div>
          
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 같은 상점의 다른 제품 */}
            {storeProducts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-lg uppercase tracking-widest text-gray-900 mb-6 text-center font-medium">
                  {store.store_name}의 다른 제품
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 md:gap-8">
                  {storeProducts.map((storeProduct) => (
                    <Link key={storeProduct.id} href={`/store/${storeId}/product/${storeProduct.id}`} className="group">
                      <div className="aspect-square bg-[#f8f8f8] relative mb-3 overflow-hidden">
                        {storeProduct.product_image_url ? (
                          <img 
                            src={storeProduct.product_image_url} 
                            alt={storeProduct.product_name} 
                            className="w-full h-full object-contain p-4"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">이미지 없음</div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{storeProduct.product_name}</h3>
                        <p className="text-sm text-gray-700">{storeProduct.price.toLocaleString()}원</p>
                      </div>
                    </Link>
                  ))}
                </div>
                <div className="flex justify-center mt-8">
                  <Link href={`/store/${storeId}`} className="px-6 py-3 border border-gray-200 text-xs uppercase tracking-widest font-medium text-gray-700 hover:bg-gray-50 transition-colors">
                    더 보기
                  </Link>
                </div>
              </div>
            )}
            
            {/* 추천 상품 */}
            {recommendedProducts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-lg uppercase tracking-widest text-gray-900 mb-6 text-center font-medium">
                  추천 상품
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 md:gap-8">
                  {recommendedProducts.map((recProduct) => (
                    <Link key={recProduct.id} href={`/store/${recProduct.store_id}/product/${recProduct.id}`} className="group">
                      <div className="aspect-square bg-[#f8f8f8] relative mb-3 overflow-hidden">
                        {recProduct.product_image_url ? (
                          <img 
                            src={recProduct.product_image_url} 
                            alt={recProduct.product_name} 
                            className="w-full h-full object-contain p-4"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">이미지 없음</div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{recProduct.product_name}</h3>
                        <p className="text-sm text-gray-700">{recProduct.price.toLocaleString()}원</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
            
            {/* 최근 본 상품 */}
            {recentlyViewedProducts.length > 0 && (
              <div>
                <h2 className="text-lg uppercase tracking-widest text-gray-900 mb-6 text-center font-medium">
                  최근 본 상품
                </h2>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-4 gap-6 md:gap-8">
                  {recentlyViewedProducts.map((recentProduct) => (
                    <Link key={recentProduct.id} href={`/store/${recentProduct.store_id}/product/${recentProduct.id}`} className="group">
                      <div className="aspect-square bg-[#f8f8f8] relative mb-3 overflow-hidden">
                        {recentProduct.product_image_url ? (
                          <img 
                            src={recentProduct.product_image_url} 
                            alt={recentProduct.product_name} 
                            className="w-full h-full object-contain p-4"
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-gray-400">이미지 없음</div>
                        )}
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/5 transition-colors"></div>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-sm font-medium text-gray-900 truncate">{recentProduct.product_name}</h3>
                        <p className="text-sm text-gray-700">{recentProduct.price.toLocaleString()}원</p>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* 풋터 */}
      <footer className="bg-white border-t border-gray-200">
        {/* 뉴스레터 섹션 */}
        <div className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-lg font-normal text-gray-900 mb-3">
                Pieta의 최신 소식 받고 영감 얻기
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                만족할 수 있는 제품으로 나만의 특별한 순간을 주문하세요.
              </p>
              <div className="flex max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="이메일"
                  className="flex-1 px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-gray-400"
                />
                <button className="px-6 py-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 풋터 컨텐츠 */}
        <div className="py-8 md:py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-2 sm:grid-cols-2 md:grid-cols-4 gap-6 md:gap-8">
              {/* Pieta 부티크 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  Pieta 부티크
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/stores" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      피에타 디럭스 부티크
                    </Link>
                  </li>
                  <li>
                    <Link href="/boutiques" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      피에타 진주 부티크
                    </Link>
                  </li>
                  <li>
                    <Link href="/locations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      매장 및 위치
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 고객 지원 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  고객 지원
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      고객센터
                    </Link>
                  </li>
                  <li>
                    <Link href="/shipping" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      배송 및 반품
                    </Link>
                  </li>
                  <li>
                    <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/size-guide" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      사이즈 가이드
                    </Link>
                  </li>
                  <li>
                    <Link href="/care" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      제품 관리 방법
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 피에타 하우스 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  피에타 하우스
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/sustainability" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      피에타 지속가능성
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      브랜드 스토리
                    </Link>
                  </li>
                  <li>
                    <Link href="/craftsmanship" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      장인정신
                    </Link>
                  </li>
                  <li>
                    <Link href="/heritage" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      브랜드 유산
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 법률 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  법률
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/legal" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      법적 고지
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      개인정보 취급 방침
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      이용약관
                    </Link>
                  </li>
                  <li>
                    <Link href="/sitemap" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      사이트맵
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* 개인정보 처리방침 및 소셜미디어 */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                {/* 소셜미디어 링크 */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">피에타 소셜미디어</span>
                  <div className="flex space-x-4">
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">Kakaotalk</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">Instagram</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">Facebook</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">YouTube</span>
                    </Link>
                  </div>
                </div>

                {/* 언어/지역 선택 */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <button className="hover:text-gray-900 transition-colors border-r border-gray-300 pr-4">
                    국가/지역: 한국 (한국어)
                  </button>
                  <Link href="/global" className="hover:text-gray-900 transition-colors">
                    →
                  </Link>
                </div>
              </div>
            </div>

            {/* 회사 정보 및 저작권 */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-xs text-gray-500 space-y-2">
                <p>
                  피에타컬렉션 주식회사 | 04539 서울특별시 중구 청계천로 19, 26층(소공동) | 사업자등록번호: 120-81-74197
                </p>
                <p>
                  대표자: 투자전문회사, Khong May Won Sharon | 통신판매업
                </p>
                <p>
                  신고번호: 2021-서울중구-01116 | 사업자정보확인
                </p>
                <p>
                  고객 센터 : 02-3280-0104 (contactpieta@christandior.com) | 호스팅 서비스 : Smile Hosting
                </p>
                <p className="font-medium text-gray-600 mt-4">
                  COPYRIGHT © CHRISTIAN DIOR COUTURE KOREA ALL RIGHTS RESERVED.
                </p>
                <p className="mt-2">
                  투자광고에 대한 주의사항 : 이 광고는 광고 참여 시점의 투자대상 및 투자위험 등에 대한 최종 안내로 활용됨니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 