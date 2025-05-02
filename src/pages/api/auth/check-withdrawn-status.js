import { createClient } from '@supabase/supabase-js';

// Supabase 클라이언트 초기화
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

export default async function handler(req, res) {
  // POST 요청만 허용
  if (req.method !== 'POST') {
    return res.status(405).json({ message: '허용되지 않는 메소드입니다' });
  }

  try {
    const { email } = req.body;

    // 이메일 유효성 검사
    if (!email || typeof email !== 'string' || !email.includes('@')) {
      return res.status(400).json({ message: '유효하지 않은 이메일 형식입니다' });
    }

    // 서비스 롤 키로 Supabase 클라이언트 생성 (관리자 권한)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 탈퇴한 사용자 정보 조회
    const { data: withdrawnUser, error: withdrawnError } = await supabase
      .from('withdrawn_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (withdrawnError && withdrawnError.code !== 'PGRST116') {
      console.error('탈퇴 사용자 조회 오류:', withdrawnError);
      return res.status(500).json({ message: '사용자 정보 조회 중 오류가 발생했습니다' });
    }

    // 탈퇴한 사용자가 아닌 경우
    if (!withdrawnUser) {
      return res.status(404).json({ 
        isWithdrawn: false,
        canReactivate: false,
        message: '탈퇴한 계정이 아닙니다' 
      });
    }

    // 계정 복구 가능 여부 확인 (탈퇴 후 30일 이내)
    const withdrawalDate = new Date(withdrawnUser.withdrawn_at);
    const thirtyDaysAfterWithdrawal = new Date(withdrawalDate);
    thirtyDaysAfterWithdrawal.setDate(withdrawalDate.getDate() + 30);
    
    const now = new Date();
    const canReactivate = now < thirtyDaysAfterWithdrawal;
    
    // 계정 최종 삭제 예정일
    const deletionDate = thirtyDaysAfterWithdrawal.toISOString();

    // auth.users 테이블에서 삭제된 계정 확인
    const { data: authUser, error: authError } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single();
      
    if (authError && authError.code !== 'PGRST116') {
      console.error('Auth 사용자 조회 오류:', authError);
    }

    return res.status(200).json({
      isWithdrawn: true,
      canReactivate,
      deletionDate,
      userId: withdrawnUser.user_id || authUser?.id,
      withdrawnAt: withdrawnUser.withdrawn_at,
      message: canReactivate 
        ? '계정을 복구할 수 있습니다' 
        : '계정 복구 기간이 만료되었습니다'
    });

  } catch (error) {
    console.error('탈퇴 상태 확인 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
} 