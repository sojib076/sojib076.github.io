import Link from 'next/link';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import IconButton from '@mui/material/IconButton';
import Badge from '@mui/material/Badge';
import Button from '@mui/material/Button';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import StorefrontIcon from '@mui/icons-material/Storefront';
import SearchBar from '@/components/SearchBar';
import { getCartCount } from '@/lib/cart';
import { getSession } from '@/lib/auth';
import { getOpenState, getStore } from '@/lib/store';

export default async function SiteHeader() {
  const [store, cartCount, session] = await Promise.all([getStore(), getCartCount(), getSession()]);
  if (!store) return null;

  const openState = getOpenState(store);

  return (
    <AppBar position="sticky" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Container disableGutters>
        <Toolbar sx={{ gap: 1, minHeight: { xs: 56, md: 64 } }}>
          <Box
            component={Link}
            href="/"
            sx={{ display: 'flex', alignItems: 'center', gap: 1, textDecoration: 'none', color: 'inherit' }}
          >
            <Box
              sx={{
                width: 36,
                height: 36,
                borderRadius: 2,
                bgcolor: 'primary.main',
                color: 'common.white',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <StorefrontIcon fontSize="small" />
            </Box>
            <Box sx={{ display: { xs: 'none', sm: 'block' } }}>
              <Typography variant="subtitle1" fontWeight={700} lineHeight={1.1}>
                {store.name}
              </Typography>
              <Chip
                size="small"
                label={openState.isOpen ? 'Open now' : openState.nextOpenLabel ?? 'Closed'}
                color={openState.isOpen ? 'success' : 'default'}
                variant={openState.isOpen ? 'filled' : 'outlined'}
                sx={{ height: 18, fontSize: 11, '& .MuiChip-label': { px: 0.75 } }}
              />
            </Box>
          </Box>

          <Box sx={{ flexGrow: 1, maxWidth: 520, mx: { xs: 0.5, md: 2 } }}>
            <SearchBar />
          </Box>

          <Stack direction="row" alignItems="center" spacing={0.5}>
            <Button
              component={Link}
              href="/orders"
              size="small"
              color="inherit"
              sx={{ display: { xs: 'none', md: 'inline-flex' } }}
            >
              My orders
            </Button>

            <IconButton
              component={Link}
              href={session?.customerId ? '/account' : '/account/login'}
              aria-label={session?.customerId ? 'My account' : 'Sign in'}
              size="small"
            >
              <PersonOutlineIcon />
            </IconButton>

            <IconButton component={Link} href="/cart" aria-label="Cart" size="small">
              <Badge badgeContent={cartCount} color="secondary" max={99}>
                <ShoppingCartOutlinedIcon />
              </Badge>
            </IconButton>
          </Stack>
        </Toolbar>
      </Container>
    </AppBar>
  );
}
