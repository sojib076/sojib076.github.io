'use server';

import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import { z } from 'zod';

import { collections, toObjectId, ObjectId } from '@/lib/db/client';
import type { OrderStatus, StoreSettings } from '@/lib/db/types';
import { requireStaff } from '@/lib/auth';
import { requireStore } from '@/lib/store';
import { takaToPoisha } from '@/lib/money';
import { updateOrderStatus } from '@/lib/orders';
import { buildSearchText } from '@/lib/catalog';
import { assertUploadable, buildImageKey, getStorage } from '@/lib/storage';

/**
 * Every write the shop owner can make. All of them re-check staff identity and
 * scope the query by storeId, so an admin session can never reach across into
 * another store's data once the marketplace exists.
 */

export type AdminState = { ok?: boolean; error?: string; message?: string };

function slugify(value: string): string {
  return value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9ঀ-৿]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 60);
}

/** Slugs must stay unique per store, even for two "Miniket Rice" entries. */
async function uniqueSlug(
  storeId: ObjectId,
  base: string,
  kind: 'products' | 'categories' | 'zones',
  currentId?: ObjectId | null,
): Promise<string> {
  const c = await collections();
  const collection = c[kind];
  const root = base || 'item';
  let candidate = root;

  for (let attempt = 1; attempt < 50; attempt += 1) {
    const existing = await collection.findOne(
      { storeId, slug: candidate },
      { projection: { _id: 1 } },
    );
    if (!existing || (currentId && existing._id.equals(currentId))) return candidate;
    candidate = `${root}-${attempt + 1}`;
  }

  return `${root}-${Date.now().toString(36)}`;
}

function refreshShop(): void {
  revalidatePath('/', 'layout');
}

// ---------------------------------------------------------------------------
// Orders
// ---------------------------------------------------------------------------

export async function updateOrderStatusAction(
  orderId: string,
  status: OrderStatus,
  note?: string,
): Promise<AdminState> {
  const staff = await requireStaff();

  try {
    await updateOrderStatus(orderId, status, { note: note ?? null, actor: staff.name ?? 'Staff' });
  } catch (error) {
    return { error: error instanceof Error ? error.message : 'Could not update the order.' };
  }

  revalidatePath('/admin');
  revalidatePath('/admin/orders');
  revalidatePath(`/admin/orders/${orderId}`);
  revalidatePath('/orders');
  return { ok: true, message: 'Order updated.' };
}

export async function saveOrderNoteAction(orderId: string, note: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(orderId);
  if (!id) return { error: 'Order not found.' };

  const { orders } = await collections();
  await orders.updateOne(
    { _id: id, storeId: new ObjectId(store.id) },
    { $set: { adminNote: note.trim() || null, updatedAt: new Date() } },
  );

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Note saved.' };
}

export async function assignDeliveryAction(orderId: string, assignee: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(orderId);
  if (!id) return { error: 'Order not found.' };

  const { orders } = await collections();
  await orders.updateOne(
    { _id: id, storeId: new ObjectId(store.id) },
    { $set: { assignedTo: assignee.trim() || null, updatedAt: new Date() } },
  );

  revalidatePath(`/admin/orders/${orderId}`);
  return { ok: true, message: 'Delivery assigned.' };
}

// ---------------------------------------------------------------------------
// Products
// ---------------------------------------------------------------------------

const productSchema = z.object({
  name: z.string().trim().min(2, 'Product name is required.').max(120),
  nameBn: z.string().trim().max(120).optional(),
  categoryId: z.string().trim().min(1, 'Choose a category.'),
  brandName: z.string().trim().max(80).optional(),
  unit: z.string().trim().min(1, 'Unit is required.').max(30),
  description: z.string().trim().max(1000).optional(),
  price: z.string().trim().min(1, 'Price is required.'),
  discountPrice: z.string().trim().optional(),
  minQty: z.coerce.number().int().min(1).max(999).default(1),
  maxQty: z.coerce.number().int().min(1).max(999).default(50),
  stockQty: z.coerce.number().int().min(0).max(100000).default(0),
  trackStock: z.coerce.boolean().default(false),
  isAvailable: z.coerce.boolean().default(true),
  isFeatured: z.coerce.boolean().default(false),
  isActive: z.coerce.boolean().default(true),
  imageUrl: z.string().trim().max(500).optional(),
});

