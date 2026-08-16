import type { Metadata } from 'next';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Divider from '@mui/material/Divider';
import Button from '@mui/material/Button';

import OrderTotals from '@/components/OrderTotals';
import ZonePicker from '@/components/ZonePicker';
import FulfillmentToggle from '@/components/FulfillmentToggle';
import CheckoutForm from '@/components/CheckoutForm';
import { getCartQuote } from '@/lib/cart';
import { getDeliverySlots, getDeliveryZones } from '@/lib/catalog';
import { requireStore, resolveSettings, nowInDhaka } from '@/lib/store';
import { getSession } from '@/lib/auth';
import { getCustomer } from '@/lib/customers';
import { formatBDT } from '@/lib/money';

export const metadata: Metadata = {
  title: 'Checkout',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ zone?: string; mode?: string }> };

export default async function CheckoutPage({ searchParams }: Props) {
  const { zone: zoneId, mode } = await searchParams;
  const store = await requireStore();
  const settings = resolveSettings(store);
  const session = await getSession();

  const fulfillmentType = mode === 'pickup' && settings.pickupEnabled ? 'PICKUP' : 'DELIVERY';

  const [zones, slots, quote] = await Promise.all([
    getDeliveryZones(store.id),
    getDeliverySlots(store.id),
    getCartQuote({ fulfillmentType, zoneId: zoneId ?? null }),
  ]);

  if (quote.lines.length === 0) redirect('/cart');

  const customer = session?.customerId ? await getCustomer(session.customerId) : null;

  // Prefer the address the shopper marked as default, else the most recent.
  const lastAddress =
    customer?.addresses.find((address) => address.isDefault) ?? customer?.addresses.at(-1);
  const zone = zones.find((z) => z.id === zoneId) ?? null;

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Checkout
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7 }}>
          <CheckoutForm
            fulfillmentType={fulfillmentType}
            zoneId={zone?.id ?? null}
            zoneName={zone?.name ?? null}
            slots={slots.map((slot) => ({ id: slot.id, label: slot.label }))}
            dateOptions={buildDateOptions(settings.maxPreOrderDays)}
            defaults={{
              name: customer?.name ?? session?.name ?? '',
              phone: customer?.phone ?? session?.phone ?? '',
              addressLine: lastAddress?.addressLine ?? '',
              landmark: lastAddress?.landmark ?? '',
            }}
            pickupEnabled={settings.pickupEnabled}
            totalLabel={formatBDT(quote.totalPoisha)}
            disabled={quote.blockers.length > 0}
            disabledReason={quote.blockers[0]}
          />
        </Grid>

        <Grid size={{ xs: 12, md: 5 }}>
          <Card sx={{ position: { md: 'sticky' }, top: 80 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Your order
              </Typography>

              {settings.pickupEnabled && settings.deliveryEnabled ? (
                <Box sx={{ mb: 2 }}>
                  <FulfillmentToggle value={fulfillmentType} />
                </Box>
              ) : null}

              {fulfillmentType === 'DELIVERY' ? (
                <Box sx={{ mb: 2 }}>
                  <ZonePicker zones={zones} value={zoneId ?? null} />
                </Box>
              ) : null}

              <Stack spacing={1} sx={{ mb: 1.5 }}>
                {quote.lines.map((line) => (
                  <Stack key={line.productId} direction="row" justifyContent="space-between" spacing={1}>
                    <Typography variant="body2" sx={{ minWidth: 0 }}>
                      {line.name}{' '}
                      <Typography component="span" variant="caption" color="text.secondary">
                        × {line.qty} {line.unit}
                      </Typography>
                    </Typography>
                    <Typography variant="body2" fontWeight={600} sx={{ whiteSpace: 'nowrap' }}>
                      {formatBDT(line.lineTotalPoisha)}
                    </Typography>
                  </Stack>
                ))}
              </Stack>

              <Divider sx={{ mb: 1.5 }} />

              <OrderTotals quote={quote} fulfillmentType={fulfillmentType} />

              <Button component={Link} href="/cart" size="small" sx={{ mt: 2 }}>
                ← Edit cart
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}

/** Today plus however many days ahead the shop accepts pre-orders. */
function buildDateOptions(maxDays: number): { value: string; label: string }[] {
  const options: { value: string; label: string }[] = [];
  const today = nowInDhaka();

  for (let offset = 0; offset <= Math.max(0, maxDays); offset += 1) {
    const date = new Date(today);
    date.setUTCDate(today.getUTCDate() + offset);
    const value = date.toISOString().slice(0, 10);
    const weekday = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'][
      date.getUTCDay()
    ];
    const label =
      offset === 0 ? `Today (${weekday})` : offset === 1 ? `Tomorrow (${weekday})` : `${weekday} ${value.slice(5)}`;
    options.push({ value, label });
  }

  return options;
}
