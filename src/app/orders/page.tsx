import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

import ReorderButton from '@/components/ReorderButton';
import { getSession } from '@/lib/auth';
import { requireStore } from '@/lib/store';
import { getRecentOrderNumbers } from '@/lib/recentOrders';
import { formatBDT } from '@/lib/money';
import { listOrdersForViewer, STATUS_LABELS } from '@/lib/orders';
import { statusColor } from '@/lib/orderDisplay';

export const metadata: Metadata = {
  title: 'My orders',
  robots: { index: false, follow: false },
};

export default async function OrdersPage() {
  const store = await requireStore();
  const session = await getSession();
  const recentNumbers = await getRecentOrderNumbers();

  // A signed-in shopper sees their full history; a guest sees what this device
  // ordered. Both paths are scoped, so nobody can browse someone else's orders.
  const orders = await listOrdersForViewer(store.id, {
    customerId: session?.customerId ?? null,
    orderNumbers: recentNumbers,
  });

  if (orders.length === 0) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <ReceiptLongOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h2" sx={{ mt: 2 }}>
          No orders yet
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Once you place an order it will appear here, ready to reorder in one tap.
        </Typography>
        <Stack direction="row" spacing={1.5} justifyContent="center">
          <Button component={Link} href="/" variant="contained">
            Start shopping
          </Button>
          {!session?.customerId ? (
            <Button component={Link} href="/account/login" variant="outlined">
              Sign in
            </Button>
          ) : null}
        </Stack>
      </Container>
    );
  }

  return (
    <Container sx={{ py: 3 }}>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h1" component="h1">
          My orders
        </Typography>
        {!session?.customerId ? (
          <Button component={Link} href="/account/login" size="small" variant="outlined">
            Sign in for full history
          </Button>
        ) : null}
      </Stack>

      <Stack spacing={2}>
        {orders.map((order) => (
          <Card key={order.id}>
            <CardContent>
              <Stack
                direction={{ xs: 'column', sm: 'row' }}
                justifyContent="space-between"
                spacing={1}
                sx={{ mb: 1 }}
              >
                <Box>
                  <Typography variant="subtitle1" fontWeight={700}>
                    {order.orderNumber}
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {order.placedAt.toLocaleDateString('en-GB', {
                      day: 'numeric',
                      month: 'short',
                      year: 'numeric',
                    })}{' '}
                    • {order.items.length} item{order.items.length === 1 ? '' : 's'} •{' '}
                    {order.fulfillmentType === 'PICKUP' ? 'Store pickup' : 'Delivery'}
                  </Typography>
                </Box>

                <Stack direction="row" spacing={1} alignItems="center">
                  <Chip size="small" label={STATUS_LABELS[order.status]} color={statusColor(order.status)} />
                  <Typography variant="h4" component="span">
                    {formatBDT(order.totalPoisha)}
                  </Typography>
                </Stack>
              </Stack>

              <Divider sx={{ my: 1 }} />

              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                {order.items
                  .slice(0, 6)
                  .map((item) => `${item.name} × ${item.qty}`)
                  .join(', ')}
                {order.items.length > 6 ? '…' : ''}
              </Typography>

              <Stack direction="row" spacing={1}>
                <Button component={Link} href={`/orders/${order.orderNumber}`} size="small" variant="text">
                  View details
                </Button>
                <ReorderButton orderId={order.id} variant="outlined" />
              </Stack>
            </CardContent>
          </Card>
        ))}
      </Stack>
    </Container>
  );
}
