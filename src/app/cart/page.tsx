import type { Metadata } from 'next';
import Link from 'next/link';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Button from '@mui/material/Button';
import Divider from '@mui/material/Divider';
import Alert from '@mui/material/Alert';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

import ProductThumb from '@/components/ProductThumb';
import AddToCartButton from '@/components/AddToCartButton';
import OrderTotals from '@/components/OrderTotals';
import ZonePicker from '@/components/ZonePicker';
import FulfillmentToggle from '@/components/FulfillmentToggle';
import { getCartQuote } from '@/lib/cart';
import { getDeliveryZones } from '@/lib/catalog';
import { requireStore, resolveSettings } from '@/lib/store';
import { formatBDT } from '@/lib/money';
import { basketMessage, whatsappHref } from '@/lib/whatsapp';

export const metadata: Metadata = {
  title: 'Your cart',
  robots: { index: false, follow: false },
};

type Props = { searchParams: Promise<{ zone?: string; mode?: string }> };

export default async function CartPage({ searchParams }: Props) {
  const { zone: zoneId, mode } = await searchParams;
  const store = await requireStore();
  const settings = resolveSettings(store);

  const fulfillmentType = mode === 'pickup' && settings.pickupEnabled ? 'PICKUP' : 'DELIVERY';

  const [zones, quote] = await Promise.all([
    getDeliveryZones(store.id),
    getCartQuote({ fulfillmentType, zoneId: zoneId ?? null }),
  ]);

  const allLines = [...quote.lines, ...quote.unavailableLines];

  if (allLines.length === 0) {
    return (
      <Container sx={{ py: 6, textAlign: 'center' }}>
        <ShoppingCartOutlinedIcon sx={{ fontSize: 64, color: 'text.disabled' }} />
        <Typography variant="h2" sx={{ mt: 2 }}>
          Your cart is empty
        </Typography>
        <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
          Add groceries and place your order — we will pack it at the shop.
        </Typography>
        <Button component={Link} href="/" variant="contained">
          Start shopping
        </Button>
      </Container>
    );
  }

  const canCheckout = quote.blockers.length === 0;
  const whatsappNumber = store.whatsapp ?? store.phone ?? null;

  // Carry the area and delivery/pickup choice through, so checkout prices the
  // same order the customer is looking at.
  const checkoutParams = new URLSearchParams();
  if (zoneId) checkoutParams.set('zone', zoneId);
  if (fulfillmentType === 'PICKUP') checkoutParams.set('mode', 'pickup');
  const query = checkoutParams.toString();
  const checkoutHref = query ? `/checkout?${query}` : '/checkout';

  return (
    <Container sx={{ py: 3 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Your cart
      </Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 7, lg: 8 }}>
          <Card>
            <CardContent sx={{ p: 0 }}>
              <Stack divider={<Divider />}>
                {allLines.map((line) => (
                  <Stack key={line.productId} direction="row" spacing={1.5} sx={{ p: 1.5 }}>
                    <Box sx={{ width: 72, flexShrink: 0, opacity: line.unavailableReason ? 0.5 : 1 }}>
                      <ProductThumb url={line.imageUrl} alt={line.name} fallbackText={line.nameBn} />
                    </Box>

                    <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                      <Link href={`/product/${line.slug}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                        <Typography variant="subtitle2" noWrap>
                          {line.name}
                        </Typography>
                      </Link>
                      <Typography variant="caption" color="text.secondary" display="block">
                        {formatBDT(line.unitPricePoisha)} / {line.unit}
                      </Typography>

                      {line.unavailableReason ? (
                        <Typography variant="caption" color="error.main" fontWeight={600}>
                          {line.unavailableReason}
                        </Typography>
                      ) : (
                        <Typography variant="subtitle2" sx={{ mt: 0.5 }}>
                          {formatBDT(line.lineTotalPoisha)}
                        </Typography>
                      )}
                    </Box>

                    <Box sx={{ width: 116, flexShrink: 0 }}>
                      <AddToCartButton
                        productId={line.productId}
                        initialQty={line.qty}
                        minQty={line.minQty}
                        maxQty={line.maxQty}
                        size="small"
                        fullWidth
                      />
                    </Box>
                  </Stack>
                ))}
              </Stack>
            </CardContent>
          </Card>

          {quote.unavailableLines.length > 0 ? (
            <Alert severity="warning" sx={{ mt: 2 }}>
              Some items are unavailable and are not included in your total. Remove them to keep
              your cart tidy.
            </Alert>
          ) : null}

          <Button component={Link} href="/" sx={{ mt: 2 }}>
            ← Continue shopping
          </Button>
        </Grid>

        <Grid size={{ xs: 12, md: 5, lg: 4 }}>
          <Card sx={{ position: { md: 'sticky' }, top: 80 }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Order summary
              </Typography>

              {settings.pickupEnabled && settings.deliveryEnabled ? (
                <Box sx={{ mb: 2 }}>
                  <FulfillmentToggle value={fulfillmentType} />
                </Box>
              ) : null}

              {fulfillmentType === 'DELIVERY' ? (
                <Box sx={{ mb: 2 }}>
                  <ZonePicker
                    zones={zones}
                    value={zoneId ?? null}
                    helperText="Delivery charge depends on your area."
                  />
                </Box>
              ) : (
                <Alert severity="info" sx={{ mb: 2 }} icon={false}>
                  Collect from {store.name}
                  {store.area ? `, ${store.area}` : ''}. No delivery charge.
                </Alert>
              )}

              <OrderTotals quote={quote} fulfillmentType={fulfillmentType} />

              <Button
                component={Link}
                href={checkoutHref}
                variant="contained"
                size="large"
                fullWidth
                disabled={!canCheckout}
                sx={{ mt: 2.5 }}
              >
                {quote.meetsMinimum ? 'Continue to checkout' : `Add ${formatBDT(quote.amountToMinimumPoisha)} more`}
              </Button>

              {!canCheckout && quote.meetsMinimum ? (
                <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                  {quote.blockers[0]}
                </Typography>
              ) : null}

              {whatsappNumber && quote.lines.length > 0 ? (
                <>
                  <Divider sx={{ my: 2 }}>
                    <Typography variant="caption" color="text.secondary">
                      or
                    </Typography>
                  </Divider>
                  <Button
                    component="a"
                    href={whatsappHref(
                      whatsappNumber,
                      basketMessage({
                        storeName: store.name,
                        quote,
                        fulfillmentType,
                        zoneName: zones.find((zone) => zone.id === zoneId)?.name ?? null,
                        siteUrl: process.env.NEXT_PUBLIC_SITE_URL,
                      }),
                    )}
                    target="_blank"
                    rel="noopener noreferrer"
                    variant="outlined"
                    fullWidth
                    startIcon={<WhatsAppIcon />}
                    sx={{ borderColor: '#25D366', color: '#128C7E' }}
                  >
                    Send this order on WhatsApp
                  </Button>
                  <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
                    Your whole basket and total go to the shop as a message — useful if you would
                    rather confirm the details by chat.
                  </Typography>
                </>
              ) : null}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Container>
  );
}
