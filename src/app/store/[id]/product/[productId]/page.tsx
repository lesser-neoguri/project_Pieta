'use client';

import { useState, useEffect } from 'react';
import { supabase, deleteProductWithImages, deleteImageFromStorage } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';

// 네비게이션 바 컨트롤을 위한 사용자 정의 이벤트 추가
const emitNavbarEvent = (hide: boolean) => {
  if (typeof window !== 'undefined') {
    const event = new CustomEvent('navbarControl', { detail: { hide } });
    window.dispatchEvent(event);
  }
};

// 스로틀 함수 추가
function throttle<T extends (...args: any[]) => any>(
  func: T,
  delay: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= delay) {
      lastCall = now;
      func(...args);
    }
  };
}

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
  const router = useRouter();
  const params = useParams();
  const storeId = params?.id as string;
  const productId = params?.productId as string;
  
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

  // 추가 제품 배너 섹션을 위한 상태 추가
  const [storeProducts, setStoreProducts] = useState<ProductData[]>([]);
  const [recommendedProducts, setRecommendedProducts] = useState<ProductData[]>([]);
  const [recentlyViewedProducts, setRecentlyViewedProducts] = useState<ProductData[]>([]);
  const [additionalProductsLoading, setAdditionalProductsLoading] = useState(true);

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

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      // 재고보다 많이 선택하지 못하도록 제한
      const maxQuantity = product?.stock || 1;
      setQuantity(Math.min(value, maxQuantity));
    }
  };

  const handleAddToCart = async () => {
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
  };

  // 이미지 URL에서 파일 경로 추출하는 함수
  const extractFilePathFromUrl = (url: string | null): string | null => {
    if (!url) return null;
    
    try {
      const urlObj = new URL(url);
      const pathParts = urlObj.pathname.split('/');
      return pathParts[pathParts.length - 1];
    } catch (error) {
      console.error('URL 파싱 오류:', error);
      return null;
    }
  };

  // 제품 이미지 삭제 함수
  const deleteProductImage = async (imageUrl: string | null): Promise<void> => {
    if (!imageUrl) return;
    
    try {
      // 스토리지에서 이미지 파일 삭제
      await deleteImageFromStorage(imageUrl);
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  // 제품 삭제 함수
  const handleDeleteProduct = async () => {
    if (!product || !isOwner) return;
    
    setDeleteLoading(true);
    
    try {
      // 새로운 함수를 사용하여 제품과 관련 이미지를 함께 삭제
      const { success, error } = await deleteProductWithImages(product.id);
        
      if (!success) {
        throw error;
      }
      
      // 성공 메시지 표시
      alert('제품이 삭제되었습니다.');
      
      router.push(`/store/${product.store_id}`);
    } catch (error) {
      console.error('제품 삭제 중 오류:', error);
      // 오류 메시지 표시
      alert('제품 삭제 중 오류가 발생했습니다.');
    } finally {
      setDeleteLoading(false);
      setShowDeleteConfirm(false);
    }
  };

  // 관심 상품 토글 함수
  const toggleFavorite = async () => {
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
        setFavoriteCount(prev => Math.max(0, prev - 1));
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
        setFavoriteCount(prev => prev + 1);
      }
    } catch (error: any) {
      console.error('관심 상품 처리 중 오류 발생:', error);
    }
  };

  // 리뷰 입력 핸들러
  const handleReviewChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setReviewForm({
      ...reviewForm,
      [name]: name === 'rating' ? parseInt(value) : value
    });
  };

  // 리뷰 이미지 변경 핸들러
  const handleReviewImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setReviewImageFile(file);
      
      // 이미지 미리보기 생성
      const reader = new FileReader();
      reader.onload = (event) => {
        if (event.target) {
          setReviewImagePreview(event.target.result as string);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // 리뷰 이미지 제거 핸들러
  const handleRemoveReviewImage = () => {
    setReviewImageFile(null);
    setReviewImagePreview(null);
  };

  // 리뷰 제출 핸들러
  const handleReviewSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user) {
      alert('리뷰를 작성하려면 로그인이 필요합니다.');
      return;
    }
    
    if (reviewForm.rating < 1 || reviewForm.rating > 5) {
      alert('별점은 1~5점 사이로 선택해주세요.');
      return;
    }
    
    setReviewSubmitting(true);
    
    try {
      let review_image_url = null;
      
      // 이미지 파일이 있으면 스토리지에 업로드
      if (reviewImageFile) {
        try {
          // 이미지 파일 크기 확인 (10MB 제한)
          if (reviewImageFile.size > 10 * 1024 * 1024) {
            throw new Error('이미지 크기는 10MB 이하여야 합니다.');
          }
          
          // 파일 확장자 확인
          const fileExt = reviewImageFile.name.split('.').pop()?.toLowerCase();
          if (!fileExt || !['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(fileExt)) {
            throw new Error('지원되는 이미지 형식은 JPG, PNG, GIF, WEBP입니다.');
          }
          
          // 파일명 생성
          const fileName = `products/${productId}/reviews/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          
          // 이미지 업로드
          const { data: uploadData, error: uploadError } = await supabase.storage
            .from('images')
            .upload(fileName, reviewImageFile, {
              cacheControl: '3600',
              upsert: false
            });
            
          if (uploadError) throw uploadError;
          
          // 업로드된 이미지의 공개 URL 가져오기
          const { data } = supabase.storage
            .from('images')
            .getPublicUrl(fileName);
            
          review_image_url = data.publicUrl;
        } catch (imageError: any) {
          console.error('이미지 처리 중 오류:', imageError);
          const errorMessage = imageError.message || '이미지 업로드에 실패했습니다.';
          
          // 이미지 없이 계속 진행할지 확인
          const continueWithoutImage = confirm(`${errorMessage}\n\n이미지 없이 리뷰를 등록하시겠습니까?`);
          if (!continueWithoutImage) {
            setReviewSubmitting(false);
            return;
          }
        }
      }
      
      // 리뷰 데이터 준비
      const reviewData = {
        product_id: productId,
        user_id: user.id,
        rating: reviewForm.rating,
        review_text: reviewForm.review_text,
        review_image_url,
        is_verified_purchase: false, // 구매 확인은 향후 구현
      };
      
      if (userHasReviewed && userReview) {
        // 기존 리뷰 수정
        const { error } = await supabase
          .from('product_reviews')
          .update(reviewData)
          .eq('id', userReview.id);
          
        if (error) throw error;
        
        // 이전 이미지가 있고 새 이미지가 다르면 이전 이미지 삭제
        if (userReview.review_image_url && userReview.review_image_url !== review_image_url) {
          await deleteProductImage(userReview.review_image_url);
        }
        
        alert('리뷰가 성공적으로 수정되었습니다.');
      } else {
        // 새 리뷰 등록
        const { error } = await supabase
          .from('product_reviews')
          .insert([reviewData]);
          
        if (error) throw error;
        
        alert('리뷰가 성공적으로 등록되었습니다.');
      }
      
      // 리뷰 폼 초기화
      setReviewForm({
        rating: 5,
        review_text: '',
      });
      setReviewImageFile(null);
      setReviewImagePreview(null);
      
      // 페이지 새로고침하여 리뷰 목록 업데이트
      window.location.reload();
    } catch (error: any) {
      console.error('리뷰 저장 중 오류 발생:', error);
      alert(`리뷰 저장 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    } finally {
      setReviewSubmitting(false);
    }
  };

  // 리뷰 삭제 핸들러
  const handleDeleteReview = async () => {
    if (!user || !userReview) return;
    
    if (!confirm('정말 리뷰를 삭제하시겠습니까?')) return;
    
    try {
      // 리뷰 삭제
      const { error } = await supabase
        .from('product_reviews')
        .delete()
        .eq('id', userReview.id)
        .eq('user_id', user.id);
        
      if (error) throw error;
      
      // 리뷰 이미지 삭제
      if (userReview.review_image_url) {
        await deleteImageFromStorage(userReview.review_image_url);
      }
      
      alert('리뷰가 성공적으로 삭제되었습니다.');
      
      // 페이지 새로고침하여 리뷰 목록 업데이트
      window.location.reload();
    } catch (error: any) {
      console.error('리뷰 삭제 중 오류 발생:', error);
      alert(`리뷰 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    }
  };

  const handleShowReviewForm = () => {
    setShowReviewForm(true);
  };

  const handleEditMyReview = () => {
    setShowReviewForm(true);
  };

  const handleDeleteMyReview = () => {
    if (!user || !userReview) return;
    
    if (!confirm('정말 리뷰를 삭제하시겠습니까?')) return;
    
    handleDeleteReview();
  };

  // 이미지 변경 함수
  const handleImageSelect = (imageUrl: string) => {
    setSelectedImage(imageUrl);
  };

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
              onScroll={throttle((e) => {
                // 스크롤 이벤트 발생 시 방향 감지
                const target = e.currentTarget;
                const currentScrollPos = target.scrollTop;
                
                // 스크롤 방향에 따라 네비게이션 바를 표시하거나 숨김
                if (currentScrollPos > prevScrollPos) {
                  // 아래로 스크롤 - 네비게이션 바 숨김
                  emitNavbarEvent(true);
                } else {
                  // 위로 스크롤 - 네비게이션 바 표시
                  emitNavbarEvent(false);
                }
                
                // 현재 스크롤 위치 저장
                prevScrollPos = currentScrollPos;
              }, 50)}
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
                        onClick={() => setShowImageModal(true)}
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
                        onClick={() => {setSelectedImage(image.url); setShowImageModal(true);}}
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
                      onClick={() => setShowImageModal(true)}
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
                      onClick={() => {setSelectedImage(image.url); setShowImageModal(true);}}
                      className="absolute inset-0 flex items-center justify-center bg-transparent"
                      aria-label="이미지 확대"
                    />
                  </div>
                ))}
              </div>
            </div>
            
            {/* 오른쪽: 제품 정보 섹션 */}
            <div className="md:w-1/2 pl-0 md:pl-8 lg:pl-12 px-5 sm:px-6 md:px-0">
              <div className="h-full flex flex-col md:max-w-md md:ml-8 lg:ml-16">
                {/* 상단 여백 */}
                <div className="flex-grow mb-auto md:min-h-[250px] lg:min-h-[300px]"></div>
                
                {/* 제품 정보 콘텐츠 */}
                <div>
                  <div className="mb-10">
                    <Link href={`/store/${storeId}`} className="inline-block mb-2">
                      <h2 className="text-sm uppercase tracking-widest text-gray-600 font-medium">
                        {store?.store_name || '상점명'}
                      </h2>
                    </Link>

                    <h1 className="text-2xl font-medium text-gray-900 mb-6">{product.product_name}</h1>
                    
                    <p className="text-lg text-gray-900 mb-8">
                      {product.price.toLocaleString()}원
                    </p>
                    
                    <div className="mb-12">
                      <div className="prose prose-sm max-w-none font-pretendard">
                        <div 
                          dangerouslySetInnerHTML={{ 
                            __html: product.product_description ? DOMPurify.sanitize(product.product_description) : '' 
                          }}
                          className="rich-editor text-gray-600 leading-relaxed text-sm"
                        />
                      </div>
                    </div>
                  </div>

                  {/* 제품 세부 정보 아코디언 */}
                  <div className="mb-10 space-y-5">
                    {/* 패키지 및 선물 옵션 */}
                    <div className="border-t border-gray-200">
                      <div 
                        className="flex justify-between items-center py-4 cursor-pointer accordion-header"
                        onClick={() => {
                          const header = document.querySelector(`[data-accordion="package-options"]`);
                          const content = document.getElementById('package-options');
                          if (header && content) {
                            header.classList.toggle('open');
                            content.classList.toggle('open');
                            
                            // 높이 자동 계산을 위한 처리
                            if (content.classList.contains('open')) {
                              const inner = content.querySelector('.accordion-inner');
                              if (inner) {
                                const height = inner.getBoundingClientRect().height;
                                content.style.height = `${height + 16}px`; // 16px는 패딩 크기
                              }
                            } else {
                              content.style.height = '0';
                            }
                          }
                        }}
                        data-accordion="package-options"
                      >
                        <h3 className="text-sm uppercase tracking-widest font-medium">패키지 옵션</h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 accordion-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div id="package-options" className="accordion-content">
                        <div className="accordion-inner space-y-4">
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="standard-package" 
                              name="package-option" 
                              defaultChecked 
                              onChange={() => {}}
                              className="h-4 w-4 text-black focus:ring-black border-gray-300"
                            />
                            <label htmlFor="standard-package" className="ml-2 text-sm">기본 패키지</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="gift-package" 
                              name="package-option"
                              onChange={() => {}}
                              className="h-4 w-4 text-black focus:ring-black border-gray-300"
                            />
                            <label htmlFor="gift-package" className="ml-2 text-sm">선물 포장 (+ ₩5,000)</label>
                          </div>
                          <div className="flex items-center">
                            <input 
                              type="radio" 
                              id="premium-package" 
                              name="package-option"
                              onChange={() => {}}
                              className="h-4 w-4 text-black focus:ring-black border-gray-300"
                            />
                            <label htmlFor="premium-package" className="ml-2 text-sm">프리미엄 패키지 (+ ₩10,000)</label>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* 배송 정보 */}
                    <div className="border-t border-gray-200">
                      <div 
                        className="flex justify-between items-center py-4 cursor-pointer accordion-header"
                        onClick={() => {
                          const header = document.querySelector(`[data-accordion="shipping-info"]`);
                          const content = document.getElementById('shipping-info');
                          if (header && content) {
                            header.classList.toggle('open');
                            content.classList.toggle('open');
                            
                            // 높이 자동 계산을 위한 처리
                            if (content.classList.contains('open')) {
                              const inner = content.querySelector('.accordion-inner');
                              if (inner) {
                                const height = inner.getBoundingClientRect().height;
                                content.style.height = `${height + 16}px`; // 16px는 패딩 크기
                              }
                            } else {
                              content.style.height = '0';
                            }
                          }
                        }}
                        data-accordion="shipping-info"
                      >
                        <h3 className="text-sm uppercase tracking-widest font-medium">배송 안내</h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 accordion-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div id="shipping-info" className="accordion-content">
                        <div className="accordion-inner space-y-2 text-sm text-gray-600">
                          {product && product.shipping_info ? (
                            <div dangerouslySetInnerHTML={{ __html: product.shipping_info.replace(/\n/g, '<br/>') }} />
                          ) : (
                            <>
                              <p>• 평일 오후 2시 이전 주문 시 당일 출고</p>
                              <p>• 주문 후 평균 2-3일 이내 수령</p>
                              <p>• 전국 무료 배송</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* 반품 정책 */}
                    <div className="border-t border-gray-200">
                      <div 
                        className="flex justify-between items-center py-4 cursor-pointer accordion-header"
                        onClick={() => {
                          const header = document.querySelector(`[data-accordion="return-policy"]`);
                          const content = document.getElementById('return-policy');
                          if (header && content) {
                            header.classList.toggle('open');
                            content.classList.toggle('open');
                            
                            // 높이 자동 계산을 위한 처리
                            if (content.classList.contains('open')) {
                              const inner = content.querySelector('.accordion-inner');
                              if (inner) {
                                const height = inner.getBoundingClientRect().height;
                                content.style.height = `${height + 16}px`; // 16px는 패딩 크기
                              }
                            } else {
                              content.style.height = '0';
                            }
                          }
                        }}
                        data-accordion="return-policy"
                      >
                        <h3 className="text-sm uppercase tracking-widest font-medium">반품 정책</h3>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 accordion-arrow" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                        </svg>
                      </div>
                      <div id="return-policy" className="accordion-content">
                        <div className="accordion-inner space-y-2 text-sm text-gray-600">
                          {product && product.return_policy ? (
                            <div dangerouslySetInnerHTML={{ __html: product.return_policy.replace(/\n/g, '<br/>') }} />
                          ) : (
                            <>
                              <p>• 상품 수령 후 7일 이내 교환/반품 가능</p>
                              <p>• 고객 변심에 의한 교환/반품 시 왕복 배송비 고객 부담</p>
                              <p>• 상품 불량/오배송의 경우 전액 판매자 부담</p>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 구매 옵션 */}
                  <div className="mb-12 space-y-6">
                    <div className="flex items-center space-x-4">
                      <div className="flex items-center border border-gray-300">
                        <button 
                          onClick={() => setQuantity(Math.max(1, quantity - 1))}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-50"
                        >
                          -
                        </button>
                        <input
                          type="number"
                          min="1"
                          max={product.stock}
                          value={quantity}
                          onChange={(e) => setQuantity(parseInt(e.target.value) || 1)}
                          className="w-12 text-center border-x border-gray-300 py-2 focus:outline-none text-sm"
                        />
                        <button 
                          onClick={() => setQuantity(Math.min(product.stock || 1, quantity + 1))}
                          className="px-4 py-2 text-gray-600 hover:bg-gray-50"
                        >
                          +
                        </button>
                      </div>
                      <div className="text-sm text-gray-500">
                        재고: {product.stock}개
                      </div>
                    </div>

                    <div className="space-y-4">
                      <button
                        onClick={handleAddToCart}
                        disabled={!product.is_available}
                        className={`w-full py-4 text-sm uppercase tracking-widest font-medium ${
                          product.is_available
                            ? 'bg-black text-white hover:bg-gray-900'
                            : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                        } transition-colors`}
                      >
                        장바구니에 추가
                      </button>
                      <button
                        onClick={() => {/* 구매하기 기능 */}}
                        disabled={!product.is_available}
                        className={`w-full py-4 text-sm uppercase tracking-widest font-medium border ${
                          product.is_available
                            ? 'border-black text-black hover:bg-gray-50'
                            : 'border-gray-300 text-gray-500 cursor-not-allowed'
                        } transition-colors`}
                      >
                        바로 구매하기
                      </button>
                      <button
                        onClick={toggleFavorite}
                        className={`w-full flex items-center justify-center py-4 text-sm uppercase tracking-widest font-medium ${
                          isFavorite 
                            ? 'bg-gray-50 text-black border border-gray-300' 
                            : 'bg-white text-gray-700 border border-gray-200'
                        } transition-colors`}
                      >
                        <svg 
                          xmlns="http://www.w3.org/2000/svg" 
                          className={`h-4 w-4 mr-2 ${isFavorite ? 'text-black fill-black' : 'text-gray-500'}`} 
                          viewBox="0 0 24 24" 
                          stroke="currentColor"
                          fill={isFavorite ? 'currentColor' : 'none'}
                        >
                          <path 
                            strokeLinecap="round" 
                            strokeLinejoin="round" 
                            strokeWidth={1.5} 
                            d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" 
                          />
                        </svg>
                        {isFavorite ? '관심 상품 해제' : '관심 상품 등록'}
                      </button>
                    </div>
                  </div>

                  {/* 공유 */}
                  <div className="pt-4 border-t border-gray-200">
                    <div className="flex items-center justify-center space-x-8">
                      <button className="text-gray-600 hover:text-black transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                        </svg>
                      </button>
                      <button className="text-gray-600 hover:text-black transition-colors">
                        <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                          <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.259-.012 3.668-.069 4.948-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  
                  {/* 관리 버튼 (소유자만) */}
                  {user && isOwner && (
                    <div className="mt-8 pt-4 border-t border-gray-200">
                      <div className="flex justify-center space-x-6">
                        <Link
                          href={`/store/${storeId}/product/edit/${productId}`}
                          className="text-xs uppercase tracking-widest text-gray-600 hover:text-black transition-colors"
                        >
                          편집
                        </Link>
                        <button
                          onClick={() => setShowDeleteConfirm(true)}
                          className="text-xs uppercase tracking-widest text-gray-600 hover:text-black transition-colors"
                        >
                          삭제
                        </button>
                      </div>
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
            onClick={() => setShowImageModal(false)}
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
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            {/* 같은 상점의 다른 제품 */}
            {storeProducts.length > 0 && (
              <div className="mb-12">
                <h2 className="text-lg uppercase tracking-widest text-gray-900 mb-6 text-center font-light">
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
                <h2 className="text-lg uppercase tracking-widest text-gray-900 mb-6 text-center font-light">
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
                <h2 className="text-lg uppercase tracking-widest text-gray-900 mb-6 text-center font-light">
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
    </div>
  );
} 