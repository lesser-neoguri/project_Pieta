import { supabase } from './supabase';

/**
 * 이미지 경로 마이그레이션 - 기존 이미지를 새 경로로 이동
 * 1. 루트 디렉토리나 다른 경로에 있는 이미지를 products/[productID]/ 경로로 복사
 * 2. 데이터베이스 업데이트
 */
export const migrateImagePaths = async () => {
  try {
    console.log('이미지 경로 마이그레이션 시작...');
    
    // 1. 모든 제품 가져오기
    const { data: products, error: productError } = await supabase
      .from('products')
      .select('id, product_name, product_image_url');
      
    if (productError) throw productError;
    
    if (!products || products.length === 0) {
      console.log('마이그레이션할 제품이 없습니다.');
      return;
    }
    
    console.log(`총 ${products.length}개 제품의 이미지를 마이그레이션합니다.`);
    
    // 2. 각 제품의 메인 이미지 마이그레이션
    for (const product of products) {
      if (!product.product_image_url) continue;
      
      try {
        // 기존 이미지 URL에서 경로 정보 추출
        const currentUrl = product.product_image_url;
        const currentPath = extractPathFromUrl(currentUrl);
        
        if (!currentPath) {
          console.log(`제품 ${product.id}: URL 경로 추출 실패 - ${currentUrl}`);
          continue;
        }
        
        // 현재 경로에서 실제 제품 ID 추출 (URL의 ID와 제품 ID가 불일치하는 경우를 처리)
        const pathParts = currentPath.split('/');
        let wrongProductId = null;
        
        // products/[wrongId]/ 형식인지 확인
        if (pathParts.length >= 2 && pathParts[0] === 'products') {
          wrongProductId = pathParts[1];
          
          // 이미 올바른 경로에 있는 경우 건너뛰기
          if (wrongProductId === product.id) {
            console.log(`제품 ${product.id}: 이미 올바른 경로에 있습니다 - ${currentPath}`);
            continue;
          }
        }
        
        // 이미지 파일명 추출
        const fileName = pathParts[pathParts.length - 1];
        
        // 새 경로 생성
        const newPath = `products/${product.id}/${fileName}`;
        
        console.log(`제품 ${product.id}: 이미지 경로 이동 - ${currentPath} -> ${newPath}`);
        
        // 파일 복사 (supabase storage API는 직접 이동 기능이 없어 복사 후 삭제 방식으로 구현)
        // 1. 기존 파일 다운로드
        const { data: fileData, error: downloadError } = await supabase.storage
          .from('images')
          .download(currentPath);
          
        if (downloadError) {
          console.error(`제품 ${product.id}: 파일 다운로드 오류 - ${downloadError.message}`);
          continue;
        }
        
        // 2. 새 경로에 파일 업로드
        const { error: uploadError } = await supabase.storage
          .from('images')
          .upload(newPath, fileData, {
            cacheControl: '3600',
            upsert: true
          });
          
        if (uploadError) {
          console.error(`제품 ${product.id}: 파일 업로드 오류 - ${uploadError.message}`);
          continue;
        }
        
        // 3. 새 URL 생성
        const { data: urlData } = supabase.storage
          .from('images')
          .getPublicUrl(newPath);
          
        const newUrl = urlData.publicUrl;
        
        // 4. 데이터베이스 업데이트
        const { error: updateError } = await supabase
          .from('products')
          .update({ product_image_url: newUrl })
          .eq('id', product.id);
          
        if (updateError) {
          console.error(`제품 ${product.id}: 데이터베이스 업데이트 오류 - ${updateError.message}`);
          continue;
        }
        
        // 5. 기존 파일 삭제 (선택적)
        const { error: deleteError } = await supabase.storage
          .from('images')
          .remove([currentPath]);
          
        if (deleteError) {
          console.warn(`제품 ${product.id}: 기존 파일 삭제 오류 - ${deleteError.message}`);
        }
        
        console.log(`제품 ${product.id}: 마이그레이션 완료 - ${newUrl}`);
      } catch (error) {
        console.error(`제품 ${product.id}: 처리 중 오류 발생`, error);
      }
    }
    
    // 3. product_images 테이블의 추가 이미지 마이그레이션
    const { data: additionalImages, error: additionalError } = await supabase
      .from('product_images')
      .select('id, product_id, image_url');
      
    if (additionalError) throw additionalError;
    
    if (additionalImages && additionalImages.length > 0) {
      console.log(`총 ${additionalImages.length}개의 추가 이미지를 마이그레이션합니다.`);
      
      for (const image of additionalImages) {
        if (!image.image_url) continue;
        
        try {
          // 기존 이미지 URL에서 경로 정보 추출
          const currentUrl = image.image_url;
          const currentPath = extractPathFromUrl(currentUrl);
          
          if (!currentPath) {
            console.log(`추가 이미지 ${image.id}: URL 경로 추출 실패 - ${currentUrl}`);
            continue;
          }
          
          // 현재 경로에서 실제 제품 ID 추출
          const pathParts = currentPath.split('/');
          let wrongProductId = null;
          
          // products/[wrongId]/ 형식인지 확인
          if (pathParts.length >= 2 && pathParts[0] === 'products') {
            wrongProductId = pathParts[1];
            
            // 이미 올바른 경로에 있는 경우 건너뛰기
            if (wrongProductId === image.product_id) {
              console.log(`추가 이미지 ${image.id}: 이미 올바른 경로에 있습니다 - ${currentPath}`);
              continue;
            }
          }
          
          // 이미지 파일명 추출
          const fileName = pathParts[pathParts.length - 1];
          
          // 새 경로 생성
          const newPath = `products/${image.product_id}/${fileName}`;
          
          console.log(`추가 이미지 ${image.id}: 이미지 경로 이동 - ${currentPath} -> ${newPath}`);
          
          // 파일 복사
          // 1. 기존 파일 다운로드
          const { data: fileData, error: downloadError } = await supabase.storage
            .from('images')
            .download(currentPath);
            
          if (downloadError) {
            console.error(`추가 이미지 ${image.id}: 파일 다운로드 오류 - ${downloadError.message}`);
            continue;
          }
          
          // 2. 새 경로에 파일 업로드
          const { error: uploadError } = await supabase.storage
            .from('images')
            .upload(newPath, fileData, {
              cacheControl: '3600',
              upsert: true
            });
            
          if (uploadError) {
            console.error(`추가 이미지 ${image.id}: 파일 업로드 오류 - ${uploadError.message}`);
            continue;
          }
          
          // 3. 새 URL 생성
          const { data: urlData } = supabase.storage
            .from('images')
            .getPublicUrl(newPath);
            
          const newUrl = urlData.publicUrl;
          
          // 4. 데이터베이스 업데이트
          const { error: updateError } = await supabase
            .from('product_images')
            .update({ image_url: newUrl })
            .eq('id', image.id);
            
          if (updateError) {
            console.error(`추가 이미지 ${image.id}: 데이터베이스 업데이트 오류 - ${updateError.message}`);
            continue;
          }
          
          // 5. 기존 파일 삭제 (선택적)
          const { error: deleteError } = await supabase.storage
            .from('images')
            .remove([currentPath]);
            
          if (deleteError) {
            console.warn(`추가 이미지 ${image.id}: 기존 파일 삭제 오류 - ${deleteError.message}`);
          }
          
          console.log(`추가 이미지 ${image.id}: 마이그레이션 완료 - ${newUrl}`);
        } catch (error) {
          console.error(`추가 이미지 ${image.id}: 처리 중 오류 발생`, error);
        }
      }
    }
    
    console.log('이미지 경로 마이그레이션 완료!');
    return { success: true };
  } catch (error) {
    console.error('이미지 경로 마이그레이션 중 오류 발생:', error);
    return { success: false, error };
  }
};

/**
 * URL에서 스토리지 경로 추출하는 유틸리티 함수
 * 예: https://xxx.supabase.co/storage/v1/object/public/images/products/abc123/image.jpg
 * -> products/abc123/image.jpg
 */
const extractPathFromUrl = (url: string | null): string | null => {
  if (!url) return null;
  
  try {
    // URL 구조 확인
    if (!url.includes('/storage/') && !url.includes('/object/public/')) {
      return null;
    }
    
    // 'public/' 이후의 부분 추출 (버킷 이름 + 파일 경로)
    const publicIndex = url.indexOf('/public/');
    if (publicIndex === -1) return null;
    
    const fullPath = url.slice(publicIndex + 8); // '/public/'.length = 8
    
    // 버킷 이름 제외한 실제 파일 경로 추출
    const pathParts = fullPath.split('/');
    if (pathParts.length <= 1) return null;
    
    // 첫 번째 부분(버킷 이름) 이후의 경로 반환
    return pathParts.slice(1).join('/');
  } catch (error) {
    console.error('URL 파싱 오류:', error);
    return null;
  }
}; 