'use client';

import { useActionState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import Typography from '@mui/material/Typography';
import {
  requestOtpAction,
  verifyOtpAction,
  type OtpRequestState,
  type OtpVerifyState,
} from '@/app/actions/auth';

/**
 * Two steps, one screen. Phone number, then the code that was texted to it.
 * Passwords are a barrier for the shoppers this is built for; a phone number
 * is something they already know by heart.
 */
export default function PhoneLoginForm() {
  const [request, requestFormAction, requesting] = useActionState<OtpRequestState, FormData>(
    requestOtpAction,
    {},
  );
  const [verify, verifyFormAction, verifying] = useActionState<OtpVerifyState, FormData>(
    verifyOtpAction,
    {},
  );

  if (!request.sent) {
    return (
      <Stack component="form" action={requestFormAction} spacing={2}>
        {request.error ? <Alert severity="error">{request.error}</Alert> : null}

        <TextField
          name="phone"
          label="Mobile number"
          placeholder="01XXXXXXXXX"
          required
          autoFocus
          autoComplete="tel"
          inputProps={{ inputMode: 'numeric', maxLength: 14 }}
          fullWidth
        />

        <Button type="submit" variant="contained" size="large" disabled={requesting} fullWidth>
          {requesting ? 'Sending code…' : 'Send code'}
        </Button>
      </Stack>
    );
  }

  return (
    <Stack component="form" action={verifyFormAction} spacing={2}>
      <input type="hidden" name="phone" value={request.phone} />

      <Alert severity="success">
        We sent a 6-digit code to {request.phone}.
        {request.devCode ? (
          <Typography variant="caption" display="block">
            Development mode — your code is <strong>{request.devCode}</strong>.
          </Typography>
        ) : null}
      </Alert>

      {verify.error ? <Alert severity="error">{verify.error}</Alert> : null}

      <TextField
        name="code"
        label="6-digit code"
        required
        autoFocus
        inputProps={{ inputMode: 'numeric', maxLength: 6 }}
        fullWidth
      />

      <TextField
        name="name"
        label="Your name (optional)"
        placeholder="So we know who to greet"
        autoComplete="name"
        fullWidth
      />

      <Button type="submit" variant="contained" size="large" disabled={verifying} fullWidth>
        {verifying ? 'Checking…' : 'Sign in'}
      </Button>

      <Button type="button" size="small" onClick={() => window.location.reload()}>
        Use a different number
      </Button>
    </Stack>
  );
}
