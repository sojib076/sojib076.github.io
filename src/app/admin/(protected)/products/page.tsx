import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';

import ProductRowActions from '@/components/admin/ProductRowActions';
import { listAdminCategories, listAdminProducts } from '@/lib/admin';
import { requireStore } from '@/lib/store';
import { formatBDT, poishaToTaka } from '@/lib/money';

type Props = { searchParams: Promise<{ category?: string; saved?: string }> };

export default async function AdminProductsPage({ searchParams }: Props) {
  const { category, saved } = await searchParams;
  const store = await requireStore();

  const [categories, products] = await Promise.all([
    listAdminCategories(store.id),
    listAdminProducts(store.id, category ?? null),
  ]);

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Box>
          <Typography variant="h1" component="h1">
            Products
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {products.length} product{products.length === 1 ? '' : 's'}
          </Typography>
        </Box>
        <Button component={Link} href="/admin/products/new" variant="contained" startIcon={<AddIcon />}>
          Add product
        </Button>
      </Stack>

      {saved ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          Product saved.
        </Alert>
      ) : null}

      {categories.length === 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          Create a category before adding products.{' '}
          <Link href="/admin/categories">Manage categories</Link>
        </Alert>
      ) : (
        <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1 }}>
          <Chip
            component={Link}
            href="/admin/products"
            label="All"
            clickable
            color={!category ? 'primary' : 'default'}
            variant={!category ? 'filled' : 'outlined'}
          />
          {categories.map((item) => (
            <Chip
              key={item.id}
              component={Link}
              href={`/admin/products?category=${item.id}`}
              label={`${item.name} (${item.productCount})`}
              clickable
              color={category === item.id ? 'primary' : 'default'}
              variant={category === item.id ? 'filled' : 'outlined'}
            />
          ))}
        </Stack>
      )}

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Product</TableCell>
                <TableCell>Category</TableCell>
                <TableCell>Unit</TableCell>
                <TableCell align="right">Offer</TableCell>
                <TableCell align="right">Stock</TableCell>
                <TableCell align="right" sx={{ minWidth: 260 }}>
                  Price (৳) • availability
                </TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {products.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No products yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                products.map((product) => (
                  <TableRow key={product.id} hover>
                    <TableCell>
                      <Link href={`/admin/products/${product.id}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="body2" fontWeight={600}>
                          {product.name}
                        </Typography>
                        {product.nameBn ? (
                          <Typography variant="caption" color="text.secondary">
                            {product.nameBn}
                          </Typography>
                        ) : null}
                      </Link>
                      {!product.isActive ? (
                        <Chip size="small" label="Hidden" sx={{ ml: 1 }} />
                      ) : null}
                      {product.isFeatured ? (
                        <Chip size="small" color="secondary" label="Featured" sx={{ ml: 1 }} />
                      ) : null}
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{product.categoryName}</Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="caption">{product.unit}</Typography>
                    </TableCell>
                    <TableCell align="right">
                      {product.discountPricePoisha ? (
                        <Chip size="small" color="secondary" label={formatBDT(product.discountPricePoisha)} />
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          —
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      {product.inventory.trackStock ? (
                        <Typography variant="caption">{product.inventory.stockQty}</Typography>
                      ) : (
                        <Typography variant="caption" color="text.disabled">
                          not counted
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell align="right">
                      <ProductRowActions
                        productId={product.id}
                        productName={product.name}
                        isAvailable={product.inventory.isAvailable}
                        price={String(poishaToTaka(product.pricePoisha))}
                      />
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>
    </Box>
  );
}
