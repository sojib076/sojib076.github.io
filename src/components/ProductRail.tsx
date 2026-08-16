import Link from 'next/link';
import Box from '@mui/material/Box';
import Stack from '@mui/material/Stack';
import Typography from '@mui/material/Typography';
import Button from '@mui/material/Button';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import ProductCard, { type ProductCardData } from '@/components/ProductCard';

type Props = {
  title: string;
  subtitle?: string;
  products: ProductCardData[];
  cartQty: Record<string, number>;
  href?: string;
  priority?: boolean;
};

/**
 * Horizontally scrolling shelf on phones, wrapping grid on desktop.
 *
 * Scrolling sideways is how every shopping app here behaves, and it keeps more
 * of the page above the fold on a small screen.
 */
export default function ProductRail({ title, subtitle, products, cartQty, href, priority }: Props) {
  if (products.length === 0) return null;

  return (
    <Box component="section" sx={{ mt: 4 }}>
      <Stack direction="row" alignItems="center" justifyContent="space-between" sx={{ mb: 1.5 }}>
        <Box>
          <Typography variant="h2" component="h2">
            {title}
          </Typography>
          {subtitle ? (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          ) : null}
        </Box>
        {href ? (
          <Button component={Link} href={href} size="small" endIcon={<ChevronRightIcon />}>
            See all
          </Button>
        ) : null}
      </Stack>

      <Box
        sx={{
          display: 'grid',
          gridAutoFlow: { xs: 'column', md: 'row' },
          gridAutoColumns: { xs: '44%', sm: '31%' },
          gridTemplateColumns: { md: 'repeat(auto-fill, minmax(180px, 1fr))' },
          gap: 1.5,
          overflowX: { xs: 'auto', md: 'visible' },
          scrollSnapType: { xs: 'x mandatory', md: 'none' },
          pb: 1,
          mx: { xs: -2, md: 0 },
          px: { xs: 2, md: 0 },
          '&::-webkit-scrollbar': { display: 'none' },
          scrollbarWidth: 'none',
        }}
      >
        {products.map((product, index) => (
          <Box key={product.id} sx={{ scrollSnapAlign: 'start' }}>
            <ProductCard
              product={product}
              cartQty={cartQty[product.id] ?? 0}
              priority={priority && index < 2}
            />
          </Box>
        ))}
      </Box>
    </Box>
  );
}
