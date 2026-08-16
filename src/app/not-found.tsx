import Link from 'next/link';
import Container from '@mui/material/Container';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import SearchIcon from '@mui/icons-material/Search';
import SearchBar from '@/components/SearchBar';

/**
 * A missing product is a normal event in a grocery shop — items get delisted.
 * So this page offers a way onward rather than a dead end.
 */
export default function NotFound() {
  return (
    <Container maxWidth="sm" sx={{ py: 8, textAlign: 'center' }}>
      <SearchIcon sx={{ fontSize: 56, color: 'text.disabled' }} />

      <Typography variant="h1" component="h1" sx={{ mt: 2 }}>
        We could not find that
      </Typography>
      <Typography color="text.secondary" sx={{ mt: 1, mb: 3 }}>
        The page or product may have been removed from the shop. Try searching for it.
      </Typography>

      <Box sx={{ mb: 3 }}>
        <SearchBar />
      </Box>

      <Stack direction="row" spacing={1.5} justifyContent="center">
        <Button component={Link} href="/" variant="contained">
          Home
        </Button>
        <Button component={Link} href="/categories" variant="outlined">
          Browse categories
        </Button>
      </Stack>
    </Container>
  );
}
