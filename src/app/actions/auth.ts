'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import {
  createSession,
  destroySession,
  issueOtp,
  normalizePhone,
  upsertCustomerByPhone,
  verifyOtp,
  verifyStaffLogin,
} from '@/lib/auth';
import { dispatchQuietly, otpMessage } from '@/lib/notifications';
import { requireStore } from '@/lib/store';
import { getOrCreateCart } from '@/lib/cart';

export type OtpRequestState = {
  sent?: boolean;
  phone?: string;
  error?: string;
  /** Only ever populated outside production, so the flow is testable locally. */
  devCode?: string;
};

export async function requestOtpAction(
  _previous: OtpRequestState,
  formData: FormData,
): Promise<OtpRequestState> {
  const store = await requireStore();
  const phone = normalizePhone(String(formData.get('phone') ?? ''));

  if (!phone) {
    return { error: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.' };
  }

  const code = await issueOtp(phone);
  await dispatchQuietly(store.id, otpMessage(phone, code));

  return {
    sent: true,
    phone,
    devCode: process.env.NODE_ENV === 'production' ? undefined : code,
  };
}

export type OtpVerifyState = { error?: string };

export async function verifyOtpAction(
  _previous: OtpVerifyState,
  formData: FormData,
): Promise<OtpVerifyState> {
  const phone = normalizePhone(String(formData.get('phone') ?? ''));
  const code = String(formData.get('code') ?? '').trim();
  const name = String(formData.get('name') ?? '').trim();

  if (!phone) return { error: 'Something went wrong. Please start again.' };

  const result = await verifyOtp(phone, code);
  if (!result.ok) return { error: result.error };

  const customer = await upsertCustomerByPhone(phone, name || null);

  await createSession({
    userId: customer.userId,
    role: 'CUSTOMER',
    customerId: customer.id,
    name: customer.name,
    phone: customer.phone,
  });

  // Attach whatever they were shopping with to their account.
  await getOrCreateCart();

  revalidatePath('/', 'layout');
  redirect('/orders');
}

export async function signOutAction(): Promise<void> {
  await destroySession();
  revalidatePath('/', 'layout');
  redirect('/');
}

export type StaffLoginState = { error?: string };

export async function staffLoginAction(
  _previous: StaffLoginState,
  formData: FormData,
): Promise<StaffLoginState> {
  const email = String(formData.get('email') ?? '');
  const password = String(formData.get('password') ?? '');

  if (!email || !password) return { error: 'Enter your email and password.' };

  const user = await verifyStaffLogin(email, password);
  // Deliberately vague: never reveal whether the email exists.
  if (!user) return { error: 'Those details do not match an account.' };

  await createSession({
    userId: user.id,
    role: user.role,
    customerId: null,
    name: user.name,
    phone: user.phone,
  });

  revalidatePath('/admin', 'layout');
  redirect('/admin');
}
