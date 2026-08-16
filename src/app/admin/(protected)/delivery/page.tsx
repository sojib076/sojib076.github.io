import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Alert from '@mui/material/Alert';
import { ZoneManager, SlotManager } from '@/components/admin/DeliveryManager';
import { listAdminSlots, listAdminZones } from '@/lib/admin';
import { requireStore, resolveSettings } from '@/lib/store';
import { formatBDT, poishaToTaka } from '@/lib/money';

/** Empty string means "inherit the store-wide value". */
function optionalTaka(poisha: number | null): string {
  return poisha == null ? '' : String(poishaToTaka(poisha));
}

export default async function AdminDeliveryPage() {
  const store = await requireStore();
  const settings = resolveSettings(store);

  const [zones, slots] = await Promise.all([listAdminZones(store.id), listAdminSlots(store.id)]);

  return (
    <Box>
      <Typography variant="h1" component="h1" gutterBottom>
        Delivery
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Store-wide defaults: minimum order {formatBDT(settings.minOrderPoisha)}, delivery{' '}
        {formatBDT(settings.defaultDeliveryFeePoisha)}
        {settings.freeDeliveryThresholdPoisha
          ? `, free above ${formatBDT(settings.freeDeliveryThresholdPoisha)}`
          : ''}
        . Areas below can override any of these.
      </Alert>

      <ZoneManager
        zones={zones.map((zone) => ({
          id: zone.id,
          name: zone.name,
          nameBn: zone.nameBn,
          deliveryFee: String(poishaToTaka(zone.deliveryFeePoisha)),
          minOrder: optionalTaka(zone.minOrderPoisha),
          freeDeliveryThreshold: optionalTaka(zone.freeDeliveryThresholdPoisha),
          estimatedMinutes: zone.estimatedMinutes,
          isActive: zone.isActive,
          sortOrder: zone.sortOrder,
          orderCount: zone.orderCount,
        }))}
      />

      <SlotManager
        slots={slots.map((slot) => ({
          id: slot.id,
          label: slot.label,
          startTime: slot.startTime,
          endTime: slot.endTime,
          isActive: slot.isActive,
          sortOrder: slot.sortOrder,
        }))}
      />
    </Box>
  );
}
