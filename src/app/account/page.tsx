import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';

import ProductCard from '@/components/ProductCard';
import { getSession, formatPhone } from '@/lib/auth';
import { signOutAction } from '@/app/actions/auth';
import { getCustomer, getCustomerSpendPoisha, getFavoriteProducts } from '@/lib/customers';
import { requireStore } from '@/lib/store';
import { getCartQtyMap } from '@/lib/catalog';
import { formatBDT } from '@/lib/money';

export const metadata: Metadata = {
  title: 'My account',
  robots: { index: false, follow: false },
};

export default async function AccountPage() {
  const session = await getSession();
  if (!session?.customerId) redirect('/account/login');

  const store = await requireStore();

  const [customer, favorites, cartQty, spendPoisha] = await Promise.all([
    getCustomer(session.customerId),
    getFavoriteProducts(store.id, session.customerId),
    getCartQtyMap(),
    getCustomerSpendPoisha(session.customerId),
  ]);

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        My account
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" spacing={2}>
            <Box>
              <Typography variant="h3">{customer?.name ?? 'Customer'}</Typography>
              <Typography variant="body2" color="text.secondary">
                {formatPhone(customer?.phone ?? session.phone ?? '')}
              </Typography>
            </Box>

            <Stack direction="row" spacing={3}>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Orders
                </Typography>
                <Typography variant="h3">{customer?.totalOrders ?? 0}</Typography>
              </Box>
              <Box>
                <Typography variant="caption" color="text.secondary" display="block">
                  Total spent
                </Typography>
                <Typography variant="h3">{formatBDT(spendPoisha)}</Typography>
              </Box>
            </Stack>
          </Stack>

          <Divider sx={{ my: 2 }} />

          <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
            <Button component={Link} href="/orders" variant="contained">
              My orders
            </Button>
            <form action={signOutAction}>
              <Button type="submit" variant="outlined" color="inherit">
                Sign out
              </Button>
            </form>
          </Stack>
        </CardContent>
      </Card>

      <Typography variant="h2" component="h2" gutterBottom>
        Saved items
      </Typography>
      {favorites.length === 0 ? (
        <Typography color="text.secondary">
          Nothing saved yet. Tap the heart on a product to keep it here.
        </Typography>
      ) : (
        <Box
          sx={{
            display: 'grid',
            gridTemplateColumns: { xs: 'repeat(2, 1fr)', sm: 'repeat(3, 1fr)', md: 'repeat(5, 1fr)' },
            gap: 1.5,
          }}
        >
          {favorites.map((favorite) => (
            <ProductCard key={favorite.id} product={favorite} cartQty={cartQty[favorite.id] ?? 0} />
          ))}
        </Box>
      )}
    </Container>
  );
}
