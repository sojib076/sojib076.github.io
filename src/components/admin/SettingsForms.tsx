'use client';

import { useActionState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Switch from '@mui/material/Switch';
import FormControlLabel from '@mui/material/FormControlLabel';
import InputAdornment from '@mui/material/InputAdornment';
import Typography from '@mui/material/Typography';
import Grid from '@mui/material/Grid2';
import {
  saveStoreHoursAction,
  saveStoreProfileAction,
  saveStoreSettingsAction,
  type AdminState,
} from '@/app/actions/admin';

function Feedback({ state }: { state: AdminState }) {
  if (state.error) return <Alert severity="error" sx={{ mb: 2 }}>{state.error}</Alert>;
  if (state.message) return <Alert severity="success" sx={{ mb: 2 }}>{state.message}</Alert>;
  return null;
}

export type StoreProfileValues = {
  name: string;
  nameBn: string;
  description: string;
  phone: string;
  whatsapp: string;
  email: string;
  addressLine: string;
  area: string;
  city: string;
  district: string;
  postcode: string;
  mapUrl: string;
  latitude: string;
  longitude: string;
};

/**
 * The shop's own details. These feed the homepage, the footer and the
 * local-business structured data, so what is typed here is what search engines
 * are told — leave a field blank rather than guessing at it.
 */
export function StoreProfileForm({ values }: { values: StoreProfileValues }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    saveStoreProfileAction,
    {},
  );

  return (
    <Box component="form" action={formAction}>
      <Feedback state={state} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField name="name" label="Store name" defaultValue={values.name} required fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 6 }}>
          <TextField name="nameBn" label="Bengali name" defaultValue={values.nameBn} fullWidth />
        </Grid>
        <Grid size={12}>
          <TextField
            name="description"
            label="Short description"
            defaultValue={values.description}
            multiline
            minRows={2}
            fullWidth
            helperText="Used as the site description in search results."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField name="phone" label="Phone" defaultValue={values.phone} fullWidth placeholder="01XXXXXXXXX" />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField name="whatsapp" label="WhatsApp" defaultValue={values.whatsapp} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField name="email" label="Email" defaultValue={values.email} fullWidth />
        </Grid>

        <Grid size={12}>
          <TextField name="addressLine" label="Street address" defaultValue={values.addressLine} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField name="area" label="Area" defaultValue={values.area} fullWidth placeholder="Joypara" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField name="city" label="City / upazila" defaultValue={values.city} fullWidth placeholder="Dohar" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField name="district" label="District" defaultValue={values.district} fullWidth placeholder="Dhaka" />
        </Grid>
        <Grid size={{ xs: 12, sm: 3 }}>
          <TextField name="postcode" label="Postcode" defaultValue={values.postcode} fullWidth />
        </Grid>

        <Grid size={12}>
          <TextField
            name="mapUrl"
            label="Google Maps link"
            defaultValue={values.mapUrl}
            fullWidth
            helperText="Shown as “Open in Maps” on the homepage."
          />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField name="latitude" label="Latitude" defaultValue={values.latitude} fullWidth />
        </Grid>
        <Grid size={{ xs: 6, sm: 3 }}>
          <TextField name="longitude" label="Longitude" defaultValue={values.longitude} fullWidth />
        </Grid>
      </Grid>

      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={pending}>
        {pending ? 'Saving…' : 'Save store details'}
      </Button>
    </Box>
  );
}

export type OrderRulesValues = {
  minOrder: string;
  defaultDeliveryFee: string;
  freeDeliveryThreshold: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  acceptOrdersWhenClosed: boolean;
  prepTimeMinutes: number;
  maxPreOrderDays: number;
  lowStockThreshold: number;
  orderNumberPrefix: string;
  notifyPhone: string;
  notifyWhatsapp: string;
  notifyEmail: string;
};

