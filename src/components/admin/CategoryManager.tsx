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
import MenuItem from '@mui/material/MenuItem';
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
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutline';
import { deleteCategoryAction, saveCategoryAction } from '@/app/actions/admin';

export type AdminCategory = {
  id: string;
  name: string;
  nameBn: string | null;
  iconKey: string | null;
  sortOrder: number;
  isActive: boolean;
  productCount: number;
};

/** Keys map to the emoji used on the storefront category tiles. */
const ICON_KEYS = [
  'rice', 'dal', 'oil', 'spices', 'salt', 'snacks', 'beverages', 'dairy', 'eggs',
  'noodles', 'breakfast', 'frozen', 'household', 'personal', 'baby', 'meat',
  'vegetables', 'fruit', 'fish', 'default',
];

const EMPTY = { id: '', name: '', nameBn: '', iconKey: 'default', sortOrder: 0, isActive: true };

export default function CategoryManager({ categories }: { categories: AdminCategory[] }) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState(EMPTY);
  const [message, setMessage] = useState<string | null>(null);
  const [severity, setSeverity] = useState<'success' | 'error'>('success');

  function report(result: { error?: string; message?: string }) {
    setSeverity(result.error ? 'error' : 'success');
    setMessage(result.error ?? result.message ?? 'Saved.');
    if (!result.error) router.refresh();
  }

  function edit(category: AdminCategory) {
    setDraft({
      id: category.id,
      name: category.name,
      nameBn: category.nameBn ?? '',
      iconKey: category.iconKey ?? 'default',
      sortOrder: category.sortOrder,
      isActive: category.isActive,
    });
    setOpen(true);
  }

  function save() {
    const formData = new FormData();
    formData.set('name', draft.name);
    formData.set('nameBn', draft.nameBn);
    formData.set('iconKey', draft.iconKey);
    formData.set('sortOrder', String(draft.sortOrder));
    if (draft.isActive) formData.set('isActive', 'on');

    startTransition(async () => {
      const result = await saveCategoryAction(draft.id || null, {}, formData);
      report(result);
      if (!result.error) setOpen(false);
    });
  }

  return (
    <>
      <Stack direction="row" justifyContent="flex-end" sx={{ mb: 2 }}>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={() => {
            setDraft({ ...EMPTY, sortOrder: categories.length });
            setOpen(true);
          }}
        >
          Add category
        </Button>
      </Stack>

      <Card>
        <Box sx={{ overflowX: 'auto' }}>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Order</TableCell>
                <TableCell>Name</TableCell>
                <TableCell>Bengali</TableCell>
                <TableCell align="right">Products</TableCell>
                <TableCell>Status</TableCell>
                <TableCell align="right" />
              </TableRow>
            </TableHead>
            <TableBody>
              {categories.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={6}>
                    <Typography variant="body2" color="text.secondary" sx={{ py: 2 }}>
                      No categories yet. Add Rice &amp; Grains, Oil, Dal and so on to match your
                      shelves.
                    </Typography>
                  </TableCell>
                </TableRow>
              ) : (
                categories.map((category) => (
                  <TableRow key={category.id} hover>
                    <TableCell>{category.sortOrder}</TableCell>
                    <TableCell>
                      <Typography variant="body2" fontWeight={600}>
                        {category.name}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" color="text.secondary">
                        {category.nameBn ?? '—'}
                      </Typography>
                    </TableCell>
                    <TableCell align="right">{category.productCount}</TableCell>
                    <TableCell>
                      <Chip
                        size="small"
                        label={category.isActive ? 'Visible' : 'Hidden'}
                        color={category.isActive ? 'success' : 'default'}
                      />
                    </TableCell>
                    <TableCell align="right">
                      <IconButton size="small" onClick={() => edit(category)} aria-label={`Edit ${category.name}`}>
                        <EditIcon fontSize="small" />
                      </IconButton>
                      <IconButton
                        size="small"
                        color="error"
                        disabled={pending}
                        aria-label={`Delete ${category.name}`}
                        onClick={() =>
                          startTransition(async () => report(await deleteCategoryAction(category.id)))
                        }
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
        <DialogTitle>{draft.id ? 'Edit category' : 'Add category'}</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ mt: 1 }}>
            <TextField
              label="Name (English)"
              value={draft.name}
              onChange={(event) => setDraft({ ...draft, name: event.target.value })}
              placeholder="Rice & Grains"
              autoFocus
              fullWidth
            />
            <TextField
              label="Bengali name"
              value={draft.nameBn}
              onChange={(event) => setDraft({ ...draft, nameBn: event.target.value })}
              placeholder="চাল ও শস্য"
              fullWidth
            />
            <TextField
              select
              label="Icon"
              value={draft.iconKey}
              onChange={(event) => setDraft({ ...draft, iconKey: event.target.value })}
              fullWidth
            >
              {ICON_KEYS.map((key) => (
                <MenuItem key={key} value={key}>
                  {key}
                </MenuItem>
              ))}
            </TextField>
            <TextField
              label="Sort order"
              type="number"
              value={draft.sortOrder}
              onChange={(event) => setDraft({ ...draft, sortOrder: Number(event.target.value) })}
              fullWidth
            />
            <FormControlLabel
              control={
                <Switch
                  checked={draft.isActive}
                  onChange={(event) => setDraft({ ...draft, isActive: event.target.checked })}
                />
              }
              label="Visible in the shop"
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
