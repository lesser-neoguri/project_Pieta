-- products 테이블에 필요한 필드 추가
ALTER TABLE products
ADD COLUMN IF NOT EXISTS total_sales INTEGER DEFAULT 0,
ADD COLUMN IF NOT EXISTS average_rating NUMERIC(2,1) DEFAULT 0.0;

-- 제품 관심 정보를 저장하는 product_favorites 테이블
CREATE TABLE IF NOT EXISTS product_favorites (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id)
);

-- 제품 판매 정보를 저장하는 product_sales 테이블
CREATE TABLE IF NOT EXISTS product_sales (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID NOT NULL, -- 주문 테이블 참조 (향후 구현)
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  price_at_purchase INTEGER NOT NULL CHECK (price_at_purchase >= 0),
  status TEXT NOT NULL CHECK (status IN ('pending', 'paid', 'shipped', 'delivered', 'cancelled', 'refunded')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 제품 리뷰 정보를 저장하는 product_reviews 테이블
CREATE TABLE IF NOT EXISTS product_reviews (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  order_id UUID, -- 주문 테이블 참조 (향후 구현)
  rating INTEGER NOT NULL CHECK (rating BETWEEN 1 AND 5),
  review_text TEXT,
  review_image_url TEXT,
  is_verified_purchase BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(product_id, user_id, order_id)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE product_favorites ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_sales ENABLE ROW LEVEL SECURITY;
ALTER TABLE product_reviews ENABLE ROW LEVEL SECURITY;

-- product_favorites 테이블에 대한 정책
CREATE POLICY "사용자는 자신의 관심 제품만 관리할 수 있음" ON product_favorites
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "입점회원은 자신의 제품에 대한 관심 정보를 볼 수 있음" ON product_favorites
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON products.store_id = stores.id
      WHERE products.id = product_favorites.product_id
      AND stores.vendor_id = auth.uid()
    )
  );

-- product_sales 테이블에 대한 정책
CREATE POLICY "사용자는 자신의 구매 정보만 볼 수 있음" ON product_sales
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "입점회원은 자신의 제품 판매 정보를 볼 수 있음" ON product_sales
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON products.store_id = stores.id
      WHERE products.id = product_sales.product_id
      AND stores.vendor_id = auth.uid()
    )
  );

-- product_reviews 테이블에 대한 정책
CREATE POLICY "사용자는 자신의 리뷰만 관리할 수 있음" ON product_reviews
  FOR ALL USING (auth.uid() = user_id);

CREATE POLICY "모든 사용자는 리뷰를 볼 수 있음" ON product_reviews
  FOR SELECT USING (TRUE);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_product_favorites_product_id ON product_favorites(product_id);
CREATE INDEX IF NOT EXISTS idx_product_favorites_user_id ON product_favorites(user_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_product_id ON product_sales(product_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_user_id ON product_sales(user_id);
CREATE INDEX IF NOT EXISTS idx_product_sales_order_id ON product_sales(order_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_product_id ON product_reviews(product_id);
CREATE INDEX IF NOT EXISTS idx_product_reviews_user_id ON product_reviews(user_id);

-- 트리거 함수: 리뷰 추가/수정/삭제 시 제품의 평균 평점 업데이트
CREATE OR REPLACE FUNCTION update_product_average_rating()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products
  SET average_rating = (
    SELECT COALESCE(AVG(rating), 0)
    FROM product_reviews
    WHERE product_id = COALESCE(NEW.product_id, OLD.product_id)
  )
  WHERE id = COALESCE(NEW.product_id, OLD.product_id);
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_product_rating_on_review_insert ON product_reviews;
CREATE TRIGGER update_product_rating_on_review_insert
AFTER INSERT ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_average_rating();

DROP TRIGGER IF EXISTS update_product_rating_on_review_update ON product_reviews;
CREATE TRIGGER update_product_rating_on_review_update
AFTER UPDATE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_average_rating();

DROP TRIGGER IF EXISTS update_product_rating_on_review_delete ON product_reviews;
CREATE TRIGGER update_product_rating_on_review_delete
AFTER DELETE ON product_reviews
FOR EACH ROW
EXECUTE FUNCTION update_product_average_rating();

-- 트리거 함수: 판매 추가 시 제품의 총 판매량 업데이트
CREATE OR REPLACE FUNCTION update_product_total_sales()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.status = 'delivered' THEN
    UPDATE products
    SET total_sales = total_sales + NEW.quantity
    WHERE id = NEW.product_id;
  END IF;
  
  RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- 트리거 생성
DROP TRIGGER IF EXISTS update_product_sales_on_delivery ON product_sales;
CREATE TRIGGER update_product_sales_on_delivery
AFTER INSERT OR UPDATE ON product_sales
FOR EACH ROW
EXECUTE FUNCTION update_product_total_sales(); 