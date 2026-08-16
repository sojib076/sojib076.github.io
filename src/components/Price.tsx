import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import { discountPercent, formatBDT } from '@/lib/money';

type Props = {
  pricePoisha: number;
  discountPricePoisha?: number | null;
  unit?: string | null;
  size?: 'small' | 'medium' | 'large';
  showBadge?: boolean;
};

/**
 * Price display. When something is discounted the original stays visible —
 * shoppers here compare with the shelf price they already know.
 */
export default function Price({
  pricePoisha,
  discountPricePoisha,
  unit,
  size = 'medium',
  showBadge = true,
}: Props) {
  const hasDiscount =
    discountPricePoisha != null && discountPricePoisha > 0 && discountPricePoisha < pricePoisha;
  const effective = hasDiscount ? discountPricePoisha! : pricePoisha;
  const percent = discountPercent({ pricePoisha, discountPricePoisha });

  const variant = size === 'large' ? 'h2' : size === 'small' ? 'subtitle2' : 'h4';

  return (
    <Stack direction="row" alignItems="baseline" spacing={0.75} flexWrap="wrap">
      <Typography variant={variant} component="span" color="text.primary">
        {formatBDT(effective)}
      </Typography>

      {unit ? (
        <Typography variant="caption" color="text.secondary" component="span">
          /{unit}
        </Typography>
      ) : null}

      {hasDiscount ? (
        <Typography
          variant="caption"
          component="span"
          color="text.secondary"
          sx={{ textDecoration: 'line-through' }}
        >
          {formatBDT(pricePoisha)}
        </Typography>
      ) : null}

      {hasDiscount && showBadge && percent > 0 ? (
        <Chip label={`-${percent}%`} size="small" color="secondary" sx={{ height: 20 }} />
      ) : null}
    </Stack>
  );
}
