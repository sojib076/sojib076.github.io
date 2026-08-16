import { redirect } from 'next/navigation';
import Box from '@mui/material/Box';
import Container from '@mui/material/Container';
import AdminNav from '@/components/admin/AdminNav';
import { getSession, isStaff } from '@/lib/auth';
import { getStore } from '@/lib/store';

/**
 * Guard for everything behind /admin. Sits in a route group so the login page
 * itself stays reachable at /admin/login without bouncing in a loop.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!isStaff(session)) redirect('/admin/login');

  const store = await getStore();

  return (
    <Box sx={{ minHeight: '100dvh', bgcolor: 'background.default' }}>
      <AdminNav storeName={store?.name ?? 'Store'} userName={session?.name ?? 'Staff'} />
      <Container maxWidth="xl" sx={{ py: 3 }}>
        {children}
      </Container>
    </Box>
  );
}
