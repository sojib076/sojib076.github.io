'use client';

import { usePathname, useRouter } from 'next/navigation';
import Paper from '@mui/material/Paper';
import BottomNavigation from '@mui/material/BottomNavigation';
import BottomNavigationAction from '@mui/material/BottomNavigationAction';
import Badge from '@mui/material/Badge';
import HomeOutlinedIcon from '@mui/icons-material/HomeOutlined';
import GridViewOutlinedIcon from '@mui/icons-material/GridViewOutlined';
import ShoppingCartOutlinedIcon from '@mui/icons-material/ShoppingCartOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

const ITEMS = [
  { label: 'Home', href: '/', icon: <HomeOutlinedIcon /> },
  { label: 'Categories', href: '/categories', icon: <GridViewOutlinedIcon /> },
  { label: 'Cart', href: '/cart', icon: null },
  { label: 'Orders', href: '/orders', icon: <ReceiptLongOutlinedIcon /> },
];

/**
 * Thumb-reachable navigation. Hidden on desktop, where the header is enough.
 */
export default function BottomNav({ cartCount }: { cartCount: number }) {
  const pathname = usePathname();
  const router = useRouter();

  if (pathname.startsWith('/admin')) return null;

  const current = ITEMS.findIndex((item) =>
    item.href === '/' ? pathname === '/' : pathname.startsWith(item.href),
  );

  return (
    <Paper
      elevation={0}
      sx={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: (theme) => theme.zIndex.appBar,
        borderTop: 1,
        borderColor: 'divider',
        display: { xs: 'block', md: 'none' },
        // Clears the iOS home indicator.
        pb: 'env(safe-area-inset-bottom)',
      }}
    >
      <BottomNavigation
        value={current}
        showLabels
        onChange={(_, index: number) => router.push(ITEMS[index].href)}
      >
        {ITEMS.map((item) => (
          <BottomNavigationAction
            key={item.href}
            label={item.label}
            icon={
              item.href === '/cart' ? (
                <Badge badgeContent={cartCount} color="secondary" max={99}>
                  <ShoppingCartOutlinedIcon />
                </Badge>
              ) : (
                item.icon
              )
            }
          />
        ))}
      </BottomNavigation>
    </Paper>
  );
}
