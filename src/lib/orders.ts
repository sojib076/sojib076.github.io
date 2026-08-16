import 'server-only';
import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import { mapOrder, mapProduct, mapZone, type Order } from '@/lib/db/mappers';
import type { FulfillmentType, OrderItem, OrderStatus, PaymentMethod } from '@/lib/db/types';
import { requireStore, resolveSettings, nowInDhaka } from '@/lib/store';
import { getSession } from '@/lib/auth';
import { findCart } from '@/lib/cart';
import { quoteOrder, type PriceableProduct } from '@/lib/pricing';
import { rememberOrder } from '@/lib/recentOrders';
import { rememberAddress } from '@/lib/customers';
import {
  dispatchQuietly,
  newOrderAdminMessage,
  orderConfirmationMessage,
  orderStatusMessage,
} from '@/lib/notifications';

/**
 * Placing an order is the one operation that must be exactly right, so it
 * re-prices everything from the database at the moment of submission. The
 * checkout form contributes contact details and choices — never money.
 *
 * The whole order, including its lines, is a single document, so creating it
 * is atomic without a multi-document transaction. That matters: transactions
 * need a replica set, and this app has to run just as correctly against a
 * standalone mongod on a cheap VPS as against Atlas.
 */

export type PlaceOrderInput = {
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  addressLine?: string | null;
  landmark?: string | null;
  zoneId?: string | null;
  slotId?: string | null;
  scheduledDate?: string | null;
  customerNote?: string | null;
  paymentMethod: PaymentMethod;
  couponCode?: string | null;
};

export type PlaceOrderResult =
  | { ok: true; orderNumber: string; orderId: string }
  | { ok: false; error: string };

