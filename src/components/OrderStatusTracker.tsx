import type { OrderStatus } from '@/lib/db/types';
import Box from '@mui/material/Box';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import Alert from '@mui/material/Alert';
import { STATUS_LABELS, statusFlow } from '@/lib/orders';

/**
 * A plain progress line, not live GPS tracking. The shop tells us where the
 * order is when they change its status, and that is all we claim to show.
 */
export default function OrderStatusTracker({
  status,
  fulfillmentType,
  cancelReason,
}: {
  status: OrderStatus;
  fulfillmentType: 'DELIVERY' | 'PICKUP';
  cancelReason?: string | null;
}) {
  if (status === 'CANCELLED') {
    return (
      <Alert severity="error">
        This order was cancelled.{cancelReason ? ` Reason: ${cancelReason}` : ''}
      </Alert>
    );
  }

  const flow = statusFlow(fulfillmentType);
  const activeStep = Math.max(0, flow.indexOf(status));

  return (
    <Box sx={{ overflowX: 'auto', py: 1 }}>
      <Stepper activeStep={activeStep} alternativeLabel sx={{ minWidth: 520 }}>
        {flow.map((step) => (
          <Step key={step} completed={flow.indexOf(step) < activeStep}>
            <StepLabel>{step === 'DELIVERED' && fulfillmentType === 'PICKUP' ? 'Collected' : STATUS_LABELS[step]}</StepLabel>
          </Step>
        ))}
      </Stepper>
    </Box>
  );
}
