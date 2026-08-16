import { notFound } from 'next/navigation';
import Link from 'next/link';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import ProductForm from '@/components/admin/ProductForm';
import { saveProductAction } from '@/app/actions/admin';
import { getAdminProduct, listAdminCategories } from '@/lib/admin';
import { requireStore } from '@/lib/store';
import { poishaToTaka } from '@/lib/money';

type Props = { params: Promise<{ id: string }> };

export default async function EditProductPage({ params }: Props) {
  const { id } = await params;
  const store = await requireStore();

  const [product, categories] = await Promise.all([
    getAdminProduct(store.id, id),
    listAdminCategories(store.id),
  ]);

  if (!product) notFound();

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h1" component="h1">
            {product.name}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            /product/{product.slug}
          </Typography>
        </Box>
        <Button component={Link} href={`/product/${product.slug}`} target="_blank" size="small">
          View in shop
        </Button>
      </Stack>

      <ProductForm
        action={saveProductAction.bind(null, product.id)}
        categories={categories}
        submitLabel="Save changes"
        values={{
          id: product.id,
          name: product.name,
          nameBn: product.nameBn ?? '',
          categoryId: product.categoryId,
          brandName: product.brandName ?? '',
          unit: product.unit,
          description: product.description ?? '',
          price: String(poishaToTaka(product.pricePoisha)),
          discountPrice:
            product.discountPricePoisha != null ? String(poishaToTaka(product.discountPricePoisha)) : '',
          minQty: product.minQty,
          maxQty: product.maxQty,
          stockQty: product.inventory.stockQty,
          trackStock: product.inventory.trackStock,
          isAvailable: product.inventory.isAvailable,
          isFeatured: product.isFeatured,
          isActive: product.isActive,
          imageUrl: product.imageUrl ?? '',
        }}
      />
    </Box>
  );
}
