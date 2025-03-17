'use client';

import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import StoreForm from '@/components/StoreForm';

export default function CreateStorePage() {
  const { user } = useAuth();
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [formData, setFormData] = useState({
    store_name: '',
    store_description: '',
    store_address: '',
  });
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [isVendor, setIsVendor] = useState(false);
  const [isApproved, setIsApproved] = useState(false);
  const [hasStore, setHasStore] = useState(false);

  useEffect(() => {
    const checkUserStatus = async () => {
      if (!user) {
        router.push('/login');
        return;
      }

      setLoading(true);
      
      try {
        // 사용자가 입점회원인지 확인
        const { data: userData, error: userError } = await supabase
          .from('users')
          .select('*')
          .eq('id', user.id)
          .single();

        if (userError) throw userError;

        if (userData.user_type !== 'vendor') {
          setIsVendor(false);
          setMessage({
            text: '입점회원만 상점을 개설할 수 있습니다.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

        setIsVendor(true);

        // 입점회원 정보 가져오기
        const { data: vendorData, error: vendorError } = await supabase
          .from('vendor_users')
          .select('*')
          .eq('user_id', user.id)
          .single();

        if (vendorError) throw vendorError;

        // 입점회원 승인 상태 확인
        if (vendorData.status !== 'approved') {
          setIsApproved(false);
          setMessage({
            text: '입점 신청이 승인된 회원만 상점을 개설할 수 있습니다.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

        setIsApproved(true);

        // 이미 상점이 있는지 확인
        const { data: storesData, error: storesError } = await supabase
          .from('stores')
          .select('id')
          .eq('vendor_id', user.id);

        if (storesError) throw storesError;

        if (storesData && storesData.length > 0) {
          setHasStore(true);
          setMessage({
            text: '하나의 입점계정은 하나의 상점만 개설할 수 있습니다.',
            type: 'error'
          });
          setLoading(false);
          return;
        }

      } catch (error: any) {
        console.error('사용자 상태 확인 중 오류 발생:', error);
        setMessage({
          text: '사용자 정보를 확인하는 중 오류가 발생했습니다.',
          type: 'error'
        });
      } finally {
        setLoading(false);
      }
    };

    checkUserStatus();
  }, [user, router]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg">로딩 중...</p>
      </div>
    );
  }

  if (!isVendor || !isApproved || hasStore) {
    return (
      <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
        <div className="max-w-7xl mx-auto">
          <div className="bg-white rounded-lg shadow-md p-6">
            {message && (
              <div className={`p-4 mb-6 rounded ${message.type === 'success' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                {message.text}
              </div>
            )}
            <div className="flex justify-center mt-4">
              <Link
                href="/vendor/store"
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
              >
                상점 관리 페이지로 돌아가기
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
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상점 개설</h1>
          <p className="mt-2 text-lg text-gray-600">
            입점회원을 위한 상점 개설 페이지입니다. 아래 양식을 작성하여 상점을 개설하세요.
          </p>
        </div>
        
        <StoreForm />
      </div>
    </div>
  );
} 