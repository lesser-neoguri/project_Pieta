import StoreDesignForm from '@/components/StoreDesignForm';

export default function EditStorePage({ params }: { params: { id: string } }) {
  return (
    <div className="pt-16">
      <StoreDesignForm storeId={params.id} />
    </div>
  );
} 