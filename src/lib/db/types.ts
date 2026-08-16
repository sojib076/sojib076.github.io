import type { ObjectId } from 'mongodb';

/**
 * MongoDB document shapes.
 *
 * These are modelled the way a document database wants to be modelled, not as
 * a transliteration of SQL tables:
 *
 *   • things that are only ever read with their parent are embedded — a
 *     product's photos, stock and price live in the product document, an
 *     order's lines and history live in the order document;
 *   • things that are queried on their own stay in their own collection —
 *     products, orders, customers, categories, zones;
 *   • `storeId` is on every tenant-owned document so a second shop is a data
 *     change, never a rewrite.
 *
 * The big practical win: writing an order is a single-document insert, so it
 * is atomic without needing a multi-document transaction (and therefore works
 * on a standalone mongod as well as on a replica set).
 *
 * Money is always an integer number of poisha (1 BDT = 100 poisha).
 */

// ---------------------------------------------------------------------------
// Enumerations (plain string unions — Mongo stores them as strings)
// ---------------------------------------------------------------------------

export const ORDER_STATUSES = [
  'PENDING',
  'CONFIRMED',
  'PREPARING',
  'READY',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
  'CANCELLED',
] as const;
export type OrderStatus = (typeof ORDER_STATUSES)[number];

export type UserRole = 'ADMIN' | 'STAFF' | 'CUSTOMER' | 'RIDER';
export type FulfillmentType = 'DELIVERY' | 'PICKUP';
export type PaymentMethod = 'CASH_ON_DELIVERY' | 'PAY_AT_STORE' | 'ONLINE';
export type PaymentStatus = 'UNPAID' | 'PAID' | 'REFUNDED' | 'FAILED';
export type DiscountType = 'PERCENT' | 'FIXED';
export type NotificationChannel = 'SMS' | 'WHATSAPP' | 'EMAIL' | 'IN_APP';
export type NotificationStatus = 'QUEUED' | 'SENT' | 'FAILED';

// ---------------------------------------------------------------------------
// Embedded sub-documents
// ---------------------------------------------------------------------------

export type StoreSettings = {
  currency: string;
  minOrderPoisha: number;
  defaultDeliveryFeePoisha: number;
  /** Null disables free delivery entirely. */
  freeDeliveryThresholdPoisha: number | null;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  prepTimeMinutes: number;
  maxPreOrderDays: number;
  acceptOrdersWhenClosed: boolean;
  orderNumberPrefix: string;
  lowStockThreshold: number;
  notifyPhone: string | null;
  notifyWhatsapp: string | null;
  notifyEmail: string | null;
};

export type StoreHour = {
  /** 0 = Sunday … 6 = Saturday */
  dayOfWeek: number;
  /** "08:00", local store time, 24h. */
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export type ProductImage = {
  url: string;
  alt: string | null;
};

export type Inventory = {
  isAvailable: boolean;
  /** Most small shops just toggle availability instead of counting stock. */
  trackStock: boolean;
  stockQty: number;
  lowStockThreshold: number;
};

export type CartItem = {
  productId: ObjectId;
  qty: number;
  addedAt: Date;
};

/** Line items snapshot name, unit and price so old receipts never change. */
export type OrderItem = {
  productId: ObjectId | null;
  name: string;
  nameBn: string | null;
  unit: string;
  unitPricePoisha: number;
  qty: number;
  lineTotalPoisha: number;
};

export type OrderEvent = {
  status: OrderStatus;
  note: string | null;
  createdBy: string | null;
  createdAt: Date;
};

/** Present from day one so online payment providers have somewhere to write. */
export type OrderPayment = {
  method: PaymentMethod;
  status: PaymentStatus;
  amountPoisha: number;
  provider: string | null;
  reference: string | null;
  paidAt: Date | null;
};

export type CustomerAddress = {
  _id: ObjectId;
  label: string | null;
  receiverName: string;
  phone: string;
  addressLine: string;
  landmark: string | null;
  zoneId: ObjectId | null;
  isDefault: boolean;
  updatedAt: Date;
};

/** Optional subtotal-banded fees inside one area. */
export type DeliveryFeeRule = {
  minSubtotalPoisha: number;
  maxSubtotalPoisha: number | null;
  feePoisha: number;
  isActive: boolean;
};

// ---------------------------------------------------------------------------
// Collections
// ---------------------------------------------------------------------------

export type StoreDoc = {
  _id: ObjectId;
  slug: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  phone: string | null;
  whatsapp: string | null;
  email: string | null;
  addressLine: string | null;
  area: string | null;
  city: string | null;
  district: string | null;
  postcode: string | null;
  latitude: number | null;
  longitude: number | null;
  mapUrl: string | null;
  logoUrl: string | null;
  isActive: boolean;
  settings: StoreSettings;
  hours: StoreHour[];
  createdAt: Date;
  updatedAt: Date;
};

export type CategoryDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  slug: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  iconKey: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
};

