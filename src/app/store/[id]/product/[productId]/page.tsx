'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import DOMPurify from 'dompurify';
import { X } from 'lucide-react';

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
        setSelectedImage(productData.product_image_url);

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
    <div className="min-h-screen bg-white">
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
        `}
      </style>
      
      {/* 네비게이션 */}
      <div className="bg-white border-b">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center justify-between h-16">
            <div className="flex items-center space-x-2 text-sm text-gray-500">
              <Link href="/" className="hover:text-gray-900">홈</Link>
              <span>/</span>
              <Link href="/stores" className="hover:text-gray-900">스토어</Link>
              <span>/</span>
              <Link href={`/store/${storeId}`} className="hover:text-gray-900">{store?.store_name || '상점'}</Link>
              <span>/</span>
              <span className="text-gray-900">{product?.product_name || '제품'}</span>
            </div>
            {user && isOwner && (
              <div className="flex items-center space-x-4">
                <Link
                  href={`/store/${storeId}/product/edit/${productId}`}
                  className="text-sm text-gray-600 hover:text-gray-900 font-pretendard"
                >
                  수정
                </Link>
                <button
                  onClick={() => setShowDeleteConfirm(true)}
                  className="text-sm text-gray-600 hover:text-gray-900 font-pretendard"
                >
                  삭제
                </button>
              </div>
            )}
          </nav>
        </div>
      </div>

      {/* 메인 컨텐츠 */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {!loading && product && store && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16">
            {/* 제품 이미지 섹션 */}
            <div>
              {/* 메인 이미지 */}
              <div className="aspect-square bg-gray-50 rounded-lg overflow-hidden relative group mb-4">
                {selectedImage ? (
                  <>
                    <img
                      src={`${selectedImage}?quality=60&width=600`}
                      alt={product.product_name}
                      className="w-full h-full object-contain"
                    />
                    <button
                      onClick={() => setShowImageModal(true)}
                      className="absolute inset-0 flex items-center justify-center bg-black/0 group-hover:bg-black/30 transition-all opacity-0 group-hover:opacity-100"
                    >
                      <span className="px-4 py-2 bg-white text-gray-900 rounded-lg font-pretendard text-sm">
                        원본 보기
                      </span>
                    </button>
                  </>
                ) : (
                  <div className="w-full h-full flex items-center justify-center">
                    <span className="text-gray-300 text-7xl font-serif">{product.product_name.charAt(0)}</span>
                  </div>
                )}
                {!product.is_available && (
                  <div className="absolute top-4 right-4 px-4 py-2 text-sm font-medium text-white bg-black/80 backdrop-blur-sm rounded-full">
                    품절
                  </div>
                )}
              </div>
              
              {/* 이미지 갤러리 */}
              {(productImages.length > 0 || product.product_image_url) && (
                <div className="grid grid-cols-5 gap-2 mt-4">
                  {/* 메인 제품 이미지를 첫 번째로 추가 */}
                  {product.product_image_url && (
                    <div 
                      className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${selectedImage === product.product_image_url ? 'border-black' : 'border-transparent'}`}
                      onClick={() => handleImageSelect(product.product_image_url!)}
                    >
                      <img 
                        src={product.product_image_url} 
                        alt={product.product_name}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  )}
                  
                  {/* 추가 이미지들 */}
                  {productImages.map(image => (
                    <div 
                      key={image.id}
                      className={`aspect-square rounded-md overflow-hidden cursor-pointer border-2 ${selectedImage === image.url ? 'border-black' : 'border-transparent'}`}
                      onClick={() => handleImageSelect(image.url)}
                    >
                      <img 
                        src={image.url} 
                        alt={`${product.product_name} 추가 이미지`}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* 제품 정보 섹션 */}
            <div>
              <div className="mb-8">
                <Link href={`/store/${storeId}`} className="group inline-flex items-center space-x-3 mb-6">
                  <div className="w-12 h-12 rounded-full bg-gray-100 overflow-hidden flex-shrink-0 border border-gray-100">
                    {store?.store_logo_url ? (
                      <img
                        src={store.store_logo_url}
                        alt={store.store_name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <span className="text-gray-400 text-base font-serif">
                          {store?.store_name?.charAt(0) || 'S'}
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex flex-col">
                    <span className="text-xs text-gray-500 mb-1">스토어</span>
                    <h2 className="text-base font-medium text-gray-900 group-hover:text-gray-600 transition-colors">
                      {store?.store_name || '상점명'}
                    </h2>
                  </div>
                </Link>

                <h1 className="text-3xl font-pretendard text-gray-900 mb-4">{product.product_name}</h1>
                <div className="flex items-center space-x-6 mb-6">
                  <div className="flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                    </svg>
                    <span className="ml-1 text-sm font-medium text-gray-600 font-pretendard">
                      {product.average_rating?.toFixed(1) || '0.0'}
                    </span>
                    <span className="ml-1 text-gray-400 text-sm font-pretendard">
                      ({reviews.length}개 리뷰)
                    </span>
                  </div>
                  <div className="text-sm text-gray-500 font-pretendard">
                    판매량: {product.total_sales || 0}개
                  </div>
                </div>
                
                <p className="text-3xl font-pretendard text-gray-900 mb-6">
                  {product.price.toLocaleString()}원
                </p>
                
                {/* 찜하기 및 장바구니 버튼 추가 */}
                <div className="flex items-center space-x-4 mb-6">
                  <button
                    onClick={toggleFavorite}
                    className={`flex items-center justify-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                      isFavorite 
                        ? 'bg-red-50 text-red-600 border border-red-200 hover:bg-red-100' 
                        : 'bg-gray-50 text-gray-700 border border-gray-200 hover:bg-gray-100'
                    }`}
                    aria-label={isFavorite ? '찜 목록에서 제거' : '찜 목록에 추가'}
                  >
                    <svg 
                      xmlns="http://www.w3.org/2000/svg" 
                      className={`h-5 w-5 mr-2 ${isFavorite ? 'text-red-500 fill-red-500' : 'text-gray-400'}`} 
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
                    {isFavorite ? '찜함' : '찜하기'}
                    {favoriteCount > 0 && (
                      <span className="ml-1 text-xs bg-gray-200 text-gray-800 rounded-full px-2 py-0.5">
                        {favoriteCount}
                      </span>
                    )}
                  </button>
                  
                  <button
                    onClick={handleAddToCart}
                    className="flex-1 bg-black text-white py-3 rounded-md text-sm font-medium hover:bg-gray-800 transition-colors flex items-center justify-center"
                    disabled={!product.is_available || product.stock <= 0}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {product.is_available && product.stock > 0 ? '장바구니에 추가' : '품절'}
                  </button>
                </div>
                
                <div className="mb-6">
                  <div className="prose prose-sm max-w-none font-pretendard">
                    <div 
                      dangerouslySetInnerHTML={{ 
                        __html: product.product_description ? DOMPurify.sanitize(product.product_description) : '' 
                      }}
                      className="rich-editor text-gray-600 leading-relaxed"
                    />
                  </div>
                </div>

                {/* 패키지 옵션 및 도움말 서비스 섹션 추가 */}
                <div className="mb-8 border-t border-gray-100 pt-8">
                  {/* 패키지 및 선물 옵션 */}
                  <div className="border-b border-gray-100 pb-4">
                    <div className="flex justify-between items-center py-4 cursor-pointer" 
                         onClick={() => {const elem = document.getElementById('package-options'); elem && elem.classList.toggle('hidden')}}>
                      <h3 className="text-sm uppercase tracking-widest">패키지 & 선물</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div id="package-options" className="hidden pb-4">
                      <div className="space-y-3">
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

                        <div className="pt-3 text-xs text-gray-500">
                          * 주문 확인 후 선물 포장 옵션 변경은 불가능합니다.
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 배송 정보 */}
                  <div className="border-b border-gray-100">
                    <div className="flex justify-between items-center py-4 cursor-pointer"
                         onClick={() => {const elem = document.getElementById('shipping-info'); elem && elem.classList.toggle('hidden')}}>
                      <h3 className="text-sm uppercase tracking-widest">무료 일반 배송</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div id="shipping-info" className="hidden pb-4">
                      <div className="space-y-3 text-sm text-gray-600">
                        <p>• 평일 오후 2시 이전 주문 시 당일 출고, 이후 주문은 익일 출고</p>
                        <p>• 주문 후 평균 2-3일 이내 수령 (토/일/공휴일 제외)</p>
                        <p>• 도서산간 지역은 추가 배송일 소요될 수 있음</p>
                        <p>• 결제 완료 후 배송 조회 가능</p>
                        <p>• 전국 무료 배송 (제주/도서산간 지역 동일)</p>
                        <div className="mt-4">
                          <h4 className="font-medium">프리미엄 배송 (선택 가능)</h4>
                          <p className="mt-1">• 당일 배송: 서울 지역 오전 11시 이전 주문 시 (+ ₩5,000)</p>
                          <p>• 퀵 배송: 서울/경기 일부 지역 (+ ₩10,000~)</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* 반품 및 교환 정책 */}
                  <div className="border-b border-gray-100">
                    <div className="flex justify-between items-center py-4 cursor-pointer"
                         onClick={() => {const elem = document.getElementById('return-policy'); elem && elem.classList.toggle('hidden')}}>
                      <h3 className="text-sm uppercase tracking-widest">반품 관련 배송 정책</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div id="return-policy" className="hidden pb-4">
                      <div className="space-y-3 text-sm text-gray-600">
                        <p>• 상품 수령 후 7일 이내 교환/반품 가능</p>
                        <p>• 고객 변심에 의한 교환/반품 시 왕복 배송비 고객 부담</p>
                        <p>• 상품 불량/오배송의 경우 전액 판매자 부담</p>
                        <p>• 일부 주문 제작 상품의 경우 교환/반품이 제한될 수 있음</p>
                        <p className="font-medium mt-2">반품 불가 상품</p>
                        <p>• 고객의 사용, 착용, 세탁 등으로 상품 가치가 훼손된 경우</p>
                        <p>• 밀봉 포장을 개봉하거나 포장이 훼손되어 상품가치가 상실된 경우</p>
                        <p>• 시간 경과에 따라 재판매가 어려운 상품의 경우</p>
                      </div>
                    </div>
                  </div>

                  {/* 결제 방식 */}
                  <div>
                    <div className="flex justify-between items-center py-4 cursor-pointer"
                         onClick={() => {const elem = document.getElementById('payment-methods'); elem && elem.classList.toggle('hidden')}}>
                      <h3 className="text-sm uppercase tracking-widest">결제 방식</h3>
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                    <div id="payment-methods" className="hidden pb-4">
                      <div className="space-y-3 text-sm text-gray-600">
                        <p>• 신용카드: 국내외 모든 신용/체크카드</p>
                        <p>• 간편결제: 카카오페이, 네이버페이, 토스, 페이코</p>
                        <p>• 계좌이체: 실시간 계좌이체</p>
                        <p>• 가상계좌: 무통장입금 (입금 확인 후 상품 출고)</p>
                        <p className="mt-3">* 모든 결제는 암호화된 보안 프로토콜을 통해 처리됩니다.</p>
                        <p>* 해외 카드 결제 시 별도의 수수료가 부과될 수 있습니다.</p>
                      </div>
                    </div>
                  </div>
                </div>

              </div>

              {/* 구매 옵션 */}
              <div className="mb-8">
                <div className="flex items-center space-x-4 mb-6">
                  <div className="flex items-center border border-gray-200">
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
                      className="w-16 text-center border-x border-gray-200 py-2 focus:outline-none"
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

                <div className="flex space-x-4">
                  <button
                    onClick={handleAddToCart}
                    disabled={!product.is_available}
                    className={`flex-1 px-8 py-4 text-sm uppercase tracking-widest font-medium ${
                      product.is_available
                        ? 'bg-black text-white hover:bg-gray-800'
                        : 'bg-gray-200 text-gray-500 cursor-not-allowed'
                    } transition-colors`}
                  >
                    장바구니에 추가
                  </button>
                  <button
                    onClick={() => {/* 구매하기 기능 */}}
                    disabled={!product.is_available}
                    className={`flex-1 px-8 py-4 text-sm uppercase tracking-widest font-medium border border-black ${
                      product.is_available
                        ? 'text-black hover:bg-gray-50'
                        : 'text-gray-500 border-gray-300 cursor-not-allowed'
                    } transition-colors`}
                  >
                    바로 구매
                  </button>
                </div>
              </div>

              {/* 공유 및 관심 */}
              <div className="flex items-center space-x-6 border-t border-gray-100 pt-6">
                <div className="flex items-center space-x-4">
                  <button className="text-gray-500 hover:text-black transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/>
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-black transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M12 2.163c3.204 0 3.584.012 4.85.07 3.252.148 4.771 1.691 4.919 4.919.058 1.265.069 1.645.069 4.849 0 3.259-.012 3.668-.069 4.948-.149 3.225-1.664 4.771-4.919 4.919-1.266.058-1.644.07-4.85.07-3.204 0-3.584-.012-4.849-.07-3.26-.149-4.771-1.699-4.919-4.92-.058-1.265-.07-1.644-.07-4.849 0-3.204.013-3.583.07-4.849.149-3.227 1.664-4.771 4.919-4.919 1.266-.057 1.645-.069 4.849-.069zm0-2.163c-3.259 0-3.667.014-4.947.072-4.358.2-6.78 2.618-6.98 6.98-.059 1.281-.073 1.689-.073 4.948 0 3.259.014 3.668.072 4.948.2 4.358 2.618 6.78 6.98 6.98 1.281.058 1.689.072 4.948.072 3.259 0 3.668-.014 4.948-.072 4.354-.2 6.782-2.618 6.979-6.98.059-1.28.073-1.689.073-4.948 0-3.259-.014-3.667-.072-4.947-.196-4.354-2.617-6.78-6.979-6.98-1.281-.059-1.69-.073-4.949-.073zm0 5.838c-3.403 0-6.162 2.759-6.162 6.162s2.759 6.163 6.162 6.163 6.162-2.759 6.162-6.163c0-3.403-2.759-6.162-6.162-6.162zm0 10.162c-2.209 0-4-1.79-4-4 0-2.209 1.791-4 4-4s4 1.791 4 4c0 2.21-1.791 4-4 4zm6.406-11.845c-.796 0-1.441.645-1.441 1.44s.645 1.44 1.441 1.44c.795 0 1.439-.645 1.439-1.44s-.644-1.44-1.439-1.44z"/>
                    </svg>
                  </button>
                  <button className="text-gray-500 hover:text-black transition-colors">
                    <svg className="w-5 h-5" fill="currentColor" viewBox="0 0 24 24">
                      <path d="M9 8h-3v4h3v12h5v-12h3.642l.358-4h-4v-1.667c0-.955.192-1.333 1.115-1.333h2.885v-5h-3.808c-3.596 0-5.192 1.583-5.192 4.615v3.385z"/>
                    </svg>
                  </button>
                </div>
                {user && (
                  <button
                    onClick={toggleFavorite}
                    className={`flex items-center space-x-2 ${
                      isFavorite ? 'text-red-500' : 'text-gray-500'
                    } hover:text-red-500 transition-colors`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill={isFavorite ? "currentColor" : "none"} viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                    <span className="text-sm">관심상품</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 이미지 상세보기 모달 */}
      {showImageModal && selectedImage && (
        <div className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-50 p-4">
          <div className="relative max-w-5xl w-full">
            <button
              className="absolute top-0 right-0 p-2 text-white hover:text-gray-300 z-10"
              onClick={() => setShowImageModal(false)}
            >
              <X className="w-8 h-8" />
            </button>
            <img
              src={selectedImage}
              alt={product?.product_name}
              className="w-full h-auto object-contain"
            />
          </div>
        </div>
      )}

      {/* 삭제 확인 모달 */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-8 max-w-md w-full">
            <h3 className="text-lg font-medium text-black mb-4">제품 삭제</h3>
            <p className="text-gray-600 mb-6 font-light">
              <strong>{product.product_name}</strong> 제품을 정말 삭제하시겠습니까? 이 작업은 되돌릴 수 없습니다.
            </p>
            
            <div className="flex justify-end space-x-3">
              <button
                onClick={() => setShowDeleteConfirm(false)}
                className="px-6 py-2.5 border border-gray-300 text-xs uppercase tracking-widest font-medium text-gray-700 hover:bg-gray-50 transition-colors"
              >
                취소
              </button>
              <button
                onClick={handleDeleteProduct}
                disabled={deleteLoading}
                className="px-6 py-2.5 bg-red-600 text-white hover:bg-red-700 transition-colors text-xs uppercase tracking-widest font-medium disabled:opacity-50"
              >
                {deleteLoading ? '삭제 중...' : '삭제'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
} 