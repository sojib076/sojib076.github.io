'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import Card from '@mui/material/Card';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import TextField from '@mui/material/TextField';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import Chip from '@mui/material/Chip';
import InputAdornment from '@mui/material/InputAdornment';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import {
  deleteSlotAction,
  deleteZoneAction,
  saveSlotAction,
  saveZoneAction,
} from '@/app/actions/admin';

export type AdminZone = {
  id: string;
  name: string;
  nameBn: string | null;
  deliveryFee: string;
  minOrder: string;
  freeDeliveryThreshold: string;
  estimatedMinutes: number;
  isActive: boolean;
  sortOrder: number;
  orderCount: number;
};

export type AdminSlot = {
  id: string;
  label: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  sortOrder: number;
};

const EMPTY_ZONE: AdminZone = {
  id: '',
  name: '',
  nameBn: '',
  deliveryFee: '',
  minOrder: '',
  freeDeliveryThreshold: '',
  estimatedMinutes: 60,
  isActive: true,
  sortOrder: 0,
  orderCount: 0,
};

const EMPTY_SLOT: AdminSlot = {
  id: '',
  label: '',
  startTime: '09:00',
  endTime: '12:00',
  isActive: true,
  sortOrder: 0,
};

function useReporter() {
  const router = useRouter();
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  function report(result: { error?: string; message?: string }) {
    setSeverity(result.error ? 'error' : 'success');
    setMessage(result.error ?? result.message ?? 'Saved.');
    if (!result.error) router.refresh();
    return !result.error;
  }

  const toast = (
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
  );

  return { report, toast };
}

/**
 * Delivery areas and their charges — the settings that decide what a customer
 * pays. Blank per-area fields fall back to the store-wide values.
 */
