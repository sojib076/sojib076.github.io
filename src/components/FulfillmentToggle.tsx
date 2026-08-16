'use client';

import { useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import ToggleButton from '@mui/material/ToggleButton';
import ToggleButtonGroup from '@mui/material/ToggleButtonGroup';
import DeliveryDiningIcon from '@mui/icons-material/DeliveryDining';
import StorefrontIcon from '@mui/icons-material/Storefront';

/** Delivery vs pickup, kept in the URL so the server prices the right one. */
export default function FulfillmentToggle({ value }: { value: 'DELIVERY' | 'PICKUP' }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [pending, startTransition] = useTransition();

  function change(next: 'DELIVERY' | 'PICKUP' | null) {
    if (!next) return;
    const params = new URLSearchParams(searchParams.toString());
    if (next === 'PICKUP') params.set('mode', 'pickup');
    else params.delete('mode');
    startTransition(() => router.replace(`${pathname}?${params.toString()}`, { scroll: false }));
  }

  return (
    <ToggleButtonGroup
      exclusive
      fullWidth
      size="small"
      color="primary"
      value={value}
      disabled={pending}
      onChange={(_, next) => change(next)}
    >
      <ToggleButton value="DELIVERY">
        <DeliveryDiningIcon fontSize="small" sx={{ mr: 0.75 }} />
        Delivery
      </ToggleButton>
      <ToggleButton value="PICKUP">
        <StorefrontIcon fontSize="small" sx={{ mr: 0.75 }} />
        Pickup
      </ToggleButton>
    </ToggleButtonGroup>
  );
}
