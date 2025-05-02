import { createClient } from '@supabase/supabase-js';

// 환경 변수에서 Supabase URL과 API 키 가져오기
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbqguwfaqhmbdypbghqo.supabase.co';
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicWd1d2ZhcWhtYmR5cGJnaHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTUzNzYsImV4cCI6MjA1Nzc3MTM3Nn0.1yoh9diwvnEuetjKpawAIFNyuOw5tKs-RiEbtfpxhoM';

// 환경 변수가 설정되지 않은 경우 경고 로그 출력
if (!process.env.NEXT_PUBLIC_SUPABASE_URL || !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY) {
  console.warn(
    '경고: Supabase URL 또는 API 키가 환경 변수에 설정되지 않았습니다.\n' +
    '.env.local 파일에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요.\n' +
    '현재는 기본값을 사용합니다.'
  );
}

// 타임아웃 설정이 포함된 옵션 추가
const options = {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
  },
  global: {
    fetch: (...args: Parameters<typeof fetch>) => {
      const [url, options = {}] = args;
      return fetch(url, {
        ...options,
        // 요청 타임아웃을 15초로 설정
        signal: AbortSignal.timeout(15000),
      });
    },
  },
};

export const supabase = createClient(supabaseUrl, supabaseKey, options);

// 연결 상태 모니터링을 위한 핼퍼 함수 추가
export const checkSupabaseConnection = async () => {
  try {
    // 간단한 쿼리를 실행하여 연결 상태 확인
    const { data, error } = await supabase.from('products').select('id').limit(1);
    
    if (error) {
      console.error('Supabase 연결 확인 오류:', error);
      return false;
    }
    
    return true;
  } catch (e) {
    console.error('Supabase 연결 확인 중 예외 발생:', e);
    return false;
  }
};

// 제품 삭제 함수 - 스토리지 이미지도 함께 삭제
export const deleteProductWithImages = async (productId: string) => {
  try {
    // 1. product_images 테이블에서 이미지 정보 가져오기
    const { data: imageData, error: imageError } = await supabase
      .from('product_images')
      .select('image_url')
      .eq('product_id', productId);
    
    if (imageError) throw imageError;

    // 2. 제품 삭제 (cascade로 인해 product_images 레코드도 자동 삭제됨)
    const { error: deleteError } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);
    
    if (deleteError) throw deleteError;

    // 3. 스토리지에서 이미지 파일 삭제
    if (imageData && imageData.length > 0) {
      for (const image of imageData) {
        if (image.image_url) {
          await deleteImageFromStorage(image.image_url);
        }
      }
    }

    // 4. 메인 제품 이미지 삭제 (있는 경우)
    const { data: productData, error: productError } = await supabase
      .from('products')
      .select('product_image_url')
      .eq('id', productId)
      .single();

    if (!productError && productData?.product_image_url) {
      await deleteImageFromStorage(productData.product_image_url);
    }

    // 5. products/[productId] 폴더 전체 삭제
    try {
      // 해당 제품의 모든 이미지가 저장된 폴더 경로
      const folderPath = `products/${productId}`;
      
      // 폴더 내의 모든 파일 목록 가져오기
      const { data: fileList, error: listError } = await supabase.storage
        .from('images')
        .list(folderPath);
        
      if (!listError && fileList && fileList.length > 0) {
        // 모든 파일 경로 배열 생성
        const filesToRemove = fileList.map(file => `${folderPath}/${file.name}`);
        
        // 파일 일괄 삭제
        const { error: removeError } = await supabase.storage
          .from('images')
          .remove(filesToRemove);
          
        if (removeError) {
          console.error('제품 폴더 내 파일 삭제 오류:', removeError);
        }
      }
    } catch (folderError) {
      console.error('제품 폴더 삭제 중 오류:', folderError);
    }

    return { success: true };
  } catch (error) {
    console.error('제품 및 이미지 삭제 중 오류:', error);
    return { success: false, error };
  }
};

/**
 * 스토리지 URL에서 경로를 추출하고 파일을 삭제하는 유틸리티 함수
 */
export const deleteImageFromStorage = async (imageUrl: string | null): Promise<boolean> => {
  if (!imageUrl) return false;
  
  try {
    // 스토리지 URL에서 경로 추출
    const storagePath = extractStoragePath(imageUrl);
    if (!storagePath) return false;
    
    // 버킷과 파일 경로 분리
    const [bucket, ...pathParts] = storagePath.split('/');
    const filePath = pathParts.join('/');
    
    // 스토리지에서 파일 삭제
    const { error } = await supabase.storage
      .from(bucket)
      .remove([filePath]);
      
    if (error) {
      console.error('이미지 삭제 오류:', error);
      return false;
    }
    
    return true;
  } catch (error) {
    console.error('이미지 삭제 중 오류 발생:', error);
    return false;
  }
};

/**
 * 스토리지 URL에서 경로를 추출하는 유틸리티 함수
 * 예: https://xxx.supabase.co/storage/v1/object/public/images/products/abc123/image.jpg
 * -> images/products/abc123/image.jpg
 */
export const extractStoragePath = (url: string | null): string | null => {
  if (!url) return null;
  
  try {
    // URL 구조 확인
    if (!url.includes('/storage/') && !url.includes('/object/public/')) {
      return null;
    }
    
    // 'public/' 이후의 부분 추출 (버킷 이름 + 파일 경로)
    const publicIndex = url.indexOf('/public/');
    if (publicIndex === -1) return null;
    
    return url.slice(publicIndex + 8); // '/public/'.length = 8
  } catch (error) {
    console.error('URL 파싱 오류:', error);
    return null;
  }
}; 