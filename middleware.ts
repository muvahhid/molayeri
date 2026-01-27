import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

export async function middleware(request: NextRequest) {
  // 1. Yanıt (Response) nesnesini oluştur
  let response = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  // 2. Supabase İstemcisini oluştur (Çerezleri yönetebilen versiyon)
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return request.cookies.get(name)?.value
        },
        set(name: string, value: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name: string, options: CookieOptions) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
          response = NextResponse.next({
            request: {
              headers: request.headers,
            },
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // 3. Kullanıcı oturumunu kontrol et
  const { data: { user } } = await supabase.auth.getUser()

  // 4. KURAL: Eğer kullanıcı '/admin' paneline girmeye çalışıyorsa ve giriş yapmamışsa
  if (request.nextUrl.pathname.startsWith('/admin') && !user) {
    // Onu yaka paça '/login' sayfasına at
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  // 5. KURAL: Eğer kullanıcı zaten giriş yapmışsa ve '/login' sayfasına girmeye çalışıyorsa
  if (request.nextUrl.pathname.startsWith('/login') && user) {
    // Onu direkt panele yönlendir (Tekrar giriş yapmasına gerek yok)
    const adminUrl = request.nextUrl.clone()
    adminUrl.pathname = '/admin/dashboard'
    return NextResponse.redirect(adminUrl)
  }

  return response
}

// Hangi sayfalarda çalışacağını belirtiyoruz (Gereksiz dosyaları yormasın diye)
export const config = {
  matcher: [
    '/admin/:path*', // Admin altındaki her şey
    '/login',        // Giriş sayfası
  ],
}