export async function saveProductAction(
  productId: string | null,
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const storeId = new ObjectId(store.id);

  const parsed = productSchema.safeParse({
    name: formData.get('name'),
    nameBn: formData.get('nameBn') ?? undefined,
    categoryId: formData.get('categoryId'),
    brandName: formData.get('brandName') ?? undefined,
    unit: formData.get('unit'),
    description: formData.get('description') ?? undefined,
    price: formData.get('price'),
    discountPrice: formData.get('discountPrice') ?? undefined,
    minQty: formData.get('minQty') ?? 1,
    maxQty: formData.get('maxQty') ?? 50,
    stockQty: formData.get('stockQty') ?? 0,
    trackStock: formData.get('trackStock') === 'on',
    isAvailable: formData.get('isAvailable') === 'on',
    isFeatured: formData.get('isFeatured') === 'on',
    isActive: formData.get('isActive') === 'on',
    imageUrl: formData.get('imageUrl') ?? undefined,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Please check the form.' };
  }

  const data = parsed.data;
  const pricePoisha = takaToPoisha(data.price);
  if (pricePoisha == null || pricePoisha <= 0) {
    return { error: 'Enter a valid price, for example 75 or 12.50.' };
  }

  const discountPoisha = data.discountPrice ? takaToPoisha(data.discountPrice) : null;
  if (data.discountPrice && discountPoisha == null) {
    return { error: 'Enter a valid discount price, or leave it empty.' };
  }
  if (discountPoisha != null && discountPoisha >= pricePoisha) {
    return { error: 'The discount price must be lower than the normal price.' };
  }
  if (data.maxQty < data.minQty) {
    return { error: 'Maximum quantity cannot be less than the minimum.' };
  }

  const c = await collections();
  const categoryId = toObjectId(data.categoryId);
  const category = categoryId ? await c.categories.findOne({ _id: categoryId, storeId }) : null;
  if (!category) return { error: 'That category no longer exists.' };

  const now = new Date();
  const brandName = data.brandName || null;

  const common = {
    name: data.name,
    nameBn: data.nameBn || null,
    description: data.description || null,
    categoryId: category._id,
    // Denormalised so product cards never need a join.
    categoryName: category.name,
    categorySlug: category.slug,
    brandName,
    unit: data.unit,
    pricePoisha,
    discountPricePoisha: discountPoisha,
    minQty: data.minQty,
    maxQty: data.maxQty,
    isFeatured: data.isFeatured,
    isActive: data.isActive,
    searchText: buildSearchText({
      name: data.name,
      nameBn: data.nameBn,
      unit: data.unit,
      brandName,
      categoryName: category.name,
    }),
    inventory: {
      isAvailable: data.isAvailable,
      trackStock: data.trackStock,
      stockQty: data.stockQty,
      lowStockThreshold: store.settings?.lowStockThreshold ?? 5,
    },
    images: data.imageUrl ? [{ url: data.imageUrl, alt: data.name }] : [],
    updatedAt: now,
  };

  const existingId = toObjectId(productId);

  if (existingId) {
    const existing = await c.products.findOne({ _id: existingId, storeId });
    if (!existing) return { error: 'That product no longer exists.' };

    await c.products.updateOne(
      { _id: existingId },
      {
        $set: {
          ...common,
          // Keep the old photo when the form was submitted without a new one.
          images: data.imageUrl ? common.images : existing.images,
        },
      },
    );
  } else {
    await c.products.insertOne({
      _id: new ObjectId(),
      storeId,
      slug: await uniqueSlug(storeId, slugify(data.name), 'products'),
      sku: null,
      sortOrder: 0,
      purchaseCount: 0,
      createdAt: now,
      ...common,
    });
  }

  revalidatePath('/admin/products');
  refreshShop();
  redirect('/admin/products?saved=1');
}

/** Fast toggle from the product list — the shop's most frequent action. */
export async function toggleProductAvailabilityAction(productId: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(productId);
  if (!id) return { error: 'Product not found.' };

  const { products } = await collections();
  const product = await products.findOne({ _id: id, storeId: new ObjectId(store.id) });
  if (!product) return { error: 'Product not found.' };

  const nextAvailable = !(product.inventory?.isAvailable ?? true);

  await products.updateOne(
    { _id: id },
    { $set: { 'inventory.isAvailable': nextAvailable, updatedAt: new Date() } },
  );

  revalidatePath('/admin/products');
  refreshShop();
  return { ok: true, message: nextAvailable ? 'Marked in stock.' : 'Marked out of stock.' };
}

export async function updateProductPriceAction(
  productId: string,
  price: string,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(productId);
  if (!id) return { error: 'Product not found.' };

  const pricePoisha = takaToPoisha(price);
  if (pricePoisha == null || pricePoisha <= 0) return { error: 'Enter a valid price.' };

  const { products } = await collections();
  const result = await products.updateOne(
    { _id: id, storeId: new ObjectId(store.id) },
    { $set: { pricePoisha, updatedAt: new Date() } },
  );
  if (result.matchedCount === 0) return { error: 'Product not found.' };

  revalidatePath('/admin/products');
  refreshShop();
  return { ok: true, message: 'Price updated.' };
}

/**
 * Products are hidden rather than deleted when they appear on past orders, so
 * a customer's receipt never loses its lines.
 */
export async function deleteProductAction(productId: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(productId);
  if (!id) return { error: 'Product not found.' };

  const storeId = new ObjectId(store.id);
  const { products, orders } = await collections();

  const product = await products.findOne({ _id: id, storeId });
  if (!product) return { error: 'Product not found.' };

  const usedOnOrder = await orders.findOne({ 'items.productId': id }, { projection: { _id: 1 } });

  if (usedOnOrder) {
    await products.updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
    revalidatePath('/admin/products');
    refreshShop();
    return {
      ok: true,
      message: 'This product is on past orders, so it was hidden instead of deleted.',
    };
  }

  await products.deleteOne({ _id: id });
  revalidatePath('/admin/products');
  refreshShop();
  return { ok: true, message: 'Product deleted.' };
}

export async function uploadProductImageAction(
  formData: FormData,
): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  await requireStaff();

  const file = formData.get('file');
  if (!(file instanceof File) || file.size === 0) {
    return { ok: false, error: 'Choose an image first.' };
  }

  const problem = assertUploadable(file.type, file.size);
  if (problem) return { ok: false, error: problem };

  try {
    const storage = getStorage();
    const buffer = Buffer.from(await file.arrayBuffer());
    const url = await storage.put(buildImageKey(file.name), buffer, file.type);
    return { ok: true, url };
  } catch (error) {
    return {
      ok: false,
      error: error instanceof Error ? error.message : 'Upload failed. Please try again.',
    };
  }
}

