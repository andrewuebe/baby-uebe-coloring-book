import { cookies } from 'next/headers';

const COOKIE_NAME = 'passcode';

export function configuredPasscode(): string {
  const value = process.env.PARTY_PASSCODE;
  if (!value) throw new Error('PARTY_PASSCODE is not set');
  return value;
}

export async function hasValidPasscodeCookie(): Promise<boolean> {
  const jar = await cookies();
  const cookie = jar.get(COOKIE_NAME);
  return cookie?.value === configuredPasscode();
}

export async function setPasscodeCookie(): Promise<void> {
  const jar = await cookies();
  jar.set(COOKIE_NAME, configuredPasscode(), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 7,
  });
}

export { COOKIE_NAME };
