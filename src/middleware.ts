import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  console.log('🌐 Middleware: 요청 처리 시작 -', request.nextUrl.pathname);
  
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  try {
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbqguwfaqhmbdypbghqo.supabase.co',
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicWd1d2ZhcWhtYmR5cGJnaHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTUzNzYsImV4cCI6MjA1Nzc3MTM3Nn0.1yoh9diwvnEuetjKpawAIFNyuOw5tKs-RiEbtfpxhoM',
      {
        cookies: {
          getAll: () => {
            const cookies = request.cookies.getAll();
            console.log('🍪 Middleware: 읽어온 쿠키 개수:', cookies.length);
            return cookies.map((cookie) => ({
              name: cookie.name,
              value: cookie.value,
            }));
          },
          setAll: (cookies) => {
            console.log('🍪 Middleware: 설정할 쿠키 개수:', cookies.length);
            for (const cookie of cookies) {
              // Chrome 호환성을 위한 쿠키 옵션 개선
              const cookieOptions = {
                ...cookie.options,
                httpOnly: cookie.options?.httpOnly ?? true,
                secure: process.env.NODE_ENV === 'production' ? true : false,
                sameSite: (cookie.options?.sameSite as 'strict' | 'lax' | 'none') ?? 'lax',
                path: cookie.options?.path ?? '/',
                maxAge: cookie.options?.maxAge ?? 60 * 60 * 24 * 7, // 7일
              };
              
              console.log('🍪 Middleware: 쿠키 설정 -', cookie.name, cookieOptions);
              response.cookies.set(cookie.name, cookie.value, cookieOptions);
            }
          },
        },
      }
    );

    // 세션 확인 및 갱신
    const { data: { session }, error } = await supabase.auth.getSession();
    
    if (error) {
      console.warn('⚠️ Middleware: 세션 확인 중 오류:', error.message);
      // 세션 오류 시 인증 관련 쿠키 정리
      const authCookieNames = ['sb-access-token', 'sb-refresh-token'];
      authCookieNames.forEach(name => {
        response.cookies.set(name, '', {
          expires: new Date(0),
          path: '/',
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax'
        });
      });
    } else if (session) {
      console.log('✅ Middleware: 유효한 세션 확인됨 -', session.user.email);
    } else {
      console.log('ℹ️ Middleware: 세션 없음');
    }

    // 특정 경로에 대한 추가 처리
    const { pathname } = request.nextUrl;
    
    // 개발 환경에서 Fast Refresh 관련 경로는 건너뛰기
    if (process.env.NODE_ENV === 'development' && (
      pathname.startsWith('/_next/') ||
      pathname.startsWith('/__nextjs_') ||
      pathname.includes('webpack-hmr')
    )) {
      console.log('🔧 Middleware: 개발 경로 건너뛰기 -', pathname);
      return response;
    }

    console.log('✅ Middleware: 요청 처리 완료 -', pathname);
    return response;
    
  } catch (error) {
    console.error('❌ Middleware: 처리 중 예외 발생:', error);
    
    // 오류 발생 시 깨끗한 응답 반환
    const cleanResponse = NextResponse.next({
      request: {
        headers: request.headers,
      },
    });
    
    // 오류 시 문제가 될 수 있는 인증 쿠키들 정리
    if (typeof error === 'object' && error !== null && 'message' in error) {
      const errorMessage = (error as Error).message;
      if (errorMessage.includes('auth') || errorMessage.includes('session') || errorMessage.includes('token')) {
        console.log('🧹 Middleware: 인증 관련 오류로 인한 쿠키 정리');
        const authCookieNames = ['sb-access-token', 'sb-refresh-token'];
        authCookieNames.forEach(name => {
          cleanResponse.cookies.set(name, '', {
            expires: new Date(0),
            path: '/',
            httpOnly: true,
            secure: process.env.NODE_ENV === 'production',
            sameSite: 'lax'
          });
        });
      }
    }
    
    return cleanResponse;
  }
}

export const config = {
  matcher: [
    /*
     * Match all request paths except:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - images (files in the public/images directory)
     * - static files in the public directory
     * - webpack-hmr (hot module reload)
     * - __nextjs_original-stack-frame (development)
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|static/|webpack-hmr|__nextjs_).*)',
  ],
}; 