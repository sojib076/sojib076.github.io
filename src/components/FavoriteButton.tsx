'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import IconButton from '@mui/material/IconButton';
import Tooltip from '@mui/material/Tooltip';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Button from '@mui/material/Button';
import FavoriteIcon from '@mui/icons-material/Favorite';
import FavoriteBorderIcon from '@mui/icons-material/FavoriteBorder';
import { toggleFavoriteAction } from '@/app/actions/favorites';

export default function FavoriteButton({
  productId,
  initialSaved = false,
}: {
  productId: string;
  initialSaved?: boolean;
}) {
  const router = useRouter();
  const [saved, setSaved] = useState(initialSaved);
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const previous = saved;
    setSaved(!previous);
    startTransition(async () => {
      const result = await toggleFavoriteAction(productId);
      if (!result.ok) {
        setSaved(previous);
        setMessage(result.error ?? 'Could not save this item.');
      }
    });
  }

  return (
    <>
      <Tooltip title={saved ? 'Saved' : 'Save for later'}>
        <IconButton
          onClick={toggle}
          disabled={pending}
          color={saved ? 'error' : 'default'}
          aria-label={saved ? 'Remove from saved items' : 'Save item'}
        >
          {saved ? <FavoriteIcon /> : <FavoriteBorderIcon />}
        </IconButton>
      </Tooltip>

      <Snackbar
        open={Boolean(message)}
        autoHideDuration={5000}
        onClose={() => setMessage(null)}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert
          severity="info"
          variant="filled"
          onClose={() => setMessage(null)}
          action={
            <Button color="inherit" size="small" onClick={() => router.push('/account/login')}>
              Sign in
            </Button>
          }
        >
          {message}
        </Alert>
      </Snackbar>
    </>
  );
}
