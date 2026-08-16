'use server';

import { revalidatePath } from 'next/cache';
import { addToCart, emptyCart, removeFromCart, setCartQty } from '@/lib/cart';
import { buildReorder } from '@/lib/orders';

/**
 * Cart mutations run as Server Actions rather than a JSON API: one round trip,
 * no client-side state to desync, and the page comes back already re-priced.
 */

export type CartActionState = { ok: boolean; error?: string; message?: string };

function refreshCartViews(): void {
  revalidatePath('/cart');
  revalidatePath('/checkout');
  revalidatePath('/', 'layout');
}

export async function addToCartAction(productId: string, qty = 1): Promise<CartActionState> {
  const result = await addToCart(productId, qty);
  refreshCartViews();
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function setCartQtyAction(productId: string, qty: number): Promise<CartActionState> {
  const result = await setCartQty(productId, qty);
  refreshCartViews();
  return result.ok ? { ok: true } : { ok: false, error: result.error };
}

export async function removeFromCartAction(productId: string): Promise<CartActionState> {
  await removeFromCart(productId);
  refreshCartViews();
  return { ok: true };
}

export async function emptyCartAction(): Promise<CartActionState> {
  await emptyCart();
  refreshCartViews();
  return { ok: true };
}

/**
 * "Order again" — adds everything still available from a past order and tells
 * the shopper plainly what could not be added and what changed price.
 */
export async function reorderAction(orderId: string): Promise<CartActionState> {
  const outcome = await buildReorder(orderId);

  for (const item of outcome.productIds) {
    await addToCart(item.id, item.qty);
  }

  refreshCartViews();

  if (outcome.added.length === 0) {
    return { ok: false, error: 'None of those items are available right now.' };
  }

  const parts = [`${outcome.added.length} item${outcome.added.length === 1 ? '' : 's'} added to your cart.`];
  if (outcome.skipped.length > 0) {
    parts.push(`Not available: ${outcome.skipped.map((item) => item.name).join(', ')}.`);
  }
  if (outcome.repriced.length > 0) {
    parts.push(`Price changed: ${outcome.repriced.map((item) => item.name).join(', ')}.`);
  }

  return { ok: true, message: parts.join(' ') };
}
