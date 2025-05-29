'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import logger from '@/lib/logger';

type BusinessHours = {
  monday: { open: string; close: string; isOpen: boolean };
  tuesday: { open: string; close: string; isOpen: boolean };
  wednesday: { open: string; close: string; isOpen: boolean };
  thursday: { open: string; close: string; isOpen: boolean };
  friday: { open: string; close: string; isOpen: boolean };
  saturday: { open: string; close: string; isOpen: boolean };
  sunday: { open: string; close: string; isOpen: boolean };
};

type StoreData = {
  id?: string;
  vendor_id: string;
  store_name: string;
  store_description: string;
  store_logo_url?: string;
  store_banner_url?: string;
  store_phone: string;
  store_email: string;
  store_address: string;
  business_hours: BusinessHours;
  is_open: boolean;
};

const defaultBusinessHours: BusinessHours = {
  monday: { open: '09:00', close: '18:00', isOpen: true },
  tuesday: { open: '09:00', close: '18:00', isOpen: true },
  wednesday: { open: '09:00', close: '18:00', isOpen: true },
  thursday: { open: '09:00', close: '18:00', isOpen: true },
  friday: { open: '09:00', close: '18:00', isOpen: true },
  saturday: { open: '09:00', close: '18:00', isOpen: true },
  sunday: { open: '09:00', close: '18:00', isOpen: false },
};