/** The commercial rules. Changing these changes every price shown on the site. */
export function OrderRulesForm({ values }: { values: OrderRulesValues }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(
    saveStoreSettingsAction,
    {},
  );

  return (
    <Box component="form" action={formAction}>
      <Feedback state={state} />

      <Grid container spacing={2}>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="minOrder"
            label="Minimum order"
            defaultValue={values.minOrder}
            required
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="defaultDeliveryFee"
            label="Default delivery fee"
            defaultValue={values.defaultDeliveryFee}
            required
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
            helperText="Used when an area has no fee of its own."
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="freeDeliveryThreshold"
            label="Free delivery above"
            defaultValue={values.freeDeliveryThreshold}
            fullWidth
            InputProps={{ startAdornment: <InputAdornment position="start">৳</InputAdornment> }}
            helperText="Empty switches free delivery off."
          />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="prepTimeMinutes"
            label="Preparation time (minutes)"
            type="number"
            defaultValue={values.prepTimeMinutes}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="maxPreOrderDays"
            label="Pre-order days ahead"
            type="number"
            defaultValue={values.maxPreOrderDays}
            fullWidth
          />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="lowStockThreshold"
            label="Low stock warning at"
            type="number"
            defaultValue={values.lowStockThreshold}
            fullWidth
          />
        </Grid>

        <Grid size={12}>
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
            <FormControlLabel
              control={<Switch name="deliveryEnabled" defaultChecked={values.deliveryEnabled} />}
              label="Accept delivery orders"
            />
            <FormControlLabel
              control={<Switch name="pickupEnabled" defaultChecked={values.pickupEnabled} />}
              label="Allow store pickup"
            />
            <FormControlLabel
              control={
                <Switch name="acceptOrdersWhenClosed" defaultChecked={values.acceptOrdersWhenClosed} />
              }
              label="Take orders while closed"
            />
          </Stack>
        </Grid>

        <Grid size={12}>
          <Typography variant="subtitle2" sx={{ mt: 1 }}>
            New-order alerts
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Where the shop is told about a new order. Leave blank to skip a channel.
          </Typography>
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField name="notifyPhone" label="SMS to" defaultValue={values.notifyPhone} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField name="notifyWhatsapp" label="WhatsApp to" defaultValue={values.notifyWhatsapp} fullWidth />
        </Grid>
        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField name="notifyEmail" label="Email to" defaultValue={values.notifyEmail} fullWidth />
        </Grid>

        <Grid size={{ xs: 12, sm: 4 }}>
          <TextField
            name="orderNumberPrefix"
            label="Order number prefix"
            defaultValue={values.orderNumberPrefix}
            fullWidth
            helperText="e.g. SS gives SS-260815-001"
          />
        </Grid>
      </Grid>

      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={pending}>
        {pending ? 'Saving…' : 'Save ordering rules'}
      </Button>
    </Box>
  );
}

export type HourValues = {
  dayOfWeek: number;
  label: string;
  opensAt: string;
  closesAt: string;
  isClosed: boolean;
};

export function StoreHoursForm({ hours }: { hours: HourValues[] }) {
  const [state, formAction, pending] = useActionState<AdminState, FormData>(saveStoreHoursAction, {});

  return (
    <Box component="form" action={formAction}>
      <Feedback state={state} />

      <Stack spacing={1.5}>
        {hours.map((hour) => (
          <Stack
            key={hour.dayOfWeek}
            direction={{ xs: 'column', sm: 'row' }}
            spacing={1.5}
            alignItems={{ sm: 'center' }}
          >
            <Typography variant="body2" sx={{ width: 100, fontWeight: 600 }}>
              {hour.label}
            </Typography>
            <TextField
              name={`opensAt-${hour.dayOfWeek}`}
              type="time"
              label="Opens"
              defaultValue={hour.opensAt}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
            />
            <TextField
              name={`closesAt-${hour.dayOfWeek}`}
              type="time"
              label="Closes"
              defaultValue={hour.closesAt}
              InputLabelProps={{ shrink: true }}
              sx={{ width: 140 }}
            />
            <FormControlLabel
              control={<Switch name={`isClosed-${hour.dayOfWeek}`} defaultChecked={hour.isClosed} />}
              label="Closed"
            />
          </Stack>
        ))}
      </Stack>

      <Button type="submit" variant="contained" sx={{ mt: 2 }} disabled={pending}>
        {pending ? 'Saving…' : 'Save opening hours'}
      </Button>
    </Box>
  );
}
