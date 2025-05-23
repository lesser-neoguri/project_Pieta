import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';

export async function middleware(request: NextRequest) {
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://gbqguwfaqhmbdypbghqo.supabase.co',
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdicWd1d2ZhcWhtYmR5cGJnaHFvIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDIxOTUzNzYsImV4cCI6MjA1Nzc3MTM3Nn0.1yoh9diwvnEuetjKpawAIFNyuOw5tKs-RiEbtfpxhoM',
    {
      cookies: {
        getAll: () => {
          return request.cookies.getAll().map((cookie) => ({
            name: cookie.name,
            value: cookie.value,
          }));
        },
        setAll: (cookies) => {
          for (const cookie of cookies) {
            response.cookies.set(cookie.name, cookie.value, cookie.options);
          }
        },
      },
    }
  );

  await supabase.auth.getSession();
  return response;
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
     */
    '/((?!_next/static|_next/image|favicon.ico|images/|static/).*)',
  ],
}; 