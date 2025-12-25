import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { getToken } from 'next-auth/jwt'

const protectedRoutes = ['/dashboard', '/reading', '/history', '/credits']
const authRoutes = ['/login', '/register']

export async function middleware(request: NextRequest) {
  const token = await getToken({
    req: request,
    secret: process.env.NEXTAUTH_SECRET
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
    '/login',
    '/register'
  ]
}
