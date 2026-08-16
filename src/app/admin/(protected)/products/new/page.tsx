import { redirect } from 'next/navigation';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import ProductForm from '@/components/admin/ProductForm';
import { saveProductAction } from '@/app/actions/admin';
import { listAdminCategories } from '@/lib/admin';
import { requireStore } from '@/lib/store';

export default async function NewProductPage() {
  const store = await requireStore();
  const categories = await listAdminCategories(store.id);

  if (categories.length === 0) {
    redirect('/admin/categories');
  }

  return (
    <Box>
      <Typography variant="h1" component="h1" gutterBottom>
        Add product
      </Typography>
      <Alert severity="info" sx={{ mb: 2 }}>
        Prices are per unit — enter 75 for rice sold at ৳75/kg.
      </Alert>

      <ProductForm
        action={saveProductAction.bind(null, null)}
        categories={categories}
        submitLabel="Add product"
        values={{
          name: '',
          nameBn: '',
          categoryId: categories[0].id,
          brandName: '',
          unit: 'kg',
          description: '',
          price: '',
          discountPrice: '',
          minQty: 1,
          maxQty: 50,
          stockQty: 0,
          trackStock: false,
          isAvailable: true,
          isFeatured: false,
          isActive: true,
          imageUrl: '',
        }}
      />
    </Box>
  );
}
