import 'server-only';
import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import type { FulfillmentType, OrderItem, OrderStatus, PaymentMethod } from '@/lib/db/types';
import { formatBDT } from '@/lib/money';
import { getProvider } from './providers';
import type { NotificationMessage } from './types';

export { whatsappLink, toInternational } from './providers';
export type { NotificationMessage, NotificationProvider } from './types';

/**
 * Every outgoing message is written to the notifications collection first,
 * then handed to the active provider. If the gateway is down the record
 * survives with status FAILED, so the owner can see what did not reach the
 * customer.
 */
export async function dispatch(
  storeId: string,
  message: NotificationMessage,
  orderId?: string | null,
): Promise<void> {
  const { notifications } = await collections();
  const provider = getProvider();

  const _id = new ObjectId();
  await notifications.insertOne({
    _id,
    storeId: new ObjectId(storeId),
    orderId: toObjectId(orderId ?? null),
    channel: message.channel,
    recipient: message.recipient,
    template: message.template,
    payload: message.payload ?? {},
    status: 'QUEUED',
    provider: provider.name,
    error: null,
    attempts: 0,
    sentAt: null,
    createdAt: new Date(),
  });

  if (!provider.supports(message.channel)) {
    await notifications.updateOne(
      { _id },
      { $set: { status: 'FAILED', error: 'Channel not supported', attempts: 1 } },
    );
    return;
  }

  const result = await provider.send(message);

  await notifications.updateOne(
    { _id },
    {
      $set: result.ok
        ? { status: 'SENT' as const, provider: result.provider, sentAt: new Date(), attempts: 1 }
        : { status: 'FAILED' as const, provider: result.provider, error: result.error, attempts: 1 },
    },
  );
}

/**
 * Notifications must never break the thing that triggered them: an SMS gateway
 * outage cannot be allowed to fail an order that the shop has already taken.
 */
export async function dispatchQuietly(
  storeId: string,
  message: NotificationMessage,
  orderId?: string | null,
): Promise<void> {
  try {
    await dispatch(storeId, message, orderId);
  } catch (error) {
    // eslint-disable-next-line no-console
    console.error('[notification] dispatch failed', error);
  }
}

// ---------------------------------------------------------------------------
// Templates
// ---------------------------------------------------------------------------

export function otpMessage(phone: string, code: string): NotificationMessage {
  return {
    channel: 'SMS',
    recipient: phone,
    template: 'OTP_CODE',
    body: `${code} is your Shibu Store verification code. It expires in 5 minutes.`,
    payload: { code },
  };
}

/** The minimum an order must expose to be described in a message. */
export type NotifiableOrder = {
  orderNumber: string;
  customerName: string;
  customerPhone: string;
  fulfillmentType: FulfillmentType;
  addressLine: string | null;
  slotLabel: string | null;
  customerNote: string | null;
  subtotalPoisha: number;
  deliveryFeePoisha: number;
  discountPoisha: number;
  totalPoisha: number;
  paymentMethod: PaymentMethod;
  items: Pick<OrderItem, 'name' | 'qty' | 'unit' | 'lineTotalPoisha'>[];
};

export function newOrderAdminMessage(
  order: NotifiableOrder,
  recipient: string,
  channel: 'SMS' | 'WHATSAPP' = 'WHATSAPP',
): NotificationMessage {
  const lines = order.items
    .map((item) => `• ${item.name} × ${item.qty} ${item.unit} — ${formatBDT(item.lineTotalPoisha)}`)
    .join('\n');

  const where =
    order.fulfillmentType === 'PICKUP' ? 'Store pickup' : `Delivery: ${order.addressLine ?? '—'}`;

  return {
    channel,
    recipient,
    template: 'ORDER_PLACED_ADMIN',
    subject: `New order ${order.orderNumber}`,
    body: [
      `New order ${order.orderNumber}`,
      `${order.customerName} — ${order.customerPhone}`,
      where,
      order.slotLabel ? `Time: ${order.slotLabel}` : null,
      '',
      lines,
      '',
      `Subtotal: ${formatBDT(order.subtotalPoisha)}`,
      order.deliveryFeePoisha > 0 ? `Delivery: ${formatBDT(order.deliveryFeePoisha)}` : null,
      order.discountPoisha > 0 ? `Discount: -${formatBDT(order.discountPoisha)}` : null,
      `Total: ${formatBDT(order.totalPoisha)}`,
      `Payment: ${paymentLabel(order.paymentMethod)}`,
      order.customerNote ? `Note: ${order.customerNote}` : null,
    ]
      .filter(Boolean)
      .join('\n'),
    payload: { orderNumber: order.orderNumber },
  };
}

export function orderConfirmationMessage(order: NotifiableOrder): NotificationMessage {
  return {
    channel: 'SMS',
    recipient: order.customerPhone,
    template: 'ORDER_CONFIRMATION_CUSTOMER',
    body:
      `Thank you! Shibu Store received your order ${order.orderNumber}. ` +
      `Total ${formatBDT(order.totalPoisha)} (${paymentLabel(order.paymentMethod)}). ` +
      `Track it here: ${trackUrl(order.orderNumber)}`,
    payload: { orderNumber: order.orderNumber },
  };
}

const STATUS_TEXT: Record<OrderStatus, string> = {
  PENDING: 'has been received and is awaiting confirmation',
  CONFIRMED: 'has been confirmed',
  PREPARING: 'is being packed now',
  READY: 'is packed and ready',
  OUT_FOR_DELIVERY: 'is on the way to you',
  DELIVERED: 'has been delivered. Thank you!',
  CANCELLED: 'has been cancelled',
};

export function orderStatusMessage(
  order: { orderNumber: string; customerPhone: string },
  status: OrderStatus,
  note?: string | null,
): NotificationMessage {
  return {
    channel: 'SMS',
    recipient: order.customerPhone,
    template: 'ORDER_STATUS_CUSTOMER',
    body: [
      `Shibu Store: your order ${order.orderNumber} ${STATUS_TEXT[status]}.`,
      note ? note : null,
      status === 'CANCELLED' ? null : trackUrl(order.orderNumber),
    ]
      .filter(Boolean)
      .join(' '),
    payload: { orderNumber: order.orderNumber, status },
  };
}

function trackUrl(orderNumber: string): string {
  const base = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  return `${base}/orders/${orderNumber}`;
}

export function paymentLabel(method: PaymentMethod): string {
  switch (method) {
    case 'CASH_ON_DELIVERY':
      return 'Cash on delivery';
    case 'PAY_AT_STORE':
      return 'Pay at store';
    default:
      return 'Online payment';
  }
}
