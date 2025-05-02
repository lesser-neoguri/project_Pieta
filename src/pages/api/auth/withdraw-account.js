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
    const { user_id } = req.body;

    // 사용자 ID 유효성 검사
    if (!user_id) {
      return res.status(400).json({ message: '사용자 ID가 필요합니다' });
    }

    // 서비스 롤 키로 Supabase 클라이언트 생성 (관리자 권한)
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. 사용자 정보 조회
    const { data: user, error: userError } = await supabase.auth.admin.getUserById(user_id);

    if (userError || !user) {
      console.error('사용자 조회 오류:', userError);
      return res.status(404).json({ message: '사용자를 찾을 수 없습니다' });
    }

    // 2. 사용자 프로필 데이터 가져오기
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user_id)
      .single();

    if (profileError && profileError.code !== 'PGRST116') {
      console.error('프로필 조회 오류:', profileError);
      // 프로필이 없어도 계속 진행
    }

    // 3. 탈퇴 사용자 정보 저장
    const { error: insertError } = await supabase
      .from('withdrawn_users')
      .insert([
        {
          user_id: user_id,
          email: user.user.email.toLowerCase(),
          withdrawn_at: new Date().toISOString(),
          scheduled_deletion_at: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(), // 30일 후
          profile_data: profile || null
        }
      ]);

    if (insertError) {
      console.error('탈퇴 정보 저장 오류:', insertError);
      return res.status(500).json({ message: '탈퇴 처리 중 오류가 발생했습니다' });
    }

    // 4. 프로필 데이터 삭제 (선택사항: 데이터 보존을 위해 삭제하지 않을 수도 있음)
    if (profile) {
      const { error: deleteProfileError } = await supabase
        .from('profiles')
        .delete()
        .eq('id', user_id);

      if (deleteProfileError) {
        console.error('프로필 삭제 오류:', deleteProfileError);
        // 계속 진행 (프로필 삭제 실패해도 사용자는 삭제)
      }
    }

    // 5. Auth 사용자 삭제
    const { error: deleteUserError } = await supabase.auth.admin.deleteUser(user_id);

    if (deleteUserError) {
      console.error('사용자 삭제 오류:', deleteUserError);
      return res.status(500).json({ message: '사용자 삭제 중 오류가 발생했습니다' });
    }

    return res.status(200).json({
      message: '계정이 성공적으로 탈퇴되었습니다. 30일 이내에 재가입하면 계정을 복구할 수 있습니다.',
      deletion_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString()
    });
    
  } catch (error) {
    console.error('계정 탈퇴 오류:', error);
    return res.status(500).json({ message: '서버 오류가 발생했습니다' });
  }
} 