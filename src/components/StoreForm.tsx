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
      <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
        <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
        <button
          onClick={() => router.push('/')}
          className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
        >
          홈으로 돌아가기
        </button>
      </div>
    );
  }

  return (
    <div className="w-full max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center font-korean">
        {existingStore ? '상점 정보 수정' : '상점 개설'}
      </h2>
      
      {message && (
        <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'} font-korean`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="storeName" className="block text-sm font-medium text-gray-700 mb-1 font-korean">
            상점명 <span className="text-red-500">*</span>
          </label>
          <input
            id="storeName"
            type="text"
            value={storeName}
            onChange={(e) => setStoreName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-korean"
            placeholder="상점명을 입력하세요"
          />
        </div>
        
        <div>
          <label htmlFor="storeDescription" className="block text-sm font-medium text-gray-700 mb-1 font-korean">
            상점 설명
          </label>
          <textarea
            id="storeDescription"
            value={storeDescription}
            onChange={(e) => setStoreDescription(e.target.value)}
            rows={4}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 font-korean"
            placeholder="상점에 대한 설명을 입력하세요"
          />
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="storeLogoUrl" className="block text-sm font-medium text-gray-700 mb-1">
              상점 로고 URL
            </label>
            <input
              id="storeLogoUrl"
              type="url"
              value={storeLogoUrl}
              onChange={(e) => setStoreLogoUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="상점 로고 이미지 URL을 입력하세요"
            />
          </div>
          
          <div>
            <label htmlFor="storeBannerUrl" className="block text-sm font-medium text-gray-700 mb-1">
              상점 배너 URL
            </label>
            <input
              id="storeBannerUrl"
              type="url"
              value={storeBannerUrl}
              onChange={(e) => setStoreBannerUrl(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="상점 배너 이미지 URL을 입력하세요"
            />
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label htmlFor="storePhone" className="block text-sm font-medium text-gray-700 mb-1">
              상점 전화번호 <span className="text-red-500">*</span>
            </label>
            <input
              id="storePhone"
              type="tel"
              value={storePhone}
              onChange={(e) => setStorePhone(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="상점 전화번호를 입력하세요"
            />
          </div>
          
          <div>
            <label htmlFor="storeEmail" className="block text-sm font-medium text-gray-700 mb-1">
              상점 이메일 <span className="text-red-500">*</span>
            </label>
            <input
              id="storeEmail"
              type="email"
              value={storeEmail}
              onChange={(e) => setStoreEmail(e.target.value)}
              required
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="상점 이메일을 입력하세요"
            />
          </div>
        </div>
        
        <div>
          <label htmlFor="storeAddress" className="block text-sm font-medium text-gray-700 mb-1">
            상점 주소 <span className="text-red-500">*</span>
          </label>
          <input
            id="storeAddress"
            type="text"
            value={storeAddress}
            onChange={(e) => setStoreAddress(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="상점 주소를 입력하세요"
          />
        </div>
        
        <div>
          <h3 className="text-lg font-medium text-gray-700 mb-3">영업 시간</h3>
          <div className="space-y-4">
            {Object.entries(businessHours).map(([day, hours]) => (
              <div key={day} className="flex items-center space-x-4">
                <div className="w-24">
                  <label className="inline-flex items-center">
                    <input
                      type="checkbox"
                      checked={(hours as any).isOpen}
                      onChange={(e) => updateBusinessHour(day as keyof BusinessHours, 'isOpen', e.target.checked)}
                      className="rounded text-blue-600 focus:ring-blue-500"
                    />
                    <span className="ml-2 text-sm font-medium text-gray-700">
                      {day.charAt(0).toUpperCase() + day.slice(1)}
                    </span>
                  </label>
                </div>
                
                <div className="flex items-center space-x-2 flex-1">
                  <input
                    type="time"
                    value={(hours as any).open}
                    onChange={(e) => updateBusinessHour(day as keyof BusinessHours, 'open', e.target.value)}
                    disabled={!(hours as any).isOpen}
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                  <span>~</span>
                  <input
                    type="time"
                    value={(hours as any).close}
                    onChange={(e) => updateBusinessHour(day as keyof BusinessHours, 'close', e.target.value)}
                    disabled={!(hours as any).isOpen}
                    className="px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100 disabled:text-gray-400"
                  />
                </div>
              </div>
            ))}
          </div>
        </div>
        
        <div>
          <label className="inline-flex items-center">
            <input
              type="checkbox"
              checked={isOpen}
              onChange={(e) => setIsOpen(e.target.checked)}
              className="rounded text-blue-600 focus:ring-blue-500"
            />
            <span className="ml-2 text-sm font-medium text-gray-700">현재 영업 중</span>
          </label>
        </div>
        
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={loading}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? '처리 중...' : existingStore ? '상점 정보 수정' : '상점 개설하기'}
          </button>
        </div>
      </form>
    </div>
  );
} 