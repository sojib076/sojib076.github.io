import type { NotificationChannel } from '@/lib/db/types';

/**
 * Notification providers are swappable on purpose.
 *
 * The shop starts on WhatsApp/SMS because that is what the owner already uses.
 * Adding a different gateway later means writing one object that satisfies
 * `NotificationProvider` — no caller changes.
 */

export type NotificationTemplate =
  | 'OTP_CODE'
  | 'ORDER_PLACED_ADMIN'
  | 'ORDER_CONFIRMATION_CUSTOMER'
  | 'ORDER_STATUS_CUSTOMER';

export type NotificationMessage = {
  channel: NotificationChannel;
  /** Phone in 01XXXXXXXXX form, or an email address for EMAIL. */
  recipient: string;
  template: NotificationTemplate;
  subject?: string;
  body: string;
  payload?: Record<string, unknown>;
};

export type SendResult =
  | { ok: true; provider: string; reference?: string }
  | { ok: false; provider: string; error: string };

export interface NotificationProvider {
  readonly name: string;
  supports(channel: NotificationChannel): boolean;
  send(message: NotificationMessage): Promise<SendResult>;
}
