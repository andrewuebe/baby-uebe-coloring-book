import { NextResponse } from 'next/server';
import { configuredPasscode, setPasscodeCookie } from '@/lib/passcode';

export async function POST(req: Request) {
  const form = await req.formData();
  const submitted = String(form.get('passcode') ?? '');
  if (submitted !== configuredPasscode()) {
    return NextResponse.redirect(new URL('/welcome?error=1', req.url), { status: 303 });
  }
  await setPasscodeCookie();
  return NextResponse.redirect(new URL('/', req.url), { status: 303 });
}
