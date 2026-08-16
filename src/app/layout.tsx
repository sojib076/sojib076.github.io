import type { Metadata, Viewport } from 'next';
import Box from '@mui/material/Box';
import ThemeRegistry from '@/components/ThemeRegistry';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import BottomNav from '@/components/BottomNav';
import { getCartCount } from '@/lib/cart';
import { getStore } from '@/lib/store';

// Prices, stock and store settings are live data; nothing here may be baked
// into a static build.
export const dynamic = 'force-dynamic';

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0F7B4F',
};

export async function generateMetadata(): Promise<Metadata> {
  const store = await getStore();
  const siteUrl = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';

  const name = store?.name ?? 'Shibu Store';
  const area = store?.area ?? '';
  const title = area ? `${name} — Grocery delivery in ${area}` : `${name} — Local grocery delivery`;
  const description =
    store?.description ??
    `Order groceries from ${name}${area ? ` in ${area}` : ''} and get them delivered to your door or collect them from the shop.`;

  return {
    metadataBase: new URL(siteUrl),
    title: { default: title, template: `%s | ${name}` },
    description,
    applicationName: name,
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      siteName: name,
      title,
      description,
      locale: 'en_BD',
      url: siteUrl,
    },
    robots: { index: true, follow: true },
    formatDetection: { telephone: true },
  };
}

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cartCount = await getCartCount();

  return (
    <html lang="en">
      <body>
        <ThemeRegistry>
          <Box sx={{ minHeight: '100dvh', display: 'flex', flexDirection: 'column' }}>
            <SiteHeader />
            <Box component="main" sx={{ flexGrow: 1, pb: { xs: 8, md: 0 } }}>
              {children}
            </Box>
            <SiteFooter />
          </Box>
          <BottomNav cartCount={cartCount} />
        </ThemeRegistry>
      </body>
    </html>
  );
}
