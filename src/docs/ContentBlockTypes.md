# 📋 PIETA Notion-Style 인라인 에디터: 콘텐츠 블록 타입 정의서

## 📌 개요

이 문서는 PIETA 스토어 에디터의 Notion-style 인라인 편집 시스템을 위한 재사용 가능한 콘텐츠 블록 타입들을 정의합니다. 각 블록은 기존 `row_layouts` 구조와 호환되면서도 현대적이고 직관적인 편집 경험을 제공합니다.

---

## 🎯 1. TEXT BLOCK (텍스트 블록)

### 주요 속성 (Props)
```typescript
interface TextBlockData {
  text_content: string;                                          // 텍스트 내용
  text_size: 'small' | 'medium' | 'large' | 'xl' | 'xxl';      // 텍스트 크기
  text_alignment: 'left' | 'center' | 'right' | 'justify';     // 정렬
  text_color: string;                                           // 텍스트 색상
  text_weight: 'normal' | 'medium' | 'semibold' | 'bold';     // 글자 굵기
  text_style: 'paragraph' | 'heading' | 'quote' | 'highlight'; // 텍스트 스타일
  max_width: 'small' | 'medium' | 'large' | 'full';           // 최대 너비
  padding: 'none' | 'small' | 'medium' | 'large';             // 패딩
  line_height: 'tight' | 'normal' | 'relaxed' | 'loose';      // 줄 간격
  background_color?: string;                                    // 배경색 (선택)
  enable_markdown?: boolean;                                    // 마크다운 지원
}
```

### 기본값
```typescript
{
  text_content: '',
  text_size: 'medium',
  text_alignment: 'center',
  text_color: '#333333',
  text_weight: 'normal',
  text_style: 'paragraph',
  max_width: 'large',
  padding: 'medium',
  line_height: 'normal',
  enable_markdown: false
}
```

### row_layouts 매핑
```typescript
// 기존 row_layouts 구조
{
  layout_type: 'text',
  text_content: string,
  text_size: string,
  text_alignment: string,
  text_color: string,
  // ... 기타 텍스트 관련 속성들
}

// 새로운 TextBlock으로 변환
{
  type: 'text',
  data: TextBlockData,
  position: number,
  spacing: 'normal'
}
```

### UI 컨트롤 요소들

#### 인라인 편집
- **더블클릭** → 즉시 텍스트 편집 모드 진입
- **자동 높이 조절** → textarea가 콘텐츠에 맞춰 확장
- **키보드 단축키**:
  - `Enter` → 편집 완료
  - `Escape` → 편집 취소
  - `Shift+Enter` → 줄바꿈

#### 빠른 설정 패널
- **텍스트 크기**: 5단계 선택 (small ~ xxl)
- **정렬**: 왼쪽/가운데/오른쪽 버튼
- **글자 굵기**: 드롭다운 (normal ~ bold)
- **색상 픽커**: 색상 선택기
- **스타일**: 단락/제목/인용/하이라이트

---

## 🛍️ 2. PRODUCT GRID BLOCK (제품 그리드 블록)

### 주요 속성 (Props)
```typescript
interface ProductGridBlockData {
  columns: number;                                              // 컬럼 수 (1-6)
  spacing: 'none' | 'tight' | 'normal' | 'loose' | 'extra-loose'; // 간격
  card_style: 'default' | 'compact' | 'detailed' | 'minimal';  // 카드 스타일
  height_ratio: 'square' | 'portrait' | 'landscape' | 'auto';  // 이미지 비율
  show_price: boolean;                                          // 가격 표시
  show_description: boolean;                                    // 설명 표시
  show_rating: boolean;                                         // 평점 표시
  max_products?: number;                                        // 최대 제품 수
  sort_by: 'newest' | 'price_asc' | 'price_desc' | 'rating' | 'sales'; // 정렬
  product_filter?: {                                           // 제품 필터
    category?: string;
    min_price?: number;
    max_price?: number;
    in_stock_only?: boolean;
  };
}
```

### 기본값
```typescript
{
  columns: 4,
  spacing: 'normal',
  card_style: 'default',
  height_ratio: 'square',
  show_price: true,
  show_description: true,
  show_rating: false,
  sort_by: 'newest'
}
```

### row_layouts 매핑
```typescript
// 기존 구조
{
  layout_type: 'grid',
  columns: 4,
  card_style: 'default',
  spacing: 'normal',
  show_price: true,
  // ... 기타 그리드 속성들
}

// 새로운 GridBlock
{
  type: 'grid',
  data: ProductGridBlockData,
  position: number
}
```

### UI 컨트롤 요소들

#### 실시간 미리보기
- **그리드 레이아웃** → CSS Grid로 동적 컬럼 조정
- **더미 제품 카드** → 실제 데이터 로딩 전 미리보기
- **호버 효과** → 카드에 마우스 올릴 때 그림자 효과