export async function placeOrder(input: PlaceOrderInput): Promise<PlaceOrderResult> {
  const store = await requireStore();
  const settings = resolveSettings(store);
  const session = await getSession();
  const storeId = new ObjectId(store.id);

  const cart = await findCart();
  if (!cart || cart.items.length === 0) return { ok: false, error: 'Your cart is empty.' };

  const c = await collections();

  const productDocs = await c.products
    .find({ _id: { $in: cart.items.map((item) => item.productId) } })
    .toArray();
  const byId = new Map(productDocs.map((doc) => [doc._id.toString(), mapProduct(doc)]));

  const lines = cart.items.flatMap((item) => {
    const product = byId.get(item.productId.toString());
    return product ? [{ product: product as PriceableProduct, qty: item.qty }] : [];
  });
  if (lines.length === 0) return { ok: false, error: 'Your cart is empty.' };

  const isDelivery = input.fulfillmentType === 'DELIVERY';

  const zoneDoc =
    isDelivery && input.zoneId
      ? await c.zones.findOne({ _id: toObjectId(input.zoneId) ?? new ObjectId(), storeId })
      : null;

  if (isDelivery && !zoneDoc) return { ok: false, error: 'Please choose a valid delivery area.' };
  if (isDelivery && !input.addressLine?.trim()) {
    return { ok: false, error: 'Please enter your delivery address.' };
  }

  const couponDoc = input.couponCode
    ? await c.coupons.findOne({ storeId, code: input.couponCode.trim().toUpperCase() })
    : null;

  const quote = quoteOrder({
    lines,
    settings,
    fulfillmentType: input.fulfillmentType,
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

  if (quote.blockers.length > 0) return { ok: false, error: quote.blockers[0] };
  if (quote.couponError) return { ok: false, error: quote.couponError };

  const slotDoc = input.slotId
    ? await c.slots.findOne({ _id: toObjectId(input.slotId) ?? new ObjectId(), storeId, isActive: true })
    : null;

  const now = new Date();
  const customerId = toObjectId(session?.customerId ?? null);
  const orderNumber = await nextOrderNumber(store.id, settings.orderNumberPrefix);

  const items: OrderItem[] = quote.lines.map((line) => ({
    productId: new ObjectId(line.productId),
    name: line.name,
    nameBn: line.nameBn,
    unit: line.unit,
    unitPricePoisha: line.unitPricePoisha,
    qty: line.qty,
    lineTotalPoisha: line.lineTotalPoisha,
  }));

  const orderId = new ObjectId();

  await c.orders.insertOne({
    _id: orderId,
    storeId,
    orderNumber,
    customerId,
    status: 'PENDING',
    fulfillmentType: input.fulfillmentType,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone,
    addressLine: isDelivery ? input.addressLine!.trim() : null,
    landmark: isDelivery ? input.landmark?.trim() || null : null,
    zoneId: zoneDoc?._id ?? null,
    zoneName: zoneDoc?.name ?? null,
    zoneEstimatedMinutes: zoneDoc?.estimatedMinutes ?? null,
    slotId: slotDoc?._id ?? null,
    slotLabel: slotDoc?.label ?? null,
    scheduledFor: parseScheduledDate(input.scheduledDate, slotDoc?.startTime),
    customerNote: input.customerNote?.trim() || null,
    adminNote: null,
    assignedTo: null,
    cancelReason: null,
    subtotalPoisha: quote.subtotalPoisha,
    deliveryFeePoisha: quote.deliveryFeePoisha,
    discountPoisha: quote.discountPoisha,
    totalPoisha: quote.totalPoisha,
    couponCode: quote.couponDiscountPoisha > 0 ? couponDoc?.code ?? null : null,
    paymentMethod: input.paymentMethod,
    paymentStatus: 'UNPAID',
    payment: {
      method: input.paymentMethod,
      status: 'UNPAID',
      amountPoisha: quote.totalPoisha,
      provider: null,
      reference: null,
      paidAt: null,
    },
    items,
    events: [{ status: 'PENDING', note: 'Order placed by customer', createdBy: null, createdAt: now }],
    placedAt: now,
    confirmedAt: null,
    readyAt: null,
    deliveredAt: null,
    cancelledAt: null,
    updatedAt: now,
  });

  // Bookkeeping after the order is safely stored. If any of this fails the
  // shop still has the order, which is the part that cannot be recreated.
  await Promise.all([
    ...quote.lines.map((line) =>
      c.products.updateOne(
        { _id: new ObjectId(line.productId) },
        {
          $inc: {
            purchaseCount: line.qty,
            // Only shops that count stock have it decremented.
            ...( byId.get(line.productId)?.inventory.trackStock ? { 'inventory.stockQty': -line.qty } : {}),
          },
        },
      ),
    ),
    // The cart is emptied, not deleted, so the shopper keeps the same token.
    c.carts.updateOne({ _id: cart._id }, { $set: { items: [], updatedAt: now } }),
    couponDoc && quote.couponDiscountPoisha > 0
      ? c.coupons.updateOne({ _id: couponDoc._id }, { $inc: { usedCount: 1 } })
      : Promise.resolve(),
    customerId
      ? c.customers.updateOne(
          { _id: customerId },
          { $inc: { totalOrders: 1 }, $set: { lastOrderAt: now, updatedAt: now } },
        )
      : Promise.resolve(),
  ]);

  // Lets this browser track the order without signing in.
  await rememberOrder(orderNumber);

  // Signed-in shoppers get their address prefilled next time.
  if (customerId && isDelivery) {
    await rememberAddress(customerId.toString(), {
      receiverName: input.customerName.trim(),
      phone: input.customerPhone,
      addressLine: input.addressLine!.trim(),
      landmark: input.landmark?.trim() || null,
      zoneId: zoneDoc?._id.toString() ?? null,
    });
  }

  const order = { orderNumber, totalPoisha: quote.totalPoisha } as const;
  const adminRecipient = settings.notifyWhatsapp ?? settings.notifyPhone;

  const notifiable = {
    orderNumber,
    customerName: input.customerName.trim(),
    customerPhone: input.customerPhone,
    fulfillmentType: input.fulfillmentType,
    addressLine: isDelivery ? input.addressLine!.trim() : null,
    slotLabel: slotDoc?.label ?? null,
    customerNote: input.customerNote?.trim() || null,
    subtotalPoisha: quote.subtotalPoisha,
    deliveryFeePoisha: quote.deliveryFeePoisha,
    discountPoisha: quote.discountPoisha,
    totalPoisha: order.totalPoisha,
    paymentMethod: input.paymentMethod,
    items,
  };

  if (adminRecipient) {
    await dispatchQuietly(
      store.id,
      newOrderAdminMessage(notifiable, adminRecipient, settings.notifyWhatsapp ? 'WHATSAPP' : 'SMS'),
      orderId.toString(),
    );
  }
  await dispatchQuietly(store.id, orderConfirmationMessage(notifiable), orderId.toString());

  return { ok: true, orderNumber, orderId: orderId.toString() };
}

/**
 * SS-260815-004 — readable over the phone, sortable, unique per day.
 *
 * findOneAndUpdate with upsert is atomic, so two customers checking out in the
 * same second can never be handed the same number.
 */
async function nextOrderNumber(storeId: string, prefix: string): Promise<string> {
  const local = nowInDhaka();
  const stamp = `${String(local.getUTCFullYear()).slice(2)}${pad(local.getUTCMonth() + 1)}${pad(
    local.getUTCDate(),
  )}`;

  const { counters } = await collections();
  const counter = await counters.findOneAndUpdate(
    { _id: `orders:${storeId}:${stamp}` },
    { $inc: { value: 1 } },
    { upsert: true, returnDocument: 'after' },
  );

  const sequence = counter?.value ?? 1;
  return `${prefix}-${stamp}-${String(sequence).padStart(3, '0')}`;
}

function pad(value: number): string {
  return String(value).padStart(2, '0');
}

function parseScheduledDate(date: string | null | undefined, startTime?: string): Date | null {
  if (!date) return null;
  const [hours, minutes] = (startTime ?? '09:00').split(':').map(Number);
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime())) return null;
  // Store the slot start in UTC, correcting for Dhaka's fixed +06:00.
  parsed.setUTCHours(hours - 6, minutes, 0, 0);
  return parsed;
}

