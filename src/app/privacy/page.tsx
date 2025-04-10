import MainLayout from '@/components/layout/MainLayout';

export default function PrivacyPage() {
  return (
    <MainLayout centered={false}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-light tracking-[0.2em] uppercase mb-8 text-center">개인정보처리방침</h1>
        
        <div className="space-y-8">
          <section>
            <h2 className="text-lg font-medium mb-4">1. 개인정보의 수집 및 이용 목적</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 다음의 목적을 위하여 개인정보를 처리합니다. 처리하고 있는 개인정보는 다음의 목적 이외의 용도로는 이용되지 않으며, 이용 목적이 변경되는 경우에는 개인정보 보호법 제18조에 따라 별도의 동의를 받는 등 필요한 조치를 이행할 예정입니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>회원 가입 및 관리</li>
              <li>서비스 제공 및 계약의 이행</li>
              <li>고객 상담 및 불만 처리</li>
              <li>신규 서비스 개발 및 마케팅에의 활용</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4">2. 수집하는 개인정보의 항목</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 회원가입, 상담, 서비스 신청 등을 위해 아래와 같은 개인정보를 수집하고 있습니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>이메일 주소, 비밀번호, 이름</li>
              <li>서비스 이용 기록, 접속 로그, 쿠키</li>
              <li>결제 기록</li>
              <li>기기 정보, IP 주소</li>
            </ul>
          </section>

          <section>
            <h2 className="text-lg font-medium mb-4">3. 개인정보의 보유 및 이용기간</h2>
            <p className="text-gray-600 leading-relaxed">
              회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 아래와 같이 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다.
            </p>
            <ul className="list-disc pl-5 mt-4 space-y-2 text-gray-600">
              <li>계약 또는 청약철회 등에 관한 기록: 5년</li>
              <li>대금결제 및 재화 등의 공급에 관한 기록: 5년</li>
              <li>소비자의 불만 또는 분쟁처리에 관한 기록: 3년</li>
            </ul>
          </section>
        </div>
      </div>
    </MainLayout>
  );
} 