import type { Metadata } from 'next';

export const metadata: Metadata = {
  // The shop's back office must never appear in search results.
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