export type ProductDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  categoryId: ObjectId;
  /** Denormalised so product cards and search need no second query. */
  categoryName: string;
  categorySlug: string;
  brandName: string | null;
  slug: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  unit: string;
  sku: string | null;
  pricePoisha: number;
  discountPricePoisha: number | null;
  minQty: number;
  maxQty: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  /** Lowercased haystack (name + Bengali name + brand + unit + category). */
  searchText: string;
  purchaseCount: number;
  images: ProductImage[];
  inventory: Inventory;
  createdAt: Date;
  updatedAt: Date;
};

export type UserDoc = {
  _id: ObjectId;
  storeId: ObjectId | null;
  role: UserRole;
  name: string | null;
  phone: string | null;
  email: string | null;
  /** Staff only; customers sign in with a one-time code. */
  passwordHash: string | null;
  isActive: boolean;
  lastLogin: Date | null;
  createdAt: Date;
  updatedAt: Date;
};

export type CustomerDoc = {
  _id: ObjectId;
  userId: ObjectId;
  name: string | null;
  phone: string;
  email: string | null;
  totalOrders: number;
  lastOrderAt: Date | null;
  addresses: CustomerAddress[];
  favoriteProductIds: ObjectId[];
  createdAt: Date;
  updatedAt: Date;
};

/** Expires automatically via a TTL index on `expiresAt`. */
export type OtpDoc = {
  _id: ObjectId;
  phone: string;
  codeHash: string;
  attempts: number;
  usedAt: Date | null;
  expiresAt: Date;
  createdAt: Date;
};

export type CartDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  token: string;
  customerId: ObjectId | null;
  items: CartItem[];
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
};

export type OrderDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  orderNumber: string;
  customerId: ObjectId | null;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;

  // Copied onto the order: editing a profile later must not rewrite the
  // address the shop already delivered to.
  customerName: string;
  customerPhone: string;
  addressLine: string | null;
  landmark: string | null;
  zoneId: ObjectId | null;
  zoneName: string | null;
  zoneEstimatedMinutes: number | null;

  slotId: ObjectId | null;
  slotLabel: string | null;
  scheduledFor: Date | null;

  customerNote: string | null;
  adminNote: string | null;
  assignedTo: string | null;
  cancelReason: string | null;

  subtotalPoisha: number;
  deliveryFeePoisha: number;
  discountPoisha: number;
  totalPoisha: number;
  couponCode: string | null;

  paymentMethod: PaymentMethod;
  paymentStatus: PaymentStatus;
  payment: OrderPayment;

  items: OrderItem[];
  events: OrderEvent[];

  placedAt: Date;
  confirmedAt: Date | null;
  readyAt: Date | null;
  deliveredAt: Date | null;
  cancelledAt: Date | null;
  updatedAt: Date;
};

export type DeliveryZoneDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  slug: string;
  name: string;
  nameBn: string | null;
  deliveryFeePoisha: number;
  /** Null means "use the store-wide setting". */
  minOrderPoisha: number | null;
  freeDeliveryThresholdPoisha: number | null;
  estimatedMinutes: number;
  isActive: boolean;
  sortOrder: number;
  rules: DeliveryFeeRule[];
  createdAt: Date;
  updatedAt: Date;
};

export type DeliverySlotDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  label: string;
  startTime: string;
  endTime: string;
  /** Null = available every day. */
  dayOfWeek: number | null;
  capacity: number;
  isActive: boolean;
  sortOrder: number;
};

export type CouponDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  code: string;
  description: string | null;
  discountType: DiscountType;
  /** Percent (1–100) or poisha, depending on discountType. */
  value: number;
  minOrderPoisha: number;
  maxDiscountPoisha: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  usageLimit: number | null;
  usedCount: number;
  isActive: boolean;
};

export type ReviewDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  customerId: ObjectId;
  productId: ObjectId | null;
  orderId: ObjectId | null;
  rating: number;
  comment: string | null;
  isApproved: boolean;
  createdAt: Date;
};

/** Provider-agnostic outbox — see src/lib/notifications. */
export type NotificationDoc = {
  _id: ObjectId;
  storeId: ObjectId;
  orderId: ObjectId | null;
  channel: NotificationChannel;
  recipient: string;
  template: string;
  payload: Record<string, unknown>;
  status: NotificationStatus;
  provider: string | null;
  error: string | null;
  attempts: number;
  sentAt: Date | null;
  createdAt: Date;
};

/** Atomic sequence source for daily order numbers. */
export type CounterDoc = {
  _id: string;
  value: number;
};
