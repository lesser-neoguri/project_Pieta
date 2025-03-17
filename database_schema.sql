-- 모든 회원 공통 정보를 저장하는 users 테이블
CREATE TABLE users (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  phone TEXT,
  user_type TEXT NOT NULL CHECK (user_type IN ('regular', 'vendor')),
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 일반회원 추가 정보를 저장하는 regular_users 테이블
CREATE TABLE regular_users (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  name TEXT NOT NULL,
  birth_date DATE,
  gender TEXT CHECK (gender IN ('male', 'female', 'other')),
  address TEXT,
  preferences JSONB,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 입점회원 추가 정보를 저장하는 vendor_users 테이블
CREATE TABLE vendor_users (
  user_id UUID PRIMARY KEY REFERENCES users(id),
  business_name TEXT NOT NULL,
  business_number TEXT NOT NULL,
  representative_name TEXT NOT NULL,
  business_category TEXT,
  address TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
  approval_date TIMESTAMP WITH TIME ZONE,
  rejection_reason TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS(Row Level Security) 정책 설정
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE regular_users ENABLE ROW LEVEL SECURITY;
ALTER TABLE vendor_users ENABLE ROW LEVEL SECURITY;

-- users 테이블에 대한 정책
CREATE POLICY "사용자는 자신의 정보만 볼 수 있음" ON users
  FOR SELECT USING (auth.uid() = id);

CREATE POLICY "사용자는 자신의 정보만 업데이트할 수 있음" ON users
  FOR UPDATE USING (auth.uid() = id);

-- 회원가입 시 사용자 정보 삽입 허용 (auth.uid()가 null이거나 id와 일치할 때)
CREATE POLICY "사용자는 회원가입 시 정보를 생성할 수 있음" ON users
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = id);

-- regular_users 테이블에 대한 정책
CREATE POLICY "일반회원은 자신의 정보만 볼 수 있음" ON regular_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "일반회원은 자신의 정보만 업데이트할 수 있음" ON regular_users
  FOR UPDATE USING (auth.uid() = user_id);

-- 회원가입 시 일반회원 정보 삽입 허용
CREATE POLICY "일반회원은 회원가입 시 정보를 생성할 수 있음" ON regular_users
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- vendor_users 테이블에 대한 정책
CREATE POLICY "입점회원은 자신의 정보만 볼 수 있음" ON vendor_users
  FOR SELECT USING (auth.uid() = user_id);

CREATE POLICY "입점회원은 자신의 정보만 업데이트할 수 있음" ON vendor_users
  FOR UPDATE USING (auth.uid() = user_id);

-- 회원가입 시 입점회원 정보 삽입 허용
CREATE POLICY "입점회원은 회원가입 시 정보를 생성할 수 있음" ON vendor_users
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- 관리자는 모든 회원 정보를 볼 수 있음 (관리자 역할이 있는 경우)
CREATE POLICY "관리자는 모든 회원 정보를 볼 수 있음" ON users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "관리자는 모든 일반회원 정보를 볼 수 있음" ON regular_users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

CREATE POLICY "관리자는 모든 입점회원 정보를 볼 수 있음" ON vendor_users
  FOR SELECT USING (auth.jwt() ->> 'role' = 'admin');

-- 관리자는 입점회원 상태를 업데이트할 수 있음
CREATE POLICY "관리자는 입점회원 상태를 업데이트할 수 있음" ON vendor_users
  FOR UPDATE USING (auth.jwt() ->> 'role' = 'admin');

-- 인덱스 생성
CREATE INDEX idx_users_user_type ON users(user_type);
CREATE INDEX idx_vendor_users_status ON vendor_users(status); 