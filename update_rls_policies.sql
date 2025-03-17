-- 기존 정책 삭제
DROP POLICY IF EXISTS "사용자는 회원가입 시 정보를 생성할 수 있음" ON users;
DROP POLICY IF EXISTS "일반회원은 회원가입 시 정보를 생성할 수 있음" ON regular_users;
DROP POLICY IF EXISTS "입점회원은 회원가입 시 정보를 생성할 수 있음" ON vendor_users;

-- 새 정책 생성
-- 회원가입 시 사용자 정보 삽입 허용 (auth.uid()가 null이거나 id와 일치할 때)
CREATE POLICY "사용자는 회원가입 시 정보를 생성할 수 있음" ON users
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = id);

-- 회원가입 시 일반회원 정보 삽입 허용
CREATE POLICY "일반회원은 회원가입 시 정보를 생성할 수 있음" ON regular_users
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id);

-- 회원가입 시 입점회원 정보 삽입 허용
CREATE POLICY "입점회원은 회원가입 시 정보를 생성할 수 있음" ON vendor_users
  FOR INSERT WITH CHECK (auth.uid() IS NULL OR auth.uid() = user_id); 