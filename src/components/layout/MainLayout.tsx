import Link from 'next/link';
import { ReactNode } from 'react';

interface MainLayoutProps {
  children: ReactNode;
  centered?: boolean;
}

export default function MainLayout({ 
  children, 
  centered = true 
}: MainLayoutProps) {
  return (
    <div className={`min-h-screen flex flex-col bg-white custom-scrollbar-vertical`}>
      <main className={`flex-1 ${centered ? 'flex items-center justify-center' : ''} px-4 py-6`}>
        {children}
      </main>

      <footer className="bg-white border-t border-gray-200">
        {/* 뉴스레터 섹션 */}
        <div className="py-12 bg-gray-50">
          <div className="max-w-6xl mx-auto px-4">
            <div className="text-center max-w-2xl mx-auto">
              <h2 className="text-lg font-normal text-gray-900 mb-3">
                Pieta의 최신 소식 받고 영감 얻기
              </h2>
              <p className="text-sm text-gray-600 mb-6">
                만족할 수 있는 제품으로 나만의 특별한 순간을 주문하세요.
              </p>
              <div className="flex max-w-md mx-auto">
                <input
                  type="email"
                  placeholder="이메일"
                  className="flex-1 px-4 py-3 border border-gray-300 text-sm focus:outline-none focus:border-gray-400"
                />
                <button className="px-6 py-3 bg-gray-900 text-white text-sm font-medium hover:bg-gray-800 transition-colors">
                  확인
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* 메인 풋터 컨텐츠 */}
        <div className="py-12 px-4">
          <div className="max-w-6xl mx-auto">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-8">
              {/* Pieta 부티크 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  Pieta 부티크
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/stores" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      피에타 디럭스 부티크
                    </Link>
                  </li>
                  <li>
                    <Link href="/boutiques" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      피에타 진주 부티크
                    </Link>
                  </li>
                  <li>
                    <Link href="/locations" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      매장 및 위치
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 고객 지원 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  고객 지원
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/contact" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      고객센터
                    </Link>
                  </li>
                  <li>
                    <Link href="/shipping" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      배송 및 반품
                    </Link>
                  </li>
                  <li>
                    <Link href="/faq" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      FAQ
                    </Link>
                  </li>
                  <li>
                    <Link href="/size-guide" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      사이즈 가이드
                    </Link>
                  </li>
                  <li>
                    <Link href="/care" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      제품 관리 방법
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 피에타 하우스 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  피에타 하우스
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/sustainability" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      피에타 지속가능성
                    </Link>
                  </li>
                  <li>
                    <Link href="/about" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      브랜드 스토리
                    </Link>
                  </li>
                  <li>
                    <Link href="/craftsmanship" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      장인정신
                    </Link>
                  </li>
                  <li>
                    <Link href="/heritage" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      브랜드 유산
                    </Link>
                  </li>
                </ul>
              </div>

              {/* 법률 */}
              <div>
                <h3 className="text-sm font-medium tracking-wider uppercase mb-4 text-gray-900">
                  법률
                </h3>
                <ul className="space-y-3">
                  <li>
                    <Link href="/legal" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      법적 고지
                    </Link>
                  </li>
                  <li>
                    <Link href="/privacy" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      개인정보 취급 방침
                    </Link>
                  </li>
                  <li>
                    <Link href="/terms" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      이용약관
                    </Link>
                  </li>
                  <li>
                    <Link href="/sitemap" className="text-sm text-gray-600 hover:text-gray-900 transition-colors">
                      사이트맵
                    </Link>
                  </li>
                </ul>
              </div>
            </div>

            {/* 개인정보 처리방침 및 소셜미디어 */}
            <div className="mt-12 pt-8 border-t border-gray-200">
              <div className="flex flex-col md:flex-row justify-between items-center space-y-4 md:space-y-0">
                {/* 소셜미디어 링크 */}
                <div className="flex items-center space-x-4">
                  <span className="text-sm text-gray-600">피에타 소셜미디어</span>
                  <div className="flex space-x-4">
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">Kakaotalk</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">Instagram</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">Facebook</span>
                    </Link>
                    <Link href="#" className="text-gray-500 hover:text-gray-900 transition-colors">
                      <span className="text-sm">YouTube</span>
                    </Link>
                  </div>
                </div>

                {/* 언어/지역 선택 */}
                <div className="flex items-center space-x-4 text-sm text-gray-600">
                  <button className="hover:text-gray-900 transition-colors border-r border-gray-300 pr-4">
                    국가/지역: 한국 (한국어)
                  </button>
                  <Link href="/global" className="hover:text-gray-900 transition-colors">
                    →
                  </Link>
                </div>
              </div>
            </div>

            {/* 회사 정보 및 저작권 */}
            <div className="mt-8 pt-6 border-t border-gray-100">
              <div className="text-xs text-gray-500 space-y-2">
                <p>
                  피에타컬렉션 주식회사 | 04539 서울특별시 중구 청계천로 19, 26층(소공동) | 사업자등록번호: 120-81-74197
                </p>
                <p>
                  대표자: 투자전문회사, Khong May Won Sharon | 통신판매업
                </p>
                <p>
                  신고번호: 2021-서울중구-01116 | 사업자정보확인
                </p>
                <p>
                  고객 센터 : 02-3280-0104 (contactpieta@christandior.com) | 호스팅 서비스 : Smile Hosting
                </p>
                <p className="font-medium text-gray-600 mt-4">
                  COPYRIGHT © CHRISTIAN DIOR COUTURE KOREA ALL RIGHTS RESERVED.
                </p>
                <p className="mt-2">
                  투자광고에 대한 주의사항 : 이 광고는 광고 참여 시점의 투자대상 및 투자위험 등에 대한 최종 안내로 활용됨니다.
                </p>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
  );
} 