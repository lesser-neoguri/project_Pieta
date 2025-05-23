import axios from 'axios';
import logger from '@/lib/logger';

export type PriceInfo = {
  type: string;
  buyPrice: string;
  sellPrice: string;
  unit: string;
};

// 금시세 데이터를 가져오는 함수
export async function fetchGoldPrices(): Promise<{priceData: PriceInfo[], timestamp: string}> {
  try {
    // 내부 API 엔드포인트를 통해 데이터 가져오기
    const { data } = await axios.get('/api/gold-prices');
    
    return {
      priceData: data.priceData,
      timestamp: data.timestamp
    };
  } catch (error) {
    logger.error('금시세 데이터 가져오기 실패:', error);
    
    // 오류 발생 시 기본 데이터 반환
    return {
      priceData: getDefaultPriceData(),
      timestamp: new Date().toLocaleString('ko-KR') + ' (마지막 업데이트 실패)'
    };
  }
}

// 기본 시세 데이터 (API 실패 시 사용)
function getDefaultPriceData(): PriceInfo[] {
  return [
    { type: '순금시세 Gold24k-3.75g', buyPrice: '610,000', sellPrice: '525,000', unit: '원/3.75g' },
    { type: '18K 금시세 Gold18k-3.75g', buyPrice: '제품시세적용', sellPrice: '385,900', unit: '원/3.75g' },
    { type: '14K 금시세 Gold14k-3.75g', buyPrice: '제품시세적용', sellPrice: '299,300', unit: '원/3.75g' },
    { type: '백금시세 Platinum-3.75g', buyPrice: '205,000', sellPrice: '166,000', unit: '원/3.75g' },
    { type: '은시세 Silver-3.75g', buyPrice: '6,950', sellPrice: '5,530', unit: '원/3.75g' }
  ];
} 