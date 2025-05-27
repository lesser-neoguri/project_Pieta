-- 탈퇴한 회원 정보를 저장할 테이블 생성
CREATE TABLE IF NOT EXISTS public.withdrawn_users (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID UNIQUE NOT NULL,
  email TEXT,
  profile_data JSONB,
  metadata JSONB,
  withdrawn_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deletion_scheduled_at TIMESTAMPTZ NOT NULL DEFAULT (now() + interval '1 month'),
  is_deleted BOOLEAN DEFAULT FALSE,
  deleted_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 이메일과 삭제 예정 시간에 대한 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_email ON public.withdrawn_users (email);
CREATE INDEX IF NOT EXISTS idx_withdrawn_users_deletion_scheduled ON public.withdrawn_users (deletion_scheduled_at) 
  WHERE NOT is_deleted;

COMMENT ON TABLE public.withdrawn_users IS '탈퇴한 회원 정보를 1개월간 보관하는 테이블';
COMMENT ON COLUMN public.withdrawn_users.user_id IS '탈퇴한 사용자의 UUID';
COMMENT ON COLUMN public.withdrawn_users.email IS '탈퇴한 사용자의 이메일';
COMMENT ON COLUMN public.withdrawn_users.profile_data IS '탈퇴 시점의 프로필 정보 (JSON 형식)';
COMMENT ON COLUMN public.withdrawn_users.metadata IS '추가 메타데이터 (원본 auth.users 정보 포함)';
COMMENT ON COLUMN public.withdrawn_users.withdrawn_at IS '탈퇴 처리 시간';
COMMENT ON COLUMN public.withdrawn_users.deletion_scheduled_at IS '영구 삭제 예정 시간 (탈퇴 후 1개월)';
COMMENT ON COLUMN public.withdrawn_users.is_deleted IS '영구 삭제 처리 여부';
COMMENT ON COLUMN public.withdrawn_users.deleted_at IS '영구 삭제 처리 시간';

-- 만료된 탈퇴 회원 정보를 삭제하는 함수
CREATE OR REPLACE FUNCTION public.delete_expired_withdrawn_users()
RETURNS INTEGER AS $$
DECLARE
  deleted_count INTEGER;
BEGIN
  -- 삭제 예정 시간이 지난 레코드를 is_deleted로 표시하고 삭제 시간 업데이트
  UPDATE public.withdrawn_users
  SET 
    is_deleted = TRUE,
    deleted_at = now()
  WHERE 
    deletion_scheduled_at <= now() 
    AND NOT is_deleted;

  GET DIAGNOSTICS deleted_count = ROW_COUNT;
  
  RAISE NOTICE '만료된 탈퇴 회원 % 건이 삭제 처리되었습니다', deleted_count;
  
  RETURN deleted_count;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.delete_expired_withdrawn_users() IS '삭제 예정 시간이 지난 탈퇴 회원 정보를 삭제 처리하는 함수';

-- 트리거 함수: 삭제 이벤트 자동 처리
CREATE OR REPLACE FUNCTION public.trigger_delete_expired_withdrawn_users()
RETURNS TRIGGER AS $$
BEGIN
  -- 함수 호출하여 만료된 레코드 삭제 처리
  PERFORM public.delete_expired_withdrawn_users();
  RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.trigger_delete_expired_withdrawn_users() IS '만료된 탈퇴 회원 정보 자동 삭제를 위한 트리거 함수';

-- 트리거 생성: 삽입/갱신 시 만료된 레코드 확인 및 삭제
DROP TRIGGER IF EXISTS check_expired_withdrawn_users ON public.withdrawn_users;
CREATE TRIGGER check_expired_withdrawn_users
AFTER INSERT OR UPDATE ON public.withdrawn_users
FOR EACH STATEMENT EXECUTE FUNCTION public.trigger_delete_expired_withdrawn_users();

-- 회원 탈퇴 처리 함수
CREATE OR REPLACE FUNCTION public.handle_user_withdrawal(p_user_id UUID)
RETURNS JSONB AS $$
DECLARE
  v_user_record RECORD;
  v_profile_record RECORD;
  v_result JSONB;
BEGIN
  -- 사용자 정보 가져오기
  SELECT * INTO v_user_record FROM auth.users WHERE id = p_user_id;
  
  IF v_user_record IS NULL THEN
    RAISE EXCEPTION '존재하지 않는 사용자입니다 (ID: %)', p_user_id;
  END IF;
  
  -- 프로필 정보 가져오기
  SELECT * INTO v_profile_record FROM public.profiles WHERE id = p_user_id;
  
  -- 탈퇴 정보 저장
  INSERT INTO public.withdrawn_users (
    user_id, 
    email, 
    profile_data, 
    metadata
  ) VALUES (
    p_user_id, 
    v_user_record.email,
    CASE WHEN v_profile_record IS NOT NULL THEN to_jsonb(v_profile_record) ELSE NULL END,
    jsonb_build_object(
      'auth_user', to_jsonb(v_user_record),
      'withdrawn_at', now()
    )
  )
  ON CONFLICT (user_id) DO UPDATE SET
    email = EXCLUDED.email,
    profile_data = EXCLUDED.profile_data,
    metadata = EXCLUDED.metadata,
    withdrawn_at = now(),
    deletion_scheduled_at = now() + interval '1 month',
    is_deleted = FALSE,
    deleted_at = NULL;
    
  v_result := jsonb_build_object(
    'success', true,
    'user_id', p_user_id,
    'email', v_user_record.email,
    'withdrawn_at', now(),
    'deletion_scheduled_at', now() + interval '1 month'
  );
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.handle_user_withdrawal(p_user_id UUID) IS '회원 탈퇴 정보를 저장하고 1개월 후 자동 삭제를 예약하는 함수';

-- 접근 권한 설정 (Row Level Security)
ALTER TABLE public.withdrawn_users ENABLE ROW LEVEL SECURITY;

-- 모든 정책 삭제
DROP POLICY IF EXISTS withdrawn_users_select_policy ON public.withdrawn_users;
DROP POLICY IF EXISTS withdrawn_users_insert_policy ON public.withdrawn_users;
DROP POLICY IF EXISTS withdrawn_users_update_policy ON public.withdrawn_users;
DROP POLICY IF EXISTS withdrawn_users_delete_policy ON public.withdrawn_users;

-- RLS 정책 생성: 관리자만 접근 가능
CREATE POLICY withdrawn_users_select_policy ON public.withdrawn_users
  FOR SELECT USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
  
CREATE POLICY withdrawn_users_insert_policy ON public.withdrawn_users
  FOR INSERT WITH CHECK (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
  
CREATE POLICY withdrawn_users_update_policy ON public.withdrawn_users
  FOR UPDATE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));
  
