'use client';

import { useState, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductListPage, { CategoryItem } from '@/components/ProductListPage';

const jewelryCategories: CategoryItem[] = [
  { id: 'all', name: '전체' },
  { id: 'rings', name: '반지' },
  { id: 'necklaces', name: '목걸이' },
  { id: 'earrings', name: '귀걸이' },
  { id: 'bracelets', name: '팔찌' },
  { id: 'sets', name: '세트' }
];

// URL 파라미터를 기반으로 필터 문자열 생성하는 함수
function getFilterString(category?: string): string {
  // 기본적으로 category 필드를 jewelry로 필터링
  let filter = "category.eq.jewelry";
  
  // 추가적인 하위 카테고리 필터링 (category 파라미터가 있는 경우)
  if (category && category !== 'all') {
    filter = `${filter},subcategory.eq.${category}`;
  }
  
  // 이름 기반 필터링 백업 - category 필드가 없는 경우를 위한 대비책
  return `${filter},product_name.ilike.%주얼리%,product_name.ilike.%목걸이%,product_name.ilike.%반지%,product_name.ilike.%귀걸이%,product_name.ilike.%팔찌%`;
}

function JewelryContent() {
  const searchParams = useSearchParams();
  const categoryParam = searchParams?.get('category') || 'all';
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

  // 현재 URL 파라미터에 기반한 필터 문자열 생성
  const productFilter = getFilterString(categoryParam);

  return (
    <ProductListPage
      title="JEWELRY & ACCESSORIES"
      subtitle="특별한 순간을 위한 아름다운 주얼리 컬렉션을 만나보세요."
      backgroundImage="https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=2070&auto=format&fit=crop"
      categories={jewelryCategories}
      filters={materialFilter}
      productFilter={productFilter}
      categoryType="standard"
    />
  );
}

export default function JewelryPage() {
  return (
    <Suspense fallback={<div>로딩 중...</div>}>
      <JewelryContent />
    </Suspense>
  );
} 