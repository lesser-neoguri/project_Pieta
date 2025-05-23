-- 관리자 확인 방식 표준화 SQL

-- 1. 관리자 확인 함수 생성
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- users 테이블의 user_type 필드를 기준으로 관리자 여부 확인
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND user_type IN ('admin', 'developer')
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 2. 슈퍼 관리자 확인 함수 생성
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
BEGIN
  -- admin_users 테이블의 admin_level 필드를 기준으로 슈퍼 관리자 여부 확인
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM admin_users
      WHERE user_id = auth.uid()
      AND admin_level = 'super_admin'
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. 벤더 확인 함수 생성
CREATE OR REPLACE FUNCTION public.is_vendor()
RETURNS BOOLEAN AS $$
BEGIN
  -- users 테이블의 user_type 필드를 기준으로 벤더 여부 확인
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND user_type = 'vendor'
      AND is_active = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. 일반 사용자 확인 함수 생성
CREATE OR REPLACE FUNCTION public.is_regular_user()
RETURNS BOOLEAN AS $$
BEGIN
  -- users 테이블의 user_type 필드를 기준으로 일반 사용자 여부 확인
  RETURN (
    SELECT EXISTS (
      SELECT 1 FROM users
      WHERE id = auth.uid()
      AND user_type = 'regular'
      AND is_active = true
    )
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. 관리자 또는 리소스 소유자 확인 함수 생성
CREATE OR REPLACE FUNCTION public.is_admin_or_owner(resource_owner_id UUID)
RETURNS BOOLEAN AS $$
BEGIN
  -- 관리자이거나 리소스 소유자인지 확인
  RETURN (
    SELECT 
      EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid()
        AND user_type IN ('admin', 'developer')
      )
    OR
    auth.uid() = resource_owner_id
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 6. 테이블 정책에 함수 적용 예제 (withdrawn_users 테이블)
-- 이 예제는 withdrawn_users 테이블이 실제 존재할 때 사용하세요
/*
ALTER TABLE IF EXISTS public.withdrawn_users ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "관리자만 탈퇴 회원 정보를 볼 수 있음" ON public.withdrawn_users;
CREATE POLICY "관리자만 탈퇴 회원 정보를 볼 수 있음" ON public.withdrawn_users
  FOR SELECT
  TO authenticated
  USING (public.is_admin());
  
DROP POLICY IF EXISTS "관리자만 탈퇴 회원 정보를 관리할 수 있음" ON public.withdrawn_users;
CREATE POLICY "관리자만 탈퇴 회원 정보를 관리할 수 있음" ON public.withdrawn_users
  FOR ALL
  TO authenticated
  USING (public.is_admin());
*/

-- 참고 사항:
-- 1. 위 함수들은 auth.uid()를 사용하므로 RLS 정책에서만 사용 가능합니다.
-- 2. 다른 테이블에 대한 정책도 위 함수들을 활용하여 표준화할 수 있습니다.
-- 3. 클라이언트 코드에서는 user_type 필드를 계속 사용할 수 있습니다. 