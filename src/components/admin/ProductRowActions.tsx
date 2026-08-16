'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Switch from '@mui/material/Switch';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogContentText from '@mui/material/DialogContentText';
import DialogActions from '@mui/material/DialogActions';
import Button from '@mui/material/Button';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import CheckIcon from '@mui/icons-material/Check';
import {
  deleteProductAction,
  toggleProductAvailabilityAction,
  updateProductPriceAction,
} from '@/app/actions/admin';

/**
 * Inline controls on the product list.
 *
 * Marking something out of stock and changing a price are the two things a
 * grocery owner does daily — they should not require opening a form.
 */
export default function ProductRowActions({
  productId,
  productName,
  isAvailable,
  price,
}: {
  productId: string;
  productName: string;
  isAvailable: boolean;
  price: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [available, setAvailable] = useState(isAvailable);
  const [priceValue, setPriceValue] = useState(price);
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [confirmOpen, setConfirmOpen] = useState(false);

  function report(result: { ok?: boolean; error?: string; message?: string }) {
    setSeverity(result.error ? 'error' : 'success');
    setMessage(result.error ?? result.message ?? 'Saved.');
    if (!result.error) router.refresh();
  }

  return (
    <>
      <Stack direction="row" spacing={1} alignItems="center" justifyContent="flex-end">
        <TextField
          size="small"
          value={priceValue}
          onChange={(event) => setPriceValue(event.target.value)}
          sx={{ width: 96 }}
          inputProps={{ inputMode: 'decimal', 'aria-label': `Price for ${productName}` }}
        />
        <Tooltip title="Save price">
          <span>
            <IconButton
              size="small"
              color="primary"
              disabled={pending || priceValue === price}
              onClick={() =>
                startTransition(async () => report(await updateProductPriceAction(productId, priceValue)))
              }
            >
              <CheckIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>

        <Tooltip title={available ? 'In stock' : 'Out of stock'}>
          <Switch
            size="small"
            checked={available}
            disabled={pending}
            inputProps={{ 'aria-label': `Availability for ${productName}` }}
            onChange={() => {
              setAvailable(!available);
              startTransition(async () => report(await toggleProductAvailabilityAction(productId)));
            }}
          />
        </Tooltip>

        <Tooltip title="Delete">
          <span>
            <IconButton size="small" color="error" disabled={pending} onClick={() => setConfirmOpen(true)}>
              <DeleteOutlineIcon fontSize="small" />
            </IconButton>
          </span>
        </Tooltip>
      </Stack>

      <Dialog open={confirmOpen} onClose={() => setConfirmOpen(false)}>
        <DialogTitle>Delete {productName}?</DialogTitle>
        <DialogContent>
          <DialogContentText>
            If this product appears on past orders it will be hidden from the shop instead of
            deleted, so old receipts stay correct.
          </DialogContentText>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setConfirmOpen(false)}>Keep</Button>
          <Button
            color="error"
            variant="contained"
            disabled={pending}
            onClick={() => {
              setConfirmOpen(false);
              startTransition(async () => report(await deleteProductAction(productId)));
            }}
          >
            Delete
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={4000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity={severity} variant="filled" onClose={() => setMessage(null)}>
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
