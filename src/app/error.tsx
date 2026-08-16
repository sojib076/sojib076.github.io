'use client';

import { useEffect } from 'react';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Alert from '@mui/material/Alert';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';

/**
 * The customer-facing failure screen.
 *
 * A raw Next.js error page tells a shopper nothing and loses the sale. This
 * says what happened in plain words, offers the two things that actually help
 * (retry, or call the shop), and never prints a stack trace.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // The digest is what ties this screen to the server log entry.
    // eslint-disable-next-line no-console
    console.error('[page error]', error.digest ?? error.message);
  }, [error]);

  const isDatabaseIssue = /mongo|MONGODB_URI|No store found/i.test(error.message);

  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <ErrorOutlineIcon sx={{ fontSize: 56, color: 'warning.main' }} />

      <Typography variant="h1" component="h1" sx={{ mt: 2 }}>
        Something went wrong
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        This page could not load just now. Your cart is safe — please try again.
      </Typography>

      <Stack direction="row" spacing={1.5} justifyContent="center">
        <Button variant="contained" onClick={reset}>
          Try again
        </Button>
        <Button variant="outlined" href="/">
          Go to home
        </Button>
      </Stack>

      {isDatabaseIssue ? (
        <Alert severity="info" sx={{ mt: 4, textAlign: 'left' }}>
          The shop database is unreachable. If you are the owner: check
          <code> MONGODB_URI</code>, and run <code>npm run db:seed</code> if this is a new
          deployment.
        </Alert>
      ) : null}

      {error.digest ? (
        <Typography variant="caption" color="text.disabled" sx={{ mt: 3, display: 'block' }}>
          Reference: {error.digest}
        </Typography>
      ) : null}
    </Container>
  );
}
