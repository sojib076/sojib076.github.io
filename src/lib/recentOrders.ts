import 'server-only';
import { cookies } from 'next/headers';

/**
 * Guests must be able to track what they ordered without creating an account —
 * most first orders here come from someone who has never signed in.
 *
 * Order numbers are short and human-readable, so they are not a secret. This
 * cookie records which orders *this browser* placed, and the order pages only
 * show an order to a browser that placed it (or to the signed-in owner).
 */

const COOKIE = 'ss_recent_orders';
const MAX_REMEMBERED = 20;
const TTL_DAYS = 90;

export async function rememberOrder(orderNumber: string): Promise<void> {
  const jar = await cookies();
  const existing = parse(jar.get(COOKIE)?.value);
  const next = [orderNumber, ...existing.filter((value) => value !== orderNumber)].slice(
    0,
    MAX_REMEMBERED,
  );

  jar.set(COOKIE, next.join(','), {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: TTL_DAYS * 24 * 60 * 60,
  });
}

export async function getRecentOrderNumbers(): Promise<string[]> {
  const jar = await cookies();
  return parse(jar.get(COOKIE)?.value);
}

export async function hasPlacedOrder(orderNumber: string): Promise<boolean> {
  const numbers = await getRecentOrderNumbers();
  return numbers.includes(orderNumber);
}

function parse(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((part) => part.trim())
    .filter(Boolean);
}