CREATE POLICY withdrawn_users_delete_policy ON public.withdrawn_users
  FOR DELETE USING (auth.uid() IN (SELECT id FROM public.profiles WHERE is_admin = true));

-- 탈퇴 회원 이메일 조회 함수 (로그인 시 확인용)
CREATE OR REPLACE FUNCTION public.check_withdrawn_user(p_email TEXT)
RETURNS JSONB AS $$
DECLARE
  v_record RECORD;
  v_result JSONB;
BEGIN
  -- 탈퇴 회원 정보 조회
  SELECT * INTO v_record FROM public.withdrawn_users 
  WHERE 
    email = p_email 
    AND NOT is_deleted;
  
  -- 결과 반환
  IF v_record IS NULL THEN
    v_result := jsonb_build_object(
      'is_withdrawn', false
    );
  ELSE
    v_result := jsonb_build_object(
      'is_withdrawn', true,
      'user_id', v_record.user_id,
      'withdrawn_at', v_record.withdrawn_at,
      'deletion_scheduled_at', v_record.deletion_scheduled_at
    );
  END IF;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

COMMENT ON FUNCTION public.check_withdrawn_user(p_email TEXT) IS '이메일로 탈퇴 회원 여부를 확인하는 함수 (로그인 시 사용)';

-- pg_cron 확장 설치 (필요시)
-- CREATE EXTENSION IF NOT EXISTS pg_cron;

-- 매일 자정에 만료된 레코드 자동 삭제 작업 예약
SELECT cron.schedule(
  'delete-expired-withdrawn-users', -- 작업 이름
  '0 0 * * *',                     -- 매일 자정에 실행 (cron 표현식)
  $$SELECT public.delete_expired_withdrawn_users()$$
);

-- 기존 작업 삭제 (재설치 시 사용)
-- SELECT cron.unschedule('delete-expired-withdrawn-users');

-- 작업 예약 확인
SELECT * FROM cron.job WHERE jobname = 'delete-expired-withdrawn-users';

-- 사용 예시:
-- 1. 회원 탈퇴 처리: 
-- SELECT public.handle_user_withdrawal('사용자UUID');

-- 2. 탈퇴 회원 확인: 
-- SELECT public.check_withdrawn_user('user@example.com');

-- 3. 만료된 회원 정보 수동 삭제: 
-- SELECT public.delete_expired_withdrawn_users(); 