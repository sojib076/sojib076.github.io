import { effectivePricePoisha } from '@/lib/money';
import type { ResolvedSettings } from '@/lib/store';
import type { DeliveryZone } from '@/lib/db/mappers';
import type { DiscountType } from '@/lib/db/types';

/**
 * The single source of truth for what an order costs.
 *
 * Every number here comes from the database — product prices, the zone's fee,
 * the store's minimum order and free-delivery threshold. Nothing is hardcoded
 * and nothing is taken from the browser: the client may send product ids and
 * quantities, never prices.
 */

export type PricedLine = {
  productId: string;
  name: string;
  nameBn: string | null;
  unit: string;
  qty: number;
  /** Shelf price, kept so the cart can show the struck-through original. */
  listPricePoisha: number;
  unitPricePoisha: number;
  lineTotalPoisha: number;
  imageUrl: string | null;
  slug: string;
  /** Set when the line cannot be ordered right now. */
  unavailableReason: string | null;
  maxQty: number;
  minQty: number;
};

export type PriceableProduct = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  unit: string;
  pricePoisha: number;
  discountPricePoisha: number | null;
  minQty: number;
  maxQty: number;
  isActive: boolean;
  inventory: { isAvailable: boolean; trackStock: boolean; stockQty: number } | null;
  images: { url: string }[];
};

export type ZoneWithRules = DeliveryZone;

