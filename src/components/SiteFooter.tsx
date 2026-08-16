import Link from 'next/link';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import Grid from '@mui/material/Grid2';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import { getStore, resolveSettings, dayLabel, formatTime } from '@/lib/store';
import { formatBDT } from '@/lib/money';
import { formatPhone } from '@/lib/auth';

export default async function SiteFooter() {
  const store = await getStore();
  if (!store) return null;
  const settings = resolveSettings(store);

  const addressParts = [store.addressLine, store.area, store.district].filter(Boolean);

  return (
    <Box component="footer" sx={{ mt: 6, bgcolor: 'primary.dark', color: 'common.white', pt: 4, pb: { xs: 10, md: 4 } }}>
      <Container>
        <Grid container spacing={3}>
          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="h4" gutterBottom>
              {store.name}
            </Typography>
            {store.nameBn ? (
              <Typography variant="body2" sx={{ opacity: 0.85 }} gutterBottom>
                {store.nameBn}
              </Typography>
            ) : null}
            {addressParts.length > 0 ? (
              <Typography variant="body2" sx={{ opacity: 0.85 }}>
                {addressParts.join(', ')}
              </Typography>
            ) : null}
            {store.phone ? (
              <Typography variant="body2" sx={{ mt: 1 }}>
                <Box component="a" href={`tel:${store.phone}`} sx={{ color: 'inherit' }}>
                  {formatPhone(store.phone)}
                </Box>
              </Typography>
            ) : null}
          </Grid>

          <Grid size={{ xs: 12, sm: 6, md: 4 }}>
            <Typography variant="subtitle2" gutterBottom>
              Ordering
            </Typography>
            <Stack spacing={0.5} sx={{ opacity: 0.85 }}>
              <Typography variant="body2">
                Minimum order {formatBDT(settings.minOrderPoisha)}
              </Typography>
              {settings.freeDeliveryThresholdPoisha ? (
                <Typography variant="body2">
                  Free delivery above {formatBDT(settings.freeDeliveryThresholdPoisha)}
                </Typography>
              ) : null}
              <Typography variant="body2">
                Usually packed in about {settings.prepTimeMinutes} minutes
              </Typography>
            </Stack>

            <Stack direction="row" spacing={2} sx={{ mt: 1.5 }}>
              <Link href="/delivery" style={{ color: 'inherit' }}>
                Delivery info
              </Link>
              <Link href="/categories" style={{ color: 'inherit' }}>
                Categories
              </Link>
            </Stack>
          </Grid>

          <Grid size={{ xs: 12, md: 4 }}>
            <Typography variant="subtitle2" gutterBottom>
              Store hours
            </Typography>
            <Stack spacing={0.25} sx={{ opacity: 0.85 }}>
              {store.hours.map((hour) => (
                <Stack key={hour.dayOfWeek} direction="row" justifyContent="space-between" sx={{ maxWidth: 260 }}>
                  <Typography variant="body2">{dayLabel(hour.dayOfWeek)}</Typography>
                  <Typography variant="body2">
                    {hour.isClosed
                      ? 'Closed'
                      : `${formatTime(hour.opensAt)} – ${formatTime(hour.closesAt)}`}
                  </Typography>
                </Stack>
              ))}
            </Stack>
          </Grid>
        </Grid>

        <Divider sx={{ my: 3, borderColor: 'rgba(255,255,255,0.2)' }} />

        <Stack
          direction={{ xs: 'column', sm: 'row' }}
          justifyContent="space-between"
          spacing={1}
          sx={{ opacity: 0.7 }}
        >
          <Typography variant="caption">
            © {new Date().getFullYear()} {store.name}. All rights reserved.
          </Typography>
          <Typography variant="caption">
            <Link href="/admin" style={{ color: 'inherit' }}>
              Store owner login
            </Link>
          </Typography>
        </Stack>
      </Container>
    </Box>
  );
}
