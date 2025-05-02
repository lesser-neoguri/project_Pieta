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
    const { email, password } = req.body;

    // 요청 유효성 검사
    if (!email || !password) {
      return res.status(400).json({ message: '이메일과 비밀번호가 모두 필요합니다' });
    }

    // 서비스 롤 키로 Supabase 클라이언트 생성 (관리자 권한)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. 탈퇴한 사용자 정보 조회
    const { data: withdrawnUser, error: searchError } = await supabase
      .from('withdrawn_users')
      .select('*')
      .eq('email', email.toLowerCase())
      .single();

    if (searchError || !withdrawnUser) {
      console.error('탈퇴 사용자 조회 오류:', searchError);
      return res.status(404).json({ message: '탈퇴한 계정을 찾을 수 없습니다' });
    }

    // 2. 탈퇴 후 30일이 지났는지 확인
    const withdrawnDate = new Date(withdrawnUser.withdrawn_at);
    const currentDate = new Date();
    const daysSinceWithdrawal = (currentDate - withdrawnDate) / (1000 * 60 * 60 * 24);

    if (daysSinceWithdrawal > 30) {
      return res.status(400).json({ 
        message: '탈퇴 후 30일이 지나서 계정을 복구할 수 없습니다. 새로운 계정을 만들어주세요.' 
      });
    }

    // 3. 새 사용자 계정 생성
    const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
      email: email.toLowerCase(),
      password: password,
      email_confirm: true, // 이메일 인증 건너뛰기
    });

    if (createError) {
      console.error('사용자 생성 오류:', createError);
      return res.status(500).json({ message: '계정 복구 중 오류가 발생했습니다' });
    }

    // 4. 프로필 데이터 복원 (있을 경우)
    if (withdrawnUser.profile_data) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([{
          ...withdrawnUser.profile_data,
          id: newUser.user.id, // 새 사용자 ID로 업데이트
          updated_at: new Date().toISOString()
        }]);

      if (profileError) {
        console.error('프로필 복원 오류:', profileError);
        // 프로필 복원 실패해도 계속 진행
      }
    }

    // 5. 탈퇴 사용자 테이블에서 삭제
    const { error: deleteError } = await supabase
      .from('withdrawn_users')
      .delete()
      .eq('email', email.toLowerCase());

    if (deleteError) {
      console.error('탈퇴 정보 삭제 오류:', deleteError);
      // 계속 진행 (탈퇴 정보 삭제 실패해도 계정 복구는 완료)
    }

    return res.status(200).json({
      message: '계정이 성공적으로 복구되었습니다',
      user_id: newUser.user.id
    });
    
  } catch (error) {
    console.error('계정 복구 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
} 