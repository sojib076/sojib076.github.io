import 'server-only';
import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import { mapCategory, mapOrder, mapProduct, mapSlot, mapZone } from '@/lib/db/mappers';
import type { Category, DeliverySlot, DeliveryZone, Order, Product } from '@/lib/db/mappers';
import type { NotificationDoc, OrderStatus } from '@/lib/db/types';
import { startOfDhakaToday, type StoreContext } from '@/lib/store';

/**
 * Reads for the shop owner's dashboard.
 *
 * Kept apart from the storefront queries because they answer different
 * questions: the shop wants totals, hidden products and cancelled orders —
 * none of which a customer should ever see.
 */

export type DashboardData = {
  todayOrders: number;
  todaySalesPoisha: number;
  pendingCount: number;
  confirmedCount: number;
  totalOrders: number;
  averageOrderPoisha: number;
  lowStock: { id: string; name: string; unit: string; stockQty: number }[];
  popular: { id: string; name: string; unit: string; purchaseCount: number }[];
  latestOrders: Order[];
};

export async function getDashboardData(
  storeId: string,
  lowStockThreshold: number,
): Promise<DashboardData> {
  const id = toObjectId(storeId);
  if (!id) throw new Error('Invalid store id');

  const { orders, products } = await collections();
  const since = startOfDhakaToday();

  const [todayStats, statusCounts, allTime, lowStockDocs, popularDocs, latestDocs] =
    await Promise.all([
      // One pass over today's orders gives both the count and the takings.
      orders
        .aggregate<{ count: number; sales: number }>([
          { $match: { storeId: id, placedAt: { $gte: since } } },
          {
            $group: {
              _id: null,
              count: { $sum: 1 },
              sales: {
                $sum: { $cond: [{ $eq: ['$status', 'CANCELLED'] }, 0, '$totalPoisha'] },
              },
            },
          },
        ])
        .toArray(),

      orders
        .aggregate<{ _id: OrderStatus; count: number }>([
          { $match: { storeId: id } },
          { $group: { _id: '$status', count: { $sum: 1 } } },
        ])
        .toArray(),

      orders
        .aggregate<{ count: number; avg: number }>([
          { $match: { storeId: id, status: { $ne: 'CANCELLED' } } },
          { $group: { _id: null, count: { $sum: 1 }, avg: { $avg: '$totalPoisha' } } },
        ])
        .toArray(),

      products
        .find({
          storeId: id,
          isActive: true,
          'inventory.trackStock': true,
          'inventory.stockQty': { $lte: lowStockThreshold },
        })
        .sort({ 'inventory.stockQty': 1, name: 1 })
        .limit(10)
        .toArray(),

      products
        .find({ storeId: id, isActive: true, purchaseCount: { $gt: 0 } })
        .sort({ purchaseCount: -1 })
        .limit(8)
        .toArray(),

      orders.find({ storeId: id }).sort({ placedAt: -1 }).limit(8).toArray(),
    ]);

  const byStatus = new Map(statusCounts.map((row) => [row._id, row.count]));

  return {
    todayOrders: todayStats[0]?.count ?? 0,
    todaySalesPoisha: todayStats[0]?.sales ?? 0,
    pendingCount: byStatus.get('PENDING') ?? 0,
    confirmedCount: byStatus.get('CONFIRMED') ?? 0,
    totalOrders: allTime[0]?.count ?? 0,
    averageOrderPoisha: Math.round(allTime[0]?.avg ?? 0),
    lowStock: lowStockDocs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      unit: doc.unit,
      stockQty: doc.inventory.stockQty,
    })),
    popular: popularDocs.map((doc) => ({
      id: doc._id.toString(),
      name: doc.name,
      unit: doc.unit,
      purchaseCount: doc.purchaseCount,
    })),
    latestOrders: latestDocs.map(mapOrder),
  };
}

export async function listAdminOrders(
  storeId: string,
  status?: OrderStatus | null,
): Promise<Order[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { orders } = await collections();
  const docs = await orders
    .find({ storeId: id, ...(status ? { status } : {}) })
    .sort({ placedAt: -1 })
    .limit(100)
    .toArray();

  return docs.map(mapOrder);
}

export type AdminOrderDetail = {
  order: Order;
  customerTotalOrders: number | null;
  notifications: Pick<
    NotificationDoc,
    'channel' | 'recipient' | 'template' | 'status' | 'error'
  >[];
};

export async function getAdminOrder(
  storeId: string,
  orderId: string,
): Promise<AdminOrderDetail | null> {
  const id = toObjectId(storeId);
  const order = toObjectId(orderId);
  if (!id || !order) return null;

  const { orders, customers, notifications } = await collections();
  const doc = await orders.findOne({ _id: order, storeId: id });
  if (!doc) return null;

  const [customer, sent] = await Promise.all([
    doc.customerId ? customers.findOne({ _id: doc.customerId }) : null,
    notifications
      .find({ orderId: order }, { projection: { channel: 1, recipient: 1, template: 1, status: 1, error: 1 } })
      .sort({ createdAt: -1 })
      .limit(5)
      .toArray(),
  ]);

  return {
    order: mapOrder(doc),
    customerTotalOrders: customer?.totalOrders ?? null,
    notifications: sent,
  };
}

export type AdminProduct = Product & { imageUrl: string | null };

export async function listAdminProducts(
  storeId: string,
  categoryId?: string | null,
): Promise<AdminProduct[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const category = toObjectId(categoryId ?? null);
  const { products } = await collections();

  const docs = await products
    .find({ storeId: id, ...(category ? { categoryId: category } : {}) })
    .sort({ categoryName: 1, name: 1 })
    .limit(1000)
    .toArray();

  return docs.map((doc) => ({ ...mapProduct(doc), imageUrl: doc.images?.[0]?.url ?? null }));
}

