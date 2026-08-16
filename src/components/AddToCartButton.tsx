'use client';

import { useState, useTransition } from 'react';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { addToCartAction, setCartQtyAction } from '@/app/actions/cart';

type Props = {
  productId: string;
  initialQty?: number;
  minQty?: number;
  maxQty?: number;
  disabled?: boolean;
  disabledLabel?: string;
  fullWidth?: boolean;
  size?: 'small' | 'medium' | 'large';
};

/**
 * One control that turns into a stepper once the item is in the cart.
 *
 * The quantity updates locally first so the button responds instantly on a
 * slow connection, while the server action re-prices the real cart behind it.
 */
export default function AddToCartButton({
  productId,
  initialQty = 0,
  minQty = 1,
  maxQty = 50,
  disabled = false,
  disabledLabel = 'Out of stock',
  fullWidth = false,
  size = 'medium',
}: Props) {
  const [qty, setQty] = useState(initialQty);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function commit(next: number) {
    const previous = qty;
    setQty(next);
    startTransition(async () => {
      const result = next === 0
        ? await setCartQtyAction(productId, 0)
        : await setCartQtyAction(productId, next);
      if (!result.ok) {
        setQty(previous);
        setError(result.error ?? 'Could not update your cart.');
      }
    });
  }

  function add() {
    const previous = qty;
    const next = Math.max(minQty, qty + 1);
    setQty(next);
    startTransition(async () => {
      const result = await addToCartAction(productId, next - previous);
      if (!result.ok) {
        setQty(previous);
        setError(result.error ?? 'Could not add this item.');
      }
    });
  }

  if (disabled) {
    return (
      <Button variant="outlined" color="inherit" size={size} fullWidth={fullWidth} disabled>
        {disabledLabel}
      </Button>
    );
  }

  if (qty <= 0) {
    return (
      <>
        <Button
          variant="contained"
          size={size}
          fullWidth={fullWidth}
          startIcon={<AddIcon />}
          onClick={add}
          disabled={pending}
        >
          Add
        </Button>
        <ErrorToast error={error} onClose={() => setError(null)} />
      </>
    );
  }

  const atMax = qty >= maxQty;

  return (
    <>
      <Stack
        direction="row"
        alignItems="center"
        justifyContent="space-between"
        sx={{
          border: 1,
          borderColor: 'primary.main',
          borderRadius: 2.5,
          bgcolor: 'primary.light',
          width: fullWidth ? '100%' : 'auto',
          minHeight: size === 'small' ? 36 : 44,
          px: 0.5,
        }}
      >
        <IconButton
          size="small"
          color="primary"
          aria-label={qty <= minQty ? 'Remove from cart' : 'Decrease quantity'}
          onClick={() => commit(qty <= minQty ? 0 : qty - 1)}
          disabled={pending}
        >
          {qty <= minQty ? <DeleteOutlineIcon fontSize="small" /> : <RemoveIcon fontSize="small" />}
        </IconButton>

        <Typography variant="subtitle2" color="primary.dark" sx={{ minWidth: 24, textAlign: 'center' }}>
          {qty}
        </Typography>

        <IconButton
          size="small"
          color="primary"
          aria-label="Increase quantity"
          onClick={() => commit(qty + 1)}
          disabled={pending || atMax}
        >
          <AddIcon fontSize="small" />
        </IconButton>
      </Stack>
      <ErrorToast error={error} onClose={() => setError(null)} />
    </>
  );
}

function ErrorToast({ error, onClose }: { error: string | null; onClose: () => void }) {
  return (
    <Snackbar
      open={Boolean(error)}
      autoHideDuration={4000}
      onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
    >
      <Alert severity="warning" variant="filled" onClose={onClose}>
        {error}
      </Alert>
    </Snackbar>
  );
}
