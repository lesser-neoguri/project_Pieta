import Link from 'next/link';

export default function RegisterPage() {
  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-8">회원가입 유형 선택</h1>
        
        <div className="grid grid-cols-1 gap-6 mb-8">
          <Link 
            href="/signup/regular" 
            className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md border border-gray-200 hover:border-blue-500 transition-all"
          >
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">일반회원</h2>
            <p className="text-gray-600 text-center">서비스를 이용하고 상품을 구매하는 일반 사용자</p>
          </Link>
          
          <Link 
            href="/signup/vendor" 
            className="flex flex-col items-center p-8 bg-white rounded-lg shadow-md border border-gray-200 hover:border-blue-500 transition-all"
          >
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <h2 className="text-xl font-semibold mb-2">입점회원</h2>
            <p className="text-gray-600 text-center">상품을 판매하고 서비스를 제공하는 판매자</p>
          </Link>
        </div>
        
        <div className="text-center">
          <p className="text-gray-600">
            이미 계정이 있으신가요?{' '}
            <Link href="/login" className="text-blue-600 hover:underline">
              로그인
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
} 