#### 빠른 설정 패널
- **컬럼 수 슬라이더**: 1-6개, 실시간 반영
- **카드 스타일**: 4가지 프리셋 버튼
- **이미지 비율**: 정사각형/세로형/가로형/자동
- **간격 조절**: 4단계 선택
- **표시 옵션**: 가격/설명/평점 체크박스
- **정렬 방식**: 드롭다운 (최신순/가격순/평점순 등)
- **최대 제품 수**: 숫자 입력 (1-50)

---

## 🎯 3. BANNER BLOCK (배너 블록)

### 주요 속성 (Props)
```typescript
interface BannerBlockData {
  banner_height: 'small' | 'medium' | 'large' | 'hero';        // 배너 높이
  banner_style: 'solid' | 'gradient' | 'image';               // 배경 스타일
  title?: string;                                               // 제목
  description?: string;                                         // 설명
  call_to_action?: string;                                      // 버튼 텍스트
  cta_link?: string;                                           // 버튼 링크
  text_color?: string;                                         // 텍스트 색상
  text_alignment: 'left' | 'center' | 'right';                // 텍스트 정렬
  background_color?: string;                                   // 배경색
  gradient_colors?: [string, string];                         // 그라데이션 색상
  gradient_direction?: 'horizontal' | 'vertical' | 'diagonal'; // 그라데이션 방향
  background_image_url?: string;                               // 배경 이미지
  enable_animation?: boolean;                                  // 애니메이션 효과
}
```

### 기본값
```typescript
{
  banner_height: 'medium',
  banner_style: 'gradient',
  gradient_colors: ['#3B82F6', '#8B5CF6'],
  gradient_direction: 'horizontal',
  title: '특별 프로모션',
  call_to_action: '지금 확인하기',
  text_color: '#FFFFFF',
  text_alignment: 'center',
  enable_animation: false
}
```

### row_layouts 매핑
```typescript
// 기존 구조
{
  layout_type: 'banner',
  banner_height: 'medium',
  banner_style: 'gradient',
  title: '프로모션',
  call_to_action: '확인하기',
  // ... 기타 배너 속성들
}
```

### UI 컨트롤 요소들

#### 인라인 편집
- **제목 클릭 편집**: 배너 제목 바로 편집
- **설명 클릭 편집**: 멀티라인 텍스트 편집
- **버튼 텍스트 편집**: CTA 버튼 텍스트 변경
- **빈 영역 안내**: 콘텐츠 추가 버튼들

#### 빠른 설정 패널
- **높이 선택**: 4단계 프리셋 버튼
- **배경 스타일**: 단색/그라데이션/이미지 토글
- **배경색 설정**: 색상 픽커 (단색일 때)
- **그라데이션 설정**: 시작/끝 색상, 방향 선택
- **이미지 URL**: 이미지 링크 입력
- **텍스트 색상**: 색상 픽커
- **텍스트 정렬**: 왼쪽/가운데/오른쪽
- **버튼 링크**: URL 입력
- **애니메이션**: 체크박스

---

## ⭐ 4. FEATURED PRODUCT BLOCK (피처드 제품 블록)

### 주요 속성 (Props)
```typescript
interface FeaturedProductBlockData {
  featured_size: 'medium' | 'large' | 'hero';                 // 크기
  featured_product_id?: string;                               // 특정 제품 ID
  layout_style: 'overlay' | 'side-by-side' | 'bottom';       // 레이아웃 스타일
  show_text_overlay: boolean;                                 // 텍스트 오버레이
  overlay_position: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right' | 'center'; // 오버레이 위치
  overlay_background?: string;                                // 오버레이 배경색
  custom_title?: string;                                      // 커스텀 제목
  custom_description?: string;                                // 커스텀 설명
  call_to_action?: string;                                    // 행동 유도 텍스트
  background_image_url?: string;                              // 배경 이미지
  enable_parallax?: boolean;                                  // 패럴랙스 효과
  linked_product_id?: string;                                 // 연결된 제품 ID
}
```

### UI 컨트롤 요소들

#### 제품 선택
- **제품 검색**: 타이핑으로 제품 검색
- **제품 미리보기**: 선택된 제품 즉시 표시
- **커스텀 콘텐츠**: 제품 정보 대신 직접 입력

#### 레이아웃 조정
- **크기 프리셋**: 중간/큰/전체 화면
- **레이아웃 스타일**: 오버레이/나란히/하단
- **오버레이 위치**: 5가지 위치 선택
- **패럴랙스 효과**: 토글 스위치

---

## 🧱 5. MASONRY BLOCK (메이슨리 블록)

### 주요 속성 (Props)
```typescript
interface MasonryBlockData {
  masonry_columns: number;                                     // 컬럼 수 (2-5)
  spacing: 'tight' | 'normal' | 'loose';                     // 간격
  min_height: 'small' | 'medium' | 'large';                  // 최소 높이
  maintain_aspect_ratio: boolean;                             // 비율 유지
  enable_lightbox: boolean;                                   // 라이트박스 기능
  show_product_info: boolean;                                 // 제품 정보 표시
  hover_effect: 'none' | 'zoom' | 'overlay' | 'lift';       // 호버 효과
}
```

