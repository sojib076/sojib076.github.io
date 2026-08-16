import { redirect } from 'next/navigation';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import Box from '@mui/material/Box';
import StorefrontIcon from '@mui/icons-material/Storefront';
import StaffLoginForm from '@/components/admin/StaffLoginForm';
import { getSession, isStaff } from '@/lib/auth';
import { getStore } from '@/lib/store';

export default async function AdminLoginPage() {
  const session = await getSession();
  if (isStaff(session)) redirect('/admin');

  const store = await getStore();

  return (
    <Container maxWidth="xs" sx={{ py: 6 }}>
      <Box sx={{ textAlign: 'center', mb: 3 }}>
        <Box
          sx={{
            width: 48,
            height: 48,
            borderRadius: 2,
            bgcolor: 'primary.main',
            color: 'common.white',
            display: 'inline-grid',
            placeItems: 'center',
            mb: 1,
          }}
        >
          <StorefrontIcon />
        </Box>
        <Typography variant="h2" component="h1">
          {store?.name ?? 'Store'} admin
        </Typography>
        <Typography variant="body2" color="text.secondary">
          Sign in to manage orders, products and settings.
        </Typography>
      </Box>

      <Card>
        <CardContent>
          <StaffLoginForm />
        </CardContent>
      </Card>
    </Container>
  );
}
