import type { Metadata } from 'next';
import Container from '@mui/material/Container';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Typography from '@mui/material/Typography';
import PhoneLoginForm from '@/components/PhoneLoginForm';

export const metadata: Metadata = {
  title: 'Sign in',
  robots: { index: false, follow: false },
};

export default function LoginPage() {
  return (
    <Container maxWidth="sm" sx={{ py: 5 }}>
      <Typography variant="h1" component="h1" gutterBottom>
        Sign in
      </Typography>
      <Typography color="text.secondary" sx={{ mb: 3 }}>
        Use your mobile number — no password to remember. Signing in keeps your order history and
        makes reordering one tap.
      </Typography>

      <Card>
        <CardContent>
          <PhoneLoginForm />
        </CardContent>
      </Card>
    </Container>
  );
}
