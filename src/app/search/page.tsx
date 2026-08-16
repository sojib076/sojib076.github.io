import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import SearchBar from '@/components/SearchBar';
import CategoryGrid from '@/components/CategoryGrid';
import ProductCard from '@/components/ProductCard';
import { getCartQtyMap, getCategories, searchProducts } from '@/lib/catalog';
import { requireStore } from '@/lib/store';

type Props = { searchParams: Promise<{ q?: string; category?: string }> };

export async function generateMetadata({ searchParams }: Props): Promise<Metadata> {
  const { q } = await searchParams;
  return {
    title: q ? `Search results for “${q}”` : 'Search groceries',
    // Search result pages add nothing to a local search index.
    robots: { index: false, follow: true },
  };
}

export default async function SearchPage({ searchParams }: Props) {
  const { q = '', category } = await searchParams;
  const store = await requireStore();
  const query = q.trim();

  const [products, cartQty, categories] = await Promise.all([
    query ? searchProducts(store.id, query, category) : Promise.resolve([]),
    getCartQtyMap(),
    getCategories(store.id),
  ]);

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Search
      </Typography>

      <Box sx={{ maxWidth: 560, mb: 3 }}>
        <SearchBar defaultValue={query} autoFocus={!query} />
      </Box>

      {!query ? (
        <>
          <Typography variant="h3" component="h2" gutterBottom>
            Browse categories instead
          </Typography>
          <CategoryGrid categories={categories} />
        </>
      ) : products.length === 0 ? (
        <>
          <Alert severity="info" sx={{ mb: 3 }}>
            No products matched “{query}”. Try a shorter word, or the Bengali name.
          </Alert>
          <Typography variant="h3" component="h2" gutterBottom>
            Categories
          </Typography>
          <CategoryGrid categories={categories} />
        </>
      ) : (
        <>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            {products.length} result{products.length === 1 ? '' : 's'} for “{query}”
          </Typography>
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
            {products.map((product) => (
              <ProductCard key={product.id} product={product} cartQty={cartQty[product.id] ?? 0} />
            ))}
          </Box>
        </>
      )}
    </Container>
  );
}
