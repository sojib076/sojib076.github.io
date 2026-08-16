import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import StorefrontIcon from '@mui/icons-material/Storefront';

import Price from '@/components/Price';
import ProductThumb from '@/components/ProductThumb';
import AddToCartButton from '@/components/AddToCartButton';
import FavoriteButton from '@/components/FavoriteButton';
import ProductRail from '@/components/ProductRail';
import { BreadcrumbJsonLd, ProductJsonLd } from '@/components/StructuredData';
import { getCartQtyMap, getProductBySlug, getRelatedProducts } from '@/lib/catalog';
import { requireStore, resolveSettings } from '@/lib/store';
import { getSession } from '@/lib/auth';
import { isFavorite } from '@/lib/customers';
import { formatBDT } from '@/lib/money';

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const store = await requireStore();
  const product = await getProductBySlug(store.id, slug);
  if (!product) return { title: 'Product not found' };

  const price = product.discountPricePoisha ?? product.pricePoisha;
  const area = store.area ? ` in ${store.area}` : '';

  return {
    title: `${product.name} — ${formatBDT(price)}/${product.unit}`,
    description:
      product.description ??
      `Buy ${product.name}${product.nameBn ? ` (${product.nameBn})` : ''} at ${formatBDT(price)} per ${product.unit} from ${store.name}${area}. Home delivery or store pickup.`,
    alternates: { canonical: `/product/${product.slug}` },
    openGraph: {
      type: 'website',
      title: product.name,
      images: product.images[0]?.url ? [product.images[0].url] : undefined,
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const { slug } = await params;
  const store = await requireStore();
  const settings = resolveSettings(store);

  const product = await getProductBySlug(store.id, slug);
  if (!product) notFound();

  const session = await getSession();
  const [related, cartQty, saved] = await Promise.all([
    getRelatedProducts(store.id, product.categoryId, product.id),
    getCartQtyMap(),
    session?.customerId ? isFavorite(session.customerId, product.id) : Promise.resolve(false),
  ]);

  const { inventory } = product;
  const soldOut = !inventory.isAvailable || (inventory.trackStock && inventory.stockQty <= 0);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';
  const url = `${siteUrl}/product/${product.slug}`;

  return (
    <Container sx={{ py: 3 }}>
      <ProductJsonLd product={product} storeName={store.name} url={url} />
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${siteUrl}/` },
          { name: product.categoryName, url: `${siteUrl}/category/${product.categorySlug}` },
          { name: product.name, url },
        ]}
      />

      <Breadcrumbs sx={{ mb: 2 }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Home
        </Link>
        <Link href={`/category/${product.categorySlug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
          {product.categoryName}
        </Link>
        <Typography color="text.primary" variant="body2">
          {product.name}
        </Typography>
      </Breadcrumbs>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 5, md: 4 }}>
          <Box sx={{ maxWidth: 360 }}>
            <ProductThumb
              url={product.images[0]?.url}
              alt={product.name}
              fallbackText={product.nameBn ?? product.name}
              rounded={3}
              priority
            />
          </Box>
        </Grid>

        <Grid size={{ xs: 12, sm: 7, md: 8 }}>
          <Stack direction="row" spacing={1} sx={{ mb: 1 }}>
            {product.brandName ? <Chip size="small" label={product.brandName} variant="outlined" /> : null}
            <Chip
              size="small"
              icon={soldOut ? undefined : <CheckCircleIcon />}
              color={soldOut ? 'default' : 'success'}
              label={soldOut ? 'Out of stock' : 'In stock'}
              variant={soldOut ? 'outlined' : 'filled'}
            />
          </Stack>

          <Typography variant="h1" component="h1">
            {product.name}
          </Typography>
          {product.nameBn ? (
            <Typography variant="h3" component="p" color="text.secondary" sx={{ fontWeight: 500 }}>
              {product.nameBn}
            </Typography>
          ) : null}

          <Box sx={{ mt: 2 }}>
            <Price
              pricePoisha={product.pricePoisha}
              discountPricePoisha={product.discountPricePoisha}
              unit={product.unit}
              size="large"
            />
          </Box>

          {product.minQty > 1 ? (
            <Typography variant="caption" color="text.secondary">
              Minimum {product.minQty} {product.unit}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={1} alignItems="center" sx={{ mt: 2.5 }}>
            <Box sx={{ width: 220 }}>
              <AddToCartButton
                productId={product.id}
                initialQty={cartQty[product.id] ?? 0}
                minQty={product.minQty}
                maxQty={product.maxQty}
                disabled={soldOut}
                fullWidth
              />
            </Box>
            <FavoriteButton productId={product.id} initialSaved={saved} />
          </Stack>

          {product.description ? (
            <>
              <Divider sx={{ my: 2.5 }} />
              <Typography variant="subtitle2" gutterBottom>
                About this item
              </Typography>
              <Typography variant="body2" color="text.secondary">
                {product.description}
              </Typography>
            </>
          ) : null}

          <Card sx={{ mt: 3, bgcolor: 'background.default' }}>
            <CardContent>
              <Stack spacing={1.25}>
                <Stack direction="row" spacing={1.5} alignItems="flex-start">
                  <LocalShippingIcon fontSize="small" color="primary" />
                  <Typography variant="body2">
                    Minimum order {formatBDT(settings.minOrderPoisha)}
                    {settings.freeDeliveryThresholdPoisha
                      ? ` • Free delivery above ${formatBDT(settings.freeDeliveryThresholdPoisha)}`
                      : ''}
                  </Typography>
                </Stack>
                {settings.pickupEnabled ? (
                  <Stack direction="row" spacing={1.5} alignItems="flex-start">
                    <StorefrontIcon fontSize="small" color="primary" />
                    <Typography variant="body2">
                      Or collect it from the shop — usually ready in about {settings.prepTimeMinutes}{' '}
                      minutes.
                    </Typography>
                  </Stack>
                ) : null}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <ProductRail
        title={`More in ${product.categoryName}`}
        products={related}
        cartQty={cartQty}
        href={`/category/${product.categorySlug}`}
      />
    </Container>
  );
}
