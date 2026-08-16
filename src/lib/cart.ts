import 'server-only';
import { cookies } from 'next/headers';
import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import { mapProduct, mapZone } from '@/lib/db/mappers';
import type { CartDoc } from '@/lib/db/types';
import { getSession } from '@/lib/auth';
import { requireStore, resolveSettings } from '@/lib/store';
import { clampQty, quoteOrder, type PriceableProduct, type Quote } from '@/lib/pricing';

/**
 * The cart lives on the server, keyed by an httpOnly cookie.
 *
 * A localStorage cart would be cheaper, but then the browser owns the prices —
 * and the whole point of this app is that the shop's totals are correct. This
 * also means a shopper's cart survives switching from mobile data to wifi, and
 * carries over when they sign in.
 *
 * Items are embedded in the cart document, so reading a cart is a single
 * lookup and every quantity change is one atomic update.
 */

const CART_COOKIE = 'ss_cart';
const CART_TTL_DAYS = 30;

function newToken(): string {
  return crypto.randomUUID().replace(/-/g, '');
}

function expiryDate(): Date {
  return new Date(Date.now() + CART_TTL_DAYS * 24 * 60 * 60 * 1000);
}

function cookieOptions() {
  return {
    httpOnly: true,
    sameSite: 'lax' as const,
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: CART_TTL_DAYS * 24 * 60 * 60,
  };
}

/** Reads the current cart without creating one. */
export async function findCart(): Promise<CartDoc | null> {
  const jar = await cookies();
  const token = jar.get(CART_COOKIE)?.value;
  const { carts } = await collections();

  if (token) {
    const byToken = await carts.findOne({ token });
    if (byToken) return byToken;
  }

  // Signed-in shopper on a new device: pick up the cart their account owns.
  const session = await getSession();
  const customerId = toObjectId(session?.customerId ?? null);
  if (customerId) {
    return carts.findOne({ customerId }, { sort: { updatedAt: -1 } });
  }

  return null;
}

/**
 * Returns the active cart, creating one if needed.
 *
 * Must be called from a Server Action or Route Handler — writing cookies is
 * not allowed while rendering a page.
 */
export async function getOrCreateCart(): Promise<CartDoc> {
  const store = await requireStore();
  const jar = await cookies();
  const session = await getSession();
  const customerId = toObjectId(session?.customerId ?? null);
  const { carts } = await collections();

  const existing = await findCart();
  if (existing) {
    // Claim a guest cart for the shopper who just signed in.
    if (customerId && !existing.customerId?.equals(customerId)) {
      await carts.updateOne(
        { _id: existing._id },
        { $set: { customerId, expiresAt: expiryDate(), updatedAt: new Date() } },
      );
      existing.customerId = customerId;
    }
    if (jar.get(CART_COOKIE)?.value !== existing.token) {
      jar.set(CART_COOKIE, existing.token, cookieOptions());
    }
    return existing;
  }

  const now = new Date();
  const doc: CartDoc = {
    _id: new ObjectId(),
    storeId: new ObjectId(store.id),
    token: newToken(),
    customerId,
    items: [],
    expiresAt: expiryDate(),
    createdAt: now,
    updatedAt: now,
  };

  await carts.insertOne(doc);
  jar.set(CART_COOKIE, doc.token, cookieOptions());
  return doc;
}

export async function clearCartCookie(): Promise<void> {
  const jar = await cookies();
  jar.delete(CART_COOKIE);
}

export type AddToCartResult = { ok: true; qty: number } | { ok: false; error: string };

async function loadProduct(storeId: string, productId: string) {
  const id = toObjectId(productId);
  const store = toObjectId(storeId);
  if (!id || !store) return null;

  const { products } = await collections();
  const doc = await products.findOne({ _id: id, storeId: store });
  return doc ? mapProduct(doc) : null;
}

/** Adds (or tops up) a line. `qty` is a delta; use setCartQty to overwrite. */
export async function addToCart(productId: string, qty = 1): Promise<AddToCartResult> {
  const store = await requireStore();
  const product = await loadProduct(store.id, productId);

  if (!product) return { ok: false, error: 'This product is no longer available.' };
  if (!product.isActive || !product.inventory.isAvailable) {
    return { ok: false, error: 'This product is out of stock.' };
  }

  const cart = await getOrCreateCart();
  const current = cart.items.find((item) => item.productId.toString() === productId);
  const requested = (current?.qty ?? 0) + qty;
  const finalQty = clampQty(product as PriceableProduct, Math.max(requested, product.minQty));

  await writeLine(cart._id, productId, finalQty, Boolean(current));
  return { ok: true, qty: finalQty };
}