export function ZoneManager({ zones }: { zones: AdminZone[] }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_ZONE);
  const { report, toast } = useReporter();

  function save() {
    const formData = new FormData();
    formData.set('name', draft.name);
    formData.set('nameBn', draft.nameBn ?? '');
    formData.set('deliveryFee', draft.deliveryFee);
    formData.set('minOrder', draft.minOrder);
    formData.set('freeDeliveryThreshold', draft.freeDeliveryThreshold);
    formData.set('estimatedMinutes', String(draft.estimatedMinutes));
    formData.set('sortOrder', String(draft.sortOrder));
    if (draft.isActive) formData.set('isActive', 'on');

    startTransition(async () => {
      const result = await saveZoneAction(draft.id || null, {}, formData);
      if (report(result)) setOpen(false);
    });
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h2" component="h2">
          Delivery areas
        </Typography>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setDraft({ ...EMPTY_ZONE, sortOrder: zones.length });
            setOpen(true);
          }}
        >
          Add area
        </Button>
      </Stack>

      <Card sx={{ mb: 4 }}>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Area</TableCell>
                <TableCell align="right">Charge</TableCell>
                <TableCell align="right">Min order</TableCell>
                <TableCell align="right">Free above</TableCell>
                <TableCell align="right">Time</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {zones.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={7}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No delivery areas yet. Customers cannot choose delivery until you add one.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                zones.map((zone) => (
                  <TableRow key={zone.id} hover>
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
                    <TableCell align="right">৳{zone.deliveryFee}</TableCell>
                    <TableCell align="right">{zone.minOrder ? `৳${zone.minOrder}` : 'default'}</TableCell>
                    <TableCell align="right">
                      {zone.freeDeliveryThreshold ? `৳${zone.freeDeliveryThreshold}` : 'default'}
                    </TableCell>
                    <TableCell align="right">~{zone.estimatedMinutes}m</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={zone.isActive ? 'On' : 'Off'}
                        color={zone.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Edit ${zone.name}`}
                        onClick={() => {
                          setDraft(zone);
                          setOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={pending}
                        aria-label={`Delete ${zone.name}`}
                        onClick={() => startTransition(async () => void report(await deleteZoneAction(zone.id)))}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{draft.id ? 'Edit area' : 'Add delivery area'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Area name"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Joypara"
              autoFocus
              fullWidth
            />
            <TextField
              label="Bengali name"
              value={draft.nameBn ?? ''}
              onChange={(event) => setDraft({ ...draft, nameBn: event.target.value })}
              placeholder="জয়পাড়া"
              fullWidth
            />
            <TextField
              label="Delivery charge"
              value={draft.deliveryFee}
              onChange={(event) => setDraft({ ...draft, deliveryFee: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
              placeholder="30"
              fullWidth
            />
            <TextField
              label="Minimum order for this area"
              value={draft.minOrder}
              onChange={(event) => setDraft({ ...draft, minOrder: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
              helperText="Leave empty to use the store-wide minimum."
              fullWidth
            />
            <TextField
              label="Free delivery above"
              value={draft.freeDeliveryThreshold}
              onChange={(event) => setDraft({ ...draft, freeDeliveryThreshold: event.target.value })}
              InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
              helperText="Leave empty to use the store-wide threshold."
              fullWidth
            />
            <TextField
              label="Usual delivery time (minutes)"
              type="number"
              value={draft.estimatedMinutes}
              onChange={(event) => setDraft({ ...draft, estimatedMinutes: Number(event.target.value) })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.isActive}
                  onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                />
              }
              label="Delivering to this area"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {toast}
    </>
  );
}

/** Time windows customers can pick at checkout. */
export function SlotManager({ slots }: { slots: AdminSlot[] }) {
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY_SLOT);
  const { report, toast } = useReporter();

  function save() {
    const formData = new FormData();
    formData.set('label', draft.label);
    formData.set('startTime', draft.startTime);
    formData.set('endTime', draft.endTime);
    formData.set('sortOrder', String(draft.sortOrder));
    if (draft.isActive) formData.set('isActive', 'on');

    startTransition(async () => {
      const result = await saveSlotAction(draft.id || null, {}, formData);
      if (report(result)) setOpen(false);
    });
  }

  return (
    <>
      <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
        <Typography variant="h2" component="h2">
          Delivery time slots
        </Typography>
        <Button
          variant="outlined"
          startIcon={<AddIcon />}
          onClick={() => {
            setDraft({ ...EMPTY_SLOT, sortOrder: slots.length });
            setOpen(true);
          }}
        >
          Add slot
        </Button>
      </Stack>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Label</TableCell>
                <TableCell>From</TableCell>
                <TableCell>To</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {slots.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={5}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No slots — customers will just ask for delivery as soon as possible.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                slots.map((slot) => (
                  <TableRow key={slot.id} hover>
                    <TableCell>{slot.label}</TableCell>
                    <TableCell>{slot.startTime}</TableCell>
                    <TableCell>{slot.endTime}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={slot.isActive ? 'On' : 'Off'}
                        color={slot.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton
                        size="small"
                        aria-label={`Edit ${slot.label}`}
                        onClick={() => {
                          setDraft(slot);
                          setOpen(true);
                        }}
                      >
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={pending}
                        aria-label={`Delete ${slot.label}`}
                        onClick={() => startTransition(async () => void report(await deleteSlotAction(slot.id)))}
                      >
                        <DeleteOutlineIcon fontSize="small" />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </Box>
      </Card>

      <Dialog open={open} onClose={() => setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>{draft.id ? 'Edit slot' : 'Add time slot'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Label customers see"
              value={draft.label}
              onChange={(event) => setDraft({ ...draft, label: event.target.value })}
              placeholder="Morning (9am – 12pm)"
              autoFocus
              fullWidth
            />
            <Stack direction="row" spacing={2}>
              <TextField
                label="From"
                type="time"
                value={draft.startTime}
                onChange={(event) => setDraft({ ...draft, startTime: event.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
              <TextField
                label="To"
                type="time"
                value={draft.endTime}
                onChange={(event) => setDraft({ ...draft, endTime: event.target.value })}
                InputLabelProps={{ shrink: true }}
                fullWidth
              />
            </Stack>
            <FormControlLabel
              control={
                <Switch
                  checked={draft.isActive}
                  onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                />
              }
              label="Offer this slot"
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="contained" onClick={save} disabled={pending}>
            {pending ? 'Saving…' : 'Save'}
          </Button>
        </DialogActions>
      </Dialog>

      {toast}
    </>
  );
}
