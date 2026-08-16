'use server';

import { redirect } from 'next/navigation';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { normalizePhone } from '@/lib/auth';
import { placeOrder } from '@/lib/orders';

/**
 * Checkout submission. Validation lives here rather than in the browser so a
 * bad payload cannot create a half-formed order the shop has to phone about.
 */

const schema = z.object({
  customerName: z.string().trim().min(2, 'Please enter your name.').max(80),
  customerPhone: z.string().trim().min(1, 'Please enter your phone number.'),
  fulfillmentType: z.enum(['DELIVERY', 'PICKUP']),
  addressLine: z.string().trim().max(400).optional().nullable(),
  landmark: z.string().trim().max(200).optional().nullable(),
  zoneId: z.string().trim().optional().nullable(),
  slotId: z.string().trim().optional().nullable(),
  scheduledDate: z.string().trim().optional().nullable(),
  customerNote: z.string().trim().max(500).optional().nullable(),
  paymentMethod: z.enum(['CASH_ON_DELIVERY', 'PAY_AT_STORE']),
  couponCode: z.string().trim().max(40).optional().nullable(),
});

export type CheckoutState = { error?: string; fieldErrors?: Record<string, string> };

export async function placeOrderAction(
  _previous: CheckoutState,
  formData: FormData,
): Promise<CheckoutState> {
  const parsed = schema.safeParse({
    customerName: formData.get('customerName'),
    customerPhone: formData.get('customerPhone'),
    fulfillmentType: formData.get('fulfillmentType'),
    addressLine: formData.get('addressLine'),
    landmark: formData.get('landmark'),
    zoneId: formData.get('zoneId') || null,
    slotId: formData.get('slotId') || null,
    scheduledDate: formData.get('scheduledDate') || null,
    customerNote: formData.get('customerNote'),
    paymentMethod: formData.get('paymentMethod'),
    couponCode: formData.get('couponCode') || null,
  });

  if (!parsed.success) {
    const fieldErrors: Record<string, string> = {};
    for (const issue of parsed.error.issues) {
      const key = String(issue.path[0]);
      if (!fieldErrors[key]) fieldErrors[key] = issue.message;
    }
    return { error: 'Please check the highlighted fields.', fieldErrors };
  }

  const phone = normalizePhone(parsed.data.customerPhone);
  if (!phone) {
    return {
      error: 'Please check the highlighted fields.',
      fieldErrors: { customerPhone: 'Enter a valid Bangladeshi mobile number, e.g. 01712345678.' },
    };
  }

  const isDelivery = parsed.data.fulfillmentType === 'DELIVERY';
  if (isDelivery && !parsed.data.addressLine?.trim()) {
    return {
      error: 'Please check the highlighted fields.',
      fieldErrors: { addressLine: 'Enter the address we should deliver to.' },
    };
  }
  if (isDelivery && !parsed.data.zoneId) {
    return {
      error: 'Please check the highlighted fields.',
      fieldErrors: { zoneId: 'Choose your delivery area.' },
    };
  }

  const result = await placeOrder({ ...parsed.data, customerPhone: phone });
  if (!result.ok) return { error: result.error };

  revalidatePath('/', 'layout');
  // Redirect throws, so it must sit outside any try/catch.
  redirect(`/orders/${result.orderNumber}?placed=1`);
}
