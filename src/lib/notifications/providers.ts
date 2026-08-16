import type { NotificationChannel } from '@/lib/db/types';
import type { NotificationMessage, NotificationProvider, SendResult } from './types';

/**
 * Ships with two providers:
 *
 *   • ConsoleProvider — the default. Logs the message instead of sending it, so
 *     the whole ordering flow (including OTP sign-in) works on a laptop with no
 *     paid gateway account.
 *   • HttpGatewayProvider — a generic HTTP SMS/WhatsApp gateway driven entirely
 *     by environment variables, which is how most Bangladeshi SMS vendors and
 *     the WhatsApp Cloud API both work.
 */

export class ConsoleProvider implements NotificationProvider {
  readonly name = 'console';

  supports(): boolean {
    return true;
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    // eslint-disable-next-line no-console
    console.info(
      `[notification] ${message.channel} → ${message.recipient} (${message.template})\n${message.body}`,
    );
    return { ok: true, provider: this.name };
  }
}

/**
 * Posts JSON to a configured endpoint.
 *
 * SMS_GATEWAY_URL   e.g. https://api.example.net/v1/sms
 * SMS_GATEWAY_TOKEN bearer token
 * SMS_GATEWAY_SENDER optional sender id
 *
 * The body template uses the vendor-neutral shape {to, message, sender}; a
 * vendor that wants different keys needs one edit here.
 */
export class HttpGatewayProvider implements NotificationProvider {
  readonly name = 'http-gateway';

  constructor(
    private readonly url: string,
    private readonly token: string | undefined,
    private readonly sender: string | undefined,
  ) {}

  supports(channel: NotificationChannel): boolean {
    return channel === 'SMS' || channel === 'WHATSAPP';
  }

  async send(message: NotificationMessage): Promise<SendResult> {
    try {
      const response = await fetch(this.url, {
        method: 'POST',
        headers: {
          'content-type': 'application/json',
          ...(this.token ? { authorization: `Bearer ${this.token}` } : {}),
        },
        body: JSON.stringify({
          to: toInternational(message.recipient),
          message: message.body,
          sender: this.sender,
          channel: message.channel.toLowerCase(),
        }),
        // A slow gateway must never hold up an order confirmation.
        signal: AbortSignal.timeout(8000),
      });

      if (!response.ok) {
        return { ok: false, provider: this.name, error: `Gateway responded ${response.status}` };
      }
      return { ok: true, provider: this.name };
    } catch (error) {
      return {
        ok: false,
        provider: this.name,
        error: error instanceof Error ? error.message : 'Unknown gateway error',
      };
    }
  }
}

/** 01712345678 → 8801712345678, which is what gateways expect. */
export function toInternational(phone: string): string {
  const digits = phone.replace(/\D/g, '');
  if (digits.startsWith('880')) return digits;
  if (digits.startsWith('0')) return `88${digits}`;
  return digits;
}

/**
 * A click-to-chat link. Costs nothing and needs no API account, which is why
 * the admin screens use it to message a customer about their order.
 */
export function whatsappLink(phone: string, text: string): string {
  return `https://wa.me/${toInternational(phone)}?text=${encodeURIComponent(text)}`;
}

let cached: NotificationProvider | null = null;

export function getProvider(): NotificationProvider {
  if (cached) return cached;

  const url = process.env.SMS_GATEWAY_URL;
  cached = url
    ? new HttpGatewayProvider(url, process.env.SMS_GATEWAY_TOKEN, process.env.SMS_GATEWAY_SENDER)
    : new ConsoleProvider();

  return cached;
}
