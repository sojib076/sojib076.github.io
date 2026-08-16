/**
 * Seeds one grocery store with a realistic Bangladeshi catalogue.
 *
 * Two rules this file follows deliberately:
 *
 *  1. No invented business information. The store's phone number, address and
 *     map link are left EMPTY for the owner to fill in from the admin
 *     dashboard — a wrong phone number on a live shop is worse than a blank
 *     one, and search engines are given only what the owner confirms.
 *  2. Prices are realistic starting points, not quoted facts. Bazaar prices
 *     move weekly; the owner is expected to correct them in Admin → Products.
 *
 * Safe to re-run: everything upserts on a stable key, so an existing shop's
 * edited prices and settings are never overwritten.
 */

import { MongoClient, ObjectId } from 'mongodb';
import bcrypt from 'bcryptjs';
import { loadEnv, requireEnv } from './env';
import { createIndexes } from '../src/lib/db/indexes';

loadEnv();

const uri = requireEnv('MONGODB_URI');
const dbName = process.env.MONGODB_DB ?? 'shibu_store';
const STORE_SLUG = process.env.ACTIVE_STORE_SLUG ?? 'shibu-store';

const taka = (amount: number) => Math.round(amount * 100);

type SeedProduct = {
  name: string;
  nameBn: string;
  unit: string;
  price: number;
  discount?: number;
  brand?: string;
  featured?: boolean;
  description?: string;
};

