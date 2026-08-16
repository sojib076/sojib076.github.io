'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Button from '@mui/material/Button';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ReplayIcon from '@mui/icons-material/Replay';
import { reorderAction } from '@/app/actions/cart';

/**
 * "Order again" is the feature that turns a grocery site into a habit, so it
 * is one tap — but it never lies about what it added. Removed or out-of-stock
 * items and price changes are reported straight back to the shopper.
 */
export default function ReorderButton({
  orderId,
  variant = 'outlined',
  fullWidth = false,
  label = 'Order again',
}: {
  orderId: string;
  variant?: 'text' | 'outlined' | 'contained';
  fullWidth?: boolean;
  label?: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'success' | 'warning'>('success');

  function run() {
    startTransition(async () => {
      const result = await reorderAction(orderId);
      if (result.ok) {
        setSeverity('success');
        setMessage(result.message ?? 'Added to your cart.');
        router.refresh();
      } else {
        setSeverity('warning');
        setMessage(result.error ?? 'Could not add these items.');
      }
    });
  }

  return (
    <>
      <Button
        variant={variant}
        fullWidth={fullWidth}
        startIcon={<ReplayIcon />}
        onClick={run}
        disabled={pending}
      >
        {pending ? 'Adding…' : label}
      </Button>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={6000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity={severity}
          variant="filled"
          onClose={() => setMessage(null)}
          action={
            severity === 'success' ? (
              <Button color="inherit" size="small" onClick={() => router.push('/cart')}>
                View cart
              </Button>
            ) : undefined
          }
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
