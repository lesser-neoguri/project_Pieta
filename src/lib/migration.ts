'use client';

import { supabase } from '@/lib/supabase';
import logger from '@/lib/logger';

/**
 * Supabase Storage URL에서 경로를 추출하는 함수
 * @param url Supabase Storage URL
 * @returns 버킷 내 파일 경로
 */
export function extractPathFromUrl(url: string | null): string | null {
  if (!url) return null;
  
  try {
    // URL에서 파일 경로 추출
    // 예: https://xxx.supabase.co/storage/v1/object/public/images/filename.jpg
    const urlObj = new URL(url);
    const pathSegments = urlObj.pathname.split('/');
    
    // storage/v1/object/public/{bucket}/{filepath} 형태에서 파일경로 추출
    const bucketIndex = pathSegments.indexOf('public') + 1;
    
    if (bucketIndex > 0 && bucketIndex < pathSegments.length - 1) {
      // bucket 이후의 모든 세그먼트를 경로로 합침
      return pathSegments.slice(bucketIndex + 1).join('/');
    }
    
    return null;
  } catch (error) {
    logger.error('URL 파싱 오류:', error);
    return null;
  }
}

/**
 * 이미지 파일을 새 경로로 이동
 * @param bucket 버킷 이름
 * @param fromPath 기존 경로
 * @param toPath 새 경로
 * @returns 이동 결과
 */
export async function moveImage(bucket: string, fromPath: string, toPath: string) {
  try {
    const { data, error } = await supabase.storage
      .from(bucket)
      .move(fromPath, toPath);
      
    if (error) {
      throw error;
    }
    
    // 이동 후 새 URL 반환
    const { data: urlData } = supabase.storage
      .from(bucket)
      .getPublicUrl(toPath);
      
    return { success: true, newUrl: urlData.publicUrl };
  } catch (error) {
    logger.error('이미지 이동 오류:', error);
    return { success: false, error };
  }
}

/**
 * 이미지 URL을 새 경로로 이동
 * @param imageUrl 이동할 이미지 URL
 * @param newPath 새 경로 (파일명 포함)
 * @param bucket 버킷 이름 (기본값: 'images')
 * @returns 이동 결과
 */
export async function migrateImageUrl(imageUrl: string | null, newPath: string, bucket: string = 'images') {
  if (!imageUrl) return { success: false, error: '이미지 URL이 없습니다.' };
  
  const currentPath = extractPathFromUrl(imageUrl);
  if (!currentPath) return { success: false, error: '이미지 경로를 추출할 수 없습니다.' };
  
  return await moveImage(bucket, currentPath, newPath);
}

/**
 * 여러 이미지 URL을 새 경로로 이동
 * @param imageUrls 이동할 이미지 URL 배열
 * @param newBasePath 새 기본 경로 (폴더)
 * @param bucket 버킷 이름 (기본값: 'images')
 * @returns 이동 결과 배열
 */
export async function batchMigrateImages(
  imageUrls: (string | null)[],
  newBasePath: string,
  bucket: string = 'images'
) {
  const results = [];
  
  for (let i = 0; i < imageUrls.length; i++) {
    const imageUrl = imageUrls[i];
    if (!imageUrl) {
      results.push({ success: false, error: '이미지 URL이 없습니다.', index: i });
      continue;
    }
    
    const currentPath = extractPathFromUrl(imageUrl);
    if (!currentPath) {
      results.push({ success: false, error: '이미지 경로를 추출할 수 없습니다.', index: i });
      continue;
    }
    
    // 기존 파일명 추출
    const fileName = currentPath.split('/').pop();
    // 새 경로 생성 (경로 끝에 / 추가)
    const newPath = `${newBasePath}${newBasePath.endsWith('/') ? '' : '/'}${fileName}`;
    
    const result = await moveImage(bucket, currentPath, newPath);
    results.push({ ...result, index: i });
  }
  
  return results;
}

/**
 * 이미지를 다른 버킷으로 이동
 * @param imageUrl 이동할 이미지 URL
 * @param destinationBucket 대상 버킷 이름
 * @param newPath 새 경로 (파일명 포함, 선택적)
 * @returns 이동 결과
 */
export async function migrateImageToBucket(
  imageUrl: string | null,
  destinationBucket: string,
  newPath?: string
) {
  if (!imageUrl) return { success: false, error: '이미지 URL이 없습니다.' };
  
  const currentPath = extractPathFromUrl(imageUrl);
  if (!currentPath) return { success: false, error: '이미지 경로를 추출할 수 없습니다.' };
  
  // 기존 URL에서 버킷 이름 추출
  const urlObj = new URL(imageUrl);
  const pathSegments = urlObj.pathname.split('/');
  const bucketIndex = pathSegments.indexOf('public') + 1;
  const sourceBucket = pathSegments[bucketIndex];
  
  // 대상 경로 결정 (지정되지 않은 경우 기존 경로 사용)
  const targetPath = newPath || currentPath;
  
  try {
    const { data, error } = await supabase.storage
      .from(sourceBucket)
      .move(currentPath, targetPath, {
        destinationBucket
      });
      
    if (error) {
      throw error;
    }
    
    // 이동 후 새 URL 반환
    const { data: urlData } = supabase.storage
      .from(destinationBucket)
      .getPublicUrl(targetPath);
      
    return { success: true, newUrl: urlData.publicUrl };
  } catch (error) {
    logger.error('이미지 버킷 이동 오류:', error);
    return { success: false, error };
  }
} 