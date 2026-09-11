
import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

// This middleware is now simplified to no longer handle auth redirects.
// The client-side AuthGuard component is now the single source of truth
// for protecting routes and handling redirects, which is a more robust
// pattern for Firebase Auth with the Next.js App Router.
export function middleware(request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  // Corresponde a todas as rotas, exceto as que começam com:
  // - api (rotas de API)
  // - _next/static (ficheiros estáticos)
  // - _next/image (otimização de imagens)
  // - favicon.ico (ícone do site)
  matcher: ['/((?!api|_next/static|_next/image|favicon.ico).*)'],
};
