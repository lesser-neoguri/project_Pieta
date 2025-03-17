'use client';

import { useState } from 'react';
import { supabase } from '@/lib/supabase';

export default function VendorSignupForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [businessName, setBusinessName] = useState('');
  const [businessNumber, setBusinessNumber] = useState('');
  const [representativeName, setRepresentativeName] = useState('');
  const [businessCategory, setBusinessCategory] = useState('');
  const [phone, setPhone] = useState('');
  const [address, setAddress] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      // 1. 회원가입 처리
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            user_type: 'vendor', // 입점회원 타입 지정
          }
        }
      });

      if (authError) {
        throw authError;
      }

      // 2. 회원 공통 정보를 users 테이블에 저장
      if (authData.user) {
        const { error: userError } = await supabase
          .from('users')
          .insert([
            {
              id: authData.user.id,
              email,
              phone,
              user_type: 'vendor',
            },
          ]);

        if (userError) {
          throw userError;
        }

        // 3. 입점회원 추가 정보를 vendor_users 테이블에 저장
        const { error: vendorError } = await supabase
          .from('vendor_users')
          .insert([
            {
              user_id: authData.user.id,
              business_name: businessName,
              business_number: businessNumber,
              representative_name: representativeName,
              business_category: businessCategory || null,
              address,
              status: 'pending', // 승인 대기 상태
            },
          ]);

        if (vendorError) {
          throw vendorError;
        }
      }

      setMessage({
        text: '회원가입 이메일이 발송되었습니다. 이메일을 확인해주세요. 입점 신청은 관리자 승인 후 완료됩니다.',
        type: 'success'
      });
      
      // 폼 초기화
      setEmail('');
      setPassword('');
      setBusinessName('');
      setBusinessNumber('');
      setRepresentativeName('');
      setBusinessCategory('');
      setPhone('');
      setAddress('');
    } catch (error: any) {
      setMessage({
        text: error.message || '회원가입 중 오류가 발생했습니다.',
        type: 'error'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md mx-auto p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold mb-6 text-center">입점회원 가입</h2>
      
      {message && (
        <div className={`p-3 mb-4 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
          {message.text}
        </div>
      )}
      
      <form onSubmit={handleSignup}>
        <div className="mb-4">
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
            이메일 <span className="text-red-500">*</span>
          </label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="이메일 주소를 입력하세요"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
            비밀번호 <span className="text-red-500">*</span>
          </label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="비밀번호를 입력하세요"
            minLength={6}
          />
          <p className="mt-1 text-xs text-gray-500">비밀번호는 최소 6자 이상이어야 합니다.</p>
        </div>
        
        <div className="mb-4">
          <label htmlFor="businessName" className="block text-sm font-medium text-gray-700 mb-1">
            상호명 <span className="text-red-500">*</span>
          </label>
          <input
            id="businessName"
            type="text"
            value={businessName}
            onChange={(e) => setBusinessName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="상호명을 입력하세요"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="businessNumber" className="block text-sm font-medium text-gray-700 mb-1">
            사업자등록번호 <span className="text-red-500">*</span>
          </label>
          <input
            id="businessNumber"
            type="text"
            value={businessNumber}
            onChange={(e) => setBusinessNumber(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="사업자등록번호를 입력하세요"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="representativeName" className="block text-sm font-medium text-gray-700 mb-1">
            대표자명 <span className="text-red-500">*</span>
          </label>
          <input
            id="representativeName"
            type="text"
            value={representativeName}
            onChange={(e) => setRepresentativeName(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="대표자명을 입력하세요"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="businessCategory" className="block text-sm font-medium text-gray-700 mb-1">
            업종
          </label>
          <input
            id="businessCategory"
            type="text"
            value={businessCategory}
            onChange={(e) => setBusinessCategory(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="업종을 입력하세요"
          />
        </div>
        
        <div className="mb-4">
          <label htmlFor="phone" className="block text-sm font-medium text-gray-700 mb-1">
            연락처
          </label>
          <input
            id="phone"
            type="tel"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="연락처를 입력하세요"
          />
        </div>
        
        <div className="mb-6">
          <label htmlFor="address" className="block text-sm font-medium text-gray-700 mb-1">
            사업장 주소 <span className="text-red-500">*</span>
          </label>
          <input
            id="address"
            type="text"
            value={address}
            onChange={(e) => setAddress(e.target.value)}
            required
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            placeholder="사업장 주소를 입력하세요"
          />
        </div>
        
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-green-600 text-white py-2 px-4 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {loading ? '처리 중...' : '입점 신청하기'}
        </button>
      </form>
    </div>
  );
} 