// ---------------------------------------------------------------------------
// Categories
// ---------------------------------------------------------------------------

export async function saveCategoryAction(
  categoryId: string | null,
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const storeId = new ObjectId(store.id);

  const name = String(formData.get('name') ?? '').trim();
  const nameBn = String(formData.get('nameBn') ?? '').trim();
  const iconKey = String(formData.get('iconKey') ?? '').trim();
  const sortOrder = Number(formData.get('sortOrder') ?? 0);
  const isActive = formData.get('isActive') === 'on';

  if (name.length < 2) return { error: 'Category name is required.' };

  const c = await collections();
  const now = new Date();
  const data = {
    name,
    nameBn: nameBn || null,
    iconKey: iconKey || null,
    sortOrder: Number.isFinite(sortOrder) ? sortOrder : 0,
    isActive,
    updatedAt: now,
  };

  const existingId = toObjectId(categoryId);

  if (existingId) {
    const existing = await c.categories.findOne({ _id: existingId, storeId });
    if (!existing) return { error: 'That category no longer exists.' };

    await c.categories.updateOne({ _id: existingId }, { $set: data });

    // Product documents carry the category name for display, so a rename has
    // to travel with it.
    if (existing.name !== name) {
      await c.products.updateMany(
        { storeId, categoryId: existingId },
        { $set: { categoryName: name } },
      );
    }
  } else {
    await c.categories.insertOne({
      _id: new ObjectId(),
      storeId,
      slug: await uniqueSlug(storeId, slugify(name), 'categories'),
      description: null,
      imageUrl: null,
      createdAt: now,
      ...data,
    });
  }

  revalidatePath('/admin/categories');
  refreshShop();
  return { ok: true, message: 'Category saved.' };
}

