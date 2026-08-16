'use client';

import { useActionState } from 'react';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import FormControl from '@mui/material/FormControl';
import FormLabel from '@mui/material/FormLabel';
import RadioGroup from '@mui/material/RadioGroup';
import FormControlLabel from '@mui/material/FormControlLabel';
import Radio from '@mui/material/Radio';
import { placeOrderAction, type CheckoutState } from '@/app/actions/checkout';

export type SlotOption = { id: string; label: string };

type Props = {
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  zoneId: string | null;
  zoneName: string | null;
  slots: SlotOption[];
  /** ISO dates the shop will accept a pre-order for. */
  dateOptions: { value: string; label: string }[];
  defaults: { name: string; phone: string; addressLine: string; landmark: string };
  pickupEnabled: boolean;
  totalLabel: string;
  disabled: boolean;
  disabledReason?: string;
};

/**
 * Deliberately short. Name, phone, where it goes, when, and how they pay —
 * nothing else. Every extra field on a checkout form is an order that does not
 * get placed.
 */
export default function CheckoutForm({
  fulfillmentType,
  zoneId,
  zoneName,
  slots,
  dateOptions,
  defaults,
  pickupEnabled,
  totalLabel,
  disabled,
  disabledReason,
}: Props) {
  const [state, formAction, pending] = useActionState<CheckoutState, FormData>(placeOrderAction, {});
  const isDelivery = fulfillmentType === 'DELIVERY';

  return (
    <Box component="form" action={formAction}>
      <input type="hidden" name="fulfillmentType" value={fulfillmentType} />
      <input type="hidden" name="zoneId" value={zoneId ?? ''} />

      {state.error ? (
        <Alert severity="error" sx={{ mb: 2 }}>
          {state.error}
        </Alert>
      ) : null}

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h3" component="h2" gutterBottom>
            Your details
          </Typography>
          <Stack spacing={2}>
            <TextField
              name="customerName"
              label="Your name"
              required
              defaultValue={defaults.name}
              error={Boolean(state.fieldErrors?.customerName)}
              helperText={state.fieldErrors?.customerName}
              autoComplete="name"
              fullWidth
            />
            <TextField
              name="customerPhone"
              label="Mobile number"
              required
              defaultValue={defaults.phone}
              error={Boolean(state.fieldErrors?.customerPhone)}
              helperText={state.fieldErrors?.customerPhone ?? 'We call this number about your order.'}
              autoComplete="tel"
              inputProps={{ inputMode: 'numeric', maxLength: 14 }}
              placeholder="01XXXXXXXXX"
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h3" component="h2" gutterBottom>
            {isDelivery ? 'Delivery address' : 'Store pickup'}
          </Typography>

          {isDelivery ? (
            <Stack spacing={2}>
              <Alert severity="info" icon={false} sx={{ py: 0.5 }}>
                Area: <strong>{zoneName ?? 'not selected'}</strong> — change it in the summary if
                this is wrong.
              </Alert>
              <TextField
                name="addressLine"
                label="Full address"
                required
                multiline
                minRows={2}
                defaultValue={defaults.addressLine}
                error={Boolean(state.fieldErrors?.addressLine)}
                helperText={state.fieldErrors?.addressLine ?? 'House, road, and any details the delivery person needs.'}
                autoComplete="street-address"
                fullWidth
              />
              <TextField
                name="landmark"
                label="Landmark (optional)"
                defaultValue={defaults.landmark}
                placeholder="Beside the mosque, opposite the school…"
                fullWidth
              />
            </Stack>
          ) : (
            <Typography variant="body2" color="text.secondary">
              Collect your order from the shop. We will send a message when it is packed and ready.
              {pickupEnabled ? '' : ' Pickup is currently unavailable.'}
            </Typography>
          )}
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <Typography variant="h3" component="h2" gutterBottom>
            When do you want it?
          </Typography>
          <Stack spacing={2}>
            <TextField select name="scheduledDate" label="Day" defaultValue={dateOptions[0]?.value ?? ''} fullWidth>
              {dateOptions.map((option) => (
                <MenuItem key={option.value} value={option.value}>
                  {option.label}
                </MenuItem>
              ))}
            </TextField>

            {slots.length > 0 ? (
              <TextField select name="slotId" label="Preferred time" defaultValue="" fullWidth>
                <MenuItem value="">
                  <em>As soon as possible</em>
                </MenuItem>
                {slots.map((slot) => (
                  <MenuItem key={slot.id} value={slot.id}>
                    {slot.label}
                  </MenuItem>
                ))}
              </TextField>
            ) : null}

            <TextField
              name="customerNote"
              label="Order note (optional)"
              multiline
              minRows={2}
              placeholder="Please send small onions, call before delivery…"
              fullWidth
            />
          </Stack>
        </CardContent>
      </Card>

      <Card sx={{ mb: 2 }}>
        <CardContent>
          <FormControl>
            <FormLabel id="payment-label">
              <Typography variant="h3" component="span">
                Payment
              </Typography>
            </FormLabel>
            <RadioGroup
              aria-labelledby="payment-label"
              name="paymentMethod"
              defaultValue={isDelivery ? 'CASH_ON_DELIVERY' : 'PAY_AT_STORE'}
              sx={{ mt: 1 }}
            >
              {isDelivery ? (
                <FormControlLabel
                  value="CASH_ON_DELIVERY"
                  control={<Radio />}
                  label="Cash on delivery"
                />
              ) : null}
              <FormControlLabel value="PAY_AT_STORE" control={<Radio />} label="Pay at the store" />
            </RadioGroup>
          </FormControl>
          <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 1 }}>
            Online payment is not enabled yet — you pay when you receive your groceries.
          </Typography>
        </CardContent>
      </Card>

      <Button
        type="submit"
        variant="contained"
        size="large"
        fullWidth
        disabled={disabled || pending}
        sx={{ py: 1.5 }}
      >
        {pending ? 'Placing your order…' : `Place order • ${totalLabel}`}
      </Button>

      {disabled && disabledReason ? (
        <Typography variant="caption" color="error.main" sx={{ mt: 1, display: 'block' }}>
          {disabledReason}
        </Typography>
      ) : null}
    </Box>
  );
}
