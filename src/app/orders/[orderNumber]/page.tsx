import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import OrderStatusTracker from '@/components/OrderStatusTracker';
import ReorderButton from '@/components/ReorderButton';
import { getSession, formatPhone } from '@/lib/auth';
import { requireStore, resolveSettings } from '@/lib/store';
import { hasPlacedOrder } from '@/lib/recentOrders';
import { formatBDT } from '@/lib/money';
import { getOrderByNumber, STATUS_LABELS } from '@/lib/orders';
import { statusColor } from '@/lib/orderDisplay';
import { paymentLabel, whatsappLink } from '@/lib/notifications';

type Props = {
  params: Promise<{ orderNumber: string }>;
  searchParams: Promise<{ placed?: string }>;
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { orderNumber } = await params;
  return {
    title: `Order ${orderNumber}`,
    robots: { index: false, follow: false },
  };
}

export default async function OrderDetailPage({ params, searchParams }: Props) {
  const { orderNumber } = await params;
  const { placed } = await searchParams;

  const store = await requireStore();
  const settings = resolveSettings(store);
  const session = await getSession();

  const order = await getOrderByNumber(store.id, orderNumber);
  if (!order) notFound();

  // Only the browser that placed the order, or the signed-in owner, may read
  // it — order numbers are readable by design and are not an access token.
  const ownsOrder =
    (session?.customerId != null && order.customerId === session.customerId) ||
    (await hasPlacedOrder(order.orderNumber));
  if (!ownsOrder) notFound();

  const isDelivery = order.fulfillmentType === 'DELIVERY';

  return (
    <Container sx={{ py: 3 }}>
      {placed ? (
        <Alert severity="success" sx={{ mb: 2 }}>
          <Typography variant="subtitle2">Order placed — thank you!</Typography>
          <Typography variant="body2">
            {store.name} has received it and will confirm shortly. We usually pack in about{' '}
            {settings.prepTimeMinutes} minutes.
          </Typography>
        </Alert>
      ) : null}

      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        justifyContent="space-between"
        alignItems={{ sm: 'center' }}
        spacing={1}
        sx={{ mb: 2 }}
      >
        <Box>
          <Typography variant="h1" component="h1">
            {order.orderNumber}
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Placed{' '}
            {order.placedAt.toLocaleString('en-GB', {
              day: 'numeric',
              month: 'short',
              year: 'numeric',
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Typography>
        </Box>
        <Chip label={STATUS_LABELS[order.status]} color={statusColor(order.status)} />
      </Stack>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <OrderStatusTracker
            status={order.status}
            fulfillmentType={order.fulfillmentType}
            cancelReason={order.cancelReason}
          />
        </CardContent>
      </Card>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 7 }}>
          <Card>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Items
              </Typography>

              <Stack divider={<Divider />} spacing={1}>
                {order.items.map((item, index) => (
                  <Stack
                    key={`${item.name}-${index}`}
                    direction="row"
                    justifyContent="space-between"
                    spacing={1}
                    sx={{ pt: 1 }}
                  >
                    <Box>
                      <Typography variant="body2" fontWeight={600}>
                        {item.name}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBDT(item.unitPricePoisha)} / {item.unit} × {item.qty}
                      </Typography>
                    </Box>
                    <Typography variant="body2" fontWeight={600}>
                      {formatBDT(item.lineTotalPoisha)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={0.75}>
                <SummaryRow label="Subtotal" value={formatBDT(order.subtotalPoisha)} />
                {isDelivery ? (
                  <SummaryRow
                    label="Delivery fee"
                    value={order.deliveryFeePoisha === 0 ? 'Free' : formatBDT(order.deliveryFeePoisha)}
                  />
                ) : (
                  <SummaryRow label="Store pickup" value="Free" />
                )}
                {order.discountPoisha > 0 ? (
                  <SummaryRow label="Discount" value={`-${formatBDT(order.discountPoisha)}`} />
                ) : null}
              </Stack>

              <Divider sx={{ my: 1.5 }} />

              <Stack direction="row" justifyContent="space-between">
                <Typography variant="h3">Total</Typography>
                <Typography variant="h3">{formatBDT(order.totalPoisha)}</Typography>
              </Stack>

              <Box sx={{ mt: 2 }}>
                <ReorderButton orderId={order.id} variant="contained" label="Order these again" />
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                {isDelivery ? 'Delivery' : 'Pickup'}
              </Typography>

              <Stack spacing={0.5}>
                <Typography variant="body2" fontWeight={600}>
                  {order.customerName}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {formatPhone(order.customerPhone)}
                </Typography>

                {isDelivery ? (
                  <>
                    <Typography variant="body2" sx={{ mt: 1 }}>
                      {order.addressLine}
                    </Typography>
                    {order.landmark ? (
                      <Typography variant="caption" color="text.secondary">
                        Landmark: {order.landmark}
                      </Typography>
                    ) : null}
                    {order.zoneName ? (
                      <Typography variant="caption" color="text.secondary">
                        Area: {order.zoneName}
                        {order.zoneEstimatedMinutes ? ` • about ${order.zoneEstimatedMinutes} min` : ''}
                      </Typography>
                    ) : null}
                  </>
                ) : (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Collect from {store.name}
                    {store.addressLine ? `, ${store.addressLine}` : ''}
                  </Typography>
                )}

                {order.slotLabel ? (
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    Preferred time: {order.slotLabel}
                  </Typography>
                ) : null}

                <Typography variant="body2" sx={{ mt: 1 }}>
                  Payment: {paymentLabel(order.paymentMethod)}
                  {order.paymentStatus === 'PAID' ? ' (paid)' : ''}
                </Typography>

                {order.customerNote ? (
                  <Alert severity="info" sx={{ mt: 1.5 }} icon={false}>
                    <Typography variant="caption" color="text.secondary" display="block">
                      Your note
                    </Typography>
                    {order.customerNote}
                  </Alert>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="subtitle2" gutterBottom>
                Need to change something?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 1.5 }}>
                Call the shop before it goes out for delivery and we will adjust it.
              </Typography>
              <Stack direction="row" spacing={1} flexWrap="wrap" useFlexGap>
                {store.phone ? (
                  <Button size="small" variant="contained" href={`tel:${store.phone}`} startIcon={<CallIcon />}>
                    Call shop
                  </Button>
                ) : null}
                {store.whatsapp ? (
                  <Button
                    size="small"
                    variant="outlined"
                    startIcon={<WhatsAppIcon />}
                    href={whatsappLink(
                      store.whatsapp,
                      `Hello, about my order ${order.orderNumber}:`,
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    WhatsApp
                  </Button>
                ) : null}
              </Stack>
            </CardContent>
          </Card>

          {order.events.length > 0 ? (
            <Card sx={{ mt: 2 }}>
              <CardContent>
                <Typography variant="subtitle2" gutterBottom>
                  Order history
                </Typography>
                <Stack spacing={1}>
                  {order.events.map((event, index) => (
                    <Stack
                      key={`${event.status}-${index}`}
                      direction="row"
                      justifyContent="space-between"
                      spacing={1}
                    >
                      <Box>
                        <Typography variant="body2">{STATUS_LABELS[event.status]}</Typography>
                        {event.note ? (
                          <Typography variant="caption" color="text.secondary">
                            {event.note}
                          </Typography>
                        ) : null}
                      </Box>
                      <Typography variant="caption" color="text.secondary" sx={{ whiteSpace: 'nowrap' }}>
                        {event.createdAt.toLocaleTimeString('en-GB', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Typography>
                    </Stack>
                  ))}
                </Stack>
              </CardContent>
            </Card>
          ) : null}
        </Grid>
      </Grid>

      <Button component={Link} href="/orders" sx={{ mt: 2 }}>
        ← All orders
      </Button>
    </Container>
  );
}

function SummaryRow({ label, value }: { label: string; value: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600}>
        {value}
      </Typography>
    </Stack>
  );
}
