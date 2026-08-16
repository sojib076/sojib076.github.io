import 'server-only';
import { cookies } from 'next/headers';
import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { collections, ObjectId } from '@/lib/db/client';
import { mapCustomer, type Customer } from '@/lib/db/mappers';
import type { UserRole } from '@/lib/db/types';

/**
 * Two ways in, one session format:
 *   • customers sign in with a phone number and a one-time code (no password
 *     to forget, and every shopper here already has a phone);
 *   • the owner and staff sign in with email + password.
 *
 * The session is a signed JWT in an httpOnly cookie, so it survives the
 * stateless serverless environment without a session collection.
 */

const SESSION_COOKIE = 'ss_session';
const SESSION_DAYS = 30;
const OTP_TTL_MINUTES = 5;
const OTP_MAX_ATTEMPTS = 5;

export type SessionPayload = {
  userId: string;
  role: UserRole;
  customerId: string | null;
  name: string | null;
  phone: string | null;
};

function getSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET;
  if (!secret || secret.length < 32) {
    throw new Error('AUTH_SECRET must be set to a random string of at least 32 characters.');
  }
  return new TextEncoder().encode(secret);
}

export async function createSession(payload: SessionPayload): Promise<void> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_DAYS}d`)
    .sign(getSecret());

  const jar = await cookies();
  jar.set(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: SESSION_DAYS * 24 * 60 * 60,
  });
}

export async function destroySession(): Promise<void> {
  const jar = await cookies();
  jar.delete(SESSION_COOKIE);
}

export async function getSession(): Promise<SessionPayload | null> {
  const jar = await cookies();
  const token = jar.get(SESSION_COOKIE)?.value;
  if (!token) return null;

  try {
    const { payload } = await jwtVerify(token, getSecret());
    return {
      userId: String(payload.userId),
      role: payload.role as UserRole,
      customerId: payload.customerId ? String(payload.customerId) : null,
      name: payload.name ? String(payload.name) : null,
      phone: payload.phone ? String(payload.phone) : null,
    };
  } catch {
    // Expired or tampered token — treat as signed out rather than erroring.
    return null;
  }
}

export async function requireCustomer(): Promise<SessionPayload> {
  const session = await getSession();
  if (!session?.customerId) throw new Error('UNAUTHENTICATED');
  return session;
}

export function isStaff(session: SessionPayload | null): boolean {
  return session?.role === 'ADMIN' || session?.role === 'STAFF';
}

export async function requireStaff(): Promise<SessionPayload> {
  const session = await getSession();
  if (!isStaff(session)) throw new Error('FORBIDDEN');
  return session!;
}

// ---------------------------------------------------------------------------
// Phone numbers
// ---------------------------------------------------------------------------

/**
 * Bangladeshi mobile numbers are stored in one canonical shape (01XXXXXXXXX)
 * so "+8801712345678", "8801712345678" and "01712345678" are one customer.
 */
export function normalizePhone(input: string): string | null {
  const digits = input.replace(/[^\d]/g, '');
  const local = digits.startsWith('880')
    ? digits.slice(3)
    : digits.startsWith('0')
      ? digits
      : `0${digits}`;

  // Operator prefixes in use: 013–019 after the leading zero.
  if (!/^01[3-9]\d{8}$/.test(local)) return null;
  return local;
}

export function formatPhone(phone: string): string {
  return phone.length === 11 ? `${phone.slice(0, 5)} ${phone.slice(5)}` : phone;
}

// ---------------------------------------------------------------------------
// One-time codes
// ---------------------------------------------------------------------------

function generateCode(): string {
  // 6 digits, uniformly distributed, never starting with 0 so it reads cleanly.
  const bytes = new Uint32Array(1);
  crypto.getRandomValues(bytes);
  return String(100000 + (bytes[0] % 900000));
}

/** Issues a code and returns it so the caller can hand it to a notifier. */
export async function issueOtp(phone: string): Promise<string> {
  const code = generateCode();
  const codeHash = await bcrypt.hash(code, 10);
  const { otps } = await collections();

  // Only the newest code for a number is valid.
  await otps.updateMany({ phone, usedAt: null }, { $set: { usedAt: new Date() } });

  await otps.insertOne({
    _id: new ObjectId(),
    phone,
    codeHash,
    attempts: 0,
    usedAt: null,
    // A TTL index on expiresAt clears these out without a cron job.
    expiresAt: new Date(Date.now() + OTP_TTL_MINUTES * 60_000),
    createdAt: new Date(),
  });

  return code;
}

export type OtpResult = { ok: true } | { ok: false; error: string };

export async function verifyOtp(phone: string, code: string): Promise<OtpResult> {
  const { otps } = await collections();

  const record = await otps.findOne(
    { phone, usedAt: null, expiresAt: { $gt: new Date() } },
    { sort: { createdAt: -1 } },
  );

  if (!record) return { ok: false, error: 'This code has expired. Please request a new one.' };
  if (record.attempts >= OTP_MAX_ATTEMPTS) {
    return { ok: false, error: 'Too many attempts. Please request a new code.' };
  }

  const matches = await bcrypt.compare(code.trim(), record.codeHash);
  if (!matches) {
    await otps.updateOne({ _id: record._id }, { $inc: { attempts: 1 } });
    return { ok: false, error: 'That code is not correct.' };
  }

  await otps.updateOne({ _id: record._id }, { $set: { usedAt: new Date() } });
  return { ok: true };
}

/** Finds or creates the shopper behind a verified phone number. */
export async function upsertCustomerByPhone(
  phone: string,
  name?: string | null,
): Promise<Customer> {
  const { users, customers } = await collections();
  const now = new Date();

  const existing = await customers.findOne({ phone });
  if (existing) {
    if (name && !existing.name) {
      await customers.updateOne({ _id: existing._id }, { $set: { name, updatedAt: now } });
      existing.name = name;
    }
    return mapCustomer(existing);
  }

  const userId = new ObjectId();
  await users.insertOne({
    _id: userId,
    storeId: null,
    role: 'CUSTOMER',
    name: name ?? null,
    phone,
    email: null,
    passwordHash: null,
    isActive: true,
    lastLogin: now,
    createdAt: now,
    updatedAt: now,
  });

  const doc = {
    _id: new ObjectId(),
    userId,
    name: name ?? null,
    phone,
    email: null,
    totalOrders: 0,
    lastOrderAt: null,
    addresses: [],
    favoriteProductIds: [],
    createdAt: now,
    updatedAt: now,
  };

  await customers.insertOne(doc);
  return mapCustomer(doc);
}

// ---------------------------------------------------------------------------
// Staff passwords
// ---------------------------------------------------------------------------

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export type StaffUser = { id: string; name: string | null; phone: string | null; role: UserRole };

export async function verifyStaffLogin(
  email: string,
  password: string,
): Promise<StaffUser | null> {
  const { users } = await collections();
  const user = await users.findOne({ email: email.trim().toLowerCase() });

  if (!user?.passwordHash || !user.isActive) return null;
  if (user.role !== 'ADMIN' && user.role !== 'STAFF') return null;

  const matches = await bcrypt.compare(password, user.passwordHash);
  if (!matches) return null;

  await users.updateOne({ _id: user._id }, { $set: { lastLogin: new Date() } });

  return { id: user._id.toString(), name: user.name, phone: user.phone, role: user.role };
}