/** Only the fields the engine actually needs to price a coupon. */
export type PriceableCoupon = {
  code: string;
  discountType: DiscountType;
  value: number;
  minOrderPoisha: number;
  maxDiscountPoisha: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type QuoteInput = {
  lines: { product: PriceableProduct; qty: number }[];
  settings: ResolvedSettings;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  zone?: ZoneWithRules | null;
  coupon?: PriceableCoupon | null;
  now?: Date;
};

export type Quote = {
  lines: PricedLine[];
  /** Lines that are still in the cart but cannot be ordered. */
  unavailableLines: PricedLine[];
  itemCount: number;
  subtotalPoisha: number;
  /** Sum of per-product discounts already reflected in the subtotal. */
  productSavingsPoisha: number;
  deliveryFeePoisha: number;
  /** True when the fee was waived by the free-delivery threshold. */
  deliveryIsFree: boolean;
  couponDiscountPoisha: number;
  couponCode: string | null;
  couponError: string | null;
  discountPoisha: number;
  totalPoisha: number;
  /** Minimum that applies to this order (zone override beats store default). */
  minOrderPoisha: number;
  meetsMinimum: boolean;
  /** How much more is needed to check out. Zero once the minimum is met. */
  amountToMinimumPoisha: number;
  freeDeliveryThresholdPoisha: number | null;
  /** How much more is needed for free delivery, when that is still reachable. */
  amountToFreeDeliveryPoisha: number | null;
  /** Blocking problems: checkout is refused while this is non-empty. */
  blockers: string[];
};

/** Availability check shared by the cart, checkout and Order Again. */
export function unavailableReasonFor(product: PriceableProduct, qty: number): string | null {
  if (!product.isActive) return 'No longer sold';
  const inventory = product.inventory;
  if (inventory && !inventory.isAvailable) return 'Out of stock';
  if (inventory?.trackStock) {
    if (inventory.stockQty <= 0) return 'Out of stock';
    if (qty > inventory.stockQty) return `Only ${inventory.stockQty} left`;
  }
  return null;
}

/** Clamp a requested quantity into the product's allowed range. */
export function clampQty(product: PriceableProduct, qty: number): number {
  const min = Math.max(1, product.minQty);
  const max = Math.max(min, product.maxQty);
  const stockCap = product.inventory?.trackStock ? product.inventory.stockQty : Number.MAX_SAFE_INTEGER;
  return Math.max(min, Math.min(qty, max, stockCap));
}

/**
 * Delivery fee for a subtotal in a zone.
 *
 * Order of precedence, most specific first:
 *   1. free-delivery threshold (zone override, else store-wide)
 *   2. a matching subtotal band on the zone
 *   3. the zone's flat fee
 *   4. the store's default fee
 */
export function calculateDeliveryFee(
  subtotalPoisha: number,
  zone: ZoneWithRules | null | undefined,
  settings: ResolvedSettings,
): { feePoisha: number; isFree: boolean; thresholdPoisha: number | null } {
  const threshold = zone?.freeDeliveryThresholdPoisha ?? settings.freeDeliveryThresholdPoisha;

  if (threshold != null && threshold > 0 && subtotalPoisha >= threshold) {
    return { feePoisha: 0, isFree: true, thresholdPoisha: threshold };
  }

  const activeRules = (zone?.rules ?? []).filter((rule) => rule.isActive);
  const band = activeRules.find(
    (rule) =>
      subtotalPoisha >= rule.minSubtotalPoisha &&
      (rule.maxSubtotalPoisha == null || subtotalPoisha <= rule.maxSubtotalPoisha),
  );
  if (band) {
    return { feePoisha: band.feePoisha, isFree: band.feePoisha === 0, thresholdPoisha: threshold };
  }

  const fee = zone?.deliveryFeePoisha ?? settings.defaultDeliveryFeePoisha;
  return { feePoisha: fee, isFree: fee === 0, thresholdPoisha: threshold };
}

function evaluateCoupon(
  coupon: PriceableCoupon | null | undefined,
  subtotalPoisha: number,
  now: Date,
): { discountPoisha: number; code: string | null; error: string | null } {
  if (!coupon) return { discountPoisha: 0, code: null, error: null };
  if (!coupon.isActive) return { discountPoisha: 0, code: coupon.code, error: 'This offer is no longer active.' };
  if (coupon.startsAt && coupon.startsAt > now) {
    return { discountPoisha: 0, code: coupon.code, error: 'This offer has not started yet.' };
  }
  if (coupon.endsAt && coupon.endsAt < now) {
    return { discountPoisha: 0, code: coupon.code, error: 'This offer has expired.' };
  }
  if (coupon.usageLimit != null && coupon.usedCount >= coupon.usageLimit) {
    return { discountPoisha: 0, code: coupon.code, error: 'This offer has been fully used.' };
  }
  if (subtotalPoisha < coupon.minOrderPoisha) {
    return { discountPoisha: 0, code: coupon.code, error: 'Order value is too low for this offer.' };
  }

  let discount =
    coupon.discountType === 'PERCENT'
      ? Math.round((subtotalPoisha * coupon.value) / 100)
      : coupon.value;

  if (coupon.maxDiscountPoisha != null) discount = Math.min(discount, coupon.maxDiscountPoisha);
  // A coupon may never turn an order into a payout.
  discount = Math.max(0, Math.min(discount, subtotalPoisha));

  return { discountPoisha: discount, code: coupon.code, error: null };
}

/** Price a cart. Pure and synchronous, so it can be unit-tested and reused. */
export function quoteOrder(input: QuoteInput): Quote {
  const { settings, fulfillmentType, zone, coupon, now = new Date() } = input;

  const priced: PricedLine[] = input.lines.map(({ product, qty }) => {
    const unitPrice = effectivePricePoisha(product);
    return {
      productId: product.id,
      slug: product.slug,
      name: product.name,
      nameBn: product.nameBn,
      unit: product.unit,
      qty,
      listPricePoisha: product.pricePoisha,
      unitPricePoisha: unitPrice,
      lineTotalPoisha: unitPrice * qty,
      imageUrl: product.images[0]?.url ?? null,
      unavailableReason: unavailableReasonFor(product, qty),
      minQty: product.minQty,
      maxQty: product.maxQty,
    };
  });

  const lines = priced.filter((line) => line.unavailableReason == null);
  const unavailableLines = priced.filter((line) => line.unavailableReason != null);

  const subtotalPoisha = lines.reduce((sum, line) => sum + line.lineTotalPoisha, 0);
  const productSavingsPoisha = lines.reduce(
    (sum, line) => sum + (line.listPricePoisha - line.unitPricePoisha) * line.qty,
    0,
  );
  const itemCount = lines.reduce((sum, line) => sum + line.qty, 0);

  const isDelivery = fulfillmentType === 'DELIVERY';

  const delivery = isDelivery
    ? calculateDeliveryFee(subtotalPoisha, zone, settings)
    : { feePoisha: 0, isFree: false, thresholdPoisha: null };

  const couponResult = evaluateCoupon(coupon, subtotalPoisha, now);

  // Zone minimums override the store default, so a far zone can demand more.
  const minOrderPoisha =
    isDelivery && zone?.minOrderPoisha != null ? zone.minOrderPoisha : settings.minOrderPoisha;

  const meetsMinimum = subtotalPoisha >= minOrderPoisha;
  const amountToMinimumPoisha = meetsMinimum ? 0 : minOrderPoisha - subtotalPoisha;

  const threshold = delivery.thresholdPoisha;
  const amountToFreeDeliveryPoisha =
    isDelivery && threshold != null && threshold > 0 && subtotalPoisha < threshold
      ? threshold - subtotalPoisha
      : null;

  const discountPoisha = couponResult.discountPoisha;
  const totalPoisha = Math.max(0, subtotalPoisha + delivery.feePoisha - discountPoisha);

  const blockers: string[] = [];
  if (lines.length === 0) blockers.push('Your cart is empty.');
  if (!meetsMinimum) blockers.push('Order value is below the minimum.');
  if (isDelivery && !settings.deliveryEnabled) blockers.push('Delivery is currently unavailable.');
  if (!isDelivery && !settings.pickupEnabled) blockers.push('Store pickup is currently unavailable.');
  if (isDelivery && !zone) blockers.push('Please choose your delivery area.');
  if (isDelivery && zone && !zone.isActive) blockers.push('We are not delivering to this area right now.');

  return {
    lines,
    unavailableLines,
    itemCount,
    subtotalPoisha,
    productSavingsPoisha,
    deliveryFeePoisha: delivery.feePoisha,
    deliveryIsFree: delivery.isFree,
    couponDiscountPoisha: couponResult.discountPoisha,
    couponCode: couponResult.code,
    couponError: couponResult.error,
    discountPoisha,
    totalPoisha,
    minOrderPoisha,
    meetsMinimum,
    amountToMinimumPoisha,
    freeDeliveryThresholdPoisha: threshold,
    amountToFreeDeliveryPoisha,
    blockers,
  };
}
