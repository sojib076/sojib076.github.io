'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useTransition } from 'react';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import { formatBDT } from '@/lib/money';

export type ZoneOption = {
  id: string;
  name: string;
  nameBn: string | null;
  deliveryFeePoisha: number;
  estimatedMinutes: number;
};

/**
 * Choosing an area re-prices the cart on the server through the URL, so the
 * delivery fee shown is always the one the order will actually be placed with.
 */
export default function ZonePicker({
  zones,
  value,
  label = 'Delivery area',
  helperText,
}: {
  zones: ZoneOption[];
  value: string | null;
  label?: string;
  helperText?: string;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function change(zoneId: string) {
    const params = new URLSearchParams(searchParams.toString());
    if (zoneId) params.set('zone', zoneId);
    else params.delete('zone');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <TextField
      select
      fullWidth
      label={label}
      value={value ?? ''}
      onChange={(event) => change(event.target.value)}
      disabled={pending}
      helperText={helperText}
    >
      <MenuItem value="">
        <em>Select your area</em>
      </MenuItem>
      {zones.map((zone) => (
        <MenuItem key={zone.id} value={zone.id}>
          {zone.name}
          {zone.nameBn ? ` (${zone.nameBn})` : ''} —{' '}
          {zone.deliveryFeePoisha === 0 ? 'Free' : formatBDT(zone.deliveryFeePoisha)}
        </MenuItem>
      ))}
    </TextField>
  );
}