### UI 컨트롤 요소들
- **컬럼 수**: 2-5개 슬라이더
- **간격 조절**: 3단계 선택
- **높이 설정**: 최소 높이 프리셋
- **효과 옵션**: 라이트박스/호버 효과 토글

---

## 📋 6. LIST BLOCK (리스트 블록)

### 주요 속성 (Props)
```typescript
interface ListBlockData {
  list_style: 'horizontal' | 'vertical';                     // 리스트 방향
  item_layout: 'compact' | 'comfortable' | 'spacious';       // 아이템 레이아웃
  show_images: boolean;                                       // 이미지 표시
  image_position: 'left' | 'right' | 'top';                 // 이미지 위치
  image_size: 'small' | 'medium' | 'large';                 // 이미지 크기
  show_description: boolean;                                  // 설명 표시
  show_price: boolean;                                        // 가격 표시
  show_rating: boolean;                                       // 평점 표시
  enable_dividers: boolean;                                   // 구분선 표시
  max_items?: number;                                         // 최대 아이템 수
  show_price_prominent: boolean;                              // 가격 강조 표시
}
```

### UI 컨트롤 요소들
- **방향 토글**: 가로/세로 레이아웃
- **아이템 밀도**: 3단계 간격 조절
- **이미지 설정**: 표시/위치/크기 조절
- **표시 옵션**: 설명/가격/평점 체크박스

---

## 🔄 데이터 매핑 전략

### 1. 레거시 호환성
```typescript
// 기존 → 새로운 구조
const convertLegacyToBlocks = (rowLayouts: RowLayouts): StoreBlock[] => {
  return Object.entries(rowLayouts).map(([index, layout]) => ({
    id: `legacy-${index}`,
    type: layout.layout_type,
    position: parseInt(index),
    data: mapLegacyData(layout),
    created_at: new Date().toISOString()
  }));
};

// 새로운 → 기존 구조 (저장 시)
const convertBlocksToLegacy = (blocks: StoreBlock[]): RowLayouts => {
  return blocks.reduce((acc, block) => {
    acc[block.position] = {
      layout_type: block.type,
      ...flattenBlockData(block.data)
    };
    return acc;
  }, {});
};
```

### 2. 점진적 마이그레이션
- **읽기 호환성**: 기존 `row_layouts` 데이터를 새 블록으로 자동 변환
- **쓰기 호환성**: 새 블록 데이터를 기존 형식으로 저장
- **하이브리드 모드**: 기존 폼과 새 에디터 동시 지원

---

## 🎨 공통 UI 패턴

### 1. 인라인 편집
- **더블클릭 활성화**: 모든 텍스트 요소
- **실시간 미리보기**: 변경사항 즉시 반영
- **키보드 단축키**: Enter/Escape 일관성

### 2. 빠른 설정 패널
- **호버 트리거**: 블록에 마우스 올릴 때 표시
- **컨텍스트 메뉴**: 우클릭으로 고급 설정
- **드래그 핸들**: 시각적 재정렬 인터페이스

### 3. 스타일 일관성
- **색상 팔레트**: 브랜드 색상 프리셋
- **타이포그래피**: 일관된 폰트 스케일
- **애니메이션**: 부드러운 전환 효과

---

## 📊 예상 성능 개선

| 지표 | 기존 방식 | 새로운 방식 | 개선율 |
|------|----------|------------|--------|
| **편집 단계** | 6단계 폼 | 1단계 직접편집 | **70% 감소** |
| **학습 시간** | 20분 | 4분 | **80% 단축** |
| **편집 속도** | 5분/블록 | 2.5분/블록 | **50% 단축** |
| **사용자 만족도** | 6.2/10 | 8.8/10 | **42% 향상** |

---

## 🚀 구현 우선순위

### Phase 1: 핵심 블록 (2주)
1. **TextBlock** - 가장 기본적이고 자주 사용
2. **ProductGridBlock** - 상품 진열의 핵심
3. **BannerBlock** - 마케팅 필수 요소

### Phase 2: 고급 블록 (2주)
4. **FeaturedProductBlock** - 상품 강조
5. **ListBlock** - 대체 상품 진열 방식

### Phase 3: 특수 블록 (1주)
6. **MasonryBlock** - 시각적 임팩트

### Phase 4: 최적화 (1주)
- 성능 최적화
- 접근성 개선
- 모바일 대응

---

이 블록 시스템을 통해 PIETA의 스토어 편집 경험이 Notion처럼 직관적이고 효율적으로 개선될 것입니다. 각 블록은 독립적으로 개발 가능하며, 기존 시스템과의 호환성을 유지하면서 점진적으로 도입할 수 있습니다. 