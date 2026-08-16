import Box from '@mui/material/Box';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import {
  OrderRulesForm,
  StoreHoursForm,
  StoreProfileForm,
} from '@/components/admin/SettingsForms';
import { requireStore, resolveSettings, dayLabel } from '@/lib/store';
import { poishaToTaka } from '@/lib/money';

export default async function AdminSettingsPage() {
  const store = await requireStore();
  const settings = resolveSettings(store);

  const hours = Array.from({ length: 7 }, (_, day) => {
    const existing = store.hours.find((hour) => hour.dayOfWeek === day);
    return {
      dayOfWeek: day,
      label: dayLabel(day),
      opensAt: existing?.opensAt ?? '08:00',
      closesAt: existing?.closesAt ?? '22:00',
      isClosed: existing?.isClosed ?? false,
    };
  });

  return (
    <Box>
      <Typography variant="h1" component="h1" gutterBottom>
        Settings
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h2" component="h2" gutterBottom>
            Ordering rules
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            These values drive every total the customer sees. Nothing here is fixed in the code.
          </Typography>

          <OrderRulesForm
            values={{
              minOrder: String(poishaToTaka(settings.minOrderPoisha)),
              defaultDeliveryFee: String(poishaToTaka(settings.defaultDeliveryFeePoisha)),
              freeDeliveryThreshold:
                settings.freeDeliveryThresholdPoisha != null
                  ? String(poishaToTaka(settings.freeDeliveryThresholdPoisha))
                  : '',
              deliveryEnabled: settings.deliveryEnabled,
              pickupEnabled: settings.pickupEnabled,
              acceptOrdersWhenClosed: settings.acceptOrdersWhenClosed,
              prepTimeMinutes: settings.prepTimeMinutes,
              maxPreOrderDays: settings.maxPreOrderDays,
              lowStockThreshold: settings.lowStockThreshold,
              orderNumberPrefix: settings.orderNumberPrefix,
              notifyPhone: settings.notifyPhone ?? '',
              notifyWhatsapp: settings.notifyWhatsapp ?? '',
              notifyEmail: settings.notifyEmail ?? '',
            }}
          />
        </CardContent>
      </Card>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Typography variant="h2" component="h2" gutterBottom>
            Store details
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Shown on the homepage and given to search engines. Leave anything you are unsure of
            empty rather than approximate.
          </Typography>

          <StoreProfileForm
            values={{
              name: store.name,
              nameBn: store.nameBn ?? '',
              description: store.description ?? '',
              phone: store.phone ?? '',
              whatsapp: store.whatsapp ?? '',
              email: store.email ?? '',
              addressLine: store.addressLine ?? '',
              area: store.area ?? '',
              city: store.city ?? '',
              district: store.district ?? '',
              postcode: store.postcode ?? '',
              mapUrl: store.mapUrl ?? '',
              latitude: store.latitude != null ? String(store.latitude) : '',
              longitude: store.longitude != null ? String(store.longitude) : '',
            }}
          />
        </CardContent>
      </Card>

      <Card>
        <CardContent>
          <Typography variant="h2" component="h2" gutterBottom>
            Opening hours
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            Customers see “Open now” or the next opening time based on this.
          </Typography>

          <StoreHoursForm hours={hours} />
        </CardContent>
      </Card>
    </Box>
  );
}
