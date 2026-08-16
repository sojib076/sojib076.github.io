import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import CategoryGrid from '@/components/CategoryGrid';
import { getCategories } from '@/lib/catalog';
import { requireStore } from '@/lib/store';

export async function generateMetadata(): Promise<Metadata> {
  const store = await requireStore();
  return {
    title: 'All grocery categories',
    description: `Browse every grocery category at ${store.name} — rice, dal, oil, spices, dairy, snacks, household and more.`,
    alternates: { canonical: '/categories' },
  };
}

export default async function CategoriesPage() {
  const store = await requireStore();
  const categories = await getCategories(store.id);

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        All categories
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2.5 }}>
        Everything {store.name} stocks, grouped the way the shelves are arranged.
      </Typography>

      {categories.length === 0 ? (
        <Typography color="text.secondary">No categories have been added yet.</Typography>
      ) : (
        <Box sx={{ mb: 3 }}>
          <CategoryGrid categories={categories} columns={{ xs: 3, sm: 4, md: 6 }} />
        </Box>
      )}
    </Container>
  );
}
