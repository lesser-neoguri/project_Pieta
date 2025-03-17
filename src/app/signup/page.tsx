'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

export default function SignupRedirect() {
  const router = useRouter();

  useEffect(() => {
    router.replace('/register');
  }, [router]);

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4">
      <p className="text-lg">리다이렉트 중...</p>
    </div>
  );
} 