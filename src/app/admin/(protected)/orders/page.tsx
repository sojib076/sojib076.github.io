import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import Chip from '@mui/material/Chip';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Button from '@mui/material/Button';
import type { OrderStatus } from '@/lib/db/types';

import { listAdminOrders } from '@/lib/admin';
import { requireStore } from '@/lib/store';
import { formatBDT } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/orders';
import { statusColor } from '@/lib/orderDisplay';
import { formatPhone } from '@/lib/auth';

const FILTERS: { key: string; label: string; status?: OrderStatus }[] = [
  { key: 'all', label: 'All' },
  { key: 'PENDING', label: 'Pending', status: 'PENDING' },
  { key: 'CONFIRMED', label: 'Confirmed', status: 'CONFIRMED' },
  { key: 'PREPARING', label: 'Preparing', status: 'PREPARING' },
  { key: 'READY', label: 'Ready', status: 'READY' },
  { key: 'OUT_FOR_DELIVERY', label: 'Out for delivery', status: 'OUT_FOR_DELIVERY' },
  { key: 'DELIVERED', label: 'Delivered', status: 'DELIVERED' },
  { key: 'CANCELLED', label: 'Cancelled', status: 'CANCELLED' },
];

type Props = { searchParams: Promise<{ status?: string }> };

export default async function AdminOrdersPage({ searchParams }: Props) {
  const { status } = await searchParams;
  const store = await requireStore();

  const active = FILTERS.find((filter) => filter.key === status) ?? FILTERS[0];

  const orders = await listAdminOrders(store.id, active.status ?? null);

  return (
    <Box>
      <Typography variant="h1" component="h1" gutterBottom>
        Orders
      </Typography>

      <Stack direction="row" spacing={1} sx={{ mb: 2, overflowX: 'auto', pb: 1 }}>
        {FILTERS.map((filter) => (
          <Chip
            key={filter.key}
            component={Link}
            href={filter.key === 'all' ? '/admin/orders' : `/admin/orders?status=${filter.key}`}
            label={filter.label}
            clickable
            color={active.key === filter.key ? 'primary' : 'default'}
            variant={active.key === filter.key ? 'filled' : 'outlined'}
          />
        ))}
      </Stack>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Customer</TableCell>
                <TableCell>Type</TableCell>
                <TableCell align="right">Items</TableCell>
                <TableCell align="right">Total</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right">Placed</TableCell>
                <TableCell />
              </TableRow>
            </TableHead>
            <TableBody>
              {orders.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={8}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No orders here yet.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                orders.map((order) => (
                  <TableRow key={order.id} hover>
                    <TableCell>
                      <Typography variant="body2" fontWeight={700}>
                        {order.orderNumber}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">{order.customerName}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatPhone(order.customerPhone)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2">
                        {order.fulfillmentType === 'PICKUP' ? 'Pickup' : order.zoneName ?? 'Delivery'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{order.items.length}</TableCell>
                    <TableCell align="right">
                      <Typography variant="body2" fontWeight={600}>
                        {formatBDT(order.totalPoisha)}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Chip size="small" label={STATUS_LABELS[order.status]} color={statusColor(order.status)} />
                    </TableCell>
                    <TableCell align="right">
                      <Typography variant="caption" color="text.secondary">
                        {order.placedAt.toLocaleString('en-GB', {
                          day: 'numeric',
                          month: 'short',
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">
                      <Button component={Link} href={`/admin/orders/${order.id}`} size="small">
                        Open
                      </Button>
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
