import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Divider from '@mui/material/Divider';
import Box from '@mui/material/Box';
import Alert from '@mui/material/Alert';
import LinearProgress from '@mui/material/LinearProgress';
import { formatBDT } from '@/lib/money';
import type { Quote } from '@/lib/pricing';

/**
 * The money panel, shown identically in the cart and at checkout.
 *
 * The delivery fee appears here from the first screen — never revealed at the
 * last step. A shopper who finds out about a ৳50 charge on the confirmation
 * page does not come back.
 */
export default function OrderTotals({
  quote,
  fulfillmentType,
  showMinimumWarning = true,
}: {
  quote: Quote;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  showMinimumWarning?: boolean;
}) {
  const isDelivery = fulfillmentType === 'DELIVERY';

  return (
    <Box>
      <Stack spacing={1}>
        <Row label={`Subtotal (${quote.itemCount} item${quote.itemCount === 1 ? '' : 's'})`} value={formatBDT(quote.subtotalPoisha)} />

        {quote.productSavingsPoisha > 0 ? (
          <Row
            label="Product savings"
            value={`-${formatBDT(quote.productSavingsPoisha)}`}
            color="success.main"
          />
        ) : null}

        {isDelivery ? (
          <Row
            label="Delivery fee"
            value={quote.deliveryIsFree ? 'Free' : formatBDT(quote.deliveryFeePoisha)}
            color={quote.deliveryIsFree ? 'success.main' : undefined}
          />
        ) : (
          <Row label="Store pickup" value="Free" color="success.main" />
        )}

        {quote.discountPoisha > 0 ? (
          <Row
            label={quote.couponCode ? `Discount (${quote.couponCode})` : 'Discount'}
            value={`-${formatBDT(quote.discountPoisha)}`}
            color="success.main"
          />
        ) : null}
      </Stack>

      <Divider sx={{ my: 1.5 }} />

      <Stack direction="row" justifyContent="space-between" alignItems="baseline">
        <Typography variant="h3" component="span">
          Total
        </Typography>
        <Typography variant="h3" component="span">
          {formatBDT(quote.totalPoisha)}
        </Typography>
      </Stack>

      {showMinimumWarning && !quote.meetsMinimum && quote.itemCount > 0 ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          <Typography variant="subtitle2" component="div">
            Add {formatBDT(quote.amountToMinimumPoisha)} more to place your order.
          </Typography>
          <Typography variant="caption" color="text.secondary">
            Minimum order is {formatBDT(quote.minOrderPoisha)} — your cart is{' '}
            {formatBDT(quote.subtotalPoisha)}.
          </Typography>
          <LinearProgress
            variant="determinate"
            value={Math.min(100, (quote.subtotalPoisha / Math.max(1, quote.minOrderPoisha)) * 100)}
            sx={{ mt: 1, height: 6, borderRadius: 3 }}
          />
        </Alert>
      ) : null}

      {isDelivery && quote.meetsMinimum && quote.amountToFreeDeliveryPoisha ? (
        <Alert severity="info" sx={{ mt: 2 }}>
          Add {formatBDT(quote.amountToFreeDeliveryPoisha)} more for free delivery.
        </Alert>
      ) : null}

      {quote.couponError ? (
        <Alert severity="warning" sx={{ mt: 2 }}>
          {quote.couponError}
        </Alert>
      ) : null}
    </Box>
  );
}

function Row({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <Stack direction="row" justifyContent="space-between">
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography variant="body2" fontWeight={600} sx={{ color }}>
        {value}
      </Typography>
    </Stack>
  );
}