export async function deleteCategoryAction(categoryId: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(categoryId);
  if (!id) return { error: 'Category not found.' };

  const storeId = new ObjectId(store.id);
  const { categories, products } = await collections();

  const category = await categories.findOne({ _id: id, storeId });
  if (!category) return { error: 'Category not found.' };

  const productCount = await products.countDocuments({ storeId, categoryId: id });
  if (productCount > 0) {
    return { error: `Move or delete its ${productCount} product(s) first.` };
  }

  await categories.deleteOne({ _id: id });
  revalidatePath('/admin/categories');
  refreshShop();
  return { ok: true, message: 'Category deleted.' };
}

// ---------------------------------------------------------------------------
// Settings
// ---------------------------------------------------------------------------

export async function saveStoreSettingsAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();

  const minOrder = takaToPoisha(String(formData.get('minOrder') ?? ''));
  const defaultFee = takaToPoisha(String(formData.get('defaultDeliveryFee') ?? ''));
  const freeThresholdRaw = String(formData.get('freeDeliveryThreshold') ?? '').trim();
  const freeThreshold = freeThresholdRaw ? takaToPoisha(freeThresholdRaw) : null;

  if (minOrder == null || minOrder < 0) return { error: 'Enter a valid minimum order amount.' };
  if (defaultFee == null || defaultFee < 0) return { error: 'Enter a valid default delivery fee.' };
  if (freeThresholdRaw && freeThreshold == null) {
    return { error: 'Enter a valid free-delivery amount, or leave it empty to switch it off.' };
  }

  const prepTime = Number(formData.get('prepTimeMinutes') ?? 45);
  const maxPreOrderDays = Number(formData.get('maxPreOrderDays') ?? 3);
  const lowStockThreshold = Number(formData.get('lowStockThreshold') ?? 5);

  const settings: StoreSettings = {
    currency: store.settings?.currency ?? 'BDT',
    minOrderPoisha: minOrder,
    defaultDeliveryFeePoisha: defaultFee,
    freeDeliveryThresholdPoisha: freeThreshold,
    deliveryEnabled: formData.get('deliveryEnabled') === 'on',
    pickupEnabled: formData.get('pickupEnabled') === 'on',
    acceptOrdersWhenClosed: formData.get('acceptOrdersWhenClosed') === 'on',
    prepTimeMinutes: Number.isFinite(prepTime) ? prepTime : 45,
    maxPreOrderDays: Number.isFinite(maxPreOrderDays) ? maxPreOrderDays : 3,
    lowStockThreshold: Number.isFinite(lowStockThreshold) ? lowStockThreshold : 5,
    orderNumberPrefix: String(formData.get('orderNumberPrefix') ?? 'SS').trim() || 'SS',
    notifyPhone: String(formData.get('notifyPhone') ?? '').trim() || null,
    notifyWhatsapp: String(formData.get('notifyWhatsapp') ?? '').trim() || null,
    notifyEmail: String(formData.get('notifyEmail') ?? '').trim() || null,
  };

  const { stores } = await collections();
  await stores.updateOne(
    { _id: new ObjectId(store.id) },
    { $set: { settings, updatedAt: new Date() } },
  );

  revalidatePath('/admin/settings');
  refreshShop();
  return { ok: true, message: 'Settings saved.' };
}

