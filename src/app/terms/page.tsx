import MainLayout from '@/components/layout/MainLayout';

export default function TermsPage() {
  return (
    <MainLayout centered={false}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-light tracking-[0.2em] uppercase mb-8 text-center">이용약관</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium mb-4">제1조 (목적)</h2>
            <p className="text-gray-600 leading-relaxed">
              이 약관은 피에타(이하 "회사")가 제공하는 서비스의 이용조건 및 절차, 회사와 회원 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4">제2조 (정의)</h2>
            <p className="text-gray-600 leading-relaxed">
              1. "서비스"란 회사가 제공하는 모든 서비스를 의미합니다.<br />
              2. "회원"이란 회사와 서비스 이용계약을 체결하고 회사가 제공하는 서비스를 이용하는 개인 또는 법인을 의미합니다.<br />
              3. "아이디(ID)"란 회원의 식별과 서비스 이용을 위하여 회원이 설정하고 회사가 승인하는 문자와 숫자의 조합을 의미합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4">제3조 (약관의 효력 및 변경)</h2>
            <p className="text-gray-600 leading-relaxed">
              1. 이 약관은 서비스 화면에 게시하거나 기타의 방법으로 회원에게 공지함으로써 효력이 발생합니다.<br />
              2. 회사는 필요한 경우 이 약관을 변경할 수 있으며, 변경된 약관은 제1항과 같은 방법으로 공지함으로써 효력이 발생합니다.
            </p>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4">제4조 (이용계약의 체결)</h2>
            <p className="text-gray-600 leading-relaxed">
              1. 이용계약은 회원이 되고자 하는 자가 약관의 내용에 대하여 동의를 한 다음 회원가입 신청을 하고 회사가 이러한 신청에 대하여 승낙함으로써 체결됩니다.<br />
              2. 회사는 회원가입 신청자의 신청에 대하여 서비스 이용을 승낙함을 원칙으로 합니다.
            </p>
          </section>
        </div>
      </div>
    </MainLayout>
  );
} 