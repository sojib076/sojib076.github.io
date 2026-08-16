import type { MetadataRoute } from 'next';
import { collections, ObjectId } from '@/lib/db/client';
import { getStore } from '@/lib/store';

export const dynamic = 'force-dynamic';

/**
 * Category and product pages are what rank for "grocery shop near me" style
 * searches, so every one of them belongs in the sitemap. Cart, checkout and
 * account pages deliberately do not.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = (process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000').replace(/\/$/, '');

  const staticEntries: MetadataRoute.Sitemap = [
    { url: `${base}/`, changeFrequency: 'daily', priority: 1 },
    { url: `${base}/categories`, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/delivery`, changeFrequency: 'monthly', priority: 0.7 },
  ];

  try {
    const store = await getStore();
    if (!store) return staticEntries;

    const storeId = new ObjectId(store.id);
    const { categories: categoryCollection, products: productCollection } = await collections();

    const [categories, products] = await Promise.all([
      categoryCollection
        .find({ storeId, isActive: true }, { projection: { slug: 1, updatedAt: 1 } })
        .toArray(),
      productCollection
        .find({ storeId, isActive: true }, { projection: { slug: 1, updatedAt: 1 } })
        .limit(5000)
        .toArray(),
    ]);

    return [
      ...staticEntries,
      ...categories.map((category) => ({
        url: `${base}/category/${category.slug}`,
        lastModified: category.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.8,
      })),
      ...products.map((product) => ({
        url: `${base}/product/${product.slug}`,
        lastModified: product.updatedAt,
        changeFrequency: 'weekly' as const,
        priority: 0.6,
      })),
    ];
  } catch {
    // A sitemap is not worth failing a deploy over when the database is
    // briefly unreachable — serve the static pages and recover next request.
    return staticEntries;
  }
}
