import { quoteOrder, calculateDeliveryFee, type PriceableProduct } from '../src/lib/pricing';
import { formatBDT, takaToPoisha } from '../src/lib/money';

const taka = (n: number) => n * 100;

const settings = {
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
};

const zone = (name: string, fee: number, id = name) => ({
  id,
  storeId: 's',
  slug: id,
  name,
  nameBn: null,
  deliveryFeePoisha: taka(fee),
  minOrderPoisha: null,
  freeDeliveryThresholdPoisha: null,
  estimatedMinutes: 45,
  isActive: true,
  sortOrder: 0,
  createdAt: new Date(),
  updatedAt: new Date(),
  rules: [],
});

const product = (id: string, price: number, over: Partial<PriceableProduct> = {}): PriceableProduct => ({
  id,
  slug: id,
  name: id,
  nameBn: null,
  unit: 'kg',
  pricePoisha: taka(price),
  discountPricePoisha: null,
  minQty: 1,
  maxQty: 50,
  isActive: true,
  inventory: { isAvailable: true, trackStock: false, stockQty: 0 },
  images: [],
  ...over,
});

let failures = 0;
function check(label: string, actual: unknown, expected: unknown) {
  const ok = JSON.stringify(actual) === JSON.stringify(expected);
  if (!ok) failures += 1;
  console.log(`${ok ? '  ok  ' : ' FAIL '} ${label}: ${JSON.stringify(actual)}${ok ? '' : ` (expected ${JSON.stringify(expected)})`}`);
}

console.log('\nScenario from the brief: minimum ৳300, cart ৳240 → "add ৳60 more"');
const under = quoteOrder({
  lines: [{ product: product('rice', 80), qty: 3 }],
  settings,
  fulfillmentType: 'DELIVERY',
  zone: zone('Joypara', 30),
});
check('subtotal', formatBDT(under.subtotalPoisha), '৳240');
check('meetsMinimum', under.meetsMinimum, false);
check('amount to minimum', formatBDT(under.amountToMinimumPoisha), '৳60');
check('checkout blocked', under.blockers.length > 0, true);

console.log('\nZone fees: Joypara ৳30, Dohar ৳50, Nearby ৳70');
for (const [name, fee] of [['Joypara', 30], ['Dohar', 50], ['Nearby', 70]] as const) {
  const q = quoteOrder({
    lines: [{ product: product('rice', 100), qty: 5 }],
    settings,
    fulfillmentType: 'DELIVERY',
    zone: zone(name, fee),
  });
  check(`${name} total (৳500 + fee)`, formatBDT(q.totalPoisha), formatBDT(taka(500 + fee)));
}

console.log('\nFree delivery above ৳1,000');
const free = quoteOrder({
  lines: [{ product: product('rice', 100), qty: 10 }],
  settings,
  fulfillmentType: 'DELIVERY',
  zone: zone('Dohar', 50),
});
check('fee waived', free.deliveryFeePoisha, 0);
check('flagged free', free.deliveryIsFree, true);
check('total', formatBDT(free.totalPoisha), '৳1,000');

const almost = quoteOrder({
  lines: [{ product: product('rice', 100), qty: 9 }],
  settings,
  fulfillmentType: 'DELIVERY',
  zone: zone('Dohar', 50),
});
check('gap to free delivery', formatBDT(almost.amountToFreeDeliveryPoisha ?? 0), '৳100');

console.log('\nPickup pays no delivery fee');
const pickup = quoteOrder({
  lines: [{ product: product('rice', 100), qty: 4 }],
  settings,
  fulfillmentType: 'PICKUP',
  zone: null,
});
check('pickup fee', pickup.deliveryFeePoisha, 0);
check('pickup allowed without zone', pickup.blockers, []);

console.log('\nDelivery without an area is refused');
const noZone = quoteOrder({
  lines: [{ product: product('rice', 100), qty: 4 }],
  settings,
  fulfillmentType: 'DELIVERY',
  zone: null,
});
check('blocked', noZone.blockers.includes('Please choose your delivery area.'), true);

console.log('\nOut-of-stock lines are excluded from the total');
const mixed = quoteOrder({
  lines: [
    { product: product('rice', 100), qty: 4 },
    { product: product('oil', 190, { inventory: { isAvailable: false, trackStock: false, stockQty: 0 } }), qty: 2 },
  ],
  settings,
  fulfillmentType: 'DELIVERY',
  zone: zone('Joypara', 30),
});
check('subtotal excludes unavailable', formatBDT(mixed.subtotalPoisha), '৳400');
check('unavailable reported', mixed.unavailableLines.length, 1);

console.log('\nDiscount price is what the customer pays');
const discounted = quoteOrder({
  lines: [{ product: product('biscuit', 55, { discountPricePoisha: taka(48) }), qty: 10 }],
  settings,
  fulfillmentType: 'PICKUP',
});
check('subtotal at offer price', formatBDT(discounted.subtotalPoisha), '৳480');
check('savings shown', formatBDT(discounted.productSavingsPoisha), '৳70');

console.log('\nZone overrides beat store defaults');
const overridden = calculateDeliveryFee(taka(1200), { ...zone('Far', 70), freeDeliveryThresholdPoisha: taka(2000) }, settings);
check('zone threshold wins over store threshold', formatBDT(overridden.feePoisha), '৳70');

console.log('\nMoney parsing');
check('takaToPoisha("75")', takaToPoisha('75'), 7500);
check('takaToPoisha("12.50")', takaToPoisha('12.50'), 1250);
check('takaToPoisha("abc")', takaToPoisha('abc'), null);
check('lakh grouping', formatBDT(taka(125000)), '৳1,25,000');

console.log(failures === 0 ? '\nAll pricing checks passed.\n' : `\n${failures} check(s) FAILED.\n`);
process.exit(failures === 0 ? 0 : 1);
