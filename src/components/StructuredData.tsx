import type { StoreContext } from '@/lib/store';
import { poishaToTaka } from '@/lib/money';

/**
 * Structured data for local search.
 *
 * Everything below is generated from what the shop owner actually entered in
 * the admin dashboard. Fields the owner has not filled in are omitted rather
 * than invented — and there is deliberately no aggregateRating, because the
 * shop has no verified reviews to describe.
 */

function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Server-rendered from our own database, and the payload is escaped below.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }}
    />
  );
}

export function LocalBusinessJsonLd({
  store,
  zoneNames = [],
}: {
  store: StoreContext;
  /** Delivery areas, which is what "grocery delivery in X" searches match on. */
  zoneNames?: string[];
}) {
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const address: Record<string, string> = { '@type': 'PostalAddress', addressCountry: 'BD' };
  if (store.addressLine) address.streetAddress = store.addressLine;
  if (store.area) address.addressLocality = store.area;
  if (store.district) address.addressRegion = store.district;
  if (store.postcode) address.postalCode = store.postcode;

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'GroceryStore',
    name: store.name,
    url: siteUrl,
    address,
  };

  if (store.description) data.description = store.description;
  if (store.phone) data.telephone = `+88${store.phone}`;
  if (store.email) data.email = store.email;
  if (store.logoUrl) data.image = new URL(store.logoUrl, siteUrl).toString();
  if (store.mapUrl) data.hasMap = store.mapUrl;
  if (store.latitude != null && store.longitude != null) {
    data.geo = { '@type': 'GeoCoordinates', latitude: store.latitude, longitude: store.longitude };
  }

  const openingHours = store.hours
    .filter((hour) => !hour.isClosed)
    .map((hour) => ({
      '@type': 'OpeningHoursSpecification',
      dayOfWeek: `https://schema.org/${
        ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][hour.dayOfWeek]
      }`,
      opens: hour.opensAt,
      closes: hour.closesAt,
    }));
  if (openingHours.length > 0) data.openingHoursSpecification = openingHours;

  if (zoneNames.length > 0) {
    data.areaServed = zoneNames.map((name) => ({ '@type': 'Place', name }));
  }

  return <JsonLd data={data} />;
}

export function ProductJsonLd({
  product,
  storeName,
  url,
}: {
  product: {
    name: string;
    description: string | null;
    unit: string;
    pricePoisha: number;
    discountPricePoisha: number | null;
    images: { url: string }[];
    brandName?: string | null;
    inventory: { isAvailable: boolean; trackStock: boolean; stockQty: number } | null;
  };
  storeName: string;
  url: string;
}) {
  const price =
    product.discountPricePoisha != null && product.discountPricePoisha < product.pricePoisha
      ? product.discountPricePoisha
      : product.pricePoisha;

  const inStock =
    product.inventory?.isAvailable !== false &&
    !(product.inventory?.trackStock && product.inventory.stockQty <= 0);

  const data: Record<string, unknown> = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    offers: {
      '@type': 'Offer',
      price: poishaToTaka(price).toFixed(2),
      priceCurrency: 'BDT',
      availability: inStock ? 'https://schema.org/InStock' : 'https://schema.org/OutOfStock',
      url,
      seller: { '@type': 'GroceryStore', name: storeName },
    },
  };

  if (product.description) data.description = product.description;
  if (product.brandName) data.brand = { '@type': 'Brand', name: product.brandName };
  if (product.images.length > 0) data.image = product.images.map((image) => image.url);

  return <JsonLd data={data} />;
}

export function BreadcrumbJsonLd({ items }: { items: { name: string; url: string }[] }) {
  return (
    <JsonLd
      data={{
        '@context': 'https://schema.org',
        '@type': 'BreadcrumbList',
        itemListElement: items.map((item, index) => ({
          '@type': 'ListItem',
          position: index + 1,
          name: item.name,
          item: item.url,
        })),
      }}
    />
  );
}
