import 'server-only';
import { MongoClient, type Db, ObjectId } from 'mongodb';
import type {
  CartDoc,
  CategoryDoc,
  CounterDoc,
  CouponDoc,
  CustomerDoc,
  DeliverySlotDoc,
  DeliveryZoneDoc,
  NotificationDoc,
  OrderDoc,
  OtpDoc,
  ProductDoc,
  ReviewDoc,
  StoreDoc,
  UserDoc,
} from './types';
import { createIndexes } from './indexes';

/**
 * One MongoClient for the whole process.
 *
 * Next.js hot-reloads modules in development and serverless platforms reuse
 * warm instances in production; without this cache each reload would open a
 * new connection pool until the database refused more.
 */

const uri = process.env.MONGODB_URI;
const dbName = process.env.MONGODB_DB ?? 'shibu_store';

const globalForMongo = globalThis as unknown as {
  _mongoClientPromise?: Promise<MongoClient>;
  _mongoIndexesReady?: Promise<void>;
};

function createClient(): Promise<MongoClient> {
  if (!uri) {
    throw new Error(
      'MONGODB_URI is not set. Copy .env.example to .env and point it at your MongoDB instance.',
    );
  }

  const client = new MongoClient(uri, {
    // Fail fast rather than hanging a page render when Mongo is unreachable.
    serverSelectionTimeoutMS: 8000,
    retryWrites: true,
  });

  return client.connect();
}

export function getClient(): Promise<MongoClient> {
  if (!globalForMongo._mongoClientPromise) {
    globalForMongo._mongoClientPromise = createClient();
  }
  return globalForMongo._mongoClientPromise;
}

export async function getDb(): Promise<Db> {
  const client = await getClient();
  return client.db(dbName);
}

/** Typed handles for every collection, so no query uses a bare string name. */
export async function collections() {
  const db = await getDb();

  return {
    db,
    stores: db.collection<StoreDoc>('stores'),
    categories: db.collection<CategoryDoc>('categories'),
    products: db.collection<ProductDoc>('products'),
    users: db.collection<UserDoc>('users'),
    customers: db.collection<CustomerDoc>('customers'),
    otps: db.collection<OtpDoc>('otpCodes'),
    carts: db.collection<CartDoc>('carts'),
    orders: db.collection<OrderDoc>('orders'),
    zones: db.collection<DeliveryZoneDoc>('deliveryZones'),
    slots: db.collection<DeliverySlotDoc>('deliverySlots'),
    coupons: db.collection<CouponDoc>('coupons'),
    reviews: db.collection<ReviewDoc>('reviews'),
    notifications: db.collection<NotificationDoc>('notifications'),
    counters: db.collection<CounterDoc>('counters'),
  };
}

export type Collections = Awaited<ReturnType<typeof collections>>;

/**
 * Applied once per process, on the first store lookup, so a fresh deployment
 * is correctly indexed without a separate migration step.
 */
export async function ensureIndexes(): Promise<void> {
  if (!globalForMongo._mongoIndexesReady) {
    globalForMongo._mongoIndexesReady = getDb()
      .then(createIndexes)
      .catch((error) => {
        // A read-only or already-indexed database must not take the site down.
        globalForMongo._mongoIndexesReady = undefined;
        // eslint-disable-next-line no-console
        console.error('[mongo] index creation failed', error);
      });
  }
  return globalForMongo._mongoIndexesReady;
}

/** Safe string → ObjectId. Returns null instead of throwing on junk input. */
export function toObjectId(value: string | null | undefined): ObjectId | null {
  if (!value || !ObjectId.isValid(value)) return null;
  return new ObjectId(value);
}

export { ObjectId };
