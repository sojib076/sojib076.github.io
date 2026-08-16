import type { Db } from 'mongodb';

/**
 * Index definitions live here, apart from the connection module, so both the
 * running app and the standalone `npm run db:indexes` script can apply them.
 *
 * Mongo will happily serve every query with a collection scan, which is fine
 * for ten products and useless for two thousand. Declaring indexes in code
 * means a fresh deployment is correctly indexed without a migration step.
 */
export async function createIndexes(db: Db): Promise<void> {
  await Promise.all([
    db.collection('stores').createIndex({ slug: 1 }, { unique: true }),

    db.collection('categories').createIndex({ storeId: 1, slug: 1 }, { unique: true }),
    db.collection('categories').createIndex({ storeId: 1, isActive: 1, sortOrder: 1 }),

    db.collection('products').createIndex({ storeId: 1, slug: 1 }, { unique: true }),
    db.collection('products').createIndex({ storeId: 1, isActive: 1, categoryId: 1, sortOrder: 1 }),
    db.collection('products').createIndex({ storeId: 1, isActive: 1, isFeatured: 1 }),
    db.collection('products').createIndex({ storeId: 1, isActive: 1, purchaseCount: -1 }),
    // Substring search over the denormalised haystack.
    db.collection('products').createIndex({ storeId: 1, searchText: 1 }),

    db.collection('users').createIndex({ email: 1 }, { unique: true, sparse: true }),
    db.collection('users').createIndex({ phone: 1 }, { unique: true, sparse: true }),

    db.collection('customers').createIndex({ phone: 1 }, { unique: true }),
    db.collection('customers').createIndex({ userId: 1 }, { unique: true }),

    // One-time codes clean themselves up.
    db.collection('otpCodes').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),
    db.collection('otpCodes').createIndex({ phone: 1, createdAt: -1 }),

    db.collection('carts').createIndex({ token: 1 }, { unique: true }),
    db.collection('carts').createIndex({ customerId: 1, updatedAt: -1 }),
    // Abandoned carts expire instead of accumulating forever.
    db.collection('carts').createIndex({ expiresAt: 1 }, { expireAfterSeconds: 0 }),

    db.collection('orders').createIndex({ orderNumber: 1 }, { unique: true }),
    db.collection('orders').createIndex({ storeId: 1, placedAt: -1 }),
    db.collection('orders').createIndex({ storeId: 1, status: 1, placedAt: -1 }),
    db.collection('orders').createIndex({ customerId: 1, placedAt: -1 }),
    db.collection('orders').createIndex({ storeId: 1, customerPhone: 1 }),
    // Powers "you buy these often" without scanning every order.
    db.collection('orders').createIndex({ customerId: 1, 'items.productId': 1 }),

    db.collection('deliveryZones').createIndex({ storeId: 1, slug: 1 }, { unique: true }),
    db.collection('deliveryZones').createIndex({ storeId: 1, isActive: 1, sortOrder: 1 }),

    db.collection('deliverySlots').createIndex({ storeId: 1, isActive: 1, sortOrder: 1 }),

    db.collection('coupons').createIndex({ storeId: 1, code: 1 }, { unique: true }),

    db.collection('reviews').createIndex({ storeId: 1, productId: 1, isApproved: 1 }),

    db.collection('notifications').createIndex({ storeId: 1, status: 1, createdAt: -1 }),
    db.collection('notifications').createIndex({ orderId: 1, createdAt: -1 }),
  ]);
}