const CATALOGUE: {
  slug: string;
  name: string;
  nameBn: string;
  iconKey: string;
  products: SeedProduct[];
}[] = [
  {
    slug: 'rice-grains',
    name: 'Rice & Grains',
    nameBn: 'চাল ও শস্য',
    iconKey: 'rice',
    products: [
      { name: 'Miniket Rice', nameBn: 'মিনিকেট চাল', unit: 'kg', price: 75, featured: true, description: 'Everyday fine rice, cleaned and sorted.' },
      { name: 'Nazirshail Rice', nameBn: 'নাজিরশাইল চাল', unit: 'kg', price: 78 },
      { name: 'Chinigura Rice', nameBn: 'চিনিগুঁড়া চাল', unit: 'kg', price: 125, description: 'Aromatic short grain, for polao and biryani.' },
      { name: 'Atap Rice', nameBn: 'আতপ চাল', unit: 'kg', price: 68 },
      { name: 'Red Flattened Rice (Chira)', nameBn: 'লাল চিড়া', unit: 'kg', price: 85 },
      { name: 'Wheat Flour (Atta)', nameBn: 'আটা', unit: 'kg', price: 55, featured: true },
      { name: 'Refined Flour (Maida)', nameBn: 'ময়দা', unit: 'kg', price: 65 },
      { name: 'Semolina (Suji)', nameBn: 'সুজি', unit: 'kg', price: 70 },
    ],
  },
  {
    slug: 'dal-pulses',
    name: 'Dal & Pulses',
    nameBn: 'ডাল',
    iconKey: 'dal',
    products: [
      { name: 'Masoor Dal', nameBn: 'মসুর ডাল', unit: 'kg', price: 135, featured: true },
      { name: 'Mug Dal', nameBn: 'মুগ ডাল', unit: 'kg', price: 165 },
      { name: 'Chhola (Chickpeas)', nameBn: 'ছোলা', unit: 'kg', price: 105 },
      { name: 'Anchor Dal', nameBn: 'অ্যাংকর ডাল', unit: 'kg', price: 95 },
      { name: 'Khesari Dal', nameBn: 'খেসারি ডাল', unit: 'kg', price: 110 },
      { name: 'Peas (Motor Dal)', nameBn: 'মটর ডাল', unit: 'kg', price: 90 },
    ],
  },
  {
    slug: 'oil',
    name: 'Oil',
    nameBn: 'তেল',
    iconKey: 'oil',
    products: [
      { name: 'Soybean Oil', nameBn: 'সয়াবিন তেল', unit: 'litre', price: 190, featured: true },
      { name: 'Soybean Oil 5L Bottle', nameBn: 'সয়াবিন তেল ৫ লিটার', unit: 'bottle', price: 920, discount: 890 },
      { name: 'Mustard Oil', nameBn: 'সরিষার তেল', unit: 'litre', price: 320 },
      { name: 'Rice Bran Oil', nameBn: 'রাইস ব্র্যান তেল', unit: 'litre', price: 225 },
      { name: 'Palm Oil', nameBn: 'পাম তেল', unit: 'litre', price: 155 },
    ],
  },
  {
    slug: 'spices',
    name: 'Spices',
    nameBn: 'মসলা',
    iconKey: 'spices',
    products: [
      { name: 'Turmeric Powder', nameBn: 'হলুদ গুঁড়া', unit: 'packet', price: 48, brand: 'Radhuni', description: '100g packet.' },
      { name: 'Chilli Powder', nameBn: 'মরিচ গুঁড়া', unit: 'packet', price: 60, brand: 'Radhuni' },
      { name: 'Coriander Powder', nameBn: 'ধনিয়া গুঁড়া', unit: 'packet', price: 45, brand: 'Radhuni' },
      { name: 'Cumin Powder', nameBn: 'জিরা গুঁড়া', unit: 'packet', price: 95, brand: 'Radhuni' },
      { name: 'Garam Masala', nameBn: 'গরম মসলা', unit: 'packet', price: 85, brand: 'Radhuni' },
      { name: 'Onion', nameBn: 'পেঁয়াজ', unit: 'kg', price: 60, featured: true },
      { name: 'Garlic', nameBn: 'রসুন', unit: 'kg', price: 180 },
      { name: 'Ginger', nameBn: 'আদা', unit: 'kg', price: 200 },
      { name: 'Dried Chilli', nameBn: 'শুকনা মরিচ', unit: 'kg', price: 380 },
    ],
  },
  {
    slug: 'salt-sugar',
    name: 'Salt & Sugar',
    nameBn: 'লবণ ও চিনি',
    iconKey: 'salt',
    products: [
      { name: 'Iodised Salt', nameBn: 'আয়োডিনযুক্ত লবণ', unit: 'kg', price: 42, brand: 'ACI', featured: true },
      { name: 'Sugar', nameBn: 'চিনি', unit: 'kg', price: 130, featured: true },
      { name: 'Brown Sugar', nameBn: 'লাল চিনি', unit: 'kg', price: 160 },
      { name: 'Molasses (Gur)', nameBn: 'খেজুরের গুড়', unit: 'kg', price: 320 },
    ],
  },
  {
    slug: 'biscuits-snacks',
    name: 'Biscuits & Snacks',
    nameBn: 'বিস্কুট ও স্ন্যাকস',
    iconKey: 'snacks',
    products: [
      { name: 'Energy Plus Biscuit', nameBn: 'এনার্জি প্লাস বিস্কুট', unit: 'packet', price: 25, brand: 'Olympic' },
      { name: 'Toast Biscuit', nameBn: 'টোস্ট বিস্কুট', unit: 'packet', price: 65, brand: 'Bengal' },
      { name: 'Chanachur', nameBn: 'চানাচুর', unit: 'packet', price: 65, brand: 'Bombay Sweets' },
      { name: 'Potato Chips', nameBn: 'চিপস', unit: 'packet', price: 25, brand: 'Mr. Twist' },
      { name: 'Cake Rusk', nameBn: 'কেক রাস্ক', unit: 'packet', price: 90, brand: 'Pran' },
      { name: 'Marie Biscuit', nameBn: 'মেরি বিস্কুট', unit: 'packet', price: 55, brand: 'Danish', discount: 48 },
    ],
  },
  {
    slug: 'beverages',
    name: 'Beverages',
    nameBn: 'পানীয়',
    iconKey: 'beverages',
    products: [
      { name: 'Tea Leaf', nameBn: 'চা পাতা', unit: 'packet', price: 145, brand: 'Ispahani', featured: true, description: '250g packet.' },
      { name: 'Coca-Cola 1L', nameBn: 'কোকা-কোলা ১ লিটার', unit: 'bottle', price: 60 },
      { name: 'Mango Juice', nameBn: 'ম্যাংগো জুস', unit: 'packet', price: 25, brand: 'Pran' },
      { name: 'Instant Coffee', nameBn: 'কফি', unit: 'packet', price: 240, brand: 'Nescafé' },
      { name: 'Drinking Water 2L', nameBn: 'পানি ২ লিটার', unit: 'bottle', price: 35 },
      { name: 'Glucose Powder', nameBn: 'গ্লুকোজ', unit: 'packet', price: 90 },
    ],
  },
  {
    slug: 'dairy',
    name: 'Dairy',
    nameBn: 'দুগ্ধজাত',
    iconKey: 'dairy',
    products: [
      { name: 'Liquid Milk 1L', nameBn: 'তরল দুধ ১ লিটার', unit: 'packet', price: 100, brand: 'Milk Vita', featured: true },
      { name: 'Full Cream Milk Powder', nameBn: 'গুঁড়া দুধ', unit: 'packet', price: 445, brand: 'Dano', description: '500g packet.' },
      { name: 'Sweet Yoghurt (Doi)', nameBn: 'মিষ্টি দই', unit: 'pcs', price: 130 },
      { name: 'Butter', nameBn: 'বাটার', unit: 'packet', price: 260, brand: 'Aarong' },
      { name: 'Cheese Slice', nameBn: 'চিজ', unit: 'packet', price: 320 },
    ],
  },
  {
    slug: 'eggs',
    name: 'Eggs',
    nameBn: 'ডিম',
    iconKey: 'eggs',
    products: [
      { name: 'Farm Eggs', nameBn: 'ফার্মের ডিম', unit: 'dozen', price: 150, featured: true },
      { name: 'Deshi Eggs', nameBn: 'দেশি ডিম', unit: 'dozen', price: 220 },
      { name: 'Duck Eggs', nameBn: 'হাঁসের ডিম', unit: 'dozen', price: 240 },
    ],
  },
  {
    slug: 'noodles-pasta',
    name: 'Noodles & Pasta',
    nameBn: 'নুডলস ও পাস্তা',
    iconKey: 'noodles',
    products: [
      { name: 'Instant Noodles 8 Pack', nameBn: 'ইনস্ট্যান্ট নুডলস ৮ প্যাক', unit: 'packet', price: 152, brand: 'Maggi', featured: true },
      { name: 'Instant Noodles Single', nameBn: 'নুডলস', unit: 'packet', price: 20, brand: 'Maggi' },
      { name: 'Stick Noodles', nameBn: 'স্টিক নুডলস', unit: 'packet', price: 60, brand: 'Cocola' },
      { name: 'Pasta', nameBn: 'পাস্তা', unit: 'packet', price: 95 },
      { name: 'Vermicelli (Semai)', nameBn: 'সেমাই', unit: 'packet', price: 55 },
    ],
  },
  {
    slug: 'breakfast',
    name: 'Breakfast',
    nameBn: 'নাস্তা',
    iconKey: 'breakfast',
    products: [
      { name: 'Sliced Bread', nameBn: 'পাউরুটি', unit: 'packet', price: 65, featured: true },
      { name: 'Honey', nameBn: 'মধু', unit: 'bottle', price: 380 },
      { name: 'Cornflakes', nameBn: 'কর্নফ্লেক্স', unit: 'packet', price: 340 },
      { name: 'Puffed Rice (Muri)', nameBn: 'মুড়ি', unit: 'kg', price: 110 },
      { name: 'Jam', nameBn: 'জ্যাম', unit: 'bottle', price: 180, brand: 'Pran' },
      { name: 'Peanut Butter', nameBn: 'পিনাট বাটার', unit: 'bottle', price: 420 },
    ],
  },
  {
    slug: 'frozen-food',
    name: 'Frozen Food',
    nameBn: 'ফ্রোজেন খাবার',
    iconKey: 'frozen',
    products: [
      { name: 'Frozen Paratha 20 pcs', nameBn: 'ফ্রোজেন পরোটা', unit: 'packet', price: 360, brand: 'Golden Harvest', featured: true },
      { name: 'Chicken Nuggets', nameBn: 'চিকেন নাগেটস', unit: 'packet', price: 300, brand: 'Golden Harvest' },
      { name: 'Chicken Sausage', nameBn: 'চিকেন সসেজ', unit: 'packet', price: 260 },
      { name: 'Frozen Singara', nameBn: 'ফ্রোজেন সিঙ্গাড়া', unit: 'packet', price: 220 },
    ],
  },
  {
    slug: 'household',
    name: 'Household',
    nameBn: 'গৃহস্থালি',
    iconKey: 'household',
    products: [
      { name: 'Detergent Powder 1kg', nameBn: 'ডিটারজেন্ট পাউডার', unit: 'packet', price: 190, brand: 'Surf Excel', featured: true },
      { name: 'Washing Powder 500g', nameBn: 'ওয়াশিং পাউডার', unit: 'packet', price: 68, brand: 'Wheel' },
      { name: 'Dishwashing Bar', nameBn: 'বাসন ধোয়ার সাবান', unit: 'pcs', price: 32, brand: 'Vim' },
      { name: 'Toilet Cleaner', nameBn: 'টয়লেট ক্লিনার', unit: 'bottle', price: 135, brand: 'Harpic' },
      { name: 'Tissue Roll', nameBn: 'টিস্যু', unit: 'pcs', price: 60, brand: 'Fresh' },
      { name: 'Mosquito Coil', nameBn: 'মশার কয়েল', unit: 'packet', price: 55 },
      { name: 'Matches', nameBn: 'দিয়াশলাই', unit: 'packet', price: 15 },
      { name: 'Candle', nameBn: 'মোমবাতি', unit: 'packet', price: 40 },
    ],
  },
  {
    slug: 'personal-care',
    name: 'Personal Care',
    nameBn: 'ব্যক্তিগত পরিচর্যা',
    iconKey: 'personal',
    products: [
      { name: 'Bath Soap', nameBn: 'গোসলের সাবান', unit: 'pcs', price: 58, brand: 'Lifebuoy', featured: true },
      { name: 'Shampoo 200ml', nameBn: 'শ্যাম্পু', unit: 'bottle', price: 235, brand: 'Sunsilk' },
      { name: 'Toothpaste 100g', nameBn: 'টুথপেস্ট', unit: 'pcs', price: 95, brand: 'Colgate' },
      { name: 'Toothbrush', nameBn: 'টুথব্রাশ', unit: 'pcs', price: 45 },
      { name: 'Antiseptic Liquid 100ml', nameBn: 'অ্যান্টিসেপটিক', unit: 'bottle', price: 68, brand: 'Dettol' },
      { name: 'Hair Oil 100ml', nameBn: 'নারিকেল তেল', unit: 'bottle', price: 110, brand: 'Parachute' },
      { name: 'Sanitary Napkin', nameBn: 'স্যানিটারি ন্যাপকিন', unit: 'packet', price: 120, brand: 'Senora' },
    ],
  },
  {
    slug: 'baby-products',
    name: 'Baby Products',
    nameBn: 'শিশু পণ্য',
    iconKey: 'baby',
    products: [
      { name: 'Baby Cereal 400g', nameBn: 'বেবি সেরেলাক', unit: 'packet', price: 640, brand: 'Cerelac', featured: true },
      { name: 'Diapers Medium 10 pcs', nameBn: 'ডায়াপার', unit: 'packet', price: 380 },
      { name: 'Baby Soap', nameBn: 'বেবি সাবান', unit: 'pcs', price: 125, brand: 'Johnson’s' },
      { name: 'Baby Wipes', nameBn: 'বেবি ওয়াইপস', unit: 'packet', price: 195 },
      { name: 'Baby Powder', nameBn: 'বেবি পাউডার', unit: 'pcs', price: 210 },
    ],
  },
];

