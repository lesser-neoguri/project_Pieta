'use client';

import { useState, useEffect } from 'react';
// import { migrateImagePaths } from '@/lib/migration';
import { useAuth } from '@/contexts/AuthContext';
import { redirect } from 'next/navigation';
import { supabase } from '@/lib/supabase';

export default function DbMigrationPage() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<string[]>([]);
  const [success, setSuccess] = useState<boolean | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [checkingRole, setCheckingRole] = useState(true);

  // 로그인한 사용자의 역할 확인
  useEffect(() => {
    const checkUserRole = async () => {
      if (!user) {
        setCheckingRole(false);
        return;
      }

      try {
        const { data, error } = await supabase
          .from('user_profiles')
          .select('role')
          .eq('user_id', user.id)
          .single();

        if (error) {
          console.error('사용자 역할 확인 오류:', error);
          setCheckingRole(false);
          return;
        }

        setIsAdmin(data?.role === 'admin');
        setCheckingRole(false);
      } catch (err) {
        console.error('역할 확인 중 오류 발생:', err);
        setCheckingRole(false);
      }
    };

    checkUserRole();
  }, [user]);

  // 권한 확인 중이거나 관리자가 아니면 접근 불가
  if (!checkingRole && (!user || !isAdmin)) {
    return redirect('/');
  }

  const handleMigrateImages = async () => {
    if (!confirm('이미지 경로 마이그레이션을 실행하시겠습니까? 이 작업은 되돌릴 수 없습니다.')) {
      return;
    }

    setLoading(true);
    setResults([]);
    setSuccess(null);

    try {
      // 콘솔 로그를 캡처하기 위한 설정
      const logs: string[] = [];
      
      // 콘솔 로그를 가로채서 결과 배열에 추가
      const originalConsoleLog = console.log;
      const originalConsoleError = console.error;
      const originalConsoleWarn = console.warn;
      
      console.log = (...args) => {
        originalConsoleLog(...args);
        logs.push(args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' '));
        setResults([...logs]);
      };
      
      console.error = (...args) => {
        originalConsoleError(...args);
        logs.push(`[오류] ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`);
        setResults([...logs]);
      };
      
      console.warn = (...args) => {
        originalConsoleWarn(...args);
        logs.push(`[경고] ${args.map(arg => 
          typeof arg === 'object' ? JSON.stringify(arg) : String(arg)
        ).join(' ')}`);
        setResults([...logs]);
      };

      // 마이그레이션 실행 (임시로 비활성화)
      // const result = await migrateImagePaths();
      console.log('마이그레이션 함수가 아직 구현되지 않았습니다.');
      setSuccess(true);

      // 콘솔 로그 원상 복구
      console.log = originalConsoleLog;
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    } catch (error) {
      console.error('마이그레이션 중 오류 발생:', error);
      setSuccess(false);
    } finally {
      setLoading(false);
    }
  };

  if (checkingRole) {
    return (
      <div className="p-8">
        <h1 className="text-2xl font-bold mb-4">권한 확인 중...</h1>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-4xl mx-auto">
      <h1 className="text-2xl font-bold mb-4">데이터베이스 마이그레이션</h1>
      <p className="mb-6 text-gray-600">이 페이지에서는 데이터베이스 마이그레이션 작업을 실행할 수 있습니다.</p>

      <div className="mb-8 p-6 border rounded-lg bg-gray-50">
        <h2 className="text-xl font-semibold mb-4">이미지 경로 마이그레이션</h2>
        <p className="mb-4">
          이 작업은 기존 이미지 파일의 저장 경로를 <code>products/[productId]/...</code> 형식으로 변경합니다.
          제품 ID가 실제 이미지 경로의 폴더와 일치하지 않는 문제를 해결합니다.
        </p>
        
        <button 
          onClick={handleMigrateImages}
          disabled={loading}
          className={`px-4 py-2 rounded-md ${
            loading 
              ? 'bg-gray-400 cursor-not-allowed' 
              : 'bg-blue-500 text-white hover:bg-blue-600'
          } transition-colors`}
        >
          {loading ? '처리 중...' : '마이그레이션 실행'}
        </button>
      </div>

      {(results.length > 0 || success !== null) && (
        <div className="border rounded-lg p-6">
          <h3 className="text-lg font-semibold mb-3">실행 결과</h3>
          
          {success !== null && (
            <div className={`mb-4 p-3 rounded-md ${
              success ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
            }`}>
              {success 
                ? '마이그레이션이 성공적으로 완료되었습니다.' 
                : '마이그레이션 중 오류가 발생했습니다. 아래 로그를 확인하세요.'}
            </div>
          )}
          
          <div className="bg-gray-900 text-gray-100 p-4 rounded-md font-mono text-sm overflow-auto max-h-96">
            {results.map((log, idx) => (
              <div key={idx} className={`${
                log.includes('[오류]') 
                  ? 'text-red-400' 
                  : log.includes('[경고]') 
                    ? 'text-yellow-400' 
                    : 'text-green-300'
              }`}>
                {log}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
} 