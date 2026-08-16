import { formatBDT } from '@/lib/money';
import type { Quote } from '@/lib/pricing';

/**
 * WhatsApp as an ordering channel, not just a support link.
 *
 * Plenty of customers here would rather send a message than fill in a form,
 * and the shop already runs on WhatsApp. Click-to-chat costs nothing, needs no
 * API account, and works the moment the site is live — so the basket a shopper
 * built on the site can always reach the shop, even before any SMS gateway is
 * paid for.
 *
 * The message is pre-filled with the exact basket and totals the site
 * calculated, so the shop is not re-typing an order from a voice call.
 */

/** 01781736024 → 8801781736024, which is what wa.me expects. */
export function toInternationalPhone(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

export function whatsappHref(phone: string, text: string): string {
  return `https://wa.me/${toInternationalPhone(phone)}?text=${encodeURIComponent(text)}`;
}

export type BasketMessageInput = {
  storeName: string;
  quote: Quote;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  zoneName?: string | null;
  siteUrl?: string;
};

/** The whole basket as a readable message the shop can act on directly. */
export function basketMessage({
  storeName,
  quote,
  fulfillmentType,
  zoneName,
  siteUrl,
}: BasketMessageInput): string {
  const lines = quote.lines.map(
    (line) => `• ${line.name} — ${line.qty} ${line.unit} × ${formatBDT(line.unitPricePoisha)} = ${formatBDT(line.lineTotalPoisha)}`,
  );

  const isDelivery = fulfillmentType === 'DELIVERY';

  return [
    `Hello ${storeName}, I would like to place this order:`,
    '',
    ...lines,
    '',
    `Subtotal: ${formatBDT(quote.subtotalPoisha)}`,
    isDelivery
      ? `Delivery${zoneName ? ` (${zoneName})` : ''}: ${
          quote.deliveryIsFree ? 'Free' : formatBDT(quote.deliveryFeePoisha)
        }`
      : 'Store pickup: Free',
    quote.discountPoisha > 0 ? `Discount: -${formatBDT(quote.discountPoisha)}` : null,
    `Total: ${formatBDT(quote.totalPoisha)}`,
    '',
    isDelivery
      ? 'Please confirm and tell me the delivery time. My address:'
      : 'Please confirm when it is ready for pickup.',
    siteUrl ? `\n(Basket built on ${siteUrl})` : null,
  ]
    .filter((line) => line !== null)
    .join('\n');
}

/** Asking about one product, from its own page. */
export function productMessage(storeName: string, productName: string, unit: string): string {
  return `Hello ${storeName}, do you have ${productName} (${unit}) in stock?`;
}
