import 'server-only';
import { cache } from 'react';
import { collections, ensureIndexes } from '@/lib/db/client';
import { mapStore, type Store } from '@/lib/db/mappers';
import type { StoreSettings } from '@/lib/db/types';

/**
 * Resolving "which store is this request for?" happens in exactly one place.
 *
 * Today it returns the single seeded store (optionally pinned by slug). When
 * the marketplace arrives, this reads the subdomain or the /[storeSlug] route
 * segment and nothing downstream changes.
 */

export type StoreContext = Store;

export const ACTIVE_STORE_SLUG = process.env.ACTIVE_STORE_SLUG ?? 'shibu-store';

/** Cached per request, so a page with ten sections still issues one query. */
export const getStore = cache(async (): Promise<StoreContext | null> => {
  // Cheap after the first call; guarantees a fresh deployment is indexed.
  await ensureIndexes();

  const { stores } = await collections();

  const bySlug = await stores.findOne({ slug: ACTIVE_STORE_SLUG });
  if (bySlug) return mapStore(bySlug);

  // Fallback so a database seeded under a different slug still boots instead
  // of showing an empty site.
  const anyStore = await stores.findOne({ isActive: true }, { sort: { createdAt: 1 } });
  return anyStore ? mapStore(anyStore) : null;
});

/** Throws when unseeded — used by routes that cannot render without a store. */
export async function requireStore(): Promise<StoreContext> {
  const store = await getStore();
  if (!store) {
    throw new Error('No store found. Run `npm run db:seed` to create the initial store record.');
  }
  return store;
}

export const DEFAULT_SETTINGS: StoreSettings = {
  currency: 'BDT',
  minOrderPoisha: 0,
  defaultDeliveryFeePoisha: 0,
  freeDeliveryThresholdPoisha: null,
  deliveryEnabled: true,
  pickupEnabled: true,
  prepTimeMinutes: 45,
  maxPreOrderDays: 3,
  acceptOrdersWhenClosed: true,
  orderNumberPrefix: 'SS',
  lowStockThreshold: 5,
  notifyPhone: null,
  notifyWhatsapp: null,
  notifyEmail: null,
};

/**
 * Settings with defaults applied.
 *
 * A document store has no schema to guarantee every field exists, so a store
 * written by an older version of the app must not crash a page — missing keys
 * fall back rather than becoming `undefined` inside a price calculation.
 */
export function resolveSettings(store: StoreContext) {
  const s = store.settings ?? DEFAULT_SETTINGS;

  return {
    currency: s.currency ?? 'BDT',
    minOrderPoisha: s.minOrderPoisha ?? 0,
    defaultDeliveryFeePoisha: s.defaultDeliveryFeePoisha ?? 0,
    freeDeliveryThresholdPoisha: s.freeDeliveryThresholdPoisha ?? null,
    deliveryEnabled: s.deliveryEnabled ?? true,
    pickupEnabled: s.pickupEnabled ?? true,
    prepTimeMinutes: s.prepTimeMinutes ?? 45,
    maxPreOrderDays: s.maxPreOrderDays ?? 3,
    acceptOrdersWhenClosed: s.acceptOrdersWhenClosed ?? true,
    orderNumberPrefix: s.orderNumberPrefix ?? 'SS',
    lowStockThreshold: s.lowStockThreshold ?? 5,
    notifyPhone: s.notifyPhone ?? store.phone ?? null,
    notifyWhatsapp: s.notifyWhatsapp ?? store.whatsapp ?? null,
    notifyEmail: s.notifyEmail ?? store.email ?? null,
  };
}

export type ResolvedSettings = ReturnType<typeof resolveSettings>;

const DAY_LABELS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export function dayLabel(dayOfWeek: number): string {
  return DAY_LABELS[dayOfWeek] ?? '';
}

/** "08:00" → minutes since midnight; null when malformed. */
function parseTime(value: string): number | null {
  const match = /^(\d{1,2}):(\d{2})$/.exec(value.trim());
  if (!match) return null;
  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59) return null;
  return hours * 60 + minutes;
}

/** "08:00" → "8:00 AM", the format shoppers here expect to read. */
export function formatTime(value: string): string {
  const total = parseTime(value);
  if (total == null) return value;
  const hours = Math.floor(total / 60);
  const minutes = total % 60;
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const display = hours % 12 === 0 ? 12 : hours % 12;
  return `${display}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

/**
 * Bangladesh has no daylight saving, so a fixed +06:00 offset is exact and
 * avoids shipping a timezone database to a low-end phone.
 */
export const BD_UTC_OFFSET_MINUTES = 6 * 60;

export function nowInDhaka(now: Date = new Date()): Date {
  return new Date(now.getTime() + BD_UTC_OFFSET_MINUTES * 60_000);
}

/** Midnight in Dhaka, expressed as the UTC instant queries can use. */
export function startOfDhakaToday(now: Date = new Date()): Date {
  const local = nowInDhaka(now);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), local.getUTCDate()) -
      BD_UTC_OFFSET_MINUTES * 60_000,
  );
}

export type OpenState = {
  isOpen: boolean;
  /** Today's hours, or null when the shop is closed all day. */
  todayHours: { opensAt: string; closesAt: string } | null;
  nextOpenLabel: string | null;
};

/** Whether the shop is serving right now, per the admin-managed hours. */
export function getOpenState(store: StoreContext, now: Date = new Date()): OpenState {
  const local = nowInDhaka(now);
  const day = local.getUTCDay();
  const minutes = local.getUTCHours() * 60 + local.getUTCMinutes();

  const today = store.hours.find((hour) => hour.dayOfWeek === day);
  if (!today || today.isClosed) {
    return { isOpen: false, todayHours: null, nextOpenLabel: findNextOpenDay(store, day) };
  }

  const opens = parseTime(today.opensAt);
  const closes = parseTime(today.closesAt);
  const todayHours = { opensAt: today.opensAt, closesAt: today.closesAt };

  if (opens == null || closes == null) {
    return { isOpen: false, todayHours, nextOpenLabel: null };
  }

  // Shops that close after midnight store e.g. 09:00 → 01:00.
  const isOpen =
    closes > opens ? minutes >= opens && minutes < closes : minutes >= opens || minutes < closes;

  const nextOpenLabel = isOpen
    ? null
    : minutes < opens
      ? `Opens today at ${formatTime(today.opensAt)}`
      : findNextOpenDay(store, day);

  return { isOpen, todayHours, nextOpenLabel };
}

function findNextOpenDay(store: StoreContext, fromDay: number): string | null {
  for (let step = 1; step <= 7; step += 1) {
    const day = (fromDay + step) % 7;
    const hours = store.hours.find((hour) => hour.dayOfWeek === day);
    if (hours && !hours.isClosed) {
      const when = step === 1 ? 'tomorrow' : dayLabel(day);
      return `Opens ${when} at ${formatTime(hours.opensAt)}`;
    }
  }
  return null;
}
