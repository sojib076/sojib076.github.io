import 'server-only';
import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import { mapCustomer, mapProduct, type Customer, type Product } from '@/lib/db/mappers';

/**
 * Shopper profile reads and the favourites list.
 *
 * Favourites are stored as an array of product ids on the customer document:
 * the list is short, always read with the profile, and toggling is a single
 * atomic $addToSet / $pull.
 */

export async function getCustomer(customerId: string): Promise<Customer | null> {
  const id = toObjectId(customerId);
  if (!id) return null;

  const { customers } = await collections();
  const doc = await customers.findOne({ _id: id });
  return doc ? mapCustomer(doc) : null;
}

export async function getCustomerSpendPoisha(customerId: string): Promise<number> {
  const id = toObjectId(customerId);
  if (!id) return 0;

  const { orders } = await collections();
  const rows = await orders
    .aggregate<{ total: number }>([
      { $match: { customerId: id, status: { $ne: 'CANCELLED' } } },
      { $group: { _id: null, total: { $sum: '$totalPoisha' } } },
    ])
    .toArray();

  return rows[0]?.total ?? 0;
}

export async function isFavorite(customerId: string, productId: string): Promise<boolean> {
  const customer = toObjectId(customerId);
  const product = toObjectId(productId);
  if (!customer || !product) return false;

  const { customers } = await collections();
  const found = await customers.findOne(
    { _id: customer, favoriteProductIds: product },
    { projection: { _id: 1 } },
  );
  return Boolean(found);
}

export type ToggleFavoriteResult = { saved: boolean };

export async function toggleFavorite(
  customerId: string,
  productId: string,
): Promise<ToggleFavoriteResult> {
  const customer = toObjectId(customerId);
  const product = toObjectId(productId);
  if (!customer || !product) return { saved: false };

  const { customers } = await collections();
  const already = await isFavorite(customerId, productId);

  await customers.updateOne(
    { _id: customer },
    already
      ? { $pull: { favoriteProductIds: product }, $set: { updatedAt: new Date() } }
      : { $addToSet: { favoriteProductIds: product }, $set: { updatedAt: new Date() } },
  );

  return { saved: !already };
}

export async function getFavoriteProducts(
  storeId: string,
  customerId: string,
  take = 12,
): Promise<Product[]> {
  const store = toObjectId(storeId);
  const customer = toObjectId(customerId);
  if (!store || !customer) return [];

  const { customers, products } = await collections();
  const doc = await customers.findOne({ _id: customer }, { projection: { favoriteProductIds: 1 } });

  const ids = (doc?.favoriteProductIds ?? []) as ObjectId[];
  if (ids.length === 0) return [];

  const found = await products
    .find({ _id: { $in: ids }, storeId: store, isActive: true })
    .limit(take)
    .toArray();

  return found.map(mapProduct);
}

/** Remembers the address used at checkout so the next order is one tap shorter. */
export async function rememberAddress(
  customerId: string,
  address: {
    receiverName: string;
    phone: string;
    addressLine: string;
    landmark: string | null;
    zoneId: string | null;
  },
): Promise<void> {
  const customer = toObjectId(customerId);
  if (!customer) return;

  const { customers } = await collections();
  const doc = await customers.findOne({ _id: customer }, { projection: { addresses: 1 } });
  if (!doc) return;

  const existing = (doc.addresses ?? []).find(
    (entry) => entry.addressLine.trim().toLowerCase() === address.addressLine.trim().toLowerCase(),
  );

  if (existing) {
    await customers.updateOne(
      { _id: customer, 'addresses._id': existing._id },
      {
        $set: {
          'addresses.$.landmark': address.landmark,
          'addresses.$.zoneId': toObjectId(address.zoneId),
          'addresses.$.updatedAt': new Date(),
        },
      },
    );
    return;
  }

  await customers.updateOne(
    { _id: customer },
    {
      $push: {
        addresses: {
          $each: [
            {
              _id: new ObjectId(),
              label: null,
              receiverName: address.receiverName,
              phone: address.phone,
              addressLine: address.addressLine,
              landmark: address.landmark,
              zoneId: toObjectId(address.zoneId),
              isDefault: (doc.addresses ?? []).length === 0,
              updatedAt: new Date(),
            },
          ],
          // Keep only the handful of addresses a household actually uses.
          $slice: -5,
        },
      },
    },
  );
}
