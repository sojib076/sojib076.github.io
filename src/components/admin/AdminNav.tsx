'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import AppBar from '@mui/material/AppBar';
import Toolbar from '@mui/material/Toolbar';
import Container from '@mui/material/Container';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import LogoutIcon from '@mui/icons-material/Logout';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import { signOutAction } from '@/app/actions/auth';

const TABS = [
  { label: 'Dashboard', href: '/admin' },
  { label: 'Orders', href: '/admin/orders' },
  { label: 'Products', href: '/admin/products' },
  { label: 'Categories', href: '/admin/categories' },
  { label: 'Delivery', href: '/admin/delivery' },
  { label: 'Settings', href: '/admin/settings' },
];

export default function AdminNav({ storeName, userName }: { storeName: string; userName: string }) {
  const pathname = usePathname();

  // Longest matching prefix wins, so /admin/orders/123 keeps "Orders" active.
  const active = TABS.reduce((best, tab) => {
    if (tab.href === '/admin' ? pathname === '/admin' : pathname.startsWith(tab.href)) {
      return tab.href.length > best.length ? tab.href : best;
    }
    return best;
  }, '/admin');

  return (
    <AppBar position="sticky" sx={{ bgcolor: 'background.paper', borderBottom: 1, borderColor: 'divider' }}>
      <Container maxWidth="xl">
        <Toolbar disableGutters sx={{ minHeight: 56, gap: 2 }}>
          <Typography variant="subtitle1" fontWeight={700} noWrap>
            {storeName}
            <Typography component="span" variant="caption" color="text.secondary">
              {' '}
              admin
            </Typography>
          </Typography>

          <Box sx={{ flexGrow: 1 }} />

          <Stack direction="row" spacing={1} alignItems="center">
            <Typography variant="body2" color="text.secondary" sx={{ display: { xs: 'none', sm: 'block' } }}>
              {userName}
            </Typography>
            <Button
              component={Link}
              href="/"
              size="small"
              endIcon={<OpenInNewIcon />}
              sx={{ display: { xs: 'none', sm: 'inline-flex' } }}
            >
              View shop
            </Button>
            <form action={signOutAction}>
              <Button type="submit" size="small" color="inherit" startIcon={<LogoutIcon />}>
                Sign out
              </Button>
            </form>
          </Stack>
        </Toolbar>

        <Tabs
          value={active}
          variant="scrollable"
          scrollButtons="auto"
          sx={{ minHeight: 40, '& .MuiTab-root': { minHeight: 40 } }}
        >
          {TABS.map((tab) => (
            <Tab key={tab.href} value={tab.href} label={tab.label} component={Link} href={tab.href} />
          ))}
        </Tabs>
      </Container>
    </AppBar>
  );
}