/** Areas from the shop's own delivery plan. */
const ZONES = [
  { slug: 'joypara', name: 'Joypara', nameBn: 'জয়পাড়া', fee: 30, minutes: 45, sortOrder: 0 },
  { slug: 'dohar', name: 'Dohar', nameBn: 'দোহার', fee: 50, minutes: 70, sortOrder: 1 },
  { slug: 'nearby-areas', name: 'Nearby Areas', nameBn: 'আশেপাশের এলাকা', fee: 70, minutes: 100, sortOrder: 2 },
];

const SLOTS = [
  { label: 'Morning (9:00 AM – 12:00 PM)', startTime: '09:00', endTime: '12:00', sortOrder: 0 },
  { label: 'Afternoon (12:00 PM – 4:00 PM)', startTime: '12:00', endTime: '16:00', sortOrder: 1 },
  { label: 'Evening (4:00 PM – 8:00 PM)', startTime: '16:00', endTime: '20:00', sortOrder: 2 },
];

function slugify(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}

async function main() {
  const client = new MongoClient(uri);
  await client.connect();
  const db = client.db(dbName);

  console.info(`Seeding "${dbName}"…`);
  await createIndexes(db);

  const now = new Date();

  const storeResult = await db.collection('stores').findOneAndUpdate(
    { slug: STORE_SLUG },
    {
      $setOnInsert: {
        slug: STORE_SLUG,
        name: 'Shibu Store',
        nameBn: 'শিবু স্টোর',
        description:
          'Your neighbourhood grocery shop. Order rice, dal, oil, spices and daily essentials for home delivery or store pickup.',
        // Contact and address are intentionally blank — fill them in from
        // Admin → Settings → Store details so the site never publishes a guess.
        phone: null,
        whatsapp: null,
        email: null,
        addressLine: null,
        area: null,
        city: null,
        district: null,
        postcode: null,
        latitude: null,
        longitude: null,
        mapUrl: null,
        logoUrl: null,
        isActive: true,
        settings: {
          currency: 'BDT',
          minOrderPoisha: taka(300),
          defaultDeliveryFeePoisha: taka(30),
          freeDeliveryThresholdPoisha: taka(1000),
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
        },
        // Open every day 8:00–22:00 until the owner says otherwise.
        hours: Array.from({ length: 7 }, (_, dayOfWeek) => ({
          dayOfWeek,
          opensAt: '08:00',
          closesAt: '22:00',
          isClosed: false,
        })),
        createdAt: now,
      },
      $set: { updatedAt: now },
    },
    { upsert: true, returnDocument: 'after' },
  );

  const storeId = storeResult!._id as ObjectId;

  for (const zone of ZONES) {
    await db.collection('deliveryZones').updateOne(
      { storeId, slug: zone.slug },
      {
        $setOnInsert: {
          storeId,
          slug: zone.slug,
          name: zone.name,
          nameBn: zone.nameBn,
          deliveryFeePoisha: taka(zone.fee),
          minOrderPoisha: null,
          freeDeliveryThresholdPoisha: null,
          estimatedMinutes: zone.minutes,
          isActive: true,
          sortOrder: zone.sortOrder,
          rules: [],
          createdAt: now,
        },
        $set: { updatedAt: now },
      },
      { upsert: true },
    );
  }

  for (const slot of SLOTS) {
    await db.collection('deliverySlots').updateOne(
      { storeId, label: slot.label },
      {
        $setOnInsert: {
          storeId,
          ...slot,
          dayOfWeek: null,
          capacity: 0,
          isActive: true,
        },
      },
      { upsert: true },
    );
  }

  let productCount = 0;

  for (const [index, group] of CATALOGUE.entries()) {
    const category = await db.collection('categories').findOneAndUpdate(
      { storeId, slug: group.slug },
      {
        $setOnInsert: { storeId, slug: group.slug, description: null, imageUrl: null, createdAt: now },
        $set: {
          name: group.name,
          nameBn: group.nameBn,
          iconKey: group.iconKey,
          sortOrder: index,
          isActive: true,
          updatedAt: now,
        },
      },
      { upsert: true, returnDocument: 'after' },
    );

    const categoryId = category!._id as ObjectId;

    for (const [position, item] of group.products.entries()) {
      const slug = slugify(item.name);
      const searchText = [item.name, item.nameBn, item.unit, item.brand, group.name]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();

      await db.collection('products').updateOne(
        { storeId, slug },
        {
          $setOnInsert: {
            storeId,
            slug,
            sku: null,
            purchaseCount: 0,
            images: [],
            inventory: {
              isAvailable: true,
              trackStock: false,
              stockQty: 0,
              lowStockThreshold: 5,
            },
            createdAt: now,
          },
          $set: {
            categoryId,
            categoryName: group.name,
            categorySlug: group.slug,
            brandName: item.brand ?? null,
            name: item.name,
            nameBn: item.nameBn,
            description: item.description ?? null,
            unit: item.unit,
            pricePoisha: taka(item.price),
            discountPricePoisha: item.discount ? taka(item.discount) : null,
            minQty: 1,
            maxQty: 50,
            isFeatured: item.featured ?? false,
            isActive: true,
            sortOrder: position,
            searchText,
            updatedAt: now,
          },
        },
        { upsert: true },
      );

      productCount += 1;
    }
  }

  // Store owner account.
  const email = (process.env.ADMIN_EMAIL ?? 'owner@shibustore.local').toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.warn(
      '\n⚠️  ADMIN_PASSWORD is not set, so no owner account was created.\n' +
        '   Set ADMIN_EMAIL and ADMIN_PASSWORD in .env and run `npm run db:seed` again.\n',
    );
  } else {
    await db.collection('users').updateOne(
      { email },
      {
        $setOnInsert: { email, phone: null, createdAt: now },
        $set: {
          name: 'Store Owner',
          role: 'ADMIN',
          storeId,
          isActive: true,
          passwordHash: await bcrypt.hash(password, 12),
          updatedAt: now,
        },
      },
      { upsert: true },
    );
    console.info(`Owner account ready: ${email}`);
  }

  console.info(`Seeded ${CATALOGUE.length} categories and ${productCount} products.`);
  console.info('Next: sign in at /admin and add your shop phone number and address.');

  await client.close();
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
