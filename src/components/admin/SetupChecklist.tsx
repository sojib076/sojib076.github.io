import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Stack from '@mui/material/Stack';
import Box from '@mui/material/Box';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import type { SetupItem } from '@/lib/admin';

const ICONS = {
  error: <ErrorOutlineIcon color="error" />,
  warning: <WarningAmberIcon color="warning" />,
  info: <InfoOutlinedIcon color="info" />,
};

/**
 * Shows what still needs setting up, worst first.
 *
 * When it says the shop is ready, that is a real statement: every blocking
 * item — categories, products, delivery areas, order alerts — has been dealt
 * with, so an order placed right now will reach the owner.
 */
export default function SetupChecklist({ items }: { items: SetupItem[] }) {
  const blocking = items.filter((item) => item.severity === 'error');

  if (items.length === 0) {
    return (
      <Card sx={{ mb: 3, borderColor: 'success.main' }}>
        <CardContent>
          <Stack direction="row" spacing={1.5} alignItems="center">
            <CheckCircleOutlineIcon color="success" />
            <Box>
              <Typography variant="subtitle1" fontWeight={700}>
                Your shop is ready to take orders
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Products, delivery areas and order alerts are all set up.
              </Typography>
            </Box>
          </Stack>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card
      sx={{
        mb: 3,
        borderColor: blocking.length > 0 ? 'error.main' : 'warning.main',
        borderWidth: 1,
      }}
    >
      <CardContent>
        <Stack direction="row" justifyContent="space-between" alignItems="center" sx={{ mb: 1.5 }}>
          <Typography variant="h3" component="h2">
            Finish setting up
          </Typography>
          {blocking.length > 0 ? (
            <Chip
              size="small"
              color="error"
              label={`${blocking.length} blocking order${blocking.length === 1 ? '' : 's'}`}
            />
          ) : null}
        </Stack>

        <Stack spacing={1.5}>
          {items.map((item) => (
            <Stack key={item.id} direction="row" spacing={1.5} alignItems="flex-start">
              <Box sx={{ mt: 0.25 }}>{ICONS[item.severity]}</Box>

              <Box sx={{ flexGrow: 1, minWidth: 0 }}>
                <Typography variant="subtitle2">{item.title}</Typography>
                <Typography variant="body2" color="text.secondary">
                  {item.detail}
                </Typography>
              </Box>

              {item.href ? (
                <Button component={Link} href={item.href} size="small" sx={{ flexShrink: 0 }}>
                  Fix
                </Button>
              ) : null}
            </Stack>
          ))}
        </Stack>
      </CardContent>
    </Card>
  );
}