export async function getAdminProduct(
  storeId: string,
  productId: string,
): Promise<AdminProduct | null> {
  const id = toObjectId(storeId);
  const product = toObjectId(productId);
  if (!id || !product) return null;

  const { products } = await collections();
  const doc = await products.findOne({ _id: product, storeId: id });
  if (!doc) return null;

  return { ...mapProduct(doc), imageUrl: doc.images?.[0]?.url ?? null };
}

export type AdminCategory = Category & { productCount: number };

/** Includes hidden categories, which the storefront query deliberately omits. */
export async function listAdminCategories(storeId: string): Promise<AdminCategory[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { categories, products } = await collections();

  const [docs, counts] = await Promise.all([
    categories.find({ storeId: id }).sort({ sortOrder: 1, name: 1 }).toArray(),
    products
      .aggregate<{ _id: ObjectId; count: number }>([
        { $match: { storeId: id } },
        { $group: { _id: '$categoryId', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countBy = new Map(counts.map((row) => [row._id.toString(), row.count]));

  return docs.map((doc) => ({
    ...mapCategory(doc),
    productCount: countBy.get(doc._id.toString()) ?? 0,
  }));
}

export type AdminZone = DeliveryZone & { orderCount: number };

export async function listAdminZones(storeId: string): Promise<AdminZone[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { zones, orders } = await collections();

  const [docs, counts] = await Promise.all([
    zones.find({ storeId: id }).sort({ sortOrder: 1, name: 1 }).toArray(),
    orders
      .aggregate<{ _id: ObjectId | null; count: number }>([
        { $match: { storeId: id, zoneId: { $ne: null } } },
        { $group: { _id: '$zoneId', count: { $sum: 1 } } },
      ])
      .toArray(),
  ]);

  const countBy = new Map(counts.map((row) => [row._id?.toString(), row.count]));

  return docs.map((doc) => ({
    ...mapZone(doc),
    orderCount: countBy.get(doc._id.toString()) ?? 0,
  }));
}

export async function listAdminSlots(storeId: string): Promise<DeliverySlot[]> {
  const id = toObjectId(storeId);
  if (!id) return [];

  const { slots } = await collections();
  const docs = await slots.find({ storeId: id }).sort({ sortOrder: 1, startTime: 1 }).toArray();
  return docs.map(mapSlot);
}

// ---------------------------------------------------------------------------
// Setup checklist
// ---------------------------------------------------------------------------

export type SetupItem = {
  id: string;
  title: string;
  detail: string;
  severity: 'error' | 'warning' | 'info';
  href?: string;
};

/**
 * What the owner has not finished setting up.
 *
 * Every item here is something they would otherwise discover the hard way —
 * from a customer who could not check out, or an order nobody was told about.
 * Silence means the shop is ready to take orders.
 */
export async function getSetupChecklist(store: StoreContext): Promise<SetupItem[]> {
  const id = toObjectId(store.id);
  if (!id) return [];

  const { products, categories, zones } = await collections();

  const [productCount, categoryCount, zoneCount] = await Promise.all([
    products.countDocuments({ storeId: id, isActive: true }),
    categories.countDocuments({ storeId: id, isActive: true }),
    zones.countDocuments({ storeId: id, isActive: true }),
  ]);

  const items: SetupItem[] = [];
  const settings = store.settings;

  // Blocking: a customer literally cannot complete an order without these.
  if (categoryCount === 0) {
    items.push({
      id: 'categories',
      title: 'No categories yet',
      detail: 'Customers browse by category. Add the ones matching your shelves.',
      severity: 'error',
      href: '/admin/categories',
    });
  }

  if (productCount === 0) {
    items.push({
      id: 'products',
      title: 'No products yet',
      detail: 'The shop has nothing to sell until you add products.',
      severity: 'error',
      href: '/admin/products/new',
    });
  }

  if (settings?.deliveryEnabled && zoneCount === 0) {
    items.push({
      id: 'zones',
      title: 'No delivery areas',
      detail:
        'Delivery is switched on but no areas exist, so nobody can choose delivery at checkout.',
      severity: 'error',
      href: '/admin/delivery',
    });
  }

  if (!settings?.notifyWhatsapp && !settings?.notifyPhone) {
    items.push({
      id: 'alerts',
      title: 'New orders are not being announced',
      detail: 'Add a WhatsApp or SMS number so you hear about an order as it arrives.',
      severity: 'error',
      href: '/admin/settings',
    });
  }

  // Worth fixing, but the shop still works.
  if (!store.addressLine || !store.area) {
    items.push({
      id: 'address',
      title: 'Shop address is incomplete',
      detail:
        'The address appears on the homepage and is what local searches such as "grocery shop near me" match on.',
      severity: 'warning',
      href: '/admin/settings',
    });
  }

  if (!store.mapUrl) {
    items.push({
      id: 'map',
      title: 'No map link',
      detail: 'Add your Google Maps link so customers collecting an order can find the shop.',
      severity: 'info',
      href: '/admin/settings',
    });
  }

  if (!process.env.SMS_GATEWAY_URL) {
    items.push({
      id: 'sms',
      title: 'No SMS gateway configured',
      detail:
        'Customers cannot receive sign-in codes or status updates by SMS. Orders still work — guests can check out and you are alerted on WhatsApp.',
      severity: 'warning',
    });
  }

  if (!process.env.S3_BUCKET) {
    items.push({
      id: 'storage',
      title: 'Product photos are stored on this server',
      detail:
        'Fine for a single server, but photos are lost if the app is redeployed on a platform with a temporary disk. Configure S3 storage to keep them.',
      severity: 'info',
    });
  }

  return items;
}
