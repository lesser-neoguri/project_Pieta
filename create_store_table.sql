-- 상점 정보를 저장하는 stores 테이블
CREATE TABLE stores (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  vendor_id UUID NOT NULL REFERENCES vendor_users(user_id),
  store_name TEXT NOT NULL,
  store_description TEXT,
  store_logo_url TEXT,
  store_banner_url TEXT,
  store_phone TEXT,
  store_email TEXT,
  store_address TEXT NOT NULL,
  business_hours JSONB,
  is_open BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE stores ENABLE ROW LEVEL SECURITY;

-- stores 테이블에 대한 정책
CREATE POLICY "입점회원은 자신의 상점 정보만 볼 수 있음" ON stores
  FOR SELECT USING (auth.uid() = vendor_id);

CREATE POLICY "입점회원은 자신의 상점 정보만 업데이트할 수 있음" ON stores
  FOR UPDATE USING (auth.uid() = vendor_id);

CREATE POLICY "입점회원은 자신의 상점 정보만 생성할 수 있음" ON stores
  FOR INSERT WITH CHECK (auth.uid() = vendor_id);

CREATE POLICY "입점회원은 자신의 상점 정보만 삭제할 수 있음" ON stores
  FOR DELETE USING (auth.uid() = vendor_id);

-- 모든 사용자가 상점 정보를 볼 수 있도록 허용
CREATE POLICY "모든 사용자는 상점 정보를 볼 수 있음" ON stores
  FOR SELECT USING (TRUE);

-- 관리자는 모든 상점 정보를 관리할 수 있음
CREATE POLICY "관리자는 모든 상점 정보를 볼 수 있음" ON stores
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "관리자는 모든 상점 정보를 업데이트할 수 있음" ON stores
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- 인덱스 생성
CREATE INDEX idx_stores_vendor_id ON stores(vendor_id); 