'use client';

import ProductListPage, { CategoryItem } from '@/components/ProductListPage';

const productCategories: CategoryItem[] = [
  { id: 'all', name: '전체' },
  { id: 'jewelry', name: '주얼리' },
  { id: 'investment', name: '투자상품' },
  { id: 'fashion', name: '패션' },
  { id: 'luxury', name: '명품' },
  { id: 'other', name: '기타' }
];

export default function ProductsPage() {
  return (
    <ProductListPage
      title="COLLECTION"
      subtitle="엄선된 프리미엄 제품들을 만나보세요"
      backgroundImage="https://images.unsplash.com/photo-1542272201-b1ca555f8222?q=80&w=3387&auto=format&fit=crop"
      categories={productCategories}
      productFilter="" // 빈 필터로 모든 제품 표시
      categoryType="uppercase"
    />
  );
} 