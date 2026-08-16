import type { Metadata } from 'next';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Breadcrumbs from '@mui/material/Breadcrumbs';
import Chip from '@mui/material/Chip';
import ProductCard from '@/components/ProductCard';
import { BreadcrumbJsonLd } from '@/components/StructuredData';
import { getCartQtyMap, getCategoryBySlug, getCategoryProducts } from '@/lib/catalog';
import { requireStore } from '@/lib/store';

type Params = { params: Promise<{ slug: string }>; searchParams: Promise<{ sort?: string }> };

export async function generateMetadata({ params }: Params): Promise<Metadata> {
  const { slug } = await params;
  const store = await requireStore();
  const category = await getCategoryBySlug(store.id, slug);
  if (!category) return { title: 'Category not found' };

  const area = store.area ? ` in ${store.area}` : '';
  return {
    title: `${category.name} — buy online${area}`,
    description:
      category.description ??
      `Order ${category.name.toLowerCase()} from ${store.name}${area} with home delivery or store pickup. Prices in BDT.`,
    alternates: { canonical: `/category/${category.slug}` },
  };
}

const SORTS = [
  { key: 'popular', label: 'Popular' },
  { key: 'price-asc', label: 'Price: low to high' },
  { key: 'price-desc', label: 'Price: high to low' },
  { key: 'name', label: 'A–Z' },
] as const;

export default async function CategoryPage({ params, searchParams }: Params) {
  const { slug } = await params;
  const { sort } = await searchParams;

  const store = await requireStore();
  const category = await getCategoryBySlug(store.id, slug);
  if (!category) notFound();

  const [products, cartQty] = await Promise.all([
    getCategoryProducts(store.id, category.id, {
      sort: (sort as 'popular' | 'price-asc' | 'price-desc' | 'name') ?? 'popular',
    }),
    getCartQtyMap(),
  ]);

  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? '';

  return (
    <Container sx={{ py: 3 }}>
      <BreadcrumbJsonLd
        items={[
          { name: 'Home', url: `${siteUrl}/` },
          { name: 'Categories', url: `${siteUrl}/categories` },
          { name: category.name, url: `${siteUrl}/category/${category.slug}` },
        ]}
      />

      <Breadcrumbs sx={{ mb: 1 }}>
        <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
          Home
        </Link>
        <Link href="/categories" style={{ textDecoration: 'none', color: 'inherit' }}>
          Categories
        </Link>
        <Typography color="text.primary" variant="body2">
          {category.name}
        </Typography>
      </Breadcrumbs>

      <Typography variant="h1" component="h1">
        {category.name}
      </Typography>
      {category.nameBn ? (
        <Typography variant="subtitle1" color="text.secondary">
          {category.nameBn}
        </Typography>
      ) : null}
      <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
        {products.length} item{products.length === 1 ? '' : 's'}
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mt: 2, mb: 2.5, overflowX: 'auto', pb: 0.5 }}>
        {SORTS.map((option) => (
          <Chip
            key={option.key}
            component={Link}
            href={`/category/${category.slug}?sort=${option.key}`}
            label={option.label}
            clickable
            color={(sort ?? 'popular') === option.key ? 'primary' : 'default'}
            variant={(sort ?? 'popular') === option.key ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      {products.length === 0 ? (
        <Typography color="text.secondary">
          Nothing in this category right now. Please check back soon.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: {
              xs: 'repeat(2, 1fr)',
              sm: 'repeat(3, 1fr)',
              md: 'repeat(4, 1fr)',
              lg: 'repeat(5, 1fr)',
            },
            gap: 1.5,
          }}
        >
          {products.map((product, index) => (
            <ProductCard
              key={product.id}
              product={product}
              cartQty={cartQty[product.id] ?? 0}
              priority={index < 4}
            />
          ))}
        </Box>
      )}
    </Container>
  );
}
