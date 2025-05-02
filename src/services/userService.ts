import { supabase } from '@/lib/supabase';
import { User } from '@supabase/supabase-js';

export const isWithdrawnUser = async (email: string) => {
  if (!email) return false;
  
  // 단일 검사 지점
  if (email.startsWith('deleted_')) return true;
  
  const { data, error } = await supabase
    .from('withdrawn_users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
    
  return !!data && !error;
};

export const handleWithdrawnUser = async (user: User | null) => {
  if (!user?.email) return { isWithdrawn: false };
  
  const isWithdrawn = await isWithdrawnUser(user.email);
  
  return { 
    isWithdrawn,
    redirectUrl: isWithdrawn ? `/reactivate-account?email=${encodeURIComponent(user.email)}` : null 
  };
}; 