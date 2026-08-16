import type {
  CategoryDoc,
  CustomerDoc,
  DeliveryFeeRule,
  DeliverySlotDoc,
  DeliveryZoneDoc,
  FulfillmentType,
  Inventory,
  OrderDoc,
  OrderEvent,
  OrderItem,
  OrderStatus,
  PaymentMethod,
  PaymentStatus,
  ProductDoc,
  ProductImage,
  StoreDoc,
  StoreHour,
  StoreSettings,
} from './types';

/**
 * Documents carry ObjectId; the rest of the app only ever sees `id: string`.
 *
 * Doing the conversion in one place keeps ObjectId out of React components
 * (where it cannot be serialised across the server/client boundary anyway)
 * and means a page never accidentally leaks a raw document.
 */

export type Store = {
  id: string;
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
  settings: StoreSettings;
  hours: StoreHour[];
};

export type Category = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  iconKey: string | null;
  imageUrl: string | null;
  sortOrder: number;
  isActive: boolean;
};

export type Product = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  description: string | null;
  unit: string;
  pricePoisha: number;
  discountPricePoisha: number | null;
  minQty: number;
  maxQty: number;
  isFeatured: boolean;
  isActive: boolean;
  sortOrder: number;
  purchaseCount: number;
  brandName: string | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
  images: ProductImage[];
  inventory: Inventory;
};

export type DeliveryZone = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  deliveryFeePoisha: number;
  minOrderPoisha: number | null;
  freeDeliveryThresholdPoisha: number | null;
  estimatedMinutes: number;
  isActive: boolean;
  sortOrder: number;
  rules: DeliveryFeeRule[];
};

export type DeliverySlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  sortOrder: number;
};

export type Order = {
  id: string;
  orderNumber: string;
  customerId: string | null;
  status: OrderStatus;
  fulfillmentType: FulfillmentType;
  customerName: string;
  customerPhone: string;
  addressLine: string | null;
  landmark: string | null;
  zoneId: string | null;
  zoneName: string | null;
  zoneEstimatedMinutes: number | null;
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
  items: (Omit<OrderItem, 'productId'> & { productId: string | null })[];
  events: OrderEvent[];
  placedAt: Date;
  deliveredAt: Date | null;
};

export type Customer = {
  id: string;
  userId: string;
  name: string | null;
  phone: string;
  email: string | null;
  totalOrders: number;
  lastOrderAt: Date | null;
  favoriteProductIds: string[];
  addresses: {
    id: string;
    label: string | null;
    receiverName: string;
    phone: string;
    addressLine: string;
    landmark: string | null;
    zoneId: string | null;
    isDefault: boolean;
  }[];
};

export function mapStore(doc: StoreDoc): Store {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    nameBn: doc.nameBn,
    description: doc.description,
    phone: doc.phone,
    whatsapp: doc.whatsapp,
    email: doc.email,
    addressLine: doc.addressLine,
    area: doc.area,
    city: doc.city,
    district: doc.district,
    postcode: doc.postcode,
    latitude: doc.latitude,
    longitude: doc.longitude,
    mapUrl: doc.mapUrl,
    logoUrl: doc.logoUrl,
    settings: doc.settings,
    // Sorted here so every caller renders Sunday-to-Saturday.
    hours: [...doc.hours].sort((a, b) => a.dayOfWeek - b.dayOfWeek),
  };
}

export function mapCategory(doc: CategoryDoc): Category {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    nameBn: doc.nameBn,
    description: doc.description,
    iconKey: doc.iconKey,
    imageUrl: doc.imageUrl,
    sortOrder: doc.sortOrder,
    isActive: doc.isActive,
  };
}

export function mapProduct(doc: ProductDoc): Product {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    nameBn: doc.nameBn,
    description: doc.description,
    unit: doc.unit,
    pricePoisha: doc.pricePoisha,
    discountPricePoisha: doc.discountPricePoisha,
    minQty: doc.minQty,
    maxQty: doc.maxQty,
    isFeatured: doc.isFeatured,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    purchaseCount: doc.purchaseCount,
    brandName: doc.brandName,
    categoryId: doc.categoryId.toString(),
    categoryName: doc.categoryName,
    categorySlug: doc.categorySlug,
    images: doc.images ?? [],
    inventory: doc.inventory,
  };
}

export function mapZone(doc: DeliveryZoneDoc): DeliveryZone {
  return {
    id: doc._id.toString(),
    slug: doc.slug,
    name: doc.name,
    nameBn: doc.nameBn,
    deliveryFeePoisha: doc.deliveryFeePoisha,
    minOrderPoisha: doc.minOrderPoisha,
    freeDeliveryThresholdPoisha: doc.freeDeliveryThresholdPoisha,
    estimatedMinutes: doc.estimatedMinutes,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
    rules: doc.rules ?? [],
  };
}

export function mapSlot(doc: DeliverySlotDoc): DeliverySlot {
  return {
    id: doc._id.toString(),
    label: doc.label,
    startTime: doc.startTime,
    endTime: doc.endTime,
    isActive: doc.isActive,
    sortOrder: doc.sortOrder,
  };
}

export function mapOrder(doc: OrderDoc): Order {
  return {
    id: doc._id.toString(),
    orderNumber: doc.orderNumber,
    customerId: doc.customerId?.toString() ?? null,
    status: doc.status,
    fulfillmentType: doc.fulfillmentType,
    customerName: doc.customerName,
    customerPhone: doc.customerPhone,
    addressLine: doc.addressLine,
    landmark: doc.landmark,
    zoneId: doc.zoneId?.toString() ?? null,
    zoneName: doc.zoneName,
    zoneEstimatedMinutes: doc.zoneEstimatedMinutes,
    slotLabel: doc.slotLabel,
    scheduledFor: doc.scheduledFor,
    customerNote: doc.customerNote,
    adminNote: doc.adminNote,
    assignedTo: doc.assignedTo,
    cancelReason: doc.cancelReason,
    subtotalPoisha: doc.subtotalPoisha,
    deliveryFeePoisha: doc.deliveryFeePoisha,
    discountPoisha: doc.discountPoisha,
    totalPoisha: doc.totalPoisha,
    couponCode: doc.couponCode,
    paymentMethod: doc.paymentMethod,
    paymentStatus: doc.paymentStatus,
    items: (doc.items ?? []).map((item) => ({
      ...item,
      productId: item.productId?.toString() ?? null,
    })),
    events: doc.events ?? [],
    placedAt: doc.placedAt,
    deliveredAt: doc.deliveredAt,
  };
}

export function mapCustomer(doc: CustomerDoc): Customer {
  return {
    id: doc._id.toString(),
    userId: doc.userId.toString(),
    name: doc.name,
    phone: doc.phone,
    email: doc.email,
    totalOrders: doc.totalOrders,
    lastOrderAt: doc.lastOrderAt,
    favoriteProductIds: (doc.favoriteProductIds ?? []).map((id) => id.toString()),
    addresses: (doc.addresses ?? []).map((address) => ({
      id: address._id.toString(),
      label: address.label,
      receiverName: address.receiverName,
      phone: address.phone,
      addressLine: address.addressLine,
      landmark: address.landmark,
      zoneId: address.zoneId?.toString() ?? null,
      isDefault: address.isDefault,
    })),
  };
}
