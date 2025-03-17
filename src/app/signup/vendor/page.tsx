import VendorSignupForm from '@/components/VendorSignupForm';
import Link from 'next/link';

export default function VendorSignupPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">프로젝트 피에타</h1>
        <VendorSignupForm />
        <div className="mt-4 text-center">
          <p className="text-gray-600 mb-2">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              로그인
            </Link>
          </p>
          <p className="text-gray-600">
            <Link href="/register" className="text-blue-600 hover:underline">
              회원가입 유형 선택으로 돌아가기
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 