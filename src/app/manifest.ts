import type { MetadataRoute } from 'next';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * Makes the shop installable to a phone's home screen.
 *
 * Grocery is a repeat purchase — a customer who orders weekly should be able
 * to reopen the shop with one tap instead of finding a browser tab. The name
 * comes from the store record, so it matches whatever the owner set.
 */
export default async function manifest(): Promise<MetadataRoute.Manifest> {
  const store = await getStore().catch(() => null);
  const name = store?.name ?? 'Shibu Store';

  return {
    name: store?.area ? `${name} — ${store.area}` : name,
    short_name: name.length > 12 ? name.slice(0, 12) : name,
    description:
      store?.description ?? 'Order groceries from your local shop for home delivery or pickup.',
    start_url: '/',
    display: 'standalone',
    orientation: 'portrait',
    background_color: '#F7F8F6',
    theme_color: '#0F7B4F',
    lang: 'en',
    categories: ['shopping', 'food'],
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
    shortcuts: [
      { name: 'My orders', url: '/orders' },
      { name: 'Cart', url: '/cart' },
    ],
  };
}
