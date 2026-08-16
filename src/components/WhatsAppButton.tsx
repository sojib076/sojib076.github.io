'use client';

import { usePathname } from 'next/navigation';
import Fab from '@mui/material/Fab';
import Tooltip from '@mui/material/Tooltip';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';

/**
 * Always-reachable WhatsApp button.
 *
 * WhatsApp is how this shop's customers already talk to it, and a shopper who
 * cannot find a product — or simply prefers to ask — should never have to give
 * up and close the site. Hidden inside the admin, and lifted above the mobile
 * bottom navigation so it never covers the cart tab.
 */
export default function WhatsAppButton({
  phone,
  storeName,
}: {
  /** International form, e.g. 8801781736024. */
  phone: string;
  storeName: string;
}) {
  const pathname = usePathname();
  if (pathname.startsWith('/admin')) return null;

  const text = `Hello ${storeName}, I would like to order some groceries.`;
  const href = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  return (
    <Tooltip title="Order or ask on WhatsApp" placement="left">
      <Fab
        component="a"
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Order on WhatsApp"
        size="medium"
        sx={{
          position: 'fixed',
          right: 16,
          // Sits above the bottom navigation on phones, low on desktop.
          bottom: { xs: 'calc(72px + env(safe-area-inset-bottom))', md: 24 },
          zIndex: (theme) => theme.zIndex.speedDial,
          bgcolor: '#25D366',
          color: '#fff',
          '&:hover': { bgcolor: '#1DA851' },
        }}
      >
        <WhatsAppIcon />
      </Fab>
    </Tooltip>
  );
}
