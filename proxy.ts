import { createServerClient, type CookieOptions } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'
import {
  fetchUserRoleById,
  getDashboardPathForRole,
  isAdminRole,
  isMerchantRole,
} from '@/lib/auth-role'

export async function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname
  const isAdminPath = pathname.startsWith('/admin')
  const isMerchantPath = pathname.startsWith('/merchant')
  const isFuturePath = pathname === '/future' || pathname.startsWith('/future/')
  const isLoginPath = pathname.startsWith('/login')

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
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // 4. KURAL: Korumalı alanlar için giriş zorunlu
  if ((isAdminPath || isMerchantPath || isFuturePath) && !user) {
    const loginUrl = request.nextUrl.clone()
    loginUrl.pathname = '/login'
    return NextResponse.redirect(loginUrl)
  }

  if (!user) {
    return response
  }

  const fallbackRole =
    ((user.user_metadata as Record<string, unknown> | undefined)?.role as
      | string
      | undefined) || 'user'
  const role = await fetchUserRoleById(supabase, user.id, fallbackRole)
  const targetDashboard = getDashboardPathForRole(role)

  // 5. KURAL: Kullanıcı login ekranındaysa doğrudan rol paneline yönlendir
  if (isLoginPath) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = targetDashboard
    return NextResponse.redirect(redirectUrl)
  }

  // 6. KURAL: Admin alanı sadece admin
  if (isAdminPath && !isAdminRole(role)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = targetDashboard
    return NextResponse.redirect(redirectUrl)
  }

  // 7. KURAL: İşletmeci alanı sadece işletmeci/pending_business
  if (isMerchantPath && !isMerchantRole(role)) {
    const redirectUrl = request.nextUrl.clone()
    redirectUrl.pathname = targetDashboard
    return NextResponse.redirect(redirectUrl)
  }

  return response
}

// Hangi sayfalarda çalışacağını belirtiyoruz (Gereksiz dosyaları yormasın diye)
export const config = {
  matcher: [
    '/admin/:path*', // Admin altındaki her şey
    '/merchant/:path*', // İşletmeci paneli
    '/future', // Geçici kapalı lansman sayfası
    '/future/:path*', // Geçici alt rotalar
    '/login', // Giriş sayfası
  ],
}
