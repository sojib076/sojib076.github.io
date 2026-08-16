'use server';

import { revalidatePath } from 'next/cache';
import { getSession } from '@/lib/auth';
import { toggleFavorite } from '@/lib/customers';

export type FavoriteState = { ok: boolean; saved?: boolean; error?: string };

/** Saving needs an account — there is nowhere else to keep the list. */
export async function toggleFavoriteAction(productId: string): Promise<FavoriteState> {
  const session = await getSession();
  if (!session?.customerId) {
    return { ok: false, error: 'Sign in to save items.' };
  }

  const result = await toggleFavorite(session.customerId, productId);

  revalidatePath('/account');
  return { ok: true, saved: result.saved };
}
