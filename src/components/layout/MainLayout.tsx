import Link from 'next/link';
import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  showNav?: boolean;
  showLogo?: boolean;
  centered?: boolean;
}

export default function MainLayout({ 
  children, 
  centered = true 
}: MainLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col bg-white">
      <main className={`flex-1 ${centered ? 'flex items-center justify-center' : ''} px-4 py-12`}>
        {children}
      </main>

      <footer className="py-8 px-4 border-t border-gray-100">
        <div className="max-w-6xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-4">About Us</h3>
              <p className="text-sm text-gray-500">
                최고의 품질과 서비스를 제공하는 프리미엄 쇼핑몰입니다.
              </p>
            </div>
            <div>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-4">Quick Links</h3>
              <ul className="space-y-2">
                <li>
                  <Link href="/terms" className="text-sm text-gray-500 hover:text-black transition-colors">
                    이용약관
                  </Link>
                </li>
                <li>
                  <Link href="/privacy" className="text-sm text-gray-500 hover:text-black transition-colors">
                    개인정보처리방침
                  </Link>
                </li>
                <li>
                  <Link href="/faq" className="text-sm text-gray-500 hover:text-black transition-colors">
                    자주 묻는 질문
                  </Link>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-sm font-medium tracking-widest uppercase mb-4">Contact</h3>
              <ul className="space-y-2">
                <li className="text-sm text-gray-500">
                  고객센터: 1588-0000
                </li>
                <li className="text-sm text-gray-500">
                  이메일: support@pieta.com
                </li>
                <li className="text-sm text-gray-500">
                  운영시간: 평일 09:00 - 18:00
                </li>
              </ul>
            </div>
          </div>
          <div className="mt-12 pt-8 border-t border-gray-100 text-center">
            <p className="text-xs text-gray-400 tracking-widest">
              © 2024 PIETA. ALL RIGHTS RESERVED.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
} 