export default function StoreForm({ storeId }: { storeId?: string }) {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [vendorData, setVendorData] = useState<any>(null);
  const [existingStore, setExistingStore] = useState<StoreData | null>(null);
  
  const [storeName, setStoreName] = useState('');
  const [storeDescription, setStoreDescription] = useState('');
  const [storeLogoUrl, setStoreLogoUrl] = useState('');
  const [storeBannerUrl, setStoreBannerUrl] = useState('');
  const [storePhone, setStorePhone] = useState('');
  const [storeEmail, setStoreEmail] = useState('');
  const [storeAddress, setStoreAddress] = useState('');
  const [businessHours, setBusinessHours] = useState<BusinessHours>(defaultBusinessHours);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    const fetchVendorData = async () => {
      if (!user) return;

      try {
        // 사용자가 입점회원인지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        if (userData.user_type !== 'vendor') {
          setMessage({
            text: '입점회원만 상점을 개설할 수 있습니다.',
            type: 'error'
          });
          return;
        }

        // 입점회원 정보 가져오기
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (vendorError) throw vendorError;

        setVendorData(vendorData);

        // 입점회원 승인 상태 확인
        if (vendorData.status !== 'approved') {
          setMessage({
            text: '입점 신청이 승인된 회원만 상점을 개설할 수 있습니다.',
            type: 'error'
          });
          return;
        }

        // 기존 상점 정보 가져오기 (수정 모드인 경우)
        if (storeId) {
          const { data: storeData, error: storeError } = await supabase
            .from('stores')
            .select('*')
            .eq('id', storeId)
            .single();

          if (storeError) {
            if (storeError.code === 'PGRST116') {
              setMessage({
                text: '존재하지 않는 상점입니다.',
                type: 'error'
              });
            } else {
              throw storeError;
            }
          } else if (storeData.vendor_id !== user.id) {
            setMessage({
              text: '해당 상점을 수정할 권한이 없습니다.',
              type: 'error'
            });
          } else {
            setExistingStore(storeData);
            setStoreName(storeData.store_name);
            setStoreDescription(storeData.store_description || '');
            setStoreLogoUrl(storeData.store_logo_url || '');
            setStoreBannerUrl(storeData.store_banner_url || '');
            setStorePhone(storeData.store_phone || '');
            setStoreEmail(storeData.store_email || '');
            setStoreAddress(storeData.store_address);
            setBusinessHours(storeData.business_hours || defaultBusinessHours);
            setIsOpen(storeData.is_open);
          }
        } else {
          // 새 상점 생성 시 기본값 설정
          setStorePhone(vendorData.phone || '');
          setStoreEmail(userData.email || '');
          setStoreAddress(vendorData.address || '');
        }
      } catch (error: any) {
        logger.error('데이터 로딩 중 오류 발생:', error);
        setMessage({
          text: '데이터를 불러오는 중 오류가 발생했습니다.',
          type: 'error'
        });
      }
    };

    fetchVendorData();
  }, [user, storeId]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!user || !vendorData) {
      setMessage({
        text: '로그인이 필요합니다.',
        type: 'error'
      });
      return;
    }

    setLoading(true);
    setMessage(null);

    try {
      const storeData: Omit<StoreData, 'id'> = {
        vendor_id: user.id,
        store_name: storeName,
        store_description: storeDescription,
        store_logo_url: storeLogoUrl || undefined,
        store_banner_url: storeBannerUrl || undefined,
        store_phone: storePhone,
        store_email: storeEmail,
        store_address: storeAddress,
        business_hours: businessHours,
        is_open: isOpen
      };

      let result;
      
      if (existingStore) {
        // 기존 상점 정보 업데이트
        result = await supabase
          .from('stores')
          .update(storeData)
          .eq('id', existingStore.id);
      } else {
        // 새 상점 생성
        result = await supabase
          .from('stores')
          .insert([storeData]);
      }

      if (result.error) {
        throw result.error;
      }

      setMessage({
        text: existingStore ? '상점 정보가 업데이트되었습니다.' : '상점이 성공적으로 개설되었습니다.',
        type: 'success'
      });

      // 성공 후 상점 관리 페이지로 이동
      setTimeout(() => {
        router.push('/vendor/store');
      }, 2000);
    } catch (error: any) {
      logger.error('상점 저장 중 오류 발생:', error);
      setMessage({
        text: error.message || '상점 정보 저장 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  const updateBusinessHour = (
    day: keyof BusinessHours,
    field: 'open' | 'close' | 'isOpen',
    value: string | boolean
  ) => {
    setBusinessHours((prev) => ({
      ...prev,
      [day]: {
        ...prev[day],
        [field]: value
      }
    }));
  };

  if (message && (message.text === '입점회원만 상점을 개설할 수 있습니다.' || 
                 message.text === '입점 신청이 승인된 회원만 상점을 개설할 수 있습니다.' ||
                 message.text === '존재하지 않는 상점입니다.' ||
                 message.text === '해당 상점을 수정할 권한이 없습니다.')) {
    return (
      <div className="bg-white">
        <div className="text-center space-y-8">
          <div className={`inline-block px-8 py-4 border ${
            message.type === 'success' 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            <p className="font-light text-sm tracking-wide">
              {message.text}
            </p>
          </div>
          <button
            onClick={() => router.push('/')}
            className="px-8 py-3 border border-gray-900 text-gray-900 bg-white hover:bg-gray-900 hover:text-white transition-all duration-300 text-sm tracking-wider uppercase font-light"
          >
            홈으로 돌아가기
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white">
      {/* 타이틀 섹션 */}
      <div className="text-center mb-16">
        <h2 className="text-2xl font-light text-gray-900 tracking-wider uppercase mb-4">
          {existingStore ? 'Edit Store Information' : 'Create New Store'}
        </h2>
        <div className="w-16 h-px bg-gray-900 mx-auto"></div>
      </div>
      
      {message && (
        <div className="text-center mb-12">
          <div className={`inline-block px-8 py-4 border ${
            message.type === 'success' 
              ? 'border-green-200 bg-green-50 text-green-700' 
              : 'border-red-200 bg-red-50 text-red-700'
          }`}>
            <p className="font-light text-sm tracking-wide">
              {message.text}
            </p>
          </div>
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-12">
        {/* 기본 정보 섹션 */}
        <div className="space-y-8">
          <h3 className="text-lg font-light text-gray-900 tracking-wide uppercase border-b border-gray-200 pb-4">
            Basic Information
          </h3>
          
          <div className="space-y-8">
            <div>
              <label htmlFor="storeName" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
                상점명 <span className="text-red-400">*</span>
              </label>
              <input
                id="storeName"
                type="text"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                required
                className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300"
                placeholder="Enter store name"
              />
            </div>
            
            <div>
              <label htmlFor="storeDescription" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
                상점 설명
              </label>
              <textarea
                id="storeDescription"
                value={storeDescription}
                onChange={(e) => setStoreDescription(e.target.value)}
                rows={4}
                className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300 resize-none"
                placeholder="Enter store description"
              />
            </div>
          </div>
        </div>

        {/* 이미지 섹션 */}
        <div className="space-y-8">
          <h3 className="text-lg font-light text-gray-900 tracking-wide uppercase border-b border-gray-200 pb-4">
            Brand Assets
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <label htmlFor="storeLogoUrl" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
                로고 URL
              </label>
              <input
                id="storeLogoUrl"
                type="url"
                value={storeLogoUrl}
                onChange={(e) => setStoreLogoUrl(e.target.value)}
                className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300"
                placeholder="Enter logo image URL"
              />
            </div>
            
            <div>
              <label htmlFor="storeBannerUrl" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
                배너 URL
              </label>
              <input
                id="storeBannerUrl"
                type="url"
                value={storeBannerUrl}
                onChange={(e) => setStoreBannerUrl(e.target.value)}
                className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300"
                placeholder="Enter banner image URL"
              />
            </div>
          </div>
        </div>

        {/* 연락처 정보 섹션 */}
        <div className="space-y-8">
          <h3 className="text-lg font-light text-gray-900 tracking-wide uppercase border-b border-gray-200 pb-4">
            Contact Information
          </h3>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
            <div>
              <label htmlFor="storePhone" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
                전화번호 <span className="text-red-400">*</span>
              </label>
              <input
                id="storePhone"
                type="tel"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                required
                className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300"
                placeholder="Enter phone number"
              />
            </div>
            
            <div>
              <label htmlFor="storeEmail" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
                이메일 <span className="text-red-400">*</span>
              </label>
              <input
                id="storeEmail"
                type="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                required
                className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300"
                placeholder="Enter email address"
              />
            </div>
          </div>
        </div>

        {/* 주소 섹션 */}
        <div className="space-y-8">
          <h3 className="text-lg font-light text-gray-900 tracking-wide uppercase border-b border-gray-200 pb-4">
            Location
          </h3>
          
          <div>
            <label htmlFor="storeAddress" className="block text-sm font-light text-gray-700 mb-3 tracking-wide uppercase">
              주소 <span className="text-red-400">*</span>
            </label>
            <input
              id="storeAddress"
              type="text"
              value={storeAddress}
              onChange={(e) => setStoreAddress(e.target.value)}
              required
              className="w-full px-0 py-4 border-0 border-b border-gray-200 focus:border-gray-900 focus:outline-none bg-transparent text-gray-900 placeholder-gray-400 transition-colors duration-300"
              placeholder="Enter store address"
            />
          </div>
        </div>

        {/* 영업 시간 섹션 */}
        <div className="space-y-8">
          <h3 className="text-lg font-light text-gray-900 tracking-wide uppercase border-b border-gray-200 pb-4">
            Business Hours
          </h3>
          
          <div className="space-y-6">
            {Object.entries(businessHours).map(([day, hours]) => (
              <div key={day} className="flex items-center justify-between py-4 border-b border-gray-100 last:border-b-0">
                <div className="flex items-center space-x-4 min-w-0 flex-1">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={(hours as any).isOpen}
                      onChange={(e) => updateBusinessHour(day as keyof BusinessHours, 'isOpen', e.target.checked)}
                      className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-1"
                    />
                    <span className="ml-3 text-sm font-light text-gray-900 tracking-wide uppercase min-w-0 w-20">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-4">
                  <input
                    type="time"
                    value={(hours as any).open}
                    onChange={(e) => updateBusinessHour(day as keyof BusinessHours, 'open', e.target.value)}
                    disabled={!(hours as any).isOpen}
                    className="px-3 py-2 border border-gray-200 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 transition-colors duration-300"
                  />
                  <span className="text-gray-400 font-light">~</span>
                  <input
                    type="time"
                    value={(hours as any).close}
                    onChange={(e) => updateBusinessHour(day as keyof BusinessHours, 'close', e.target.value)}
                    disabled={!(hours as any).isOpen}
                    className="px-3 py-2 border border-gray-200 text-sm focus:border-gray-900 focus:outline-none disabled:bg-gray-50 disabled:text-gray-400 transition-colors duration-300"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 영업 상태 섹션 */}
        <div className="space-y-8">
          <h3 className="text-lg font-light text-gray-900 tracking-wide uppercase border-b border-gray-200 pb-4">
            Store Status
          </h3>
          
          <div>
            <label className="inline-flex items-center">
              <input
                type="checkbox"
                checked={isOpen}
                onChange={(e) => setIsOpen(e.target.checked)}
                className="w-4 h-4 text-gray-900 border-gray-300 focus:ring-gray-900 focus:ring-1"
              />
              <span className="ml-3 text-sm font-light text-gray-900 tracking-wide">현재 영업 중</span>
            </label>
          </div>
        </div>

        {/* 제출 버튼 */}
        <div className="pt-8 text-center">
          <button
            type="submit"
            disabled={loading}
            className="px-12 py-4 border border-gray-900 text-gray-900 bg-white hover:bg-gray-900 hover:text-white transition-all duration-300 text-sm tracking-wider uppercase font-light disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:bg-white disabled:hover:text-gray-900"
          >
            {loading ? 'Processing...' : existingStore ? 'Update Store' : 'Create Store'}
          </button>
        </div>
      </form>
    </div>
  );
} 