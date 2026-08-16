import Link from 'next/link';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Chip from '@mui/material/Chip';
import Divider from '@mui/material/Divider';
import Grid from '@mui/material/Grid2';
import Alert from '@mui/material/Alert';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import StorefrontIcon from '@mui/icons-material/Storefront';
import PlaceIcon from '@mui/icons-material/Place';
import CallIcon from '@mui/icons-material/Call';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import PaymentsIcon from '@mui/icons-material/Payments';

import SearchBar from '@/components/SearchBar';
import CategoryGrid from '@/components/CategoryGrid';
import ProductRail from '@/components/ProductRail';
import { LocalBusinessJsonLd } from '@/components/StructuredData';
import { getOpenState, requireStore, resolveSettings, dayLabel, formatTime } from '@/lib/store';
import { formatBDT } from '@/lib/money';
import { formatPhone } from '@/lib/auth';
import { whatsappLink } from '@/lib/notifications';
import {
  getCartQtyMap,
  getCategories,
  getDeliverySlots,
  getDeliveryZones,
  getFeaturedProducts,
  getFrequentlyPurchased,
  getOfferProducts,
  getPopularProducts,
} from '@/lib/catalog';

export default async function HomePage() {
  const store = await requireStore();
  const settings = resolveSettings(store);
  const openState = getOpenState(store);

  const [categories, popular, featured, offers, frequent, zones, slots, cartQty] = await Promise.all([
    getCategories(store.id),
    getPopularProducts(store.id),
    getFeaturedProducts(store.id),
    getOfferProducts(store.id),
    getFrequentlyPurchased(store.id),
    getDeliveryZones(store.id),
    getDeliverySlots(store.id),
    getCartQtyMap(),
  ]);

  return (
    <>
      <LocalBusinessJsonLd store={store} zoneNames={zones.map((zone) => zone.name)} />

      {/* 1 — Store information */}
      <Box
        component="section"
        sx={{
          background: 'linear-gradient(160deg, #0F7B4F 0%, #0A5C3A 100%)',
          color: 'common.white',
          pt: { xs: 3, md: 5 },
          pb: { xs: 4, md: 6 },
        }}
      >
        <Container>
          <Stack direction="row" spacing={1} sx={{ mb: 1.5 }} flexWrap="wrap" useFlexGap>
            <Chip
              size="small"
              icon={<AccessTimeIcon />}
              label={openState.isOpen ? 'Open now' : openState.nextOpenLabel ?? 'Closed today'}
              sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'inherit', '& .MuiChip-icon': { color: 'inherit' } }}
            />
            {store.area ? (
              <Chip
                size="small"
                icon={<PlaceIcon />}
                label={store.area}
                sx={{ bgcolor: 'rgba(255,255,255,0.16)', color: 'inherit', '& .MuiChip-icon': { color: 'inherit' } }}
              />
            ) : null}
          </Stack>

          <Typography variant="h1" component="h1" sx={{ maxWidth: 620 }}>
            Your local grocery store, now at your doorstep.
          </Typography>
          <Typography variant="body1" sx={{ mt: 1, opacity: 0.9, maxWidth: 560 }}>
            Order from {store.name} before you need it. We pack it at the shop and deliver to your
            home, or keep it ready for you to collect.
          </Typography>

          {/* 2 — Search */}
          <Box sx={{ mt: 3, maxWidth: 560 }}>
            <SearchBar autoFocus={false} />
          </Box>

          <Stack direction="row" spacing={2} sx={{ mt: 2.5 }} flexWrap="wrap" useFlexGap>
            <Stat label="Minimum order" value={formatBDT(settings.minOrderPoisha)} />
            {settings.freeDeliveryThresholdPoisha ? (
              <Stat label="Free delivery above" value={formatBDT(settings.freeDeliveryThresholdPoisha)} />
            ) : null}
            <Stat label="Ready in about" value={`${settings.prepTimeMinutes} min`} />
          </Stack>
        </Container>
      </Box>

      <Container sx={{ pt: 3 }}>
        {!openState.isOpen && settings.acceptOrdersWhenClosed ? (
          <Alert severity="info" sx={{ mb: 2 }}>
            The shop is closed right now, but you can still place your order — we will pack it when
            we open. {openState.nextOpenLabel ?? ''}
          </Alert>
        ) : null}

        {/* 3 — Grocery categories */}
        <Box component="section">
          <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
            <Typography variant="h2" component="h2">
              Shop by category
            </Typography>
            <Button component={Link} href="/categories" size="small">
              All categories
            </Button>
          </Stack>
          <CategoryGrid categories={categories.slice(0, 12)} />
        </Box>

        {/* 4 — Popular products */}
        <ProductRail
          title="Popular this week"
          subtitle="What the neighbourhood is buying"
          products={popular}
          cartQty={cartQty}
          priority
        />

        {/* 5 — Frequently purchased */}
        {frequent.length > 0 ? (
          <ProductRail
            title="You buy these often"
            subtitle="Straight from your past orders"
            products={frequent}
            cartQty={cartQty}
            href="/orders"
          />
        ) : (
          <ProductRail
            title="Everyday essentials"
            subtitle="The staples most homes keep stocked"
            products={featured}
            cartQty={cartQty}
          />
        )}

        {/* 6 — Offers */}
        {offers.length > 0 ? (
          <ProductRail title="Offers" subtitle="Discounted at the shop right now" products={offers} cartQty={cartQty} />
        ) : null}

        {/* 7 — How ordering works */}
        <Box component="section" sx={{ mt: 5 }}>
          <Typography variant="h2" component="h2" gutterBottom>
            How ordering works
          </Typography>
          <Grid container spacing={1.5}>
            {[
              { step: '1', title: 'Fill your basket', text: 'Search or browse categories and add what you need.' },
              { step: '2', title: 'Choose delivery or pickup', text: 'Pick your area and a time that suits you.' },
              { step: '3', title: 'We pack your order', text: `Usually ready in about ${settings.prepTimeMinutes} minutes.` },
              { step: '4', title: 'Pay on delivery', text: 'Cash when it arrives, or pay at the shop.' },
            ].map((item) => (
              <Grid key={item.step} size={{ xs: 6, md: 3 }}>
                <Card sx={{ height: '100%' }}>
                  <CardContent>
                    <Box
                      sx={{
                        width: 32,
                        height: 32,
                        borderRadius: '50%',
                        bgcolor: 'primary.light',
                        color: 'primary.dark',
                        display: 'grid',
                        placeItems: 'center',
                        fontWeight: 700,
                        mb: 1,
                      }}
                    >
                      {item.step}
                    </Box>
                    <Typography variant="subtitle2">{item.title}</Typography>
                    <Typography variant="body2" color="text.secondary">
                      {item.text}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Box>

        {/* 8 — Delivery information */}
        <Box component="section" sx={{ mt: 5 }}>
          <Typography variant="h2" component="h2" gutterBottom>
            Delivery information
          </Typography>
          <Grid container spacing={2}>
            <Grid size={{ xs: 12, md: 7 }}>
              <Card>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <DeliveryDiningIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Areas we deliver to
                    </Typography>
                  </Stack>

                  {zones.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      Delivery areas have not been set up yet.
                    </Typography>
                  ) : (
                    <Stack divider={<Divider flexItem />} spacing={1}>
                      {zones.map((zone) => (
                        <Stack
                          key={zone.id}
                          direction="row"
                          justifyContent="space-between"
                          alignItems="center"
                          spacing={1}
                        >
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {zone.name}
                              {zone.nameBn ? (
                                <Typography component="span" variant="caption" color="text.secondary">
                                  {' '}
                                  {zone.nameBn}
                                </Typography>
                              ) : null}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              About {zone.estimatedMinutes} min
                              {zone.minOrderPoisha
                                ? ` • Minimum ${formatBDT(zone.minOrderPoisha)}`
                                : ''}
                            </Typography>
                          </Box>
                          <Chip
                            size="small"
                            label={zone.deliveryFeePoisha === 0 ? 'Free' : formatBDT(zone.deliveryFeePoisha)}
                            color={zone.deliveryFeePoisha === 0 ? 'success' : 'default'}
                          />
                        </Stack>
                      ))}
                    </Stack>
                  )}

                  {settings.freeDeliveryThresholdPoisha ? (
                    <Alert severity="success" sx={{ mt: 2 }} icon={<DeliveryDiningIcon fontSize="inherit" />}>
                      Delivery is free on orders above{' '}
                      {formatBDT(settings.freeDeliveryThresholdPoisha)}.
                    </Alert>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>

            <Grid size={{ xs: 12, md: 5 }}>
              <Card sx={{ height: '100%' }}>
                <CardContent>
                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1.5 }}>
                    <AccessTimeIcon color="primary" />
                    <Typography variant="subtitle1" fontWeight={700}>
                      Delivery times
                    </Typography>
                  </Stack>

                  {slots.length === 0 ? (
                    <Typography variant="body2" color="text.secondary">
                      We deliver during shop hours.
                    </Typography>
                  ) : (
                    <Stack spacing={0.75}>
                      {slots.map((slot) => (
                        <Typography key={slot.id} variant="body2">
                          • {slot.label}
                        </Typography>
                      ))}
                    </Stack>
                  )}

                  <Divider sx={{ my: 1.5 }} />

                  <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                    <PaymentsIcon color="primary" fontSize="small" />
                    <Typography variant="subtitle2">Payment</Typography>
                  </Stack>
                  <Typography variant="body2" color="text.secondary">
                    Cash on delivery, or pay at the shop when you collect. No advance payment
                    needed.
                  </Typography>

                  {settings.pickupEnabled ? (
                    <>
                      <Divider sx={{ my: 1.5 }} />
                      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 1 }}>
                        <StorefrontIcon color="primary" fontSize="small" />
                        <Typography variant="subtitle2">Store pickup</Typography>
                      </Stack>
                      <Typography variant="body2" color="text.secondary">
                        Order now and collect from the shop — no delivery charge.
                      </Typography>
                    </>
                  ) : null}
                </CardContent>
              </Card>
            </Grid>
          </Grid>
        </Box>

        {/* 9 — Store location */}
        <Box component="section" sx={{ mt: 5 }}>
          <Typography variant="h2" component="h2" gutterBottom>
            Find the shop
          </Typography>
          <Card>
            <CardContent>
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, md: 6 }}>
                  <Stack direction="row" spacing={1.5}>
                    <PlaceIcon color="primary" />
                    <Box>
                      <Typography variant="subtitle2">{store.name}</Typography>
                      <Typography variant="body2" color="text.secondary">
                        {[store.addressLine, store.area, store.district].filter(Boolean).join(', ') ||
                          'Address not added yet.'}
                      </Typography>
                      {store.mapUrl ? (
                        <Button
                          component="a"
                          href={store.mapUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          size="small"
                          sx={{ mt: 1, px: 0 }}
                        >
                          Open in Maps
                        </Button>
                      ) : null}
                    </Box>
                  </Stack>
                </Grid>

                <Grid size={{ xs: 12, md: 6 }}>
                  <Typography variant="subtitle2" gutterBottom>
                    Opening hours
                  </Typography>
                  <Stack spacing={0.25}>
                    {store.hours.map((hour) => (
                      <Stack key={hour.dayOfWeek} direction="row" justifyContent="space-between" sx={{ maxWidth: 280 }}>
                        <Typography variant="body2" color="text.secondary">
                          {dayLabel(hour.dayOfWeek)}
                        </Typography>
                        <Typography variant="body2">
                          {hour.isClosed ? 'Closed' : `${formatTime(hour.opensAt)} – ${formatTime(hour.closesAt)}`}
                        </Typography>
                      </Stack>
                    ))}
                  </Stack>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Box>

        {/* 10 — Contact / order support */}
        <Box component="section" sx={{ mt: 5, mb: 2 }}>
          <Card sx={{ bgcolor: 'primary.light', borderColor: 'primary.main' }}>
            <CardContent>
              <Typography variant="h3" component="h2" gutterBottom>
                Need help with an order?
              </Typography>
              <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
                Call or message the shop directly — someone is there during opening hours.
              </Typography>

              <Stack direction="row" spacing={1.5} flexWrap="wrap" useFlexGap>
                {store.phone ? (
                  <Button variant="contained" href={`tel:${store.phone}`} startIcon={<CallIcon />}>
                    {formatPhone(store.phone)}
                  </Button>
                ) : null}
                {store.whatsapp ? (
                  <Button
                    variant="outlined"
                    href={whatsappLink(store.whatsapp, `Hello ${store.name}, I need help with my grocery order.`)}
                    target="_blank"
                    rel="noopener noreferrer"
                    startIcon={<WhatsAppIcon />}
                  >
                    WhatsApp
                  </Button>
                ) : null}
                <Button component={Link} href="/orders" variant="text">
                  Track an order
                </Button>
              </Stack>
            </CardContent>
          </Card>
        </Box>
      </Container>
    </>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <Box>
      <Typography variant="caption" sx={{ opacity: 0.8, display: 'block' }}>
        {label}
      </Typography>
      <Typography variant="subtitle1" fontWeight={700}>
        {value}
      </Typography>
    </Box>
  );
}
