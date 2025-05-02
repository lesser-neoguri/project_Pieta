import { createServerSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default async function handler(req, res) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ 
      error: '허용되지 않는 메서드입니다. DELETE 요청만 가능합니다.' 
    });
  }

  try {
    const { user_id } = req.body;

    if (!user_id) {
      return res.status(400).json({ 
        error: '사용자 ID가 필요합니다.' 
      });
    }

    // Supabase 클라이언트 초기화
    const supabase = createServerSupabaseClient({ req, res });

    // 사용자 존재 여부 확인 (profiles 테이블 조회)
    const { data: profileData, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user_id)
      .single();
      
    if (profileError || !profileData) {
      return res.status(404).json({ 
        error: '해당 사용자를 찾을 수 없습니다.' 
      });
    }

    // 탈퇴 정보 저장 (stored procedure 호출)
    const { data: withdrawalData, error: withdrawalError } = await supabase
      .rpc('handle_user_withdrawal', { p_user_id: user_id });

    // 탈퇴 정보 저장에 실패하더라도 로그만 남기고 계정 삭제는 진행
    if (withdrawalError) {
      console.error('탈퇴 정보 저장 중 오류 발생:', withdrawalError);
      // 오류를 기록하지만 계정 삭제는 계속 진행
    } else {
      console.log('탈퇴 정보 저장 완료:', withdrawalData);
    }

    // Supabase auth 사용자 계정 삭제
    const { error: deleteError } = await supabase.auth.admin.deleteUser(user_id);

    if (deleteError) {
      return res.status(500).json({ 
        error: '계정 삭제 중 오류가 발생했습니다.', 
        details: deleteError.message 
      });
    }

    // 성공 응답
    return res.status(200).json({ 
      success: true, 
      message: '계정이 성공적으로 삭제되었습니다.' 
    });
    
  } catch (error) {
    console.error('계정 삭제 중 예외 발생:', error);
    return res.status(500).json({ 
      error: '서버 오류가 발생했습니다.', 
      details: error.message 
    });
  }
} 