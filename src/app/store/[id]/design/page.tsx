'use client';

import { useParams } from 'next/navigation';
import StoreDesignForm from '@/components/StoreDesignForm';
import { DetailedStoreDesignForm } from '@/components/forms/DetailedStoreDesignFormIntegration';
import { useState } from 'react';

export default function StoreDesignPage() {
  const params = useParams();
  const storeId = params?.id as string;
  const [useNewEditor, setUseNewEditor] = useState(false);

  if (!storeId) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-lg text-red-600">잘못된 상점 ID입니다.</p>
      </div>
    );
  }

  return (
    <div>
      {/* 에디터 선택 토글 */}
      <div className="fixed top-4 right-4 z-50 bg-white border border-gray-300 rounded-lg shadow-lg p-4">
        <div className="flex items-center space-x-3">
          <span className="text-sm font-medium text-gray-700">
            {useNewEditor ? '🆕 Notion 스타일 에디터' : '📝 기존 에디터'}
          </span>
          <button
            onClick={() => setUseNewEditor(!useNewEditor)}
            className={`
              relative inline-flex h-6 w-11 items-center rounded-full transition-colors
              ${useNewEditor ? 'bg-blue-600' : 'bg-gray-200'}
            `}
          >
            <span
              className={`
                inline-block h-4 w-4 transform rounded-full bg-white transition-transform
                ${useNewEditor ? 'translate-x-6' : 'translate-x-1'}
              `}
            />
          </button>
          <span className="text-xs text-gray-500">
            새 에디터 테스트
          </span>
        </div>
      </div>

      {/* 선택된 에디터 렌더링 */}
      {useNewEditor ? (
        <DetailedStoreDesignForm
          storeId={storeId}
          initialDesign={{}}
          products={[]}
          onSave={(design) => {
            console.log('Detailed Editor - Design saved:', design);
          }}
          onError={(error) => {
            console.error('Detailed Editor - Error:', error);
          }}
        />
      ) : (
        <StoreDesignForm storeId={storeId} />
      )}
    </div>
  );
} 