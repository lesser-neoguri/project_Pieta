'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import MainLayout from '@/components/layout/MainLayout';

type CartItem = {
  id: string;
  quantity: number;
  product: {
    id: string;
    product_name: string;
    product_description: string;
    product_image_url: string | null;
    price: number;
    stock: number;
    is_available: boolean;
    store: {
      id: string;
      store_name: string;
    }
  };
  selected: boolean;
};

export default function CartPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [cartItems, setCartItems] = useState<CartItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [totalPrice, setTotalPrice] = useState(0);
  const [selectedPrice, setSelectedPrice] = useState(0);
  const [allSelected, setAllSelected] = useState(true);
  const [showGiftMessage, setShowGiftMessage] = useState(false);

  useEffect(() => {
    // 로그인 확인
    if (!user) {
      router.push('/login');
      return;
    }

    const fetchCart = async () => {
      try {
        setLoading(true);
        setError(null);

        // 사용자의 장바구니 가져오기 (cart_items 테이블)
        const { data: cartData, error: cartError } = await supabase
          .from('cart_items')
          .select(`
            id,
            product_id,
            quantity,
            product:product_id (
              id,
              product_name,
              product_description,
              product_image_url,
              price,
              stock,
              is_available,
              store_id,
              store:store_id (
                id,
                store_name
              )
            )
          `)
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });

        if (cartError) {
          throw cartError;
        }

        // 응답 데이터 가공
        const transformedItems = cartData.map((item: any) => ({
          id: item.id,
          quantity: item.quantity,
          product: item.product,
          selected: true
        }));

        // 재고보다 많은 수량은 자동으로 조정
        const adjustedItems = transformedItems.map((item: CartItem) => {
          if (item.quantity > item.product.stock) {
            return {
              ...item,
              quantity: item.product.stock
            };
          }
          return item;
        });

        setCartItems(adjustedItems);
        
        // 총 금액 계산
        calculateTotal(adjustedItems);
        calculateSelectedTotal(adjustedItems);
      } catch (error: any) {
        console.error('장바구니를 불러오는 중 오류가 발생했습니다:', error);
        setError('장바구니를 불러오는 중 오류가 발생했습니다.');
      } finally {
        setLoading(false);
      }
    };

    fetchCart();
  }, [user, router]);

  // 총 금액 계산 함수
  const calculateTotal = (items: CartItem[]) => {
    const total = items.reduce((sum, item) => {
      if (item.product.is_available) {
        return sum + (item.product.price * item.quantity);
      }
      return sum;
    }, 0);
    setTotalPrice(total);
  };

  // 선택된 상품 금액 계산 함수
  const calculateSelectedTotal = (items: CartItem[]) => {
    const selectedTotal = items.reduce((sum, item) => {
      if (item.product.is_available && item.selected) {
        return sum + (item.product.price * item.quantity);
      }
      return sum;
    }, 0);
    setSelectedPrice(selectedTotal);
  };

  // 수량 변경 핸들러
  const handleQuantityChange = async (itemId: string, newQuantity: number) => {
    try {
      // 음수 방지
      if (newQuantity < 1) {
        newQuantity = 1;
      }

      // 재고보다 많이 설정 방지
      const item = cartItems.find(item => item.id === itemId);
      if (item && newQuantity > item.product.stock) {
        newQuantity = item.product.stock;
      }

      // DB 업데이트
      const { error } = await supabase
        .from('cart_items')
        .update({ quantity: newQuantity })
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      // 상태 업데이트
      const updatedItems = cartItems.map(item => {
        if (item.id === itemId) {
          return {
            ...item,
            quantity: newQuantity
          };
        }
        return item;
      });

      setCartItems(updatedItems);
      calculateTotal(updatedItems);
      calculateSelectedTotal(updatedItems);
    } catch (error: any) {
      console.error('수량 변경 중 오류가 발생했습니다:', error);
      alert('수량 변경 중 오류가 발생했습니다.');
    }
  };

  // 아이템 제거 핸들러
  const handleRemoveItem = async (itemId: string) => {
    try {
      // 확인 대화상자
      if (!confirm('정말 이 상품을 장바구니에서 삭제하시겠습니까?')) {
        return;
      }
      
      // DB에서 항목 삭제
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('id', itemId)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      // UI 업데이트
      const updatedItems = cartItems.filter(item => item.id !== itemId);
      setCartItems(updatedItems);
      calculateTotal(updatedItems);
      calculateSelectedTotal(updatedItems);
      
      // 전체 선택 상태 업데이트
      updateAllSelectedState(updatedItems);
    } catch (error: any) {
      console.error('항목 삭제 중 오류가 발생했습니다:', error);
      alert('항목 삭제 중 오류가 발생했습니다.');
    }
  };

  // 전체 삭제 핸들러
  const handleClearCart = async () => {
    try {
      if (cartItems.length === 0) return;
      
      // 확인 대화상자
      if (!confirm('장바구니의 모든 상품을 삭제하시겠습니까?')) {
        return;
      }
      
      // DB에서 사용자의 모든 장바구니 항목 삭제
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      // UI 업데이트
      setCartItems([]);
      setTotalPrice(0);
      setSelectedPrice(0);
      setAllSelected(true);
    } catch (error: any) {
      console.error('장바구니 비우기 중 오류가 발생했습니다:', error);
      alert('장바구니 비우기 중 오류가 발생했습니다.');
    }
  };

  // 항목 선택 상태 변경 핸들러
  const handleItemSelection = (itemId: string, selected: boolean) => {
    const updatedItems = cartItems.map(item => {
      if (item.id === itemId) {
        return { ...item, selected };
      }
      return item;
    });
    
    setCartItems(updatedItems);
    calculateSelectedTotal(updatedItems);
    updateAllSelectedState(updatedItems);
  };

  // 전체 선택 상태 업데이트
  const updateAllSelectedState = (items: CartItem[]) => {
    const availableItems = items.filter(item => item.product.is_available);
    const allItemsSelected = availableItems.length > 0 && availableItems.every(item => item.selected);
    setAllSelected(allItemsSelected);
  };

  // 전체 선택/해제 핸들러
  const handleSelectAll = (selected: boolean) => {
    const updatedItems = cartItems.map(item => {
      // 품절 상품은 선택 상태를 변경하지 않음
      if (!item.product.is_available) {
        return item;
      }
      return { ...item, selected };
    });
    
    setCartItems(updatedItems);
    calculateSelectedTotal(updatedItems);
    setAllSelected(selected);
  };

  // 선택 항목만 삭제 핸들러
  const handleRemoveSelected = async () => {
    try {
      const selectedItems = cartItems.filter(item => item.selected);
      
      if (selectedItems.length === 0) {
        alert('선택된 상품이 없습니다.');
        return;
      }
      
      // 확인 대화상자
      if (!confirm('선택한 상품을 장바구니에서 삭제하시겠습니까?')) {
        return;
      }
      
      // 선택된 항목의 ID 목록
      const selectedIds = selectedItems.map(item => item.id);
      
      // DB에서 선택된 항목 삭제
      const { error } = await supabase
        .from('cart_items')
        .delete()
        .in('id', selectedIds)
        .eq('user_id', user?.id);

      if (error) {
        throw error;
      }

      // UI 업데이트
      const remainingItems = cartItems.filter(item => !item.selected);
      setCartItems(remainingItems);
      calculateTotal(remainingItems);
      calculateSelectedTotal(remainingItems);
      updateAllSelectedState(remainingItems);
    } catch (error: any) {
      console.error('선택된 항목 삭제 중 오류가 발생했습니다:', error);
      alert('선택된 항목 삭제 중 오류가 발생했습니다.');
    }
  };

  // 주문 처리 핸들러 (실제로는 결제 페이지로 이동)
  const handleCheckout = () => {
    const selectedItems = cartItems.filter(item => item.selected && item.product.is_available);
    
    if (selectedItems.length === 0) {
      alert('선택된 유효한 상품이 없습니다.');
      return;
    }
    
    // 선택된 상품만 결제 페이지로 전달
    const selectedItemIds = selectedItems.map(item => item.id);
    // URL 매개변수로 선택된 항목 ID를 전달
    router.push(`/checkout?items=${selectedItemIds.join(',')}`);
  };

  return (
    <MainLayout showNav={true} showLogo={true} centered={false}>
      <div className="flex flex-col min-h-screen">
        {/* 상단 타이틀 */}
        <div className="py-8 text-center border-b border-gray-200">
          <h1 className="text-2xl font-light uppercase tracking-[0.3em]">쇼핑백</h1>
          <p className="text-sm text-gray-500 mt-1">{cartItems.length}개 제품</p>
        </div>
        
        {loading ? (
          <div className="flex justify-center items-center py-24">
            <div className="animate-spin h-8 w-8 border-t-2 border-b-2 border-gray-900"></div>
          </div>
        ) : error ? (
          <div className="bg-gray-50 text-red-700 p-8 text-center">
            {error}
          </div>
        ) : cartItems.length === 0 ? (
          <div className="text-center py-16 sm:py-24">
            <p className="text-gray-500 mb-8">쇼핑백이 비어있습니다.</p>
            <Link 
              href="/products" 
              className="inline-block bg-black text-white px-10 py-4 text-sm uppercase tracking-[0.2em] hover:bg-gray-900 transition-colors"
            >
              쇼핑하러 가기
            </Link>
          </div>
        ) : (
          <div className="flex-1 flex flex-col lg:flex-row">
            {/* 왼쪽 컬럼: 상품 목록 */}
            <div className="lg:w-7/12 border-r border-gray-200 min-h-screen">
              <div className="p-8">
                <div className="flex items-center justify-between pb-5 mb-6 border-b border-gray-200">
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      checked={allSelected}
                      onChange={(e) => handleSelectAll(e.target.checked)}
                      className="h-4 w-4 text-black focus:ring-black border-gray-300"
                    />
                    <span className="ml-3 text-sm uppercase tracking-wider font-light">전체선택</span>
                  </div>
                  <div className="flex space-x-6">
                    <button
                      onClick={handleRemoveSelected}
                      className="text-xs uppercase tracking-wider hover:text-gray-500 font-light"
                    >
                      선택 삭제
                    </button>
                    <button
                      onClick={handleClearCart}
                      className="text-xs uppercase tracking-wider hover:text-gray-500 font-light"
                    >
                      전체 삭제
                    </button>
                  </div>
                </div>
                
                <div className="space-y-10">
                  {cartItems.map((item) => (
                    <div 
                      key={item.id} 
                      className={`pb-10 border-b border-gray-100 ${!item.product.is_available ? 'opacity-60' : ''}`}
                    >
                      <div className="flex">
                        <div className="pr-5 pt-1">
                          <input
                            type="checkbox"
                            checked={item.selected}
                            onChange={(e) => handleItemSelection(item.id, e.target.checked)}
                            disabled={!item.product.is_available}
                            className="h-4 w-4 text-black focus:ring-black border-gray-300 disabled:opacity-50"
                          />
                        </div>
                        
                        <div className="flex flex-1">
                          <div className="h-28 w-28 flex-shrink-0 overflow-hidden bg-gray-50">
                            {item.product.product_image_url ? (
                              <img
                                src={item.product.product_image_url}
                                alt={item.product.product_name}
                                className="h-full w-full object-cover object-center"
                              />
                            ) : (
                              <div className="h-full w-full flex items-center justify-center text-gray-400 text-xs">
                                이미지 없음
                              </div>
                            )}
                          </div>
                          
                          <div className="ml-6 flex-1">
                            <div className="flex justify-between">
                              <div>
                                <Link href={`/store/${item.product.store.id}`} className="text-xs text-gray-500 hover:text-black transition-colors mb-1 block">
                                  {item.product.store.store_name}
                                </Link>
                                <Link href={`/store/${item.product.store.id}/product/${item.product.id}`} className="text-sm font-medium mb-1 block hover:text-gray-600">
                                  {item.product.product_name}
                                </Link>
                                {!item.product.is_available && (
                                  <span className="inline-flex items-center mt-1 px-2 py-0.5 text-xs bg-gray-100 text-gray-800">
                                    품절
                                  </span>
                                )}
                              </div>
                              <button
                                onClick={() => handleRemoveItem(item.id)}
                                className="text-gray-400 hover:text-gray-600 h-5 w-5 flex items-center justify-center"
                                aria-label="삭제"
                              >
                                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M6 18L18 6M6 6l12 12" />
                                </svg>
                              </button>
                            </div>
                            
                            <div className="mt-6 flex justify-between items-center">
                              <div className="flex items-center border border-gray-200">
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity - 1)}
                                  disabled={!item.product.is_available || item.quantity <= 1}
                                  className="w-7 h-7 flex items-center justify-center text-gray-500 disabled:opacity-50"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  max={item.product.stock}
                                  value={item.quantity}
                                  onChange={(e) => handleQuantityChange(item.id, parseInt(e.target.value) || 1)}
                                  disabled={!item.product.is_available}
                                  className="w-10 border-x border-gray-200 text-center h-7 text-sm disabled:opacity-50"
                                />
                                <button
                                  onClick={() => handleQuantityChange(item.id, item.quantity + 1)}
                                  disabled={!item.product.is_available || item.quantity >= item.product.stock}
                                  className="w-7 h-7 flex items-center justify-center text-gray-500 disabled:opacity-50"
                                >
                                  +
                                </button>
                              </div>
                              
                              <div className="text-right">
                                <div className="text-sm font-medium">
                                  ₩{(item.product.price * item.quantity).toLocaleString()}
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                
                <div className="mt-8 flex justify-end">
                  <Link
                    href="/products"
                    className="text-sm text-gray-500 hover:text-black uppercase tracking-wider font-light"
                  >
                    쇼핑 계속하기
                  </Link>
                </div>

                {/* 패키지 & 선물 옵션 */}
                <div className="mt-12 border-t border-gray-200 pt-12">
                  <h2 className="text-lg uppercase tracking-[0.2em] mb-6 font-light">패키지 & 선물</h2>
                  
                  {/* 패키지 옵션 */}
                  <div className="border border-gray-200 mb-6">
                    <div className="p-6">
                      <div className="space-y-6">
                        {/* 시그니처 패키지 */}
                        <div className="flex items-start space-x-4">
                          <input
                            type="radio"
                            id="signature-package"
                            name="package-type"
                            className="mt-1 h-4 w-4 text-black focus:ring-black border-gray-300"
                            defaultChecked
                          />
                          <div>
                            <label htmlFor="signature-package" className="text-sm font-medium">PIETA 시그니처 패키지</label>
                            <p className="text-xs text-gray-500 mt-1">
                              모든 주문은 작업한 장인 센터에 인증을 거쳐 90% 이상의 재활용 소재로 제작된 
                              시그니처 박스로 제공됩니다.
                            </p>
                          </div>
                        </div>
                        
                        {/* 에코 패키지 */}
                        <div className="flex items-start space-x-4">
                          <input
                            type="radio"
                            id="eco-package"
                            name="package-type"
                            className="mt-1 h-4 w-4 text-black focus:ring-black border-gray-300"
                          />
                          <div>
                            <label htmlFor="eco-package" className="text-sm font-medium">PIETA 에코 패키지</label>
                            <p className="text-xs text-gray-500 mt-1">
                              환경을 생각하는 고객님을 위한 미니멀 포장으로 제공됩니다.
                            </p>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 쇼핑백 추가 옵션 */}
                  <div className="border border-gray-200 mb-6">
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          id="add-shopping-bag"
                          className="mt-1 h-4 w-4 text-black focus:ring-black border-gray-300"
                          defaultChecked
                        />
                        <div>
                          <label htmlFor="add-shopping-bag" className="text-sm font-medium">PIETA 쇼핑백 추가</label>
                          <p className="text-xs text-gray-500 mt-1">
                            구매하신 주문에 쇼핑백이 추가됩니다.
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>
                  
                  {/* 기프트 옵션 */}
                  <div className="border border-gray-200 mb-6">
                    <div className="p-6">
                      <div className="flex items-start space-x-4">
                        <input
                          type="checkbox"
                          id="gift-option"
                          className="mt-1 h-4 w-4 text-black focus:ring-black border-gray-300"
                          onChange={(e) => setShowGiftMessage(e.target.checked)}
                        />
                        <div className="w-full">
                          <label htmlFor="gift-option" className="text-sm font-medium">기프트 옵션</label>
                          <p className="text-xs text-gray-500 mt-1">
                            기프트 메시지와 함께 특별한 포장을 더해 보세요.
                          </p>
                          
                          {/* 기프트 메시지 입력란 - 체크박스 선택시에만 보이도록 */}
                          {showGiftMessage && (
                            <div className="mt-4">
                              <textarea
                                placeholder="기프트 메시지를 입력하세요 (선택사항)"
                                className="w-full p-3 border border-gray-200 text-sm focus:ring-black focus:border-black"
                                rows={3}
                              ></textarea>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
            
            {/* 오른쪽 컬럼: 요약 및 옵션 */}
            <div className="lg:w-5/12">
              <div className="p-8 sticky top-0">
                {/* 주문 요약 */}
                <div className="bg-gray-50 p-8 mb-8">
                  <h2 className="text-lg uppercase tracking-[0.2em] mb-8 pb-6 border-b border-gray-200 font-light">합계</h2>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-light">소계</span>
                      <span>₩{selectedPrice.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-gray-500 font-light">세금</span>
                      <span>₩{Math.round(selectedPrice * 0.1).toLocaleString()}</span>
                    </div>
                  </div>
                  
                  <div className="pt-6 border-t border-gray-200">
                    <div className="flex justify-between mb-8">
                      <span className="text-lg uppercase tracking-[0.2em] font-light">합계</span>
                      <span className="text-lg font-medium">₩{Math.round(selectedPrice * 1.1).toLocaleString()}</span>
                    </div>
                    
                    <button
                      onClick={handleCheckout}
                      disabled={cartItems.filter(item => item.selected && item.product.is_available).length === 0}
                      className="w-full bg-black py-4 px-6 text-white uppercase tracking-[0.3em] text-sm hover:bg-gray-900 transition-colors disabled:opacity-50 disabled:bg-gray-400"
                    >
                      계속 결제하기
                    </button>
                    
                    {/* 품절 상품 알림 */}
                    {cartItems.some(item => item.selected && !item.product.is_available) && (
                      <div className="mt-4 text-xs text-red-600 text-center">
                        품절된 상품은 결제할 수 없습니다.
                      </div>
                    )}
                    
                    {/* 선택된 상품 없음 알림 */}
                    {cartItems.filter(item => item.selected).length === 0 && (
                      <div className="mt-4 text-xs text-gray-500 text-center">
                        구매할 상품을 선택해주세요.
                      </div>
                    )}
                  </div>
                </div>
                
                {/* 도움말 및 서비스 */}
                <div className="border border-gray-200 mb-12">
                  <h3 className="uppercase tracking-wider text-sm font-light p-6 border-b border-gray-200">
                    도움말 및 서비스
                  </h3>
                  
                  <div>
                    {/* 안전한 결제 */}
                    <div className="border-b border-gray-200">
                      <button className="w-full flex justify-between items-center text-left focus:outline-none p-6">
                        <span className="text-sm font-medium">100% 안전한 보장하는 결제 방식</span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="px-6 pb-6">
                        <p className="text-xs text-gray-500">
                          귀하의 신용카드 정보는 항상이 안전하게 처리됩니다. 모든 거래 정보는 SSL(Secure Sockets Layer)로 암호화되어 보호됩니다.
                        </p>
                      </div>
                    </div>
                    
                    {/* 무료 일반 배송 */}
                    <div className="border-b border-gray-200">
                      <button className="w-full flex justify-between items-center text-left focus:outline-none p-6">
                        <span className="text-sm font-medium">무료 일반 배송</span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="px-6 pb-6">
                        <p className="text-xs text-gray-500">
                          모든 주문은 무료 배송으로 제공됩니다. 주문 후 영업일 기준 2-3일 이내에 배송됩니다.
                          배송 관련 문의는 고객센터(1234-5678)로 연락해주세요.
                        </p>
                      </div>
                    </div>
                    
                    {/* 반품 관련 배송 정책 */}
                    <div>
                      <button className="w-full flex justify-between items-center text-left focus:outline-none p-6">
                        <span className="text-sm font-medium">반품 관련 배송 정책</span>
                        <svg className="h-4 w-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                      <div className="px-6 pb-6">
                        <p className="text-xs text-gray-500">
                          제품 수령 후 7일 이내에 교환 및 반품이 가능합니다. 단, 고객의 단순 변심에 의한 교환/반품의 경우 
                          배송비용은 고객 부담입니다. 제품 하자의 경우 무료 반품 서비스가 제공됩니다.
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </MainLayout>
  );
} 