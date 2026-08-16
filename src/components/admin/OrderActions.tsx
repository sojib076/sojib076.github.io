'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Stack from '@mui/material/Stack';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import type { OrderStatus } from '@/lib/db/types';
import {
  assignDeliveryAction,
  saveOrderNoteAction,
  updateOrderStatusAction,
} from '@/app/actions/admin';

const LABELS: Record<OrderStatus, string> = {
  PENDING: 'Pending',
  CONFIRMED: 'Confirm order',
  PREPARING: 'Start packing',
  READY: 'Mark ready',
  OUT_FOR_DELIVERY: 'Send out for delivery',
  DELIVERED: 'Mark delivered',
  CANCELLED: 'Cancel order',
};

/**
 * The shop's control panel for one order. Status moves one step at a time, in
 * the order the work actually happens — so nobody marks an unpacked order as
 * delivered by mis-tapping a dropdown.
 */
export default function OrderActions({
  orderId,
  nextStatuses,
  adminNote,
  assignedTo,
}: {
  orderId: string;
  nextStatuses: OrderStatus[];
  adminNote: string | null;
  assignedTo: string | null;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'success' | 'error'>('success');
  const [cancelOpen, setCancelOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [note, setNote] = useState(adminNote ?? '');
  const [assignee, setAssignee] = useState(assignedTo ?? '');

  function run(work: () => Promise<{ ok?: boolean; error?: string; message?: string }>) {
    startTransition(async () => {
      const result = await work();
      setSeverity(result.error ? 'error' : 'success');
      setMessage(result.error ?? result.message ?? 'Saved.');
      if (!result.error) router.refresh();
    });
  }

  return (
    <>
      <Stack spacing={1}>
        {nextStatuses.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            This order is finished — no further changes.
          </Typography>
        ) : null}

        {nextStatuses.map((status) =>
          status === 'CANCELLED' ? (
            <Button
              key={status}
              variant="outlined"
              color="error"
              disabled={pending}
              onClick={() => setCancelOpen(true)}
            >
              {LABELS[status]}
            </Button>
          ) : (
            <Button
              key={status}
              variant="contained"
              disabled={pending}
              onClick={() => run(() => updateOrderStatusAction(orderId, status))}
            >
              {LABELS[status]}
            </Button>
          ),
        )}
      </Stack>

      <Stack spacing={1.5} sx={{ mt: 2.5 }}>
        <TextField
          label="Assign delivery to"
          placeholder="Rider name or phone"
          value={assignee}
          onChange={(event) => setAssignee(event.target.value)}
          fullWidth
        />
        <Button
          size="small"
          variant="outlined"
          disabled={pending}
          onClick={() => run(() => assignDeliveryAction(orderId, assignee))}
        >
          Save assignment
        </Button>

        <TextField
          label="Internal note"
          placeholder="Only staff can see this"
          value={note}
          onChange={(event) => setNote(event.target.value)}
          multiline
          minRows={2}
          fullWidth
        />
        <Button
          size="small"
          variant="outlined"
          disabled={pending}
          onClick={() => run(() => saveOrderNoteAction(orderId, note))}
        >
          Save note
        </Button>
      </Stack>

      <Dialog open={cancelOpen} onClose={() => setCancelOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>Cancel this order?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            The customer is told the order was cancelled, and any counted stock goes back on the
            shelf.
          </Typography>
          <TextField
            label="Reason (sent to the customer)"
            value={cancelReason}
            onChange={(event) => setCancelReason(event.target.value)}
            autoFocus
            fullWidth
            multiline
            minRows={2}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)}>Keep order</Button>
          <Button
            color="error"
            variant="contained"
            disabled={pending}
            onClick={() => {
              setCancelOpen(false);
              run(() => updateOrderStatusAction(orderId, 'CANCELLED', cancelReason));
            }}
          >
            Cancel order
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
