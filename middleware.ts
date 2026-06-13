import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { COOKIE_NAME } from './lib/passcode';

const PUBLIC_PREFIXES = ['/welcome', '/api/welcome', '/admin', '/api/admin', '/_next', '/favicon'];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  if (PUBLIC_PREFIXES.some((p) => pathname.startsWith(p))) return NextResponse.next();
  const passcode = process.env.PARTY_PASSCODE ?? '';
  const cookie = req.cookies.get(COOKIE_NAME)?.value;
  if (!passcode || cookie !== passcode) {
    const url = req.nextUrl.clone();
    url.pathname = '/welcome';
    url.search = '';
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: '/((?!_next|favicon.ico).*)' };
