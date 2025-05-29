'use client';

import { useParams } from 'next/navigation';
import StoreDesignForm from '@/components/StoreDesignForm';

export default function StoreDesignPage() {
  const params = useParams();
  const storeId = params?.id as string;

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-red-600">잘못된 상점 ID입니다.</p>
      </div>
    );
  }

  return (
    <div>
      <StoreDesignForm storeId={storeId} />
    </div>
  );
} 