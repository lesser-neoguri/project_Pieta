'use client';

import { useState } from 'react';
import MainLayout from '@/components/layout/MainLayout';

interface FAQItem {
  question: string;
  answer: string;
}

const faqItems: FAQItem[] = [
  {
    question: '회원가입은 어떻게 하나요?',
    answer: '상단 메뉴의 "회원가입" 버튼을 클릭하여 필요한 정보를 입력하시면 됩니다. 일반 회원, 판매자 회원, 도매 회원 중 선택하여 가입하실 수 있습니다.'
  },
  {
    question: '비밀번호를 잊어버렸어요.',
    answer: '로그인 페이지에서 "비밀번호를 잊으셨나요?" 링크를 클릭하시면 비밀번호 재설정 이메일을 받으실 수 있습니다.'
  },
  {
    question: '주문 취소는 어떻게 하나요?',
    answer: '주문 취소는 배송 시작 전까지 가능합니다. 마이페이지의 주문 내역에서 취소하실 주문을 선택하여 취소 신청을 하실 수 있습니다.'
  },
  {
    question: '반품/교환은 어떻게 진행되나요?',
    answer: '상품 수령 후 7일 이내에 마이페이지에서 반품/교환 신청이 가능합니다. 단, 상품이 사용되거나 훼손된 경우에는 반품/교환이 제한될 수 있습니다.'
  },
  {
    question: '도매회원은 어떤 혜택이 있나요?',
    answer: '도매회원은 대량 구매 시 특별 할인가가 적용되며, 전용 상품 구매가 가능합니다. 또한 전담 매니저가 배정되어 맞춤 서비스를 제공받으실 수 있습니다.'
  }
];

export default function FAQPage() {
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  const toggleFAQ = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  return (
    <MainLayout centered={false}>
      <div className="max-w-3xl mx-auto">
        <h1 className="text-2xl font-light tracking-[0.2em] uppercase mb-8 text-center">자주 묻는 질문</h1>
        
        <div className="space-y-4">
          {faqItems.map((item, index) => (
            <div key={index} className="border-b border-gray-200">
              <button
                onClick={() => toggleFAQ(index)}
                className="w-full py-4 text-left flex justify-between items-center hover:text-gray-600 transition-colors"
              >
                <span className="text-lg">{item.question}</span>
                <span className="text-2xl transform transition-transform duration-200" style={{
                  transform: openIndex === index ? 'rotate(45deg)' : 'rotate(0deg)'
                }}>
                  +
                </span>
              </button>
              
              <div 
                className={`overflow-hidden transition-all duration-200 ${
                  openIndex === index ? 'max-h-40 pb-4' : 'max-h-0'
                }`}
              >
                <p className="text-gray-600 leading-relaxed">
                  {item.answer}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </MainLayout>
  );
} 