import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

/**
 * 탈퇴한 사용자 처리 함수
 * 로그인 시도 시 탈퇴 여부를 확인하고 적절한 처리를 수행
 * 
 * @param {string} email - 로그인 시도한 이메일
 * @returns {Object} - 처리 결과 객체 (isWithdrawn, canReactivate, message)
 */
export async function handleWithdrawnUser(email) {
  if (!email) {
    return { 
      isWithdrawn: false, 
      canReactivate: false,
      message: '이메일 정보가 제공되지 않았습니다.'
    };
  }

  try {
    // 1. withdrawn_users 테이블에서 사용자 찾기
    const { data: withdrawnUser, error: withdrawnError } = await supabase
      .from('withdrawn_users')
      .select('*')
      .eq('email', email)
      .single();

    if (withdrawnError && withdrawnError.code !== 'PGRST116') {
      // PGRST116는 결과가 없음을 의미 (정상적인 경우)
      console.error('탈퇴 회원 조회 중 오류:', withdrawnError);
      return { 
        isWithdrawn: false, 
        canReactivate: false,
        message: '사용자 정보 조회 중 오류가 발생했습니다.'
      };
    }

    // 2. 탈퇴한 사용자가 맞는지 확인
    if (withdrawnUser) {
      // 삭제 예정일이 지났는지 확인
      const deletionDate = new Date(withdrawnUser.deletion_scheduled_at);
      const now = new Date();
      
      if (deletionDate > now) {
        // 아직 복구 가능한 기간
        return {
          isWithdrawn: true,
          canReactivate: true,
          userId: withdrawnUser.user_id,
          withdrawnAt: withdrawnUser.withdrawn_at,
          deletionDate: withdrawnUser.deletion_scheduled_at,
          message: '탈퇴한 계정입니다. 계정 복구 페이지로 이동합니다.'
        };
      } else {
        // 복구 기간 만료
        return {
          isWithdrawn: true,
          canReactivate: false,
          message: '탈퇴 후 1개월이 지나 계정을 복구할 수 없습니다. 새로운 계정으로 가입해주세요.'
        };
      }
    }

    // 3. auth.users 테이블에서 삭제된 계정 확인 (이메일이 변경되었을 수 있음)
    const { data: authUsers, error: authError } = await supabase.auth.admin.listUsers({
      filter: `email.ilike.%${email}%`,
      // 이메일이 deleted_ 형식으로 변경되어 있을 수 있으므로 부분 검색
    });

    if (authError) {
      console.error('Auth 사용자 조회 중 오류:', authError);
      return { 
        isWithdrawn: false, 
        canReactivate: false,
        message: '사용자 정보 조회 중 오류가 발생했습니다.'
      };
    }

    // 삭제된 계정인지 확인
    const deletedUser = authUsers.users.find(user => 
      user.email.includes(email) && 
      user.email.startsWith('deleted_') &&
      (user.app_metadata?.is_deleted === true || user.user_metadata?.withdrawn_at)
    );

    if (deletedUser) {
      // 삭제 예정일 확인
      const deletionDate = deletedUser.user_metadata?.deletion_scheduled_at 
        ? new Date(deletedUser.user_metadata.deletion_scheduled_at)
        : new Date(deletedUser.banned_until);
      
      const now = new Date();
      
      if (deletionDate && deletionDate > now) {
        return {
          isWithdrawn: true,
          canReactivate: true,
          userId: deletedUser.id,
          withdrawnAt: deletedUser.user_metadata?.withdrawn_at,
          deletionDate: deletedUser.user_metadata?.deletion_scheduled_at || deletedUser.banned_until,
          message: '탈퇴한 계정입니다. 계정 복구 페이지로 이동합니다.'
        };
      } else {
        return {
          isWithdrawn: true,
          canReactivate: false,
          message: '탈퇴 후 1개월이 지나 계정을 복구할 수 없습니다. 새로운 계정으로 가입해주세요.'
        };
      }
    }

    // 탈퇴한 사용자가 아님
    return { 
      isWithdrawn: false, 
      canReactivate: false,
      message: null
    };
  } catch (error) {
    console.error('탈퇴 회원 확인 중 예외 발생:', error);
    return { 
      isWithdrawn: false, 
      canReactivate: false,
      message: '사용자 정보 확인 중 오류가 발생했습니다.'
    };
  }
} 