// ---------------------------------------------------------------------------
// Reads
// ---------------------------------------------------------------------------

export async function getOrderByNumber(storeId: string, orderNumber: string): Promise<Order | null> {
  const id = toObjectId(storeId);
  if (!id) return null;

  const { orders } = await collections();
  const doc = await orders.findOne({ storeId: id, orderNumber });
  return doc ? mapOrder(doc) : null;
}

export async function getOrderById(storeId: string, orderId: string): Promise<Order | null> {
  const id = toObjectId(storeId);
  const order = toObjectId(orderId);
  if (!id || !order) return null;

  const { orders } = await collections();
  const doc = await orders.findOne({ _id: order, storeId: id });
  return doc ? mapOrder(doc) : null;
}

/**
 * A signed-in shopper sees their full history; a guest sees the orders this
 * browser placed. Both paths are scoped, so nobody can browse someone else's.
 */
export async function listOrdersForViewer(
  storeId: string,
  options: { customerId?: string | null; orderNumbers?: string[]; limit?: number } = {},
): Promise<Order[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const customerId = toObjectId(options.customerId ?? null);
  const numbers = options.orderNumbers ?? [];

  if (!customerId && numbers.length === 0) return [];

  const { orders } = await collections();
  const docs = await orders
    .find(customerId ? { storeId: id, customerId } : { storeId: id, orderNumber: { $in: numbers } })
    .sort({ placedAt: -1 })
    .limit(options.limit ?? 25)
    .toArray();

  return docs.map(mapOrder);
}

// ---------------------------------------------------------------------------
// Status flow
// ---------------------------------------------------------------------------

const DELIVERY_FLOW: OrderStatus[] = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
];
const PICKUP_FLOW: OrderStatus[] = ['PENDING', 'CONFIRMED', 'PREPARING', 'READY', 'DELIVERED'];

export function statusFlow(fulfillmentType: FulfillmentType): OrderStatus[] {
  return fulfillmentType === 'PICKUP' ? PICKUP_FLOW : DELIVERY_FLOW;
}

/** Statuses the shop may move an order to next. Keeps the admin UI honest. */
export function allowedNextStatuses(
  current: OrderStatus,
  fulfillmentType: FulfillmentType,
): OrderStatus[] {
  if (current === 'DELIVERED' || current === 'CANCELLED') return [];
  const flow = statusFlow(fulfillmentType);
  const index = flow.indexOf(current);
  const next = index >= 0 && index < flow.length - 1 ? [flow[index + 1]] : [];
  return [...next, 'CANCELLED'];
}

export const STATUS_LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirmed',
  PREPARING: 'Preparing',
  READY: 'Ready',
  OUT_FOR_DELIVERY: 'Out for delivery',
  DELIVERED: 'Delivered',
  CANCELLED: 'Cancelled',
};

