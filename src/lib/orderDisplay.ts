import type { OrderStatus } from '@/lib/db/types';

/** Shared status colouring so the shop and the shopper see the same signals. */
export function statusColor(
  status: OrderStatus,
): 'default' | 'primary' | 'secondary' | 'success' | 'warning' | 'error' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'CONFIRMED':
    case 'PREPARING':
      return 'primary';
    case 'READY':
    case 'OUT_FOR_DELIVERY':
      return 'secondary';
    case 'DELIVERED':
      return 'success';
    case 'CANCELLED':
      return 'error';
    default:
      return 'default';
  }
}