/** Sets an exact quantity; zero or less removes the line. */
export async function setCartQty(productId: string, qty: number): Promise<AddToCartResult> {
  const store = await requireStore();
  const cart = await getOrCreateCart();
  const id = toObjectId(productId);
  if (!id) return { ok: false, error: 'This product is no longer available.' };

  const { carts } = await collections();

  if (qty <= 0) {
    await carts.updateOne(
      { _id: cart._id },
      {
        $pull: { items: { productId: id } },
        $set: { updatedAt: new Date(), expiresAt: expiryDate() },
      },
    );
    return { ok: true, qty: 0 };
  }

  const product = await loadProduct(store.id, productId);
  if (!product) return { ok: false, error: 'This product is no longer available.' };

  const finalQty = clampQty(product as PriceableProduct, qty);
  const exists = cart.items.some((item) => item.productId.equals(id));

  await writeLine(cart._id, productId, finalQty, exists);
  return { ok: true, qty: finalQty };
}

/**
 * Upsert of a single embedded line.
 *
 * Mongo cannot "upsert an array element" in one operator, so an existing line
 * is updated by positional match and a new one is pushed.
 */
async function writeLine(
  cartId: ObjectId,
  productId: string,
  qty: number,
  exists: boolean,
): Promise<void> {
  const id = toObjectId(productId);
  if (!id) return;

  const { carts } = await collections();
  const touch = { updatedAt: new Date(), expiresAt: expiryDate() };

  if (exists) {
    await carts.updateOne(
      { _id: cartId, 'items.productId': id },
      { $set: { 'items.$.qty': qty, ...touch } },
    );
    return;
  }

  const result = await carts.updateOne(
    { _id: cartId, 'items.productId': { $ne: id } },
    { $push: { items: { productId: id, qty, addedAt: new Date() } }, $set: touch },
  );

  // Lost a race with a concurrent add (two taps on a slow connection): the
  // line already exists, so set it instead of pushing a duplicate.
  if (result.matchedCount === 0) {
    await carts.updateOne(
      { _id: cartId, 'items.productId': id },
      { $set: { 'items.$.qty': qty, ...touch } },
    );
  }
}

export async function removeFromCart(productId: string): Promise<void> {
  await setCartQty(productId, 0);
}

export async function emptyCart(): Promise<void> {
  const cart = await findCart();
  if (!cart) return;

  const { carts } = await collections();
  await carts.updateOne(
    { _id: cart._id },
    { $set: { items: [], updatedAt: new Date(), expiresAt: expiryDate() } },
  );
}

export type CartQuoteOptions = {
  fulfillmentType?: 'DELIVERY' | 'PICKUP';
  zoneId?: string | null;
  couponCode?: string | null;
};

export type CartQuote = Quote & { cartId: string | null };

/** Prices whatever is in the cart right now. Read-only, so pages may call it. */
export async function getCartQuote(options: CartQuoteOptions = {}): Promise<CartQuote> {
  const store = await requireStore();
  const settings = resolveSettings(store);
  const fulfillmentType = options.fulfillmentType ?? 'DELIVERY';

  const cart = await findCart();
  const { products, zones, coupons } = await collections();

  const productIds = (cart?.items ?? []).map((item) => item.productId);

  const [productDocs, zoneDoc, couponDoc] = await Promise.all([
    productIds.length > 0 ? products.find({ _id: { $in: productIds } }).toArray() : [],
    options.zoneId
      ? zones.findOne({ _id: toObjectId(options.zoneId) ?? new ObjectId(), storeId: new ObjectId(store.id) })
      : null,
    options.couponCode
      ? coupons.findOne({
          storeId: new ObjectId(store.id),
          code: options.couponCode.trim().toUpperCase(),
        })
      : null,
  ]);

  const byId = new Map(productDocs.map((doc) => [doc._id.toString(), mapProduct(doc)]));

  // Keep the shopper's own ordering, and drop lines whose product has since
  // been deleted outright.
  const lines = (cart?.items ?? []).flatMap((item) => {
    const product = byId.get(item.productId.toString());
    return product ? [{ product: product as PriceableProduct, qty: item.qty }] : [];
  });

  const quote = quoteOrder({
    lines,
    settings,
    fulfillmentType,
    zone: zoneDoc ? mapZone(zoneDoc) : null,
    coupon: couponDoc
      ? {
          code: couponDoc.code,
          discountType: couponDoc.discountType,
          value: couponDoc.value,
          minOrderPoisha: couponDoc.minOrderPoisha,
          maxDiscountPoisha: couponDoc.maxDiscountPoisha,
          startsAt: couponDoc.startsAt,
          endsAt: couponDoc.endsAt,
          usageLimit: couponDoc.usageLimit,
          usedCount: couponDoc.usedCount,
          isActive: couponDoc.isActive,
        }
      : null,
  });

  return { ...quote, cartId: cart?._id.toString() ?? null };
}

/** Badge count for the header. Cheap enough to call on every page. */
export async function getCartCount(): Promise<number> {
  const cart = await findCart();
  if (!cart) return 0;
  return cart.items.reduce((sum, item) => sum + item.qty, 0);
}