export async function saveStoreProfileAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return { error: 'Store name is required.' };

  const latitude = Number(formData.get('latitude') ?? '');
  const longitude = Number(formData.get('longitude') ?? '');
  const text = (key: string) => String(formData.get(key) ?? '').trim() || null;

  const { stores } = await collections();
  await stores.updateOne(
    { _id: new ObjectId(store.id) },
    {
      $set: {
        name,
        nameBn: text('nameBn'),
        description: text('description'),
        phone: text('phone'),
        whatsapp: text('whatsapp'),
        email: text('email'),
        addressLine: text('addressLine'),
        area: text('area'),
        city: text('city'),
        district: text('district'),
        postcode: text('postcode'),
        mapUrl: text('mapUrl'),
        latitude: Number.isFinite(latitude) && latitude !== 0 ? latitude : null,
        longitude: Number.isFinite(longitude) && longitude !== 0 ? longitude : null,
        updatedAt: new Date(),
      },
    },
  );

  revalidatePath('/admin/settings');
  refreshShop();
  return { ok: true, message: 'Store details saved.' };
}

export async function saveStoreHoursAction(
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();

  const hours = Array.from({ length: 7 }, (_, day) => ({
    dayOfWeek: day,
    opensAt: String(formData.get(`opensAt-${day}`) ?? '08:00'),
    closesAt: String(formData.get(`closesAt-${day}`) ?? '22:00'),
    isClosed: formData.get(`isClosed-${day}`) === 'on',
  }));

  const { stores } = await collections();
  await stores.updateOne(
    { _id: new ObjectId(store.id) },
    { $set: { hours, updatedAt: new Date() } },
  );

  revalidatePath('/admin/settings');
  refreshShop();
  return { ok: true, message: 'Opening hours saved.' };
}

// ---------------------------------------------------------------------------
// Delivery zones and slots
// ---------------------------------------------------------------------------

export async function saveZoneAction(
  zoneId: string | null,
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const storeId = new ObjectId(store.id);

  const name = String(formData.get('name') ?? '').trim();
  if (name.length < 2) return { error: 'Area name is required.' };

  const fee = takaToPoisha(String(formData.get('deliveryFee') ?? ''));
  if (fee == null || fee < 0) return { error: 'Enter a valid delivery charge.' };

  const minOrderRaw = String(formData.get('minOrder') ?? '').trim();
  const minOrder = minOrderRaw ? takaToPoisha(minOrderRaw) : null;
  if (minOrderRaw && minOrder == null) return { error: 'Enter a valid minimum order for this area.' };

  const freeRaw = String(formData.get('freeDeliveryThreshold') ?? '').trim();
  const freeThreshold = freeRaw ? takaToPoisha(freeRaw) : null;
  if (freeRaw && freeThreshold == null) return { error: 'Enter a valid free-delivery amount.' };

  const estimatedMinutes = Number(formData.get('estimatedMinutes') ?? 60);
  const now = new Date();

  const data = {
    name,
    nameBn: String(formData.get('nameBn') ?? '').trim() || null,
    deliveryFeePoisha: fee,
    minOrderPoisha: minOrder,
    freeDeliveryThresholdPoisha: freeThreshold,
    estimatedMinutes: Number.isFinite(estimatedMinutes) ? estimatedMinutes : 60,
    isActive: formData.get('isActive') === 'on',
    sortOrder: Number(formData.get('sortOrder') ?? 0) || 0,
    updatedAt: now,
  };

  const { zones, orders } = await collections();
  const existingId = toObjectId(zoneId);

  if (existingId) {
    const existing = await zones.findOne({ _id: existingId, storeId });
    if (!existing) return { error: 'That area no longer exists.' };

    await zones.updateOne({ _id: existingId }, { $set: data });

    // Orders keep the area name they were placed with; keep it current.
    if (existing.name !== name) {
      await orders.updateMany({ storeId, zoneId: existingId }, { $set: { zoneName: name } });
    }
  } else {
    await zones.insertOne({
      _id: new ObjectId(),
      storeId,
      slug: await uniqueSlug(storeId, slugify(name), 'zones'),
      rules: [],
      createdAt: now,
      ...data,
    });
  }

  revalidatePath('/admin/delivery');
  refreshShop();
  return { ok: true, message: 'Delivery area saved.' };
}

