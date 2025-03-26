import { NextResponse } from 'next/server';
import axios from 'axios';
import * as cheerio from 'cheerio';

// 금시세 정보 타입 정의
type PriceInfo = {
  type: string;
  buyPrice: string;
  sellPrice: string;
  unit: string;
};

// API 핸들러 - GET 요청 처리
export async function GET() {
  try {
    // 한국금거래소 포항점 사이트에서 데이터 가져오기
    const { data } = await axios.get('https://goldlee6479.koreagoldx.co.kr/', {
      headers: {
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
      }
    });

    // cheerio로 HTML 파싱
    const $ = cheerio.load(data);
    
    // 시세 테이블 찾기
    const priceData: PriceInfo[] = [];
    
    // 시세표의 각 행을 찾아 데이터 추출 - 한국금거래소 포항점 사이트 구조에 맞게 조정
    $('.table-data tr').each(function(_, element) {
      const typeText = $(element).find('td:nth-child(1)').text().trim();
      
      // 유효한 시세 행인지 확인
      if (typeText.includes('Gold24k') || 
          typeText.includes('Gold18k') || 
          typeText.includes('Gold14k') || 
          typeText.includes('Platinum') || 
          typeText.includes('Silver')) {
        
        // 매수가(내가 살 때)와 매도가(내가 팔 때) 추출 - 한국금거래소 포항점 사이트 구조에 맞게 조정
        // 이 사이트에서는 매수가에 "⬆️1.29%8,000" 같은 형식의 텍스트가 포함되어 있음
        let buyPriceText = $(element).find('td:nth-child(2)').text().trim();
        let sellPriceText = $(element).find('td:nth-child(3)').text().trim();
        
        // 숫자만 추출 (예: "6180001.29%8,000" -> "618000")
        const buyPrice = buyPriceText.replace(/[^0-9]/g, '');
        
        // 숫자 추출 후 콤마 포맷팅
        let formattedBuyPrice = '';
        let formattedSellPrice = '';
        
        if (buyPrice) {
          formattedBuyPrice = parseInt(buyPrice).toLocaleString() + '원';
        } else if (buyPriceText.includes('제품시세적용')) {
          formattedBuyPrice = '제품시세적용';
        } else {
          formattedBuyPrice = '시세확인중';
        }
        
        // 판매가 처리
        // 자사백금바기준, 자사실버바기준 등 텍스트 제거
        sellPriceText = sellPriceText.replace(/\*\*.*\*\*/g, '').trim();
        const sellPrice = sellPriceText.replace(/[^0-9]/g, '');
        
        if (sellPrice) {
          formattedSellPrice = parseInt(sellPrice).toLocaleString() + '원';
        } else {
          formattedSellPrice = '시세확인중';
        }
        
        // 정제된 정보 저장
        priceData.push({
          type: typeText,
          buyPrice: formattedBuyPrice,
          sellPrice: formattedSellPrice,
          unit: '원/3.75g'
        });
      }
    });
    
    // 데이터가 비어있거나 오류가 발생했을 경우 기본 데이터 사용
    if (priceData.length === 0) {
      console.log('시세 데이터를 찾을 수 없음, 기본 데이터 사용');
      return NextResponse.json({ 
        priceData: getDefaultPriceData(),
        timestamp: new Date().toLocaleString('ko-KR'),
        source: '기본 데이터' 
      });
    }
    
    // 시세 업데이트 시간 정보 추출
    let timestamp = '';
    const dateText = $('h2:contains("한국금거래소 시세 라인업") + div').text().trim();
    
    if (dateText) {
      timestamp = dateText + ' ' + new Date().toLocaleTimeString('ko-KR');
    } else {
      timestamp = new Date().toLocaleString('ko-KR');
    }

    // 결과 반환
    return NextResponse.json({ 
      priceData, 
      timestamp,
      source: '한국금거래소 포항점'
    });
  } catch (error) {
    console.error('API - 금시세 데이터 가져오기 실패:', error);
    
    // 오류 발생 시 기본 데이터 반환
    return NextResponse.json({ 
      priceData: getDefaultPriceData(),
      timestamp: new Date().toLocaleString('ko-KR') + ' (마지막 업데이트 실패)',
      source: '기본 데이터'
    });
  }
}

// 기본 시세 데이터 (API 실패 시 사용)
function getDefaultPriceData(): PriceInfo[] {
  return [
    { type: '순금시세 Gold24k-3.75g', buyPrice: '618,000원', sellPrice: '532,000원', unit: '원/3.75g' },
    { type: '18K 금시세 Gold18k-3.75g', buyPrice: '제품시세적용', sellPrice: '391,100원', unit: '원/3.75g' },
    { type: '14K 금시세 Gold14k-3.75g', buyPrice: '제품시세적용', sellPrice: '303,300원', unit: '원/3.75g' },
    { type: '백금시세 Platinum-3.75g', buyPrice: '203,000원', sellPrice: '165,000원', unit: '원/3.75g' },
    { type: '은시세 Silver-3.75g', buyPrice: '7,010원', sellPrice: '5,570원', unit: '원/3.75g' }
  ];
} 