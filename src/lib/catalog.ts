import 'server-only';
import type { Filter, Sort } from 'mongodb';
import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import { mapCategory, mapProduct, mapSlot, mapZone } from '@/lib/db/mappers';
import type { Category, DeliverySlot, DeliveryZone, Product } from '@/lib/db/mappers';
import type { ProductDoc } from '@/lib/db/types';
import { findCart } from '@/lib/cart';
import { getSession } from '@/lib/auth';

/**
 * Storefront reads.
 *
 * Kept in one place so every surface asks for the same product shape and the
 * query count per page stays small — page loads happen on mobile data here,
 * not fibre.
 */

export type CatalogProduct = Product;
export type CatalogCategory = Category & { productCount: number };

function activeProducts(storeId: ObjectId): Filter<ProductDoc> {
  return { storeId, isActive: true };
}

/** productId → quantity, so cards render as steppers without extra queries. */
export async function getCartQtyMap(): Promise<Record<string, number>> {
  const cart = await findCart();
  if (!cart) return {};

  return Object.fromEntries(cart.items.map((item) => [item.productId.toString(), item.qty]));
}

export async function getCategories(storeId: string): Promise<CatalogCategory[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { categories, products } = await collections();

  const [docs, counts] = await Promise.all([
    categories.find({ storeId: id, isActive: true }).sort({ sortOrder: 1, name: 1 }).toArray(),
    // One grouped count beats one count per category.
    products
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { storeId: id, isActive: true } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countBy = new Map(counts.map((row) => [row._id.toString(), row.count]));

  return docs.map((doc) => ({
    ...mapCategory(doc),
    productCount: countBy.get(doc._id.toString()) ?? 0,
  }));
}

/** Best sellers, by what the shop has actually sold. */
export async function getPopularProducts(storeId: string, take = 12): Promise<Product[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { products } = await collections();
  const docs = await products
    .find({ ...activeProducts(id), purchaseCount: { $gt: 0 } })
    .sort({ purchaseCount: -1, sortOrder: 1 })
    .limit(take)
    .toArray();

  return docs.map(mapProduct);
}

/**
 * The staples the shop wants in front of every customer. Falls back to any
 * active product so a brand-new catalogue never renders an empty homepage.
 */
export async function getFeaturedProducts(storeId: string, take = 12): Promise<Product[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { products } = await collections();

  const featured = await products
    .find({ ...activeProducts(id), isFeatured: true })
    .sort({ sortOrder: 1, name: 1 })
    .limit(take)
    .toArray();

  if (featured.length > 0) return featured.map(mapProduct);

  const fallback = await products
    .find(activeProducts(id))
    .sort({ sortOrder: 1, name: 1 })
    .limit(take)
    .toArray();

  return fallback.map(mapProduct);
}

/** Everything currently discounted — the "Offers" rail. */
export async function getOfferProducts(storeId: string, take = 12): Promise<Product[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { products } = await collections();

  // $expr compares two fields in the same document, so a "discount" that is
  // not actually cheaper never reaches the page.
  const docs = await products
    .find({
      ...activeProducts(id),
      discountPricePoisha: { $ne: null },
      $expr: { $lt: ['$discountPricePoisha', '$pricePoisha'] },
    })
    .sort({ sortOrder: 1, name: 1 })
    .limit(take)
    .toArray();

  return docs.map(mapProduct);
}

/**
 * What this shopper buys again and again, most-bought first. Empty for someone
 * who has not ordered yet, and the homepage shows staples instead.
 */
export async function getFrequentlyPurchased(storeId: string, take = 12): Promise<Product[]> {
  const session = await getSession();
  const customerId = toObjectId(session?.customerId ?? null);
  const id = toObjectId(storeId);
  if (!customerId || !id) return [];

  const { orders, products } = await collections();

  const grouped = await orders
    .aggregate<{ _id: ObjectId; qty: number }>([
      { $match: { storeId: id, customerId, status: { $ne: 'CANCELLED' } } },
      { $unwind: '$items' },
      { $match: { 'items.productId': { $ne: null } } },
      { $group: { _id: '$items.productId', qty: { $sum: '$items.qty' } } },
      { $sort: { qty: -1 } },
      { $limit: take },
    ])
    .toArray();

  if (grouped.length === 0) return [];

  const ids = grouped.map((row) => row._id);
  const docs = await products.find({ _id: { $in: ids }, ...activeProducts(id) }).toArray();

  // Preserve the "most bought first" order the aggregation produced.
  const rank = new Map(ids.map((value, index) => [value.toString(), index]));
  return docs
    .map(mapProduct)
    .sort((a, b) => (rank.get(a.id) ?? 0) - (rank.get(b.id) ?? 0));
}

export async function getCategoryBySlug(storeId: string, slug: string): Promise<Category | null> {
  const id = toObjectId(storeId);
  if (!id) return null;

  const { categories } = await collections();
  const doc = await categories.findOne({ storeId: id, slug, isActive: true });
  return doc ? mapCategory(doc) : null;
}

export type ProductSort = 'popular' | 'price-asc' | 'price-desc' | 'name';

export async function getCategoryProducts(
  storeId: string,
  categoryId: string,
  options: { sort?: ProductSort } = {},
): Promise<Product[]> {
  const id = toObjectId(storeId);
  const category = toObjectId(categoryId);
  if (!id || !category) return [];

  const sort: Sort =
    options.sort === 'price-asc'
      ? { pricePoisha: 1 }
      : options.sort === 'price-desc'
        ? { pricePoisha: -1 }
        : options.sort === 'name'
          ? { name: 1 }
          : { purchaseCount: -1, sortOrder: 1, name: 1 };

  const { products } = await collections();
  const docs = await products
    .find({ ...activeProducts(id), categoryId: category })
    .sort(sort)
    .limit(200)
    .toArray();

  return docs.map(mapProduct);
}

export async function getProductBySlug(storeId: string, slug: string): Promise<Product | null> {
  const id = toObjectId(storeId);
  if (!id) return null;

  const { products } = await collections();
  const doc = await products.findOne({ storeId: id, slug, isActive: true });
  return doc ? mapProduct(doc) : null;
}

export async function getRelatedProducts(
  storeId: string,
  categoryId: string,
  excludeId: string,
): Promise<Product[]> {
  const id = toObjectId(storeId);
  const category = toObjectId(categoryId);
  const exclude = toObjectId(excludeId);
  if (!id || !category) return [];

  const { products } = await collections();
  const docs = await products
    .find({
      ...activeProducts(id),
      categoryId: category,
      ...(exclude ? { _id: { $ne: exclude } } : {}),
    })
    .sort({ purchaseCount: -1, name: 1 })
    .limit(8)
    .toArray();

  return docs.map(mapProduct);
}

/** Escapes a user's search term before it becomes part of a regex. */
function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Search across the denormalised haystack so an English or Bengali spelling
 * both find the same bag of rice.
 *
 * Substring regexes are used rather than the text index because shoppers type
 * fragments ("soyab", "chal") far more often than whole words, and a text
 * index only matches whole tokens.
 */
export async function searchProducts(
  storeId: string,
  query: string,
  categorySlug?: string,
): Promise<Product[]> {
  const id = toObjectId(storeId);
  const trimmed = query.trim();
  if (!id || !trimmed) return [];

  const terms = trimmed.toLowerCase().split(/\s+/).slice(0, 5).filter(Boolean);
  if (terms.length === 0) return [];

  const { products } = await collections();

  const docs = await products
    .find({
      ...activeProducts(id),
      ...(categorySlug ? { categorySlug } : {}),
      // Every term must appear somewhere, which keeps "soyabean oil" precise.
      $and: terms.map((term) => ({
        searchText: { $regex: escapeRegex(term), $options: 'i' },
      })),
    })
    .sort({ purchaseCount: -1, name: 1 })
    .limit(60)
    .toArray();

  return docs.map(mapProduct);
}

export async function getDeliveryZones(storeId: string): Promise<DeliveryZone[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { zones } = await collections();
  const docs = await zones.find({ storeId: id, isActive: true }).sort({ sortOrder: 1, name: 1 }).toArray();
  return docs.map(mapZone);
}

export async function getZoneById(storeId: string, zoneId: string): Promise<DeliveryZone | null> {
  const id = toObjectId(storeId);
  const zone = toObjectId(zoneId);
  if (!id || !zone) return null;

  const { zones } = await collections();
  const doc = await zones.findOne({ _id: zone, storeId: id });
  return doc ? mapZone(doc) : null;
}

export async function getDeliverySlots(storeId: string): Promise<DeliverySlot[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { slots } = await collections();
  const docs = await slots.find({ storeId: id, isActive: true }).sort({ sortOrder: 1, startTime: 1 }).toArray();
  return docs.map(mapSlot);
}

/** Search text is rebuilt on every write so the index never drifts. */
export function buildSearchText(input: {
  name: string;
  nameBn?: string | null;
  unit?: string | null;
  brandName?: string | null;
  categoryName?: string | null;
}): string {
  return [input.name, input.nameBn, input.unit, input.brandName, input.categoryName]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
}
