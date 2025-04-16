'use client';

import { useState } from 'react';
import ProductListPage, { CategoryItem } from '@/components/ProductListPage';

const investmentCategories: CategoryItem[] = [
  { id: 'all', name: '전체' },
  { id: 'gold', name: '골드' },
  { id: 'platinum', name: '플래티넘' },
  { id: 'silver', name: '실버' },
  { id: 'diamond', name: '다이아몬드' },
  { id: 'other', name: '기타' }
];

export default function InvestmentPage() {
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');

  // 소재 옵션
  const materials = [
    { id: 'all', name: '전체' },
    { id: 'gold', name: '골드' },
    { id: 'platinum', name: '플래티넘' },
    { id: 'silver', name: '실버' },
    { id: 'diamond', name: '다이아몬드' },
    { id: 'other', name: '기타' }
  ];

  // 소재 필터 UI
  const materialFilter = (
    <div className="flex items-center space-x-4 ml-4">
      <select
        value={selectedMaterial}
        onChange={(e) => setSelectedMaterial(e.target.value)}
        className="text-sm border-none bg-transparent focus:ring-0"
      >
        {materials.map((material) => (
          <option key={material.id} value={material.id}>
            {material.name}
          </option>
        ))}
      </select>
    </div>
  );

  return (
    <ProductListPage
      title="INVESTMENT"
      subtitle="안전하고 신뢰할 수 있는 투자 상품을 만나보세요."
      backgroundImage="https://images.unsplash.com/photo-1625236239328-47d678e2b53b?q=80&w=3270&auto=format&fit=crop"
      categories={investmentCategories}
      filters={materialFilter}
      productFilter="category.eq.investment,product_name.ilike.%투자%,product_name.ilike.%골드%,product_name.ilike.%플래티넘%,product_name.ilike.%실버%,product_name.ilike.%다이아몬드%"
      categoryType="uppercase"
    />
  );
} 