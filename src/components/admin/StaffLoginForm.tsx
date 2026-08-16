'use client';

import { useActionState } from 'react';
import Stack from '@mui/material/Stack';
import TextField from '@mui/material/TextField';
import Button from '@mui/material/Button';
import Alert from '@mui/material/Alert';
import { staffLoginAction, type StaffLoginState } from '@/app/actions/auth';

export default function StaffLoginForm() {
  const [state, formAction, pending] = useActionState<StaffLoginState, FormData>(
    staffLoginAction,
    {},
  );

  return (
    <Stack component="form" action={formAction} spacing={2}>
      {state.error ? <Alert severity="error">{state.error}</Alert> : null}

      <TextField
        name="email"
        type="email"
        label="Email"
        required
        autoFocus
        autoComplete="username"
        fullWidth
      />
      <TextField
        name="password"
        type="password"
        label="Password"
        required
        autoComplete="current-password"
        fullWidth
      />

      <Button type="submit" variant="contained" size="large" disabled={pending} fullWidth>
        {pending ? 'Signing in…' : 'Sign in'}
      </Button>
    </Stack>
  );
}