export async function deleteZoneAction(zoneId: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(zoneId);
  if (!id) return { error: 'Area not found.' };

  const storeId = new ObjectId(store.id);
  const { zones, orders } = await collections();

  const zone = await zones.findOne({ _id: id, storeId });
  if (!zone) return { error: 'Area not found.' };

  const used = await orders.findOne({ storeId, zoneId: id }, { projection: { _id: 1 } });

  // Past orders reference the area, so retire it instead of breaking history.
  if (used) {
    await zones.updateOne({ _id: id }, { $set: { isActive: false, updatedAt: new Date() } });
    revalidatePath('/admin/delivery');
    refreshShop();
    return {
      ok: true,
      message: 'This area has past orders, so it was switched off instead of deleted.',
    };
  }

  await zones.deleteOne({ _id: id });
  revalidatePath('/admin/delivery');
  refreshShop();
  return { ok: true, message: 'Delivery area deleted.' };
}

export async function saveSlotAction(
  slotId: string | null,
  _previous: AdminState,
  formData: FormData,
): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const storeId = new ObjectId(store.id);

  const label = String(formData.get('label') ?? '').trim();
  const startTime = String(formData.get('startTime') ?? '').trim();
  const endTime = String(formData.get('endTime') ?? '').trim();

  if (!label) return { error: 'Give the time slot a name customers will understand.' };
  if (!/^\d{1,2}:\d{2}$/.test(startTime) || !/^\d{1,2}:\d{2}$/.test(endTime)) {
    return { error: 'Enter times as HH:MM, for example 09:00.' };
  }

  const data = {
    label,
    startTime,
    endTime,
    isActive: formData.get('isActive') === 'on',
    sortOrder: Number(formData.get('sortOrder') ?? 0) || 0,
  };

  const { slots } = await collections();
  const existingId = toObjectId(slotId);

  if (existingId) {
    const result = await slots.updateOne({ _id: existingId, storeId }, { $set: data });
    if (result.matchedCount === 0) return { error: 'That time slot no longer exists.' };
  } else {
    await slots.insertOne({
      _id: new ObjectId(),
      storeId,
      dayOfWeek: null,
      capacity: 0,
      ...data,
    });
  }

  revalidatePath('/admin/delivery');
  refreshShop();
  return { ok: true, message: 'Time slot saved.' };
}

export async function deleteSlotAction(slotId: string): Promise<AdminState> {
  await requireStaff();
  const store = await requireStore();
  const id = toObjectId(slotId);
  if (!id) return { error: 'Time slot not found.' };

  const { slots } = await collections();
  const result = await slots.deleteOne({ _id: id, storeId: new ObjectId(store.id) });
  if (result.deletedCount === 0) return { error: 'Time slot not found.' };

  revalidatePath('/admin/delivery');
  refreshShop();
  return { ok: true, message: 'Time slot removed.' };
}
