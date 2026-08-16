import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Chip from '@mui/material/Chip';
import Alert from '@mui/material/Alert';
import Box from '@mui/material/Box';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';

import { getDeliverySlots, getDeliveryZones } from '@/lib/catalog';
import { requireStore, resolveSettings, dayLabel, formatTime } from '@/lib/store';
import { formatBDT } from '@/lib/money';

export async function generateMetadata(): Promise<Metadata> {
  const store = await requireStore();
  const zones = await getDeliveryZones(store.id);
  const areas = zones.map((zone) => zone.name).join(', ');

  return {
    title: 'Delivery areas, charges and times',
    description: areas
      ? `${store.name} delivers groceries to ${areas}. See delivery charges, minimum order and delivery times.`
      : `Delivery charges, minimum order and delivery times for ${store.name}.`,
    alternates: { canonical: '/delivery' },
  };
}

export default async function DeliveryPage() {
  const store = await requireStore();
  const settings = resolveSettings(store);
  const [zones, slots] = await Promise.all([getDeliveryZones(store.id), getDeliverySlots(store.id)]);

  return (
    <Container sx={{ py: 3 }} maxWidth="md">
      <Typography variant="h1" component="h1" gutterBottom>
        Delivery information
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Everything about how {store.name} gets your groceries to you — charges, areas and timings.
        No hidden fees at the last step.
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h2" component="h2" gutterBottom>
            Delivery charges by area
          </Typography>

          {zones.length === 0 ? (
            <Typography color="text.secondary">Delivery areas have not been set up yet.</Typography>
          ) : (
            <Box sx={{ overflowX: 'auto' }}>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Area</TableCell>
                    <TableCell align="right">Delivery charge</TableCell>
                    <TableCell align="right">Minimum order</TableCell>
                    <TableCell align="right">Usual time</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {zones.map((zone) => (
                    <TableRow key={zone.id}>
                      <TableCell>
                        <Typography variant="body2" fontWeight={600}>
                          {zone.name}
                        </Typography>
                        {zone.nameBn ? (
                          <Typography variant="caption" color="text.secondary">
                            {zone.nameBn}
                          </Typography>
                        ) : null}
                      </TableCell>
                      <TableCell align="right">
                        {zone.deliveryFeePoisha === 0 ? (
                          <Chip size="small" color="success" label="Free" />
                        ) : (
                          formatBDT(zone.deliveryFeePoisha)
                        )}
                      </TableCell>
                      <TableCell align="right">
                        {formatBDT(zone.minOrderPoisha ?? settings.minOrderPoisha)}
                      </TableCell>
                      <TableCell align="right">~{zone.estimatedMinutes} min</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </Box>
          )}

          {settings.freeDeliveryThresholdPoisha ? (
            <Alert severity="success" sx={{ mt: 2 }}>
              Delivery is free on any order above {formatBDT(settings.freeDeliveryThresholdPoisha)}.
            </Alert>
          ) : null}
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h2" component="h2" gutterBottom>
            Delivery times
          </Typography>
          {slots.length === 0 ? (
            <Typography color="text.secondary">
              We deliver throughout shop opening hours.
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

          <Divider sx={{ my: 2 }} />

          <Typography variant="subtitle2" gutterBottom>
            Shop hours
          </Typography>
          <Stack spacing={0.25} sx={{ maxWidth: 320 }}>
            {store.hours.map((hour) => (
              <Stack key={hour.dayOfWeek} direction="row" justifyContent="space-between">
                <Typography variant="body2" color="text.secondary">
                  {dayLabel(hour.dayOfWeek)}
                </Typography>
                <Typography variant="body2">
                  {hour.isClosed ? 'Closed' : `${formatTime(hour.opensAt)} – ${formatTime(hour.closesAt)}`}
                </Typography>
              </Stack>
            ))}
          </Stack>
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h2" component="h2" gutterBottom>
            Ordering rules
          </Typography>
          <Stack spacing={1}>
            <Typography variant="body2">
              • Minimum order is {formatBDT(settings.minOrderPoisha)} (some areas may be higher).
            </Typography>
            <Typography variant="body2">
              • Orders are usually packed in about {settings.prepTimeMinutes} minutes.
            </Typography>
            <Typography variant="body2">
              • You can pre-order up to {settings.maxPreOrderDays} day
              {settings.maxPreOrderDays === 1 ? '' : 's'} ahead.
            </Typography>
            {settings.pickupEnabled ? (
              <Typography variant="body2">
                • Store pickup is free — order online and collect when it is ready.
              </Typography>
            ) : null}
            <Typography variant="body2">
              • Pay cash on delivery, or pay at the shop when you collect.
            </Typography>
          </Stack>
        </CardContent>
      </Card>
    </Container>
  );
}
