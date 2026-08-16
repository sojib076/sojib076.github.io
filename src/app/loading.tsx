import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Skeleton from '@mui/material/Skeleton';
import Stack from '@mui/material/Stack';

/**
 * Shown while a page's data loads.
 *
 * On a slow mobile connection the alternative is a blank white screen, which
 * reads as "broken" and loses the order. A skeleton in roughly the shape of
 * the real page keeps the wait legible.
 */
export default function Loading() {
  return (
    <Container sx={{ py: 3 }}>
      <Skeleton variant="text" width="48%" height={44} />
      <Skeleton variant="text" width="72%" />

      <Stack direction="row" spacing={1.5} sx={{ mt: 3, mb: 3, overflow: 'hidden' }}>
        {Array.from({ length: 6 }).map((_, index) => (
          <Skeleton key={index} variant="rounded" width={92} height={96} sx={{ flexShrink: 0 }} />
        ))}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridTemplateColumns: {
            xs: 'repeat(2, 1fr)',
            sm: 'repeat(3, 1fr)',
            md: 'repeat(4, 1fr)',
            lg: 'repeat(5, 1fr)',
          },
          gap: 1.5,
        }}
      >
        {Array.from({ length: 10 }).map((_, index) => (
          <Box key={index}>
            <Skeleton variant="rounded" sx={{ width: '100%', aspectRatio: '1 / 1' }} />
            <Skeleton variant="text" width="80%" sx={{ mt: 1 }} />
            <Skeleton variant="text" width="45%" />
            <Skeleton variant="rounded" height={36} sx={{ mt: 1 }} />
          </Box>
        ))}
      </Box>
    </Container>
  );
}
