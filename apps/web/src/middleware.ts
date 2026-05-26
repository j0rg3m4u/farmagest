import { NextRequest, NextResponse } from 'next/server';

// Tokens ficam em localStorage (cliente), então o middleware não pode verificar auth.
// Proteção real é feita em componentes via RequireAuth.
export function middleware(_request: NextRequest) {
  return NextResponse.next();
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico).*)'],
};
