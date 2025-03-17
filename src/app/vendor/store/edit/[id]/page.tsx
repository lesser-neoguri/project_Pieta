import StoreForm from '@/components/StoreForm';

export default function EditStorePage({ params }: { params: { id: string } }) {
  return (
    <div className="min-h-screen py-12 px-4 sm:px-6 lg:px-8 bg-gray-50">
      <div className="max-w-7xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">상점 정보 수정</h1>
          <p className="mt-2 text-lg text-gray-600">
            상점 정보를 수정할 수 있습니다.
          </p>
        </div>
        
        <StoreForm storeId={params.id} />
      </div>
    </div>
  );
} 