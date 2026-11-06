import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const protectedRoutes = ['/dashboard', '/reading', '/history', '/credits', '/daily', '/subscribe', '/profile', '/referral', '/blueprint', '/compatibility', '/history/insights', '/reading/manual']
const authRoutes = ['/login', '/register']

/**
 * Auth.js names its session cookie after the request's protocol: `__Secure-` only
 * over https. Reading it by NODE_ENV broke `next start` on http (local e2e): the
 * cookie was looked up under the https name and every private page sent you to
 * /login. On Vercel the protocol is always https, so production is unchanged.
 */
export function sessionCookieName(protocol: string): string {
  return protocol === 'https:' ? '__Secure-authjs.session-token' : 'authjs.session-token'
}

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET,
    cookieName: sessionCookieName(request.nextUrl.protocol)
  })

  const { pathname } = request.nextUrl

  // Si está en ruta protegida sin sesión -> login
  const isProtectedRoute = protectedRoutes.some(route => pathname.startsWith(route))
  if (isProtectedRoute && !token) {
    const url = new URL('/login', request.url)
    url.searchParams.set('callbackUrl', pathname)
    return NextResponse.redirect(url)
  }

  // Si está logueado y va a login/register -> dashboard
  const isAuthRoute = authRoutes.some(route => pathname.startsWith(route))
  if (isAuthRoute && token) {
    return NextResponse.redirect(new URL('/dashboard', request.url))
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    '/dashboard/:path*',
    '/reading/:path*',
    '/history/:path*',
    '/credits/:path*',
    '/daily/:path*',
    '/subscribe/:path*',
    '/profile/:path*',
    '/referral/:path*',
    '/blueprint/:path*',
    '/compatibility/:path*',
    // '/history/insights' and '/reading/manual' are already matched by '/history/:path*' and '/reading/:path*'
    '/login',
    '/register'
  ]
}
