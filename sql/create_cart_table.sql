-- cart_items 테이블 생성
CREATE TABLE IF NOT EXISTS cart_items (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  product_id UUID NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  UNIQUE(user_id, product_id)
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE cart_items ENABLE ROW LEVEL SECURITY;

-- 사용자는 자신의 장바구니 항목만 접근 가능
CREATE POLICY "사용자는 자신의 장바구니만 관리할 수 있음" ON cart_items
  FOR ALL USING (auth.uid() = user_id);

-- 입점회원은 자신의 제품에 대한 장바구니 정보를 볼 수 있음
CREATE POLICY "입점회원은 자신의 제품에 대한 장바구니 정보를 볼 수 있음" ON cart_items
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM products
      JOIN stores ON products.store_id = stores.id
      WHERE products.id = cart_items.product_id
      AND stores.vendor_id = auth.uid()
    )
  );

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_cart_items_user_id ON cart_items(user_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product_id ON cart_items(product_id);

-- 업데이트 시 updated_at 자동 갱신 트리거
CREATE OR REPLACE FUNCTION update_cart_items_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_cart_items_updated_at
BEFORE UPDATE ON cart_items
FOR EACH ROW
EXECUTE FUNCTION update_cart_items_updated_at(); 