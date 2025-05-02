'use client';

import { useState, useEffect, Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import ProductListPage, { CategoryItem } from '@/components/ProductListPage';
import { supabase } from '@/lib/supabase';

const jewelryCategories: CategoryItem[] = [
  { id: 'all', name: '전체' },
  { id: 'rings', name: '반지' },
  { id: 'necklaces', name: '목걸이' },
  { id: 'earrings', name: '귀걸이' },
  { id: 'bracelets', name: '팔찌' },
  { id: 'sets', name: '세트' }
];

function JewelryPageContent() {
  const searchParams = useSearchParams();
  // null 안전성을 위한 옵셔널 체이닝 사용
  const categoryParam = searchParams?.get('category') || null;
  
  console.log('주얼리 페이지 로드 - URL 파라미터:', categoryParam);
  console.log('유효한 카테고리인지 확인:', jewelryCategories.some(cat => cat.id === categoryParam));
  
  const validCategory = categoryParam && jewelryCategories.some(cat => cat.id === categoryParam) 
    ? categoryParam 
    : 'all';
    
  console.log('사용할 카테고리:', validCategory);
  
  const [selectedMaterial, setSelectedMaterial] = useState<string>('all');
  // URL 파라미터에서 카테고리 값을 가져와 초기 상태로 설정
  const [selectedCategory, setSelectedCategory] = useState<string>(validCategory);
  
  // 데이터 로딩을 위한 상태 추가
  const [forceRefresh, setForceRefresh] = useState<number>(0);
  
  // URL 변경 시 상태 업데이트를 위한 useEffect 추가
  useEffect(() => {
    // URL에서 카테고리 매개변수가 변경될 때마다 상태 업데이트
    if (categoryParam && jewelryCategories.some(cat => cat.id === categoryParam)) {
      setSelectedCategory(categoryParam);
      // 값이 변경될 때마다 강제 새로고침 트리거
      setForceRefresh(prev => prev + 1);
      console.log('URL 매개변수 변경으로 인한 카테고리 업데이트:', categoryParam);
    }
  }, [categoryParam]);

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
  
  // 카테고리별 적절한 필터 설정
  const getFilterString = (selectedCategory: string | null) => {
    console.log("선택된 카테고리:", selectedCategory);
    
    // 새로운 방식의 필터 문자열 생성
    let baseFilter = "main_category.eq.jewelry";
    if (selectedCategory && selectedCategory !== 'all') {
      console.log(`필터 생성: main_category=jewelry AND category=${selectedCategory}`);
      baseFilter = `${baseFilter},category.eq.${selectedCategory}`;
      
      // 테스트 쿼리 실행 (디버깅용)
      console.log(`테스트 쿼리 실행: main_category='jewelry' AND category='${selectedCategory}'`);
      testFilter(selectedCategory);
    }

    // 디버깅을 위한 로그 추가
    console.log('최종 필터:', baseFilter);
    
    return baseFilter;
  };
  
  // 필터 테스트 함수 (개발용)
  const testFilter = async (categoryName: string) => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, product_name, category')
        .eq('main_category', 'jewelry')
        .eq('category', categoryName);
        
      console.log(`테스트 결과 - ${categoryName} 카테고리 제품:`, data?.length || 0);
      console.log('테스트 쿼리 결과:', data);
      
      if (error) {
        console.error('테스트 쿼리 오류:', error);
      }
    } catch (err) {
      console.error('테스트 쿼리 실행 오류:', err);
    }
  };

  // 제품 데이터를 가져오는 함수를 별도로 분리
  const fetchProducts = async (filterString: string) => {
    let query = supabase
      .from('products')
      .select('*');
    
    // OR 대신 필터 조건들을 개별적으로 적용
    const filters = filterString.split(',');
    filters.forEach(filter => {
      const [field, condition] = filter.split('.');
      if (condition && condition.startsWith('eq.')) {
        const value = condition.substring(3);
        query = query.eq(field, value);
      }
    });
    
    const { data: products, error } = await query.order('created_at', { ascending: false });

    // 디버깅을 위한 로그 추가
    console.log('조회된 제품 수:', products?.length);
    console.log('조회된 제품:', products);

    if (error) {
      console.error('제품 조회 에러:', error);
      return [];
    }

    return products;
  };

  return (
    <ProductListPage
      title="JEWELRY & ACCESSORIES"
      subtitle="특별한 순간을 위한 아름다운 주얼리 컬렉션을 만나보세요."
      backgroundImage="https://images.unsplash.com/photo-1515405295579-ba7b45403062?q=80&w=2070&auto=format&fit=crop"
      categories={jewelryCategories}
      filters={materialFilter}
      productFilter={getFilterString(selectedCategory)}
      categoryType="standard"
      initialCategory={selectedCategory}
      onCategoryChange={setSelectedCategory}
      forceRefreshKey={forceRefresh}
    />
  );
}

export default function JewelryPage() {
  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center">로딩 중...</div>}>
      <JewelryPageContent />
    </Suspense>
  );
} 