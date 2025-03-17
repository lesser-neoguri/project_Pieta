'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';

type StoreData = {
  id: string;
  store_name: string;
  store_description: string;
  store_logo_url: string | null;
  store_address: string;
  is_open: boolean;
  created_at: string;
  vendor_id: string;
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

  useEffect(() => {
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

        // 디버깅을 위한 로그 추가
        console.log('가져온 제품 데이터:', productData);
        console.log('total_sales 값:', productData.total_sales);
        console.log('average_rating 값:', productData.average_rating);

        setProduct(productData);

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

  const handleQuantityChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    if (!isNaN(value) && value > 0) {
      // 재고보다 많이 선택하지 못하도록 제한
      const maxQuantity = product?.stock || 1;
      setQuantity(Math.min(value, maxQuantity));
    }
  };

  const handleAddToCart = () => {
    // 장바구니 기능 구현 (향후 확장)
    alert(`${product?.product_name} ${quantity}개를 장바구니에 추가했습니다.`);
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
      const filePath = extractFilePathFromUrl(imageUrl);
      if (!filePath) return;
      
      console.log('제품 이미지 삭제 시도:', filePath);
      
      const { error } = await supabase.storage
        .from('images')
        .remove([filePath]);
        
      if (error) {
        console.error('이미지 삭제 오류:', error);
      } else {
        console.log('이미지 삭제 성공');
      }
    } catch (error) {
      console.error('이미지 삭제 중 오류 발생:', error);
    }
  };

  // 제품 삭제 함수
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
        await deleteProductImage(product.product_image_url);
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
          const fileName = `reviews/${Date.now()}_${Math.floor(Math.random() * 1000)}.${fileExt}`;
          
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
        await deleteProductImage(userReview.review_image_url);
      }
      
      alert('리뷰가 성공적으로 삭제되었습니다.');
      
      // 페이지 새로고침하여 리뷰 목록 업데이트
      window.location.reload();
    } catch (error: any) {
      console.error('리뷰 삭제 중 오류 발생:', error);
      alert(`리뷰 삭제 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}`);
    }
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
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        {/* 상점 정보 및 네비게이션 */}
        <div className="mb-6">
          <nav className="flex items-center text-sm text-gray-500 mb-4">
            <Link href="/" className="hover:text-blue-600">홈</Link>
            <span className="mx-2">›</span>
            <Link href="/storelist" className="hover:text-blue-600">상점 목록</Link>
            <span className="mx-2">›</span>
            <Link href={`/store/${store.id}`} className="hover:text-blue-600">{store.store_name}</Link>
            <span className="mx-2">›</span>
            <span className="text-gray-900">{product.product_name}</span>
          </nav>
        </div>
        
        {/* 제품 상세 정보 */}
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
          <div className="md:flex">
            {/* 제품 이미지 */}
            <div className="md:w-1/2 h-96 bg-gray-200 relative">
              {product.product_image_url ? (
                <img
                  src={product.product_image_url}
                  alt={`${product.product_name} 이미지`}
                  className="w-full h-full object-contain"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center bg-gray-100">
                  <span className="text-gray-400 text-6xl">{product.product_name.charAt(0)}</span>
                </div>
              )}
              {!product.is_available && (
                <div className="absolute top-4 right-4 px-3 py-1 text-sm font-medium text-white rounded bg-red-500">
                  품절
                </div>
              )}
            </div>
            
            {/* 제품 정보 */}
            <div className="md:w-1/2 p-8">
              <div className="flex justify-between items-start">
                <div>
                  <h1 className="text-2xl font-bold text-gray-900 mb-2">{product.product_name}</h1>
                  <p className="text-sm text-gray-500 mb-4">
                    판매처: <Link href={`/store/${store.id}`} className="text-blue-600 hover:underline">{store.store_name}</Link>
                  </p>
                </div>
                {isOwner && (
                  <div className="flex space-x-2">
                    <Link
                      href={`/store/${store.id}/product/edit/${product.id}`}
                      className="px-3 py-1 bg-blue-100 text-blue-700 rounded hover:bg-blue-200 transition-colors text-sm"
                    >
                      수정
                    </Link>
                    <button
                      onClick={() => setShowDeleteConfirm(true)}
                      className="px-3 py-1 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors text-sm"
                    >
                      삭제
                    </button>
                  </div>
                )}
              </div>
              
              <div className="border-t border-b py-4 my-4">
                <p className="text-3xl font-bold text-gray-900 mb-2">{product.price.toLocaleString()}원</p>
                <div className="flex items-center mt-2 space-x-4">
                  <div className="flex items-center">
                    <span className={`inline-block w-3 h-3 rounded-full mr-2 ${product.is_available ? 'bg-green-500' : 'bg-red-500'}`}></span>
                    <span className={`text-sm ${product.is_available ? 'text-green-600' : 'text-red-600'}`}>
                      {product.is_available ? '구매 가능' : '품절'}
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600">
                      판매량: {product.total_sales !== undefined ? product.total_sales : 0}개
                    </span>
                  </div>
                  
                  <div className="flex items-center">
                    <span className="text-sm text-gray-600 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-400 mr-1" viewBox="0 0 20 20" fill="currentColor">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      {product.average_rating !== undefined ? product.average_rating.toFixed(1) : '0.0'} ({reviews.length}개 리뷰)
                    </span>
                  </div>
                </div>
                
                <div className="mt-4">
                  <button
                    onClick={toggleFavorite}
                    className={`flex items-center px-3 py-1 rounded text-sm ${
                      isFavorite 
                        ? 'bg-red-100 text-red-600 hover:bg-red-200' 
                        : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                    } transition-colors`}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-4 w-4 mr-1 ${isFavorite ? 'text-red-500' : 'text-gray-400'}`} 
                      viewBox="0 0 20 20" 
                      fill="currentColor"
                    >
                      <path 
                        fillRule="evenodd" 
                        d="M3.172 5.172a4 4 0 015.656 0L10 6.343l1.172-1.171a4 4 0 115.656 5.656L10 17.657l-6.828-6.829a4 4 0 010-5.656z" 
                        clipRule="evenodd" 
                      />
                    </svg>
                    {isFavorite ? '관심 상품 해제' : '관심 상품 등록'} ({favoriteCount})
                  </button>
                </div>
              </div>
              
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">제품 설명</h2>
                <p className="text-gray-700 whitespace-pre-line">
                  {product.product_description || '제품 설명이 없습니다.'}
                </p>
              </div>
              
              {product.is_available && (
                <div className="mb-6">
                  <div className="flex items-center mb-4">
                    <label htmlFor="quantity" className="block text-gray-700 font-medium mr-4">
                      수량
                    </label>
                    <div className="flex items-center">
                      <button 
                        onClick={() => setQuantity(Math.max(1, quantity - 1))}
                        className="px-3 py-1 border border-gray-300 rounded-l-md bg-gray-100 hover:bg-gray-200"
                      >
                        -
                      </button>
                      <input
                        type="number"
                        id="quantity"
                        value={quantity}
                        onChange={handleQuantityChange}
                        min="1"
                        max={product.stock}
                        className="w-16 px-3 py-1 border-t border-b border-gray-300 text-center"
                      />
                      <button 
                        onClick={() => setQuantity(Math.min(product.stock, quantity + 1))}
                        className="px-3 py-1 border border-gray-300 rounded-r-md bg-gray-100 hover:bg-gray-200"
                      >
                        +
                      </button>
                    </div>
                    <span className="ml-4 text-sm text-gray-500">
                      (재고: {product.stock}개)
                    </span>
                  </div>
                  
                  <div className="flex space-x-4">
                    <button
                      onClick={handleAddToCart}
                      className="flex-1 px-6 py-3 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      장바구니에 추가
                    </button>
                    <button
                      className="flex-1 px-6 py-3 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      바로 구매하기
                    </button>
                  </div>
                </div>
              )}
              
              <div className="mt-8">
                <Link
                  href={`/store/${store.id}`}
                  className="text-blue-600 hover:underline"
                >
                  ← {store.store_name} 상점으로 돌아가기
                </Link>
              </div>
            </div>
          </div>
          
          {/* 리뷰 섹션 */}
          <div className="p-8 border-t">
            <h2 className="text-xl font-bold text-gray-900 mb-4">
              고객 리뷰 ({reviews.length})
            </h2>
            
            {/* 리뷰 작성 폼 */}
            {user ? (
              <div className="mb-8 bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-semibold mb-4">
                  {userHasReviewed ? '내 리뷰 수정하기' : '리뷰 작성하기'}
                </h3>
                
                <form onSubmit={handleReviewSubmit}>
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">
                      별점
                    </label>
                    <div className="flex items-center">
                      {[1, 2, 3, 4, 5].map((star) => (
                        <label key={star} className="mr-2 cursor-pointer">
                          <input
                            type="radio"
                            name="rating"
                            value={star}
                            checked={reviewForm.rating === star}
                            onChange={handleReviewChange}
                            className="sr-only"
                          />
                          <svg 
                            xmlns="http://www.w3.org/2000/svg" 
                            className={`h-8 w-8 ${
                              star <= reviewForm.rating ? 'text-yellow-400' : 'text-gray-300'
                            } hover:text-yellow-400 transition-colors`}
                            viewBox="0 0 20 20" 
                            fill="currentColor"
                          >
                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                          </svg>
                        </label>
                      ))}
                      <span className="ml-2 text-gray-700">{reviewForm.rating}점</span>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <label htmlFor="review_text" className="block text-gray-700 font-medium mb-2">
                      리뷰 내용
                    </label>
                    <textarea
                      id="review_text"
                      name="review_text"
                      value={reviewForm.review_text}
                      onChange={handleReviewChange}
                      rows={4}
                      className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="제품에 대한 솔직한 리뷰를 작성해주세요."
                    />
                  </div>
                  
                  <div className="mb-4">
                    <label className="block text-gray-700 font-medium mb-2">
                      이미지 첨부 (선택사항)
                    </label>
                    <div className="text-xs text-gray-500 mb-2">
                      지원 형식: JPG, PNG, GIF, WEBP (최대 10MB)
                    </div>
                    
                    {reviewImagePreview ? (
                      <div className="relative inline-block mb-2">
                        <img 
                          src={reviewImagePreview} 
                          alt="리뷰 이미지 미리보기" 
                          className="h-32 object-cover rounded-md"
                        />
                        <button
                          type="button"
                          onClick={handleRemoveReviewImage}
                          className="absolute top-1 right-1 bg-red-500 text-white rounded-full w-6 h-6 flex items-center justify-center"
                        >
                          ×
                        </button>
                      </div>
                    ) : (
                      <input
                        type="file"
                        id="review_image"
                        name="review_image"
                        accept="image/jpeg,image/png,image/gif,image/webp"
                        onChange={handleReviewImageChange}
                        className="w-full px-4 py-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    )}
                  </div>
                  
                  <div className="flex justify-between">
                    <div>
                      {userHasReviewed && (
                        <button
                          type="button"
                          onClick={handleDeleteReview}
                          className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors mr-2"
                          disabled={reviewSubmitting}
                        >
                          리뷰 삭제
                        </button>
                      )}
                    </div>
                    <button
                      type="submit"
                      className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                      disabled={reviewSubmitting}
                    >
                      {reviewSubmitting ? '처리 중...' : userHasReviewed ? '리뷰 수정' : '리뷰 등록'}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              <div className="mb-8 bg-gray-50 p-6 rounded-lg text-center">
                <p className="text-gray-600 mb-4">리뷰를 작성하려면 로그인이 필요합니다.</p>
                <Link
                  href="/login"
                  className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors inline-block"
                >
                  로그인하기
                </Link>
              </div>
            )}
            
            {/* 리뷰 목록 */}
            {reviewLoading ? (
              <p className="text-gray-500">리뷰 로딩 중...</p>
            ) : reviews.length > 0 ? (
              <div className="space-y-6">
                {reviews.map((review) => (
                  <div key={review.id} className="border-b pb-6 last:border-b-0">
                    <div className="flex justify-between items-start mb-2">
                      <div>
                        <div className="flex items-center">
                          <div className="flex">
                            {[1, 2, 3, 4, 5].map((star) => (
                              <svg 
                                key={star}
                                xmlns="http://www.w3.org/2000/svg" 
                                className={`h-5 w-5 ${star <= review.rating ? 'text-yellow-400' : 'text-gray-300'}`}
                                viewBox="0 0 20 20" 
                                fill="currentColor"
                              >
                                <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                              </svg>
                            ))}
                          </div>
                          <span className="ml-2 text-sm font-medium text-gray-700">{review.user_name}</span>
                          {review.is_verified_purchase && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-green-100 text-green-800 rounded">
                              구매 확인
                            </span>
                          )}
                          {user && review.user_id === user.id && (
                            <span className="ml-2 px-2 py-0.5 text-xs bg-blue-100 text-blue-800 rounded">
                              내 리뷰
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(review.created_at).toLocaleDateString('ko-KR', {
                            year: 'numeric',
                            month: 'long',
                            day: 'numeric'
                          })}
                        </p>
                      </div>
                    </div>
                    
                    {review.review_image_url && (
                      <div className="mb-3">
                        <img 
                          src={review.review_image_url} 
                          alt="리뷰 이미지" 
                          className="h-24 object-cover rounded"
                        />
                      </div>
                    )}
                    
                    <p className="text-gray-700 whitespace-pre-line">
                      {review.review_text || '내용 없음'}
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="bg-gray-50 p-6 rounded text-center">
                <p className="text-gray-500 mb-4">아직 리뷰가 없습니다.</p>
                <p className="text-sm text-gray-400">
                  첫 번째 리뷰를 작성해보세요!
                </p>
              </div>
            )}
          </div>
        </div>
        
        {/* 삭제 확인 모달 */}
        {showDeleteConfirm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full">
              <h3 className="text-xl font-bold text-gray-900 mb-4">제품 삭제 확인</h3>
              <p className="text-gray-700 mb-6">
                <strong>{product.product_name}</strong> 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
              </p>
              <div className="flex justify-end space-x-4">
                <button
                  onClick={() => setShowDeleteConfirm(false)}
                  className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 hover:bg-gray-50 transition-colors"
                  disabled={deleteLoading}
                >
                  취소
                </button>
                <button
                  onClick={handleDeleteProduct}
                  className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors"
                  disabled={deleteLoading}
                >
                  {deleteLoading ? '삭제 중...' : '삭제'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 