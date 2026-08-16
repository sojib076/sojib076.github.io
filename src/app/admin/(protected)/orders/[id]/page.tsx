import Link from 'next/link';
import { notFound } from 'next/navigation';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import OrderActions from '@/components/admin/OrderActions';
import { getAdminOrder } from '@/lib/admin';
import { requireStore } from '@/lib/store';
import { formatPhone } from '@/lib/auth';
import { formatBDT } from '@/lib/money';
import { allowedNextStatuses, STATUS_LABELS } from '@/lib/orders';
import { statusColor } from '@/lib/orderDisplay';
import { paymentLabel, whatsappLink } from '@/lib/notifications';

type Props = { params: Promise<{ id: string }> };

export default async function AdminOrderDetailPage({ params }: Props) {
  const { id } = await params;
  const store = await requireStore();

  const detail = await getAdminOrder(store.id, id);
  if (!detail) notFound();

  const { order, customerTotalOrders, notifications } = detail;

  const isDelivery = order.fulfillmentType === 'DELIVERY';
  const nextStatuses = allowedNextStatuses(order.status, order.fulfillmentType);

  const packingMessage = [
    `Hello ${order.customerName}, this is ${store.name} about your order ${order.orderNumber}.`,
  ].join(' ');

  return (
    <Box>
      <Button component={Link} href="/admin/orders" size="small" sx={{ mb: 1 }}>
        ← All orders
      </Button>

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
            {customerTotalOrders != null ? ` • customer's order #${customerTotalOrders}` : ' • guest order'}
          </Typography>
        </Box>
        <Chip label={STATUS_LABELS[order.status]} color={statusColor(order.status)} />
      </Stack>

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Packing list
              </Typography>

              <Stack divider={<Divider />}>
                {order.items.map((item, index) => (
                  <Stack
                    key={`${item.name}-${index}`}
                    direction="row"
                    justifyContent="space-between"
                    alignItems="center"
                    sx={{ py: 1 }}
                  >
                    <Box>
                      <Typography variant="body1" fontWeight={600}>
                        {item.name}
                        {item.nameBn ? (
                          <Typography component="span" variant="body2" color="text.secondary">
                            {' '}
                            {item.nameBn}
                          </Typography>
                        ) : null}
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        {formatBDT(item.unitPricePoisha)} / {item.unit}
                      </Typography>
                    </Box>
                    <Stack direction="row" spacing={2} alignItems="center">
                      <Chip label={`× ${item.qty} ${item.unit}`} size="small" />
                      <Typography variant="subtitle2" sx={{ minWidth: 72, textAlign: 'right' }}>
                        {formatBDT(item.lineTotalPoisha)}
                      </Typography>
                    </Stack>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ my: 2 }} />

              <Stack spacing={0.5} sx={{ maxWidth: 320, ml: 'auto' }}>
                <Row label="Subtotal" value={formatBDT(order.subtotalPoisha)} />
                <Row
                  label={isDelivery ? 'Delivery fee' : 'Pickup'}
                  value={order.deliveryFeePoisha === 0 ? 'Free' : formatBDT(order.deliveryFeePoisha)}
                />
                {order.discountPoisha > 0 ? (
                  <Row label="Discount" value={`-${formatBDT(order.discountPoisha)}`} />
                ) : null}
                <Divider sx={{ my: 0.5 }} />
                <Stack direction="row" justifyContent="space-between">
                  <Typography variant="h3">Total</Typography>
                  <Typography variant="h3">{formatBDT(order.totalPoisha)}</Typography>
                </Stack>
                <Typography variant="caption" color="text.secondary" align="right">
                  {paymentLabel(order.paymentMethod)} • {order.paymentStatus === 'PAID' ? 'Paid' : 'Not paid yet'}
                </Typography>
              </Stack>
            </CardContent>
          </Card>

          {order.customerNote ? (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Typography variant="caption" display="block" color="text.secondary">
                Customer note
              </Typography>
              {order.customerNote}
            </Alert>
          ) : null}

          <Card>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                History
              </Typography>
              <Stack spacing={1}>
                {order.events.map((event, index) => (
                  <Stack key={`${event.status}-${index}`} direction="row" justifyContent="space-between">
                    <Box>
                      <Typography variant="body2">{STATUS_LABELS[event.status]}</Typography>
                      <Typography variant="caption" color="text.secondary">
                        {event.note ?? ''} {event.createdBy ? `— ${event.createdBy}` : ''}
                      </Typography>
                    </Box>
                    <Typography variant="caption" color="text.secondary">
                      {event.createdAt.toLocaleString('en-GB', {
                        day: 'numeric',
                        month: 'short',
                        hour: 'numeric',
                        minute: '2-digit',
                      })}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              {notifications.length > 0 ? (
                <>
                  <Divider sx={{ my: 2 }} />
                  <Typography variant="subtitle2" gutterBottom>
                    Messages sent
                  </Typography>
                  <Stack spacing={0.5}>
                    {notifications.map((notification, index) => (
                      <Typography key={index} variant="caption" color="text.secondary">
                        {notification.channel} → {notification.recipient} • {notification.template} •{' '}
                        {notification.status}
                        {notification.error ? ` (${notification.error})` : ''}
                      </Typography>
                    ))}
                  </Stack>
                </>
              ) : null}
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ mb: 2 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                {isDelivery ? 'Deliver to' : 'Pickup by'}
              </Typography>

              <Typography variant="body1" fontWeight={600}>
                {order.customerName}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                {formatPhone(order.customerPhone)}
              </Typography>

              {isDelivery ? (
                <>
                  <Typography variant="body2" sx={{ mt: 1 }}>
                    {order.addressLine}
                  </Typography>
                  {order.landmark ? (
                    <Typography variant="caption" color="text.secondary" display="block">
                      Landmark: {order.landmark}
                    </Typography>
                  ) : null}
                  {order.zoneName ? (
                    <Chip
                      size="small"
                      sx={{ mt: 1 }}
                      label={`${order.zoneName} • ${formatBDT(order.deliveryFeePoisha)}${
                        order.zoneEstimatedMinutes ? ` • ~${order.zoneEstimatedMinutes} min` : ''
                      }`}
                    />
                  ) : null}
                </>
              ) : (
                <Typography variant="body2" sx={{ mt: 1 }}>
                  Collecting from the shop.
                </Typography>
              )}

              {order.slotLabel ? (
                <Typography variant="body2" sx={{ mt: 1.5 }}>
                  Requested time: <strong>{order.slotLabel}</strong>
                </Typography>
              ) : null}
              {order.scheduledFor ? (
                <Typography variant="caption" color="text.secondary">
                  For {order.scheduledFor.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' })}
                </Typography>
              ) : null}

              <Stack direction="row" spacing={1} sx={{ mt: 2 }} flexWrap="wrap" useFlexGap>
                <Button size="small" variant="contained" href={`tel:${order.customerPhone}`} startIcon={<CallIcon />}>
                  Call
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  href={whatsappLink(order.customerPhone, packingMessage)}
                  target="_blank"
                  rel="noopener noreferrer"
                  startIcon={<WhatsAppIcon />}
                >
                  WhatsApp
                </Button>
              </Stack>

              {order.assignedTo ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1.5, display: 'block' }}>
                  Assigned to {order.assignedTo}
                </Typography>
              ) : null}
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Update order
              </Typography>
              <OrderActions
                orderId={order.id}
                nextStatuses={nextStatuses}
                adminNote={order.adminNote}
                assignedTo={order.assignedTo}
              />
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

function Row({ label, value }: { label: string; value: string }) {
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
