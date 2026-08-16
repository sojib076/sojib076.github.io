import Link from 'next/link';
import Card from '@mui/material/Card';
import CardContent from '@mui/material/CardContent';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Chip from '@mui/material/Chip';
import Price from '@/components/Price';
import ProductThumb from '@/components/ProductThumb';
import AddToCartButton from '@/components/AddToCartButton';

export type ProductCardData = {
  id: string;
  slug: string;
  name: string;
  nameBn: string | null;
  unit: string;
  pricePoisha: number;
  discountPricePoisha: number | null;
  minQty: number;
  maxQty: number;
  images: { url: string }[];
  inventory: { isAvailable: boolean; trackStock: boolean; stockQty: number } | null;
};

type Props = {
  product: ProductCardData;
  /** Quantity already in the cart, so the card opens as a stepper. */
  cartQty?: number;
  priority?: boolean;
};

export default function ProductCard({ product, cartQty = 0, priority = false }: Props) {
  const inventory = product.inventory;
  const soldOut =
    (inventory && !inventory.isAvailable) ||
    Boolean(inventory?.trackStock && inventory.stockQty <= 0);
  const lowStock =
    !soldOut && Boolean(inventory?.trackStock) && (inventory?.stockQty ?? 0) <= 5;

  return (
    <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', position: 'relative' }}>
      <Box
        component={Link}
        href={`/product/${product.slug}`}
        sx={{ display: 'block', p: 1, pb: 0, textDecoration: 'none' }}
      >
        <Box sx={{ position: 'relative', opacity: soldOut ? 0.55 : 1 }}>
          <ProductThumb
            url={product.images[0]?.url}
            alt={product.name}
            fallbackText={product.nameBn ?? product.name}
            priority={priority}
          />
          {soldOut ? (
            <Chip
              label="Out of stock"
              size="small"
              sx={{ position: 'absolute', top: 6, left: 6, bgcolor: 'grey.800', color: 'common.white' }}
            />
          ) : null}
        </Box>
      </Box>

      <CardContent sx={{ p: 1.25, pt: 1, flexGrow: 1, display: 'flex', flexDirection: 'column' }}>
        <Box
          component={Link}
          href={`/product/${product.slug}`}
          sx={{ textDecoration: 'none', color: 'inherit', flexGrow: 1 }}
        >
          <Typography variant="subtitle2" sx={{ lineHeight: 1.3 }}>
            {product.name}
          </Typography>
          {product.nameBn ? (
            <Typography variant="caption" color="text.secondary" display="block">
              {product.nameBn}
            </Typography>
          ) : null}

          <Stack direction="row" spacing={0.5} alignItems="center" sx={{ mt: 0.75 }}>
            <Typography variant="caption" color="text.secondary">
              {product.unit}
            </Typography>
            {lowStock ? (
              <Typography variant="caption" color="warning.main" fontWeight={600}>
                • Only {inventory?.stockQty} left
              </Typography>
            ) : null}
          </Stack>

          <Box sx={{ mt: 0.5 }}>
            <Price
              pricePoisha={product.pricePoisha}
              discountPricePoisha={product.discountPricePoisha}
              size="small"
            />
          </Box>
        </Box>

        <Box sx={{ mt: 1.25 }}>
          <AddToCartButton
            productId={product.id}
            initialQty={cartQty}
            minQty={product.minQty}
            maxQty={product.maxQty}
            disabled={soldOut}
            size="small"
            fullWidth
          />
        </Box>
      </CardContent>
    </Card>
  );
}
