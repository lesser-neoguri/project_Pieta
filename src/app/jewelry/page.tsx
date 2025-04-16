'use client';

import { useState } from 'react';
import ProductListPage, { CategoryItem } from '@/components/ProductListPage';

const jewelryCategories: CategoryItem[] = [
  { id: 'all', name: '전체' },
  { id: 'rings', name: '반지' },
  { id: 'necklaces', name: '목걸이' },
  { id: 'earrings', name: '귀걸이' },
  { id: 'bracelets', name: '팔찌' },
  { id: 'sets', name: '세트' }
];

export default function JewelryPage() {
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');

  // 소재 옵션
  const materials = [
    { id: 'all', name: '전체' },
    { id: 'gold', name: '골드' },
    { id: 'platinum', name: '플래티넘' },
    { id: 'diamond', name: '다이아몬드' },
    { id: 'pearl', name: '진주' },
    { id: 'gemstone', name: '보석' }
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
      title="JEWELRY & ACCESSORIES"
      subtitle="특별한 순간을 위한 아름다운 주얼리 컬렉션을 만나보세요."
      backgroundImage="https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=2070&auto=format&fit=crop"
      categories={jewelryCategories}
      filters={materialFilter}
      productFilter="category.eq.jewelry,product_name.ilike.%주얼리%,product_name.ilike.%목걸이%,product_name.ilike.%반지%,product_name.ilike.%귀걸이%,product_name.ilike.%팔찌%"
      categoryType="standard"
    />
  );
} 