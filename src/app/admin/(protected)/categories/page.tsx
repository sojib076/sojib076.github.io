import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import CategoryManager from '@/components/admin/CategoryManager';
import { listAdminCategories } from '@/lib/admin';
import { requireStore } from '@/lib/store';

export default async function AdminCategoriesPage() {
  const store = await requireStore();

  const categories = await listAdminCategories(store.id);

  return (
    <Box>
      <Typography variant="h1" component="h1" gutterBottom>
        Categories
      </Typography>
      <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
        Categories are how customers browse. Keep them close to how your shelves are arranged.
      </Typography>

      <CategoryManager
        categories={categories.map((category) => ({
          id: category.id,
          name: category.name,
          nameBn: category.nameBn,
          iconKey: category.iconKey,
          sortOrder: category.sortOrder,
          isActive: category.isActive,
          productCount: category.productCount,
        }))}
      />
    </Box>
  );
}