export async function updateOrderStatus(
  orderId: string,
  status: OrderStatus,
  options: { note?: string | null; actor?: string | null } = {},
): Promise<void> {
  const store = await requireStore();
  const storeId = new ObjectId(store.id);
  const id = toObjectId(orderId);
  if (!id) throw new Error('Order not found');

  const c = await collections();
  const order = await c.orders.findOne({ _id: id, storeId });
  if (!order) throw new Error('Order not found');

  const now = new Date();
  const timestamps: Record<string, Date> = {};
  if (status === 'CONFIRMED') timestamps.confirmedAt = now;
  if (status === 'READY') timestamps.readyAt = now;
  if (status === 'DELIVERED') timestamps.deliveredAt = now;
  if (status === 'CANCELLED') timestamps.cancelledAt = now;

  // Cash is collected on handover, so delivery is what marks it paid.
  const paid = status === 'DELIVERED' && order.paymentMethod !== 'ONLINE';

  await c.orders.updateOne(
    { _id: id },
    {
      $set: {
        status,
        ...timestamps,
        updatedAt: now,
        ...(status === 'CANCELLED' ? { cancelReason: options.note ?? null } : {}),
        ...(paid
          ? {
              paymentStatus: 'PAID' as const,
              'payment.status': 'PAID' as const,
              'payment.paidAt': now,
            }
          : {}),
      },
      $push: {
        events: { status, note: options.note ?? null, createdBy: options.actor ?? null, createdAt: now },
      },
    },
  );

  // Cancelling returns counted stock to the shelf.
  if (status === 'CANCELLED') {
    await Promise.all(
      order.items
        .filter((item) => item.productId)
        .map((item) =>
          c.products.updateOne(
            { _id: item.productId!, 'inventory.trackStock': true },
            { $inc: { 'inventory.stockQty': item.qty } },
          ),
        ),
    );
  }

  await dispatchQuietly(
    store.id,
    orderStatusMessage(
      { orderNumber: order.orderNumber, customerPhone: order.customerPhone },
      status,
      options.note,
    ),
    orderId,
  );
}

// ---------------------------------------------------------------------------
// Repeat ordering
// ---------------------------------------------------------------------------

export type ReorderOutcome = {
  added: { name: string; qty: number }[];
  skipped: { name: string; reason: string }[];
  repriced: { name: string; oldPricePoisha: number; newPricePoisha: number }[];
  productIds: { id: string; qty: number }[];
};

/**
 * "Order again" for a past order.
 *
 * Groceries repeat, so this is the fastest path to a second order — but a
 * month-old basket is never assumed still valid. Missing items are reported
 * rather than silently dropped, and price changes are surfaced so nobody is
 * surprised at the door.
 */
export async function buildReorder(orderId: string): Promise<ReorderOutcome> {
  const store = await requireStore();
  const outcome: ReorderOutcome = { added: [], skipped: [], repriced: [], productIds: [] };

  const id = toObjectId(orderId);
  const storeId = toObjectId(store.id);
  if (!id || !storeId) return outcome;

  const c = await collections();
  const order = await c.orders.findOne({ _id: id, storeId });
  if (!order) return outcome;

  const productIds = order.items
    .map((item) => item.productId)
    .filter((value): value is ObjectId => value != null);

  const products = productIds.length
    ? await c.products.find({ _id: { $in: productIds }, storeId }).toArray()
    : [];
  const byId = new Map(products.map((doc) => [doc._id.toString(), mapProduct(doc)]));

  for (const item of order.items) {
    const product = item.productId ? byId.get(item.productId.toString()) : undefined;

    if (!product || !product.isActive) {
      outcome.skipped.push({ name: item.name, reason: 'No longer sold' });
      continue;
    }
    if (!product.inventory.isAvailable) {
      outcome.skipped.push({ name: item.name, reason: 'Out of stock' });
      continue;
    }
    if (product.inventory.trackStock && product.inventory.stockQty <= 0) {
      outcome.skipped.push({ name: item.name, reason: 'Out of stock' });
      continue;
    }

    const current = product.discountPricePoisha ?? product.pricePoisha;
    if (current !== item.unitPricePoisha) {
      outcome.repriced.push({
        name: product.name,
        oldPricePoisha: item.unitPricePoisha,
        newPricePoisha: current,
      });
    }

    outcome.added.push({ name: product.name, qty: item.qty });
    outcome.productIds.push({ id: product.id, qty: item.qty });
  }

  return outcome;
}
