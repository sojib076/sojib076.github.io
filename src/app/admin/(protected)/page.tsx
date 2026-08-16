import Link from 'next/link';
import Grid from '@mui/material/Grid2';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ShoppingBagOutlinedIcon from '@mui/icons-material/ShoppingBagOutlined';
import PendingActionsIcon from '@mui/icons-material/PendingActions';
import PaidOutlinedIcon from '@mui/icons-material/PaidOutlined';
import InsightsIcon from '@mui/icons-material/Insights';

import SetupChecklist from '@/components/admin/SetupChecklist';
import { getDashboardData, getSetupChecklist } from '@/lib/admin';
import { requireStore, resolveSettings } from '@/lib/store';
import { formatBDT } from '@/lib/money';
import { STATUS_LABELS } from '@/lib/orders';
import { statusColor } from '@/lib/orderDisplay';

export default async function AdminDashboardPage() {
  const store = await requireStore();
  const settings = resolveSettings(store);
  const [dashboard, setupItems] = await Promise.all([
    getDashboardData(store.id, settings.lowStockThreshold),
    getSetupChecklist(store),
  ]);

  const {
    todayOrders,
    todaySalesPoisha,
    pendingCount,
    confirmedCount,
    totalOrders,
    averageOrderPoisha,
    lowStock,
    popular,
    latestOrders,
  } = dashboard;

  return (
    <Box>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h1" component="h1">
          Today
        </Typography>
        <Button component={Link} href="/admin/orders?status=PENDING" variant="contained">
          {pendingCount} order{pendingCount === 1 ? '' : 's'} to confirm
        </Button>
      </Stack>

      <SetupChecklist items={setupItems} />

      {pendingCount > 0 ? (
        <Alert severity="warning" sx={{ mb: 2 }}>
          {pendingCount} order{pendingCount === 1 ? ' is' : 's are'} waiting for you to confirm.
          Customers see “Pending” until you do.
        </Alert>
      ) : null}

      <Grid container spacing={2} sx={{ mb: 3 }}>
        <StatCard
          label="Today's orders"
          value={String(todayOrders)}
          icon={<ShoppingBagOutlinedIcon />}
        />
        <StatCard
          label="Today's sales"
          value={formatBDT(todaySalesPoisha)}
          icon={<PaidOutlinedIcon />}
        />
        <StatCard
          label="Pending / confirmed"
          value={`${pendingCount} / ${confirmedCount}`}
          icon={<PendingActionsIcon />}
        />
        <StatCard
          label="Average order"
          value={formatBDT(averageOrderPoisha)}
          hint={`${totalOrders} orders all time`}
          icon={<InsightsIcon />}
        />
      </Grid>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1 }}>
                <Typography variant="h3" component="h2">
                  Latest orders
                </Typography>
                <Button component={Link} href="/admin/orders" size="small">
                  All orders
                </Button>
              </Stack>

              {latestOrders.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No orders yet.
                </Typography>
              ) : (
                <Stack divider={<Divider />}>
                  {latestOrders.map((order) => (
                    <Stack
                      key={order.id}
                      component={Link}
                      href={`/admin/orders/${order.id}`}
                      direction="row"
                      justifyContent="space-between"
                      alignItems="center"
                      spacing={1}
                      sx={{ py: 1.25, textDecoration: 'none', color: 'inherit' }}
                    >
                      <Box sx={{ minWidth: 0 }}>
                        <Typography variant="subtitle2">{order.orderNumber}</Typography>
                        <Typography variant="caption" color="text.secondary" noWrap>
                          {order.customerName} •{' '}
                          {order.fulfillmentType === 'PICKUP' ? 'Pickup' : 'Delivery'} •{' '}
                          {order.placedAt.toLocaleTimeString('en-GB', {
                            hour: 'numeric',
                            minute: '2-digit',
                          })}
                        </Typography>
                      </Box>
                      <Stack direction="row" spacing={1} alignItems="center">
                        <Chip size="small" label={STATUS_LABELS[order.status]} color={statusColor(order.status)} />
                        <Typography variant="subtitle2" sx={{ whiteSpace: 'nowrap' }}>
                          {formatBDT(order.totalPoisha)}
                        </Typography>
                      </Stack>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Low stock
              </Typography>
              {lowStock.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Nothing is running low. Stock counting is off unless you enable it per product.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {lowStock.map((product) => (
                    <Stack key={product.id} direction="row" justifyContent="space-between">
                      <Typography variant="body2">{product.name}</Typography>
                      <Chip
                        size="small"
                        color={product.stockQty <= 0 ? 'error' : 'warning'}
                        label={`${product.stockQty} ${product.unit}`}
                      />
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Popular products
              </Typography>
              {popular.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  Sales data will appear here after your first orders.
                </Typography>
              ) : (
                <Stack spacing={1}>
                  {popular.map((product) => (
                    <Stack key={product.id} direction="row" justifyContent="space-between">
                      <Typography variant="body2">{product.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {product.purchaseCount} {product.unit}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function StatCard({
  label,
  value,
  hint,
  icon,
}: {
  label: string;
  value: string;
  hint?: string;
  icon: React.ReactNode;
}) {
  return (
    <Grid size={{ xs: 6, md: 3 }}>
      <Card sx={{ height: '100%' }}>
        <CardContent>
          <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 0.5, color: 'primary.main' }}>
            {icon}
            <Typography variant="caption" color="text.secondary">
              {label}
            </Typography>
          </Stack>
          <Typography variant="h2" component="p">
            {value}
          </Typography>
          {hint ? (
            <Typography variant="caption" color="text.secondary">
              {hint}
            </Typography>
          ) : null}
        </CardContent>
      </Card>
    </Grid>
  );
}
