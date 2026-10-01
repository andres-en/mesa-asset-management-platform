import { NextResponse } from 'next/server';

// Rutas que NO requieren sesión
const PUBLIC_PREFIXES = ['/login', '/auth/callback', '/firmar'];

const IS_DEV_LOGIN_ENABLED =
  process.env.NODE_ENV === 'development' &&
  process.env.NEXT_PUBLIC_ENABLE_DEV_LOGIN === 'true';

function isTokenStructurallyValid(token) {
  if (IS_DEV_LOGIN_ENABLED) return Boolean(token);
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return false;
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padding = '='.repeat((4 - (base64.length % 4)) % 4);
    const payload = JSON.parse(atob(base64 + padding));
    if (typeof payload.exp !== 'number') return false;
    return payload.exp * 1000 > Date.now();
  } catch {
    return false;
  }
}

export function middleware(request) {
  const { pathname } = request.nextUrl;

  // Permitir rutas públicas (exact match o prefix)
  if (PUBLIC_PREFIXES.some((p) => pathname === p || pathname.startsWith(p + '/'))) {
    return NextResponse.next();
  }

  const token = request.cookies.get('token')?.value;

  if (!token || !isTokenStructurallyValid(token)) {
    return NextResponse.redirect(new URL('/login', request.url));
  }

  return NextResponse.next();
}

export const config = {
  // Excluye también los assets estáticos de /public (logo, íconos, etc.) —
  // sin esto, el middleware los redirige a /login como si fueran una ruta protegida.
  matcher: ['/((?!_next/static|_next/image|favicon.ico|api|.*\\.(?:png|jpg|jpeg|svg|gif|webp|ico)$).*)